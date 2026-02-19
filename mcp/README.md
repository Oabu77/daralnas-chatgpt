<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

# QuranChain MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with the QuranChain-OS API.

## Features

- **get_verse**: Retrieve Quran verses by Surah and Ayah numbers
- **get_translations**: Get translations for specific verses
- **verify_hash**: Verify blockchain hashes for data integrity
- **authenticate_user**: User authentication and authorization

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the server:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Configuration

The server connects to the QuranChain-OS API at `http://localhost:5000/api` by default. You can configure this by setting the `API_BASE_URL` environment variable.

## Tools

### get_verse
Retrieves a Quran verse by Surah and Ayah numbers.

**Parameters:**
- `surahNumber` (number): The Surah number (1-114)
- `verseNumber` (number): The verse number within the Surah

### get_translations
Gets translations for a specific verse.

**Parameters:**
- `verseId` (string): The ID of the verse to get translations for

### verify_hash
Verifies the blockchain hash for data integrity using Keccak-256.

**Parameters:**
- `data` (object): The data object to verify
- `hash` (string): The expected hash value

### authenticate_user
Authenticates a user and returns a JWT token.

**Parameters:**
- `email` (string): User email
- `password` (string): User password

## Usage

This MCP server communicates via stdio and can be integrated with MCP-compatible clients like Claude Desktop or other AI assistants that support the Model Context Protocol.</content>
<parameter name="filePath">/home/omar/Desktop/QuranChain-OS/mcp/README.md