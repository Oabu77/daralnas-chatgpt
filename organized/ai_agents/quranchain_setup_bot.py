import os
import subprocess
import socket
import requests
import time

def check_dependency(command, name):
    """Check if a system dependency is installed."""
    try:
        subprocess.run([command, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"[+] {name} is installed.")
    except FileNotFoundError:
        print(f"[-] {name} is not installed. Please install {name}.")
        exit(1)

def check_port(port):
    """Check if a given port is open."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0

def start_quranchain_server():
    """Start QuranChain server process if not running."""
    if check_port(8545):
        print("[+] QuranChain server is already running on port 8545.")
    else:
        print("[*] Starting QuranChain server...")
        try:
            subprocess.Popen(["quranchain-node", "--config", "quranchain-config.json"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            time.sleep(5)
            if check_port(8545):
                print("[+] QuranChain server started successfully.")
            else:
                print("[-] Failed to start QuranChain server. Check logs.")
                exit(1)
        except Exception as e:
            print(f"[-] Error starting QuranChain server: {e}")
            exit(1)

def check_dns(domain):
    """Check if the QuranChain.net domain resolves correctly."""
    try:
        ip = socket.gethostbyname(domain)
        print(f"[+] {domain} resolves to {ip}.")
    except socket.gaierror:
        print(f"[-] DNS resolution failed for {domain}. Please configure DNS.")
        exit(1)

def check_web_service():
    """Check if QuranChain web service is running."""
    url = "https://quranchain.net"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("[+] QuranChain web service is running.")
        else:
            print(f"[-] QuranChain web service returned {response.status_code}.")
    except requests.ConnectionError:
        print("[-] QuranChain web service is not running. Check the server setup.")

def main():
    print("\n--- QuranChain Ecosystem Server Setup Bot ---\n")
    # Step 1: Check required dependencies
    check_dependency("docker", "Docker")
    check_dependency("node", "Node.js")
    check_dependency("python3", "Python")
    
    # Step 2: Start QuranChain Node Server
    start_quranchain_server()
    
    # Step 3: Check DNS for QuranChain.net
    check_dns("QuranChain.net")
    
    # Step 4: Verify Web Service Availability
    check_web_service()

    print("\n[+] QuranChain Ecosystem setup is complete and verified.\n")

if __name__ == "__main__":
    main()

