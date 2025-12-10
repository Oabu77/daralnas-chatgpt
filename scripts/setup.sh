#!/usr/bin/env bash
set -euo pipefail

# Simple setup helper to install dependencies, create a D1 database, and apply migrations.
# It is meant for everyday users who want a guided bootstrap experience with real resources.

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

echo "🚀 Cloudflare OpenAPI template bootstrap"

echo "🔍 Checking required tools..."
missing=()
for cmd in node npm npx; do
  if ! command_exists "$cmd"; then
    missing+=("$cmd")
  fi
done

if ! command_exists wrangler; then
  missing+=("wrangler (install with: npm install -g wrangler)")
fi

if ((${#missing[@]} > 0)); then
  echo "❌ Missing tools: ${missing[*]}" >&2
  exit 1
fi

echo "✅ Required tools found"

echo "🔐 Verifying Cloudflare authentication (npx wrangler whoami)"
if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "❌ Not authenticated with Cloudflare. Run 'npx wrangler login' and retry." >&2
  exit 1
fi

node_version=$(node -v | sed 's/^v//')
node_major=${node_version%%.*}
if ((node_major < 18)); then
  echo "⚠️  Node.js v18 or newer is recommended; detected v$node_version" >&2
fi

echo "📦 Installing project dependencies (npm install)"
npm install

project_name=$(node -e "console.log(require('./package.json').name || '')" 2>/dev/null || true)
config_default=$(node -e "try { const cfg = require('./wrangler.jsonc'); console.log((cfg.d1_databases && cfg.d1_databases[0] && cfg.d1_databases[0].database_name) || ''); } catch { console.log(''); }" 2>/dev/null || true)
default_db_name=${config_default:-${project_name:-openapi-template-db}}
db_id=""

echo "🗂  Existing D1 database configuration: ${config_default:-'none found'}"
read -r -p "Enter D1 database name [${default_db_name}]: " db_name
: "${db_name:=$default_db_name}"
if [[ -z "$db_name" ]]; then
  echo "❌ Database name cannot be empty." >&2
  exit 1
fi

read -r -p "Do you already have a database ID? (y/N): " has_id
has_id=${has_id:-N}

create_db=false
if [[ "$has_id" =~ ^[Yy]$ ]]; then
  read -r -p "Enter existing database ID: " db_id
  if [[ -z "$db_id" ]]; then
    echo "❌ A database ID is required when reusing an existing database." >&2
    exit 1
  fi
  if ! [[ "$db_id" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
    echo "❌ The database ID must be a valid UUID (copied from the D1 dashboard or 'wrangler d1 list')." >&2
    exit 1
  fi
else
  create_db=true
fi

if $create_db; then
  echo "🗄️  Creating D1 database '$db_name' via Wrangler..."
  if db_json=$(npx wrangler d1 create "$db_name" --json); then
    db_id=$(node -e "console.log(JSON.parse(process.argv[1]).uuid)" "$db_json")
    echo "✅ Created D1 database with ID: $db_id"
  else
    echo "❌ Failed to create database automatically. Please create one manually and re-run the script." >&2
    exit 1
  fi
fi

# Update wrangler.jsonc with the chosen database values.
echo "📝 Updating wrangler.jsonc (backup at wrangler.jsonc.bak)"
SETUP_DB_NAME="$db_name" SETUP_DB_ID="$db_id" node <<'NODE'
const fs = require('fs');
const path = 'wrangler.jsonc';
const backup = 'wrangler.jsonc.bak';
const raw = fs.readFileSync(path, 'utf8');
fs.writeFileSync(backup, raw);

// Remove simple // and /* */ comments so JSON.parse works for JSONC files.
const stripped = raw
  .replace(/\/\*[^]*?\*\//g, '')
  .replace(/(^|\s)//.*$/gm, '')
  .trim();

const data = stripped ? JSON.parse(stripped) : {};
const dbName = process.env.SETUP_DB_NAME;
const dbId = process.env.SETUP_DB_ID;
if (!Array.isArray(data.d1_databases) || data.d1_databases.length === 0) {
  data.d1_databases = [{ binding: 'DB', database_name: dbName, database_id: dbId }];
} else {
  const first = data.d1_databases[0];
  first.binding = first.binding || 'DB';
  first.database_name = dbName;
  first.database_id = dbId;
  data.d1_databases[0] = first;
}
fs.writeFileSync(path, JSON.stringify(data, null, 8));
NODE

# Apply migrations
read -r -p "Run D1 migrations now? (Y/n): " run_migrations
run_migrations=${run_migrations:-Y}
if [[ "$run_migrations" =~ ^[Yy]$ ]]; then
  read -r -p "Apply migrations remotely (R) or locally (l)? [R/l]: " remote_choice
  remote_choice=${remote_choice:-R}
  if [[ "$remote_choice" =~ ^[Ll]$ ]]; then
    echo "📜 Applying migrations locally"
    npx wrangler d1 migrations apply DB --local
  else
    echo "📜 Applying migrations remotely"
    npx wrangler d1 migrations apply DB --remote
  fi
else
  echo "ℹ️  Skipping migrations. You can run them later with: npx wrangler d1 migrations apply DB --remote"
fi

echo "✅ Setup complete! You can now deploy with: npx wrangler deploy"
