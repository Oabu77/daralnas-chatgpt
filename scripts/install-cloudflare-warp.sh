#!/usr/bin/env bash
set -euo pipefail

# This script installs the Cloudflare WARP (cloudflare-warp) client on Debian/Ubuntu systems.
# It adds the official Cloudflare package repository and installs the warp client via apt.

if ! command -v sudo >/dev/null 2>&1; then
        echo "[ERROR] sudo is required to install packages." >&2
        exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
        echo "[ERROR] curl is required to download the Cloudflare GPG key." >&2
        exit 1
fi

if ! command -v gpg >/dev/null 2>&1; then
        echo "[ERROR] gpg is required to import the Cloudflare GPG key." >&2
        exit 1
fi

release_codename=$(lsb_release -cs)

# Import the Cloudflare WARP GPG key.
sudo curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg \
        | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg

# Add the Cloudflare WARP apt repository.
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ ${release_codename} main" \
        | sudo tee /etc/apt/sources.list.d/cloudflare-client.list >/dev/null

# Update package index and install the WARP client.
sudo apt-get update
sudo apt-get install -y cloudflare-warp

echo "Cloudflare WARP installation complete."
