/**
 * Laptop Bridge Client - Communicates with Laptop Relay Agent
 * Sends requests from Codespace to omar@omar-GL75-Leopard-10SDK
 */

import * as crypto from 'crypto';

export interface LaptopRelayConfig {
  tunnelUrl: string;
  secretToken: string;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  home: string;
  cwd: string;
  user: string;
  python_version: string;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
  size: number;
  modified: number;
}

export interface ListFilesResponse {
  success: boolean;
  path?: string;
  entries?: FileEntry[];
  count?: number;
  error?: string;
}

export interface ReadFileResponse {
  success: boolean;
  path?: string;
  content?: string;
  total_lines?: number;
  start_line?: number;
  end_line?: number;
  size?: number;
  error?: string;
}

export interface SearchResponse {
  success: boolean;
  results?: string[];
  count?: number;
  truncated?: boolean;
  error?: string;
}

export interface ExecuteCommandResponse {
  success: boolean;
  stdout?: string;
  stderr?: string;
  returncode?: number;
  error?: string;
}

export class LaptopBridgeClient {
  private config: LaptopRelayConfig;
  private baseUrl: string;

  constructor(config: LaptopRelayConfig) {
    this.config = config;
    this.baseUrl = config.tunnelUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Generate HMAC authentication signature
   */
  private generateAuth(body: string): { signature: string; timestamp: string } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${timestamp}:${body}`;
    const signature = crypto
      .createHmac('sha256', this.config.secretToken)
      .update(payload)
      .digest('hex');

    return { signature, timestamp };
  }

  /**
   * Make authenticated request to relay agent
   */
  private async request<T>(
    endpoint: string,
    data: any = {}
  ): Promise<T> {
    const body = JSON.stringify(data);
    const { signature, timestamp } = this.generateAuth(body);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signature}`,
        'X-Timestamp': timestamp,
      },
      body,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if relay agent is online
   */
  async health(): Promise<{ status: string; hostname: string; platform: string; timestamp: number }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const result = await this.request<{ success: boolean; data?: SystemInfo; error?: string }>('/system_info');
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get system info');
    }

    return result.data;
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<FileEntry[]> {
    const result = await this.request<ListFilesResponse>('/list_files', { path });
    
    if (!result.success || !result.entries) {
      throw new Error(result.error || 'Failed to list files');
    }

    return result.entries;
  }

  /**
   * Read file contents
   */
  async readFile(
    path: string,
    startLine?: number,
    endLine?: number,
    maxSize?: number
  ): Promise<string> {
    const result = await this.request<ReadFileResponse>('/read_file', {
      path,
      start_line: startLine,
      end_line: endLine,
      max_size: maxSize,
    });

    if (!result.success || !result.content) {
      throw new Error(result.error || 'Failed to read file');
    }

    return result.content;
  }

  /**
   * Search for files or content
   */
  async search(
    searchPath: string,
    pattern?: string,
    content?: string,
    maxResults?: number
  ): Promise<string[]> {
    const result = await this.request<SearchResponse>('/search', {
      path: searchPath,
      pattern,
      content,
      max_results: maxResults,
    });

    if (!result.success || !result.results) {
      throw new Error(result.error || 'Search failed');
    }

    return result.results;
  }

  /**
   * Execute a command on the laptop
   */
  async executeCommand(
    command: string,
    cwd?: string,
    timeout?: number
  ): Promise<{ stdout: string; stderr: string; returncode: number }> {
    const result = await this.request<ExecuteCommandResponse>('/execute_command', {
      command,
      cwd,
      timeout,
    });

    if (!result.success || result.stdout === undefined) {
      throw new Error(result.error || 'Command execution failed');
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr || '',
      returncode: result.returncode || 0,
    };
  }

  /**
   * Deploy to laptop via Bluetooth
   */
  async bluetoothDeploy(): Promise<{ success: boolean; stdout: string; stderr: string }> {
    const result = await this.request<ExecuteCommandResponse>('/bluetooth_deploy', {});

    return {
      success: result.success || false,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  }

  /**
   * Get full file path inventory from laptop
   */
  async getFileInventory(rootPath: string): Promise<string[]> {
    const allFiles: string[] = [];
    
    const traverse = async (path: string, depth: number = 0) => {
      if (depth > 10) return; // Prevent infinite recursion

      try {
        const entries = await this.listFiles(path);
        
        for (const entry of entries) {
          allFiles.push(entry.path);
          
          if (entry.is_dir && !entry.name.startsWith('.')) {
            await traverse(entry.path, depth + 1);
          }
        }
      } catch (error) {
        console.error(`Error traversing ${path}:`, error);
      }
    };

    await traverse(rootPath);
    return allFiles;
  }

  /**
   * Find files matching a pattern
   */
  async findFiles(rootPath: string, pattern: string): Promise<string[]> {
    return this.search(rootPath, pattern);
  }

  /**
   * Search for content in files
   */
  async searchContent(rootPath: string, searchTerm: string): Promise<string[]> {
    return this.search(rootPath, undefined, searchTerm);
  }
}

/**
 * Create a laptop bridge client from environment variables
 */
export function createLaptopBridge(): LaptopBridgeClient | null {
  const tunnelUrl = process.env.LAPTOP_RELAY_URL;
  const secretToken = process.env.LAPTOP_RELAY_SECRET;

  if (!tunnelUrl || !secretToken) {
    console.warn('Laptop bridge not configured. Set LAPTOP_RELAY_URL and LAPTOP_RELAY_SECRET');
    return null;
  }

  return new LaptopBridgeClient({ tunnelUrl, secretToken });
}

/**
 * Test laptop connectivity
 */
export async function testLaptopConnection(): Promise<boolean> {
  const bridge = createLaptopBridge();
  
  if (!bridge) {
    console.error('❌ Laptop bridge not configured');
    return false;
  }

  try {
    const health = await bridge.health();
    console.log('✅ Laptop connected:', health.hostname);
    
    const info = await bridge.getSystemInfo();
    console.log('📊 System Info:', info);
    
    return true;
  } catch (error) {
    console.error('❌ Laptop connection failed:', error);
    return false;
  }
}
