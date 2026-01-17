#!/usr/bin/env bash
# Deployment Readiness Verification Script
# This script verifies that the application is ready for deployment

set -euo pipefail

echo "🔍 OliveExpress™ Deployment Readiness Check"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to print success message
success() {
    echo "✅ $1"
}

# Function to print error message
error() {
    echo "❌ $1"
    ((ERRORS++))
}

# Function to print warning message
warning() {
    echo "⚠️  $1"
    ((WARNINGS++))
}

# Function to print info message
info() {
    echo "ℹ️  $1"
}

echo "📋 Checking prerequisites..."
echo ""

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        success "Node.js version: $NODE_VERSION"
    else
        error "Node.js version $NODE_VERSION is too old (need >= 18)"
    fi
else
    error "Node.js is not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    success "npm version: $NPM_VERSION"
else
    error "npm is not installed"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    success "Dependencies installed"
else
    warning "node_modules not found - run 'npm install'"
fi

echo ""
echo "🔧 Checking configuration files..."
echo ""

# Check wrangler.jsonc
if [ -f "wrangler.jsonc" ]; then
    success "wrangler.jsonc exists"
    
    # Check if D1 database is configured
    if grep -q "d1_databases" wrangler.jsonc; then
        success "D1 database configured in wrangler.jsonc"
    else
        error "D1 database not configured in wrangler.jsonc"
    fi
else
    error "wrangler.jsonc not found"
fi

# Check tsconfig.json
if [ -f "tsconfig.json" ]; then
    success "tsconfig.json exists"
else
    error "tsconfig.json not found"
fi

# Check package.json
if [ -f "package.json" ]; then
    success "package.json exists"
    
    # Check for required scripts
    if grep -q '"deploy"' package.json; then
        success "Deploy script defined"
    else
        error "Deploy script not defined in package.json"
    fi
    
    if grep -q '"predeploy"' package.json; then
        success "Predeploy script defined (migrations)"
    else
        warning "Predeploy script not defined in package.json"
    fi
else
    error "package.json not found"
fi

echo ""
echo "🗄️  Checking database migrations..."
echo ""

MIGRATION_COUNT=0
if [ -d "migrations" ]; then
    MIGRATION_COUNT=$(find migrations -name "*.sql" | wc -l)
    if [ "$MIGRATION_COUNT" -eq 6 ]; then
        success "All 6 migration files present"
    else
        warning "Expected 6 migration files, found $MIGRATION_COUNT"
    fi
    
    # Check for specific migrations
    for migration in "0001_add_tasks_table.sql" "0002_oliveexpress_core_tables.sql" "0003_quranchain_integration.sql" "0004_ai_analytics_treasury.sql" "0005_integrations.sql" "0006_regional_seed_data.sql"; do
        if [ -f "migrations/$migration" ]; then
            success "Migration found: $migration"
        else
            error "Migration missing: $migration"
        fi
    done
else
    error "migrations directory not found"
fi

echo ""
echo "📝 Checking documentation..."
echo ""

# Check for required documentation
for doc in "README.md" "DEPLOYMENT.md" "INTEGRATION_STATUS.md" "SYSTEM_INTEGRATION_MAP.md" "API_TESTS.md" "ANSWER.md"; do
    if [ -f "$doc" ]; then
        success "Documentation found: $doc"
    else
        warning "Documentation missing: $doc"
    fi
done

echo ""
echo "🔨 Checking code quality..."
echo ""

# TypeScript compilation
if command -v npx &> /dev/null && [ -f "tsconfig.json" ]; then
    info "Running TypeScript compilation check..."
    if npx tsc --noEmit > /dev/null 2>&1; then
        success "TypeScript compilation successful"
    else
        error "TypeScript compilation failed"
    fi
else
    warning "Cannot check TypeScript compilation (npx or tsconfig.json missing)"
fi

echo ""
echo "🧪 Checking test configuration..."
echo ""

# Check test files
if [ -d "tests" ]; then
    TEST_COUNT=$(find tests -name "*.test.ts" | wc -l)
    success "Test directory exists ($TEST_COUNT test files)"
else
    warning "tests directory not found"
fi

# Check test configuration
if [ -f "tests/vitest.config.mts" ]; then
    success "Vitest configuration found"
else
    warning "Vitest configuration not found"
fi

echo ""
echo "🚀 Checking deployment workflow..."
echo ""

# Check GitHub Actions workflow
if [ -f ".github/workflows/deploy.yml" ]; then
    success "GitHub Actions deploy workflow exists"
    
    # Check for required workflow steps
    if grep -q "Apply D1 migrations" .github/workflows/deploy.yml; then
        success "Migration step in workflow"
    else
        warning "Migration step not found in workflow"
    fi
    
    if grep -q "Deploy to Cloudflare Workers" .github/workflows/deploy.yml; then
        success "Deploy step in workflow"
    else
        warning "Deploy step not found in workflow"
    fi
else
    warning ".github/workflows/deploy.yml not found"
fi

echo ""
echo "📊 Summary"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 Perfect! Application is ready for deployment"
    echo ""
    echo "Next steps:"
    echo "  1. Review DEPLOY_CHECKLIST.md for final verification"
    echo "  2. Run 'npm test' to ensure all tests pass"
    echo "  3. Run 'npm run deploy' to deploy to production"
    echo "     OR merge to main branch for automatic deployment"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "✅ Application is ready for deployment with $WARNINGS warning(s)"
    echo ""
    echo "Warnings can typically be ignored, but review them to ensure"
    echo "they don't affect your deployment."
    echo ""
    echo "Next steps:"
    echo "  1. Review warnings above"
    echo "  2. Run 'npm test' to ensure all tests pass"
    echo "  3. Run 'npm run deploy' to deploy to production"
    exit 0
else
    echo "❌ Application is NOT ready for deployment"
    echo ""
    echo "Errors found: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi
