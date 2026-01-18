#!/usr/bin/env python3
"""
Laptop Relay Agent - Bridge between Codespace and Local Machine
Runs on omar@omar-GL75-Leopard-10SDK to provide file access to remote AI agents
"""

import os
import sys
import json
import hmac
import hashlib
import time
import subprocess
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Security Configuration
SECRET_TOKEN = os.getenv('LAPTOP_RELAY_SECRET', 'CHANGE_THIS_SECRET_TOKEN_IN_PRODUCTION')
ALLOWED_PATHS = [
    '/home/omar',
    '/mnt',
    '/media',
]
BLOCKED_PATHS = [
    '.ssh',
    '.gnupg',
    'Private',
    'secrets',
]

def verify_auth(request):
    """Verify HMAC authentication"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return False
    
    token = auth_header[7:]
    timestamp = request.headers.get('X-Timestamp', '0')
    
    # Check timestamp to prevent replay attacks (5 minute window)
    if abs(time.time() - float(timestamp)) > 300:
        return False
    
    # Verify HMAC signature
    body = request.get_data()
    expected_sig = hmac.new(
        SECRET_TOKEN.encode(),
        f"{timestamp}:{body.decode()}".encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(token, expected_sig)

def is_path_allowed(path):
    """Check if path is within allowed directories and not blocked"""
    abs_path = os.path.abspath(path)
    
    # Check if path starts with allowed prefix
    if not any(abs_path.startswith(allowed) for allowed in ALLOWED_PATHS):
        return False
    
    # Check if path contains blocked components
    if any(blocked in abs_path for blocked in BLOCKED_PATHS):
        return False
    
    return True

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint (no auth required)"""
    return jsonify({
        'status': 'online',
        'hostname': os.uname().nodename,
        'platform': sys.platform,
        'timestamp': time.time()
    })

