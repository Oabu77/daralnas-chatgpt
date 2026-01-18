# 🔗 Laptop Relay Agent - Complete Setup Guide

Bridge communication between GitHub Codespace and your local laptop (`omar@omar-GL75-Leopard-10SDK`).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Codespace                             │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  Laptop Bridge Client (TypeScript)                   │       │
│  │  - Sends authenticated requests                      │       │
│  │  - HMAC signature validation                         │       │
│  │  - List/Read/Search/Execute operations               │       │
│  └──────────────────────────────────────────────────────┘       │
│                           │                                       │
│                           │ HTTPS                                 │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Cloudflare Tunnel       │
              │  (Public HTTPS Endpoint) │
              └─────────────────────────┘
                            │
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│          omar@omar-GL75-Leopard-10SDK (Your Laptop)              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  Laptop Relay Agent (Python Flask)                   │       │
│  │  - Listens on localhost:8888                         │       │
│  │  - Authenticates requests via HMAC                   │       │
│  │  - Provides file system access                       │       │
│  │  - Executes safe commands                            │       │
│  └──────────────────────────────────────────────────────┘       │
│                           │                                       │
│                           ▼                                       │
│              /home/omar/ (File System)                            │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Step 1: Setup on Laptop (omar@omar-GL75-Leopard-10SDK)

```bash
# Clone the repository (if not already)
cd ~/Projects
git clone https://github.com/Oabu77/daralnas-chatgpt.git
cd daralnas-chatgpt

# Run the setup script
chmod +x scripts/setup-laptop-relay.sh
./scripts/setup-laptop-relay.sh
```

This will:
- ✅ Install Python dependencies (Flask, Flask-CORS)
- ✅ Generate a secure authentication token
- ✅ Install Cloudflare Tunnel (`cloudflared`)
- ✅ Create a systemd service (Linux) or launcher script
- ✅ Save your secret token to `~/.laptop-relay-secret`

### Step 2: Start the Relay Agent on Laptop

```bash
# Start the agent
~/start-laptop-relay.sh
```

You'll see output like:

```
🚀 Starting Laptop Relay Agent...
✅ Relay agent started (PID: 12345)
🌐 Starting Cloudflare Tunnel...
✅ Cloudflare Tunnel started (PID: 12346)

════════════════════════════════════════════════════════════════
🔗 LAPTOP RELAY AGENT RUNNING
════════════════════════════════════════════════════════════════

Watch the cloudflared output above for your tunnel URL:
  https://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.trycloudflare.com
```

**IMPORTANT:** Copy the tunnel URL (starts with `https://` and ends with `.trycloudflare.com`)

### Step 3: Configure Codespace

In your GitHub Codespace terminal:

```bash
# Set the tunnel URL (use the URL from Step 2)
export LAPTOP_RELAY_URL=https://your-tunnel-url.trycloudflare.com

# Set the secret token (get it from your laptop)
export LAPTOP_RELAY_SECRET=$(cat ~/.laptop-relay-secret)

# Or manually copy the secret from your laptop
echo "Get secret from laptop: cat ~/.laptop-relay-secret"
export LAPTOP_RELAY_SECRET=your-secret-token-here
```

To make these permanent in Codespace:

```bash
# Add to ~/.bashrc
echo 'export LAPTOP_RELAY_URL=https://your-tunnel-url.trycloudflare.com' >> ~/.bashrc
echo 'export LAPTOP_RELAY_SECRET=your-secret-token' >> ~/.bashrc
source ~/.bashrc
```

### Step 4: Test the Connection

```bash
# Install tsx if needed
npm install -g tsx

# Run the test script
tsx scripts/test-laptop-bridge.ts
```

Expected output:

```
════════════════════════════════════════════════════════════════
🧪 TESTING LAPTOP BRIDGE CONNECTION
════════════════════════════════════════════════════════════════

✅ Environment variables configured
📡 Test 1: Health Check
   ✅ Status: online
   ✅ Hostname: omar-GL75-Leopard-10SDK
   ✅ Platform: linux

📊 Test 2: System Information
   ✅ Hostname: omar-GL75-Leopard-10SDK
   ✅ Platform: linux
   ✅ User: omar
   ✅ Home: /home/omar
   ...

✅ ALL TESTS PASSED
```

## 📚 API Usage

### From TypeScript (Codespace)

```typescript
import { createLaptopBridge } from './src/agents/laptop-bridge-client';

// Create bridge client
const bridge = createLaptopBridge();

// List files in home directory
const files = await bridge.listFiles('/home/omar');
console.log(files);

// Read a file
const content = await bridge.readFile('/home/omar/.bashrc', 1, 50);
console.log(content);

// Search for Python files
const pythonFiles = await bridge.findFiles('/home/omar/Projects', '*.py');
console.log(pythonFiles);

// Search for content
const matches = await bridge.searchContent('/home/omar/Documents', 'TODO');
console.log(matches);

// Execute a command
const result = await bridge.executeCommand('ls -la /home/omar');
console.log(result.stdout);

// Get system info
const info = await bridge.getSystemInfo();
console.log(info.hostname); // omar-GL75-Leopard-10SDK
```

### Direct API Calls

