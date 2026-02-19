/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import keccak256 from "keccak256";

class QuranChainServer extends Server {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = process.env.API_BASE_URL || "http://localhost:3000/api") {
    super({
      name: "quranchain-mcp-server",
      version: "1.0.0",
    });
    this.apiBaseUrl = apiBaseUrl;

    this.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
  }

  private handleListTools() {
    return {
      tools: [
        {
          name: "get_verse",
          description: "Retrieve a Quran verse by Surah and Ayah numbers",
          inputSchema: {
            type: "object",
            properties: {
              surahNumber: {
                type: "number",
                description: "The Surah number (1-114)",
                minimum: 1,
                maximum: 114,
              },
              verseNumber: {
                type: "number",
                description: "The verse number within the Surah",
                minimum: 1,
              },
            },
            required: ["surahNumber", "verseNumber"],
          },
        },
        {
          name: "get_translations",
          description: "Get translations for a specific verse",
          inputSchema: {
            type: "object",
            properties: {
              verseId: {
                type: "string",
                description: "The ID of the verse to get translations for",
              },
            },
            required: ["verseId"],
          },
        },
        {
          name: "verify_hash",
          description: "Verify the blockchain hash for data integrity",
          inputSchema: {
            type: "object",
            properties: {
              data: {
                type: "object",
                description: "The data object to verify",
              },
              hash: {
                type: "string",
                description: "The expected hash value",
              },
            },
            required: ["data", "hash"],
          },
        },
        {
          name: "authenticate_user",
          description: "Authenticate a user and return a JWT token",
          inputSchema: {
            type: "object",
            properties: {
              email: {
                type: "string",
                description: "User email",
              },
              password: {
                type: "string",
                description: "User password",
              },
            },
            required: ["email", "password"],
          },
        },
      ],
    };
  }

  private async handleCallTool(request: any) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_verse":
          return await this.getVerse(args.surahNumber, args.verseNumber);
        case "get_translations":
          return await this.getTranslations(args.verseId);
        case "verify_hash":
          return await this.verifyHash(args.data, args.hash);
        case "authenticate_user":
          return await this.authenticateUser(args.email, args.password);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error.message}`
      );
    }
  }

  private async getVerse(surahNumber: number, verseNumber: number) {
    const response = await axios.get(
      `${this.apiBaseUrl}/verses/surah/${surahNumber}/ayah/${verseNumber}`
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data.data, null, 2),
        },
      ],
    };
  }

  private async getTranslations(verseId: string) {
    const response = await axios.get(
      `${this.apiBaseUrl}/translations/verse/${verseId}`
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data.data, null, 2),
        },
      ],
    };
  }

  private async verifyHash(data: any, hash: string) {
    const computedHash = "0x" + keccak256(JSON.stringify(data)).toString("hex");
    const isValid = computedHash === hash;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ isValid, computedHash }, null, 2),
        },
      ],
    };
  }

  private async authenticateUser(email: string, password: string) {
    const response = await axios.post(`${this.apiBaseUrl}/auth/login`, {
      email,
      password,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }
}

async function main() {
  const server = new QuranChainServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QuranChain MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});