@app.route('/system_info', methods=['POST'])
def system_info():
    """Get system information"""
    if not verify_auth(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        info = {
            'hostname': os.uname().nodename,
            'platform': sys.platform,
            'home': os.path.expanduser('~'),
            'cwd': os.getcwd(),
            'user': os.getenv('USER'),
            'python_version': sys.version,
        }
        return jsonify({'success': True, 'data': info})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/list_files', methods=['POST'])
def list_files():
    """List files in a directory"""
    if not verify_auth(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    path = data.get('path', '.')
    
    if not is_path_allowed(path):
        return jsonify({'success': False, 'error': 'Path not allowed'}), 403
    
    try:
        abs_path = os.path.abspath(os.path.expanduser(path))
        if not os.path.exists(abs_path):
            return jsonify({'success': False, 'error': 'Path does not exist'}), 404
        
        if not os.path.isdir(abs_path):
            return jsonify({'success': False, 'error': 'Path is not a directory'}), 400
        
        entries = []
        for entry in os.listdir(abs_path):
            entry_path = os.path.join(abs_path, entry)
            try:
                stat = os.stat(entry_path)
                entries.append({
                    'name': entry,
                    'path': entry_path,
                    'is_dir': os.path.isdir(entry_path),
                    'is_file': os.path.isfile(entry_path),
                    'size': stat.st_size,
                    'modified': stat.st_mtime,
                })
            except:
                # Skip entries we can't stat (permissions, etc.)
                continue
        
        return jsonify({
            'success': True,
            'path': abs_path,
            'entries': entries,
            'count': len(entries)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/read_file', methods=['POST'])
def read_file():
    """Read file contents"""
    if not verify_auth(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    path = data.get('path')
    start_line = data.get('start_line', 1)
    end_line = data.get('end_line', None)
    max_size = data.get('max_size', 1024 * 1024)  # 1MB default
    
    if not path:
        return jsonify({'success': False, 'error': 'Path required'}), 400
    
    if not is_path_allowed(path):
        return jsonify({'success': False, 'error': 'Path not allowed'}), 403
    
    try:
        abs_path = os.path.abspath(os.path.expanduser(path))
        if not os.path.exists(abs_path):
            return jsonify({'success': False, 'error': 'File does not exist'}), 404
        
        if not os.path.isfile(abs_path):
            return jsonify({'success': False, 'error': 'Path is not a file'}), 400
        
        # Check file size
        file_size = os.path.getsize(abs_path)
        if file_size > max_size:
            return jsonify({'success': False, 'error': f'File too large ({file_size} bytes)'}), 413
        
        # Read file
        with open(abs_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        
        # Extract requested lines
        total_lines = len(lines)
        start_idx = max(0, start_line - 1)
        end_idx = min(total_lines, end_line) if end_line else total_lines
        
        content = ''.join(lines[start_idx:end_idx])
        
        return jsonify({
            'success': True,
            'path': abs_path,
            'content': content,
            'total_lines': total_lines,
            'start_line': start_line,
            'end_line': end_idx,
            'size': file_size
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/search', methods=['POST'])
def search():
    """Search for files or content"""
    if not verify_auth(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    search_path = data.get('path', '.')
    pattern = data.get('pattern', '*')
    content_search = data.get('content', None)
    max_results = data.get('max_results', 100)
    
    if not is_path_allowed(search_path):
        return jsonify({'success': False, 'error': 'Path not allowed'}), 403
    
    try:
        abs_path = os.path.abspath(os.path.expanduser(search_path))
        results = []
        
        # Use find command for efficiency
        if content_search:
            # Content search with grep
            cmd = ['grep', '-r', '-l', '-i', content_search, abs_path]
        else:
            # File name search with find
            cmd = ['find', abs_path, '-name', pattern, '-type', 'f']
        
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        for line in proc.stdout.strip().split('\n'):
            if line and len(results) < max_results:
                results.append(line)
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results),
            'truncated': len(results) >= max_results
        })
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Search timeout'}), 408
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/execute_command', methods=['POST'])
def execute_command():
    """Execute a shell command (restricted)"""
    if not verify_auth(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    command = data.get('command')
    cwd = data.get('cwd', None)
    timeout = data.get('timeout', 30)
    
    # Whitelist of allowed commands
    ALLOWED_COMMANDS = ['ls', 'pwd', 'whoami', 'uname', 'df', 'du', 'find', 'grep', 'cat', 'head', 'tail']
    
    if not command:
        return jsonify({'success': False, 'error': 'Command required'}), 400
    
    # Check if command is allowed
    cmd_parts = command.split()
    if not cmd_parts or cmd_parts[0] not in ALLOWED_COMMANDS:
        return jsonify({'success': False, 'error': f'Command not allowed. Allowed: {ALLOWED_COMMANDS}'}), 403
    
    try:
        proc = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        return jsonify({
            'success': True,
            'stdout': proc.stdout,
            'stderr': proc.stderr,
            'returncode': proc.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Command timeout'}), 408
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 80)
    print("🔗 LAPTOP RELAY AGENT STARTING")
    print("=" * 80)
    print(f"Hostname: {os.uname().nodename}")
    print(f"Platform: {sys.platform}")
    print(f"Python: {sys.version}")
    print(f"Secret Token: {'SET' if SECRET_TOKEN != 'CHANGE_THIS_SECRET_TOKEN_IN_PRODUCTION' else '⚠️  USING DEFAULT (INSECURE!)'}")
    print(f"Allowed Paths: {ALLOWED_PATHS}")
    print(f"Blocked Paths: {BLOCKED_PATHS}")
    print("=" * 80)
    print("\n🚀 Starting Flask server on http://127.0.0.1:8888")
    print("💡 Expose this with Cloudflare Tunnel: cloudflared tunnel --url http://localhost:8888")
    print("\n")
    
    app.run(host='127.0.0.1', port=8888, debug=False)