```bash
# Health check (no auth required)
curl https://your-tunnel-url.trycloudflare.com/health

# Generate authentication signature (example in Python)
python3 << 'EOF'
import hmac, hashlib, time, json

secret = "your-secret-token"
timestamp = str(int(time.time()))
body = json.dumps({"path": "/home/omar"})
signature = hmac.new(secret.encode(), f"{timestamp}:{body}".encode(), hashlib.sha256).hexdigest()

print(f"Authorization: Bearer {signature}")
print(f"X-Timestamp: {timestamp}")
print(f"Body: {body}")
EOF
```

## 🔒 Security Features

### Authentication
- **HMAC-SHA256 signatures** prevent request tampering
- **Timestamp validation** prevents replay attacks (5-minute window)
- **Secret token** stored securely in `~/.laptop-relay-secret`

### Path Restrictions
- **Allowed Paths:** `/home/omar`, `/mnt`, `/media`
- **Blocked Paths:** `.ssh`, `.gnupg`, `Private`, `secrets`
- All paths validated before access

### Command Restrictions
- Only whitelisted commands allowed: `ls`, `pwd`, `whoami`, `uname`, `df`, `du`, `find`, `grep`, `cat`, `head`, `tail`
- No shell injection possible
- 30-second timeout on all commands

### Network Security
- Flask server binds to `127.0.0.1` only (localhost)
- Exposed via Cloudflare Tunnel (HTTPS encryption)
- No direct internet exposure of laptop

## 🛠️ Advanced Configuration

### Change Allowed Paths

Edit `scripts/laptop-relay-agent.py`:

```python
ALLOWED_PATHS = [
    '/home/omar',
    '/mnt/external-drive',
    '/media/usb',
]
```

### Change Blocked Paths

```python
BLOCKED_PATHS = [
    '.ssh',
    '.gnupg',
    'Private',
    'secrets',
    'confidential',
]
```

### Change Port

```python
app.run(host='127.0.0.1', port=9999, debug=False)
```

Then update tunnel command:
```bash
cloudflared tunnel --url http://localhost:9999
```

### Add More Allowed Commands

```python
ALLOWED_COMMANDS = ['ls', 'pwd', 'whoami', 'git', 'python3', 'node']
```

## 🔧 Troubleshooting

### Tunnel URL Changes Every Restart

**Problem:** Cloudflare free tunnels get new URLs each time.

**Solution:** Use a named tunnel (requires Cloudflare account):

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create named tunnel
cloudflared tunnel create laptop-relay

# Get tunnel credentials
cat ~/.cloudflared/<tunnel-id>.json

# Run with named tunnel
cloudflared tunnel --config ~/.cloudflared/config.yml run laptop-relay
```

### Connection Refused

**Check if relay agent is running:**
```bash
ps aux | grep laptop-relay-agent
```

**Check if tunnel is running:**
```bash
ps aux | grep cloudflared
```

**Test local connection:**
```bash
curl http://localhost:8888/health
```

### Authentication Failed

**Verify secret token matches:**
```bash
# On laptop
cat ~/.laptop-relay-secret

# In Codespace
echo $LAPTOP_RELAY_SECRET
```

**Check timestamp synchronization:**
```bash
# Ensure clocks are synchronized
timedatectl
```

### Path Not Allowed Error

**Check if path is in ALLOWED_PATHS:**
```bash
# Edit the agent file
nano scripts/laptop-relay-agent.py

# Add your path to ALLOWED_PATHS list
```

## 📊 API Reference

### Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/health` | GET | No | Health check |
| `/system_info` | POST | Yes | Get system information |
| `/list_files` | POST | Yes | List directory contents |
| `/read_file` | POST | Yes | Read file contents |
| `/search` | POST | Yes | Search for files or content |
| `/execute_command` | POST | Yes | Execute whitelisted command |

### Request/Response Examples

#### List Files
```json
// Request
{
  "path": "/home/omar/Documents"
}

// Response
{
  "success": true,
  "path": "/home/omar/Documents",
  "entries": [
    {
      "name": "report.pdf",
      "path": "/home/omar/Documents/report.pdf",
      "is_dir": false,
      "is_file": true,
      "size": 102400,
      "modified": 1705622400
    }
  ],
  "count": 1
}
```

#### Read File
```json
// Request
{
  "path": "/home/omar/.bashrc",
  "start_line": 1,
  "end_line": 50,
  "max_size": 1048576
}

// Response
{
  "success": true,
  "path": "/home/omar/.bashrc",
  "content": "# .bashrc\n...",
  "total_lines": 123,
  "start_line": 1,
  "end_line": 50,
  "size": 4096
}
```

## 🎯 Next Steps

1. ✅ **Test all endpoints** using `tsx scripts/test-laptop-bridge.ts`
2. ✅ **Integrate with AI agents** to access laptop files from Codespace
3. ✅ **Set up permanent tunnel** with Cloudflare named tunnel
4. ✅ **Add to systemd** for automatic startup on laptop boot

## 📝 Maintenance

### Stop the Agent
```bash
# Find PIDs
ps aux | grep -E "laptop-relay|cloudflared"

# Kill processes
pkill -f laptop-relay-agent
pkill cloudflared
```

### Update the Agent
```bash
cd ~/Projects/daralnas-chatgpt
git pull
~/start-laptop-relay.sh
```

### View Logs
```bash
# If using systemd
journalctl --user -u laptop-relay -f

# Or check Flask output
tail -f ~/laptop-relay.log
```

---

**Created:** January 18, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
