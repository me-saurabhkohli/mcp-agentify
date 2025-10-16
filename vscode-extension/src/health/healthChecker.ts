import { Logger } from '../utils/logger';
import * as http from 'http';
import * as https from 'https';

/**
 * Health checker service for monitoring system status
 */
export class HealthChecker {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Run complete health check
   */
  async runCompleteHealthCheck(options?: {
    onProgress?: (message: string, increment: number) => void;
  }): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const checks = [
      { name: 'Node.js Runtime', check: () => this.checkNodeJs() },
      { name: 'VS Code Environment', check: () => this.checkVSCodeEnvironment() },
      { name: 'Workspace', check: () => this.checkWorkspace() },
      { name: 'MCP Server', check: () => this.checkMCPServer() },
      { name: 'CLI Tools', check: () => this.checkCLITools() },
      { name: 'Network Connectivity', check: () => this.checkNetworkConnectivity() },
      { name: 'File Permissions', check: () => this.checkFilePermissions() }
    ];

    for (let i = 0; i < checks.length; i++) {
      const { name, check } = checks[i];
      const progress = ((i + 1) / checks.length) * 100;
      
      options?.onProgress?.(`Checking ${name}...`, progress);
      
      try {
        const result = await check();
        results.push(result);
        this.logger.debug(`Health check passed: ${name}`, result);
      } catch (error) {
        const failResult: HealthCheckResult = {
          name,
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        };
        results.push(failResult);
        this.logger.warn(`Health check failed: ${name}`, error);
      }
    }

    options?.onProgress?.('Health check complete', 100);
    return results;
  }

  /**
   * Check individual component health
   */
  async checkComponent(component: string): Promise<HealthCheckResult> {
    switch (component) {
      case 'nodejs':
        return this.checkNodeJs();
      case 'vscode':
        return this.checkVSCodeEnvironment();
      case 'workspace':
        return this.checkWorkspace();
      case 'mcp-server':
        return this.checkMCPServer();
      case 'cli':
        return this.checkCLITools();
      case 'network':
        return this.checkNetworkConnectivity();
      case 'permissions':
        return this.checkFilePermissions();
      default:
        throw new Error(`Unknown component: ${component}`);
    }
  }

  private async checkNodeJs(): Promise<HealthCheckResult> {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    if (majorVersion >= 18) {
      return {
        name: 'Node.js Runtime',
        status: 'pass',
        message: `Node.js ${version} is supported`,
        details: { version, majorVersion },
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        name: 'Node.js Runtime',
        status: 'fail',
        message: `Node.js ${version} is outdated. Requires Node.js 18+`,
        details: { version, majorVersion, required: '18+' },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkVSCodeEnvironment(): Promise<HealthCheckResult> {
    try {
      const vscode = require('vscode');
      const version = vscode.version;
      
      return {
        name: 'VS Code Environment',
        status: 'pass',
        message: `VS Code ${version} environment is healthy`,
        details: { version },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'VS Code Environment',
        status: 'fail',
        message: 'Failed to load VS Code API',
        details: { error: String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkWorkspace(): Promise<HealthCheckResult> {
    const vscode = require('vscode');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (workspaceFolders && workspaceFolders.length > 0) {
      return {
        name: 'Workspace',
        status: 'pass',
        message: `${workspaceFolders.length} workspace folder(s) available`,
        details: { 
          count: workspaceFolders.length,
          folders: workspaceFolders.map((f: any) => f.uri.fsPath)
        },
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        name: 'Workspace',
        status: 'warn',
        message: 'No workspace folders open',
        details: { count: 0 },
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkMCPServer(): Promise<HealthCheckResult> {
    try {
      const responseData = await this.makeHttpRequest('http://localhost:8890/health');

      return {
        name: 'MCP Server',
        status: 'pass',
        message: 'MCP server is responding',
        timestamp: new Date().toISOString(),
        details: {
          url: 'http://localhost:8890/health',
          statusCode: responseData.statusCode,
          responseTime: responseData.responseTime,
          version: responseData.data?.version || 'unknown'
        }
      };
    } catch (error) {
      return {
        name: 'MCP Server',
        status: 'fail',
        message: 'MCP server is not responding',
        timestamp: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          url: 'http://localhost:8890/health'
        }
      };
    }
  }

  private async checkCLITools(): Promise<HealthCheckResult> {
    // This would need to be implemented based on actual CLI availability
    // For now, return a placeholder result
    return {
      name: 'CLI Tools',
      status: 'pass',
      message: 'CLI tools check not implemented yet',
      timestamp: new Date().toISOString()
    };
  }

  private async checkNetworkConnectivity(): Promise<HealthCheckResult> {
    try {
      // Check if we can reach npm registry (for CLI tool installation)
      const responseData = await this.makeHttpRequest('https://registry.npmjs.org/', { method: 'HEAD' });

      if (responseData.statusCode === 200) {
        return {
          name: 'Network Connectivity',
          status: 'pass',
          message: 'Network connectivity is healthy',
          details: { npmRegistry: 'accessible', responseTime: responseData.responseTime },
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          name: 'Network Connectivity',
          status: 'warn',
          message: 'Limited network connectivity',
          details: { npmRegistry: 'inaccessible', statusCode: responseData.statusCode },
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        name: 'Network Connectivity',
        status: 'fail',
        message: 'Network connectivity issues detected',
        details: { error: String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Helper method to make HTTP requests using Node.js modules
   */
  private makeHttpRequest(url: string, options?: { method?: string }): Promise<{ statusCode: number; responseTime: number; data?: any }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options?.method || 'GET',
        timeout: 5000
      };

      const req = httpModule.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({
              statusCode: res.statusCode || 0,
              responseTime,
              data: parsedData
            });
          } catch {
            resolve({
              statusCode: res.statusCode || 0,
              responseTime,
              data: data
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  private async checkFilePermissions(): Promise<HealthCheckResult> {
    const fs = require('fs');
    const path = require('path');
    const vscode = require('vscode');
    
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return {
          name: 'File Permissions',
          status: 'warn',
          message: 'No workspace folder to check permissions',
          timestamp: new Date().toISOString()
        };
      }

      const testPath = path.join(workspaceFolder.uri.fsPath, '.mcp-agentify-test');
      
      // Try to write a test file
      fs.writeFileSync(testPath, 'test');
      
      // Try to read it back
      const content = fs.readFileSync(testPath, 'utf8');
      
      // Clean up
      fs.unlinkSync(testPath);
      
      if (content === 'test') {
        return {
          name: 'File Permissions',
          status: 'pass',
          message: 'File system permissions are adequate',
          details: { testPath },
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          name: 'File Permissions',
          status: 'fail',
          message: 'File system read/write test failed',
          details: { testPath },
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        name: 'File Permissions',
        status: 'fail',
        message: 'Insufficient file system permissions',
        details: { error: String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
  timestamp: string;
}