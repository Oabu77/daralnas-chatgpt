#!/usr/bin/env python3
"""
Bluetooth Command Sender - Send deployment commands via Bluetooth
Runs on laptop relay agent to execute commands on paired Bluetooth devices
"""

import subprocess
import json
import sys
import time

def find_paired_devices():
    """Find all paired Bluetooth devices"""
    try:
        result = subprocess.run(
            ['bluetoothctl', 'paired-devices'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        devices = []
        for line in result.stdout.strip().split('\n'):
            if line.startswith('Device '):
                parts = line.split()
                if len(parts) >= 3:
                    mac = parts[1]
                    name = ' '.join(parts[2:])
                    devices.append({'mac': mac, 'name': name})
        
        return devices
    except Exception as e:
        print(f"Error finding devices: {e}")
        return []

def send_bluetooth_command(device_mac, command):
    """Send command to Bluetooth device via rfcomm"""
    try:
        # Connect via rfcomm
        print(f"📡 Connecting to {device_mac}...")
        
        # Bind rfcomm channel
        bind_result = subprocess.run(
            ['sudo', 'rfcomm', 'bind', '0', device_mac, '1'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if bind_result.returncode != 0:
            print(f"❌ Failed to bind: {bind_result.stderr}")
            return False
        
        print(f"✅ Connected on /dev/rfcomm0")
        
        # Send command
        print(f"📤 Sending command: {command[:50]}...")
        with open('/dev/rfcomm0', 'w') as bt:
            bt.write(command + '\n')
            bt.flush()
        
        time.sleep(1)
        
        # Try to read response
        try:
            with open('/dev/rfcomm0', 'r') as bt:
                response = bt.read(1024)
                print(f"📥 Response: {response}")
        except:
            print("No response available")
        
        # Release rfcomm
        subprocess.run(['sudo', 'rfcomm', 'release', '0'], timeout=5)
        
        return True
        
    except Exception as e:
        print(f"❌ Error sending command: {e}")
        # Try to clean up
        subprocess.run(['sudo', 'rfcomm', 'release', '0'], stderr=subprocess.DEVNULL)
        return False

def send_via_ssh_over_bluetooth(device_name, command):
    """Send command via SSH over Bluetooth PAN (Personal Area Network)"""
    try:
        # This assumes Bluetooth PAN is set up
        print(f"🔗 Attempting SSH over Bluetooth to {device_name}...")
        
        # Try to resolve device by name
        # Bluetooth devices often get .local mDNS names
        ssh_target = f"{device_name}.local"
        
        result = subprocess.run(
            ['ssh', '-o', 'ConnectTimeout=5', ssh_target, command],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            print(f"✅ Command executed successfully")
            print(f"Output: {result.stdout}")
            return True
        else:
            print(f"❌ SSH failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error with SSH: {e}")
        return False

def deploy_via_bluetooth():
    """Deploy laptop relay agent via Bluetooth"""
    
    print("=" * 80)
    print("📡 BLUETOOTH DEPLOYMENT SYSTEM")
    print("=" * 80)
    print()
    
    # Find paired devices
    print("🔍 Scanning for paired Bluetooth devices...")
    devices = find_paired_devices()
    
    if not devices:
        print("❌ No paired Bluetooth devices found")
        print()
        print("Please pair your laptop first:")
        print("  1. Enable Bluetooth on laptop")
        print("  2. Run: bluetoothctl")
        print("  3. Type: scan on")
        print("  4. Type: pair <MAC_ADDRESS>")
        print("  5. Type: trust <MAC_ADDRESS>")
        return False
    
    print(f"✅ Found {len(devices)} paired device(s):")
    for i, dev in enumerate(devices, 1):
        print(f"  {i}. {dev['name']} ({dev['mac']})")
    
    print()
    
    # Look for GL75-Leopard laptop
    target_device = None
    for dev in devices:
        if 'GL75' in dev['name'] or 'Leopard' in dev['name'] or 'omar' in dev['name'].lower():
            target_device = dev
            print(f"🎯 Found target laptop: {dev['name']}")
            break
    
    if not target_device:
        print("⚠️  GL75-Leopard laptop not found in paired devices")
        print("Which device should I use? (Enter number or 0 to cancel): ")
        try:
            choice = int(input())
            if choice == 0 or choice > len(devices):
                return False
            target_device = devices[choice - 1]
        except:
            return False
    
    print()
    print(f"📱 Target: {target_device['name']} ({target_device['mac']})")
    print()
    
    # Deployment command
    deploy_cmd = """cd ~/Projects && \\
(git clone https://github.com/Oabu77/daralnas-chatgpt.git 2>/dev/null || (cd daralnas-chatgpt && git pull)) && \\
cd daralnas-chatgpt && \\
chmod +x scripts/setup-laptop-relay.sh && \\
./scripts/setup-laptop-relay.sh && \\
nohup ~/start-laptop-relay.sh > ~/laptop-relay.log 2>&1 &
"""
    
    print("📋 Deployment command:")
    print(deploy_cmd)
    print()
    
    # Try SSH over Bluetooth first (most reliable)
    print("🔄 Method 1: SSH over Bluetooth PAN...")
    if send_via_ssh_over_bluetooth(target_device['name'], deploy_cmd):
        print()
        print("✅ DEPLOYMENT SUCCESSFUL VIA BLUETOOTH")
        return True
    
    # Try direct rfcomm serial
    print()
    print("🔄 Method 2: Direct Bluetooth serial (rfcomm)...")
    if send_bluetooth_command(target_device['mac'], deploy_cmd):
        print()
        print("✅ DEPLOYMENT SUCCESSFUL VIA BLUETOOTH SERIAL")
        return True
    
    print()
    print("❌ All Bluetooth methods failed")
    print()
    print("💡 Alternative: Copy this command and run manually on laptop:")
    print()
    print(deploy_cmd)
    
    return False

if __name__ == '__main__':
    success = deploy_via_bluetooth()
    sys.exit(0 if success else 1)
