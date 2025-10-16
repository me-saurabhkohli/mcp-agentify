import * as vscode from 'vscode';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import * as http from 'http';
import { randomUUID } from 'node:crypto';

// Import tool implementations
import { breakpointTools } from './tools/breakpointTools';
import { debugControlTools } from './tools/debugControlTools';
import { stateInspectionTools } from './tools/stateInspectionTools';
import { configurationTools } from './tools/configurationTools';

// Import resource implementations
import { debugResources } from './resources/debugResources';

/**
 * MCP Debug Server - HTTP-based MCP server running inside VS Code extension
 * Exposes debugging capabilities via MCP protocol for AI tools
 */
export class MCPDebugServer {
  private mcpServer: McpServer;
  private app: express.Application;
  private httpServer: http.Server | undefined;
  private port: number = 8890;
  private isRunning: boolean = false;
  private transport!: StreamableHTTPServerTransport;

  constructor(private context: vscode.ExtensionContext) {
    this.mcpServer = new McpServer({
      name: 'mcp-agentify-debug',
      version: '1.0.0'
    });
    
    this.app = express();
    this.setupRoutes();
    this.registerTools();
    this.registerResources();
  }

  /**
   * Setup Express routes and middleware
   */
  private setupRoutes(): void {
    // CORS middleware
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-id');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      
      next();
    });

    // JSON body parser
    this.app.use(express.json({ limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (req: express.Request, res: express.Response) => {
      res.json({
        status: 'healthy',
        server: 'mcp-agentify-debug',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Status endpoint
    this.app.get('/status', (req: express.Request, res: express.Response) => {
      res.json({
        isRunning: this.isRunning,
        port: this.port,
        activeTransports: this.transport ? 1 : 0,
        timestamp: new Date().toISOString()
      });
    });

    // Create a single transport for the MCP server
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        console.log(`MCP session initialized: ${sessionId}`);
      },
      onsessionclosed: (sessionId: string) => {
        console.log(`MCP session closed: ${sessionId}`);
      }
    });

    // Connect MCP server to transport
    this.mcpServer.connect(this.transport);

    // MCP HTTP endpoint
    this.app.post('/mcp', async (req: express.Request, res: express.Response) => {
      try {
        await this.transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('MCP request error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  /**
   * Start HTTP server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('MCP Debug Server is already running');
    }

    try {
      this.httpServer = this.app.listen(this.port, () => {
        console.log(`MCP Debug Server started on port ${this.port}`);
      });

      this.httpServer?.on('error', (error: any) => {
        console.error('HTTP server error:', error);
        throw error;
      });

      this.isRunning = true;
    } catch (error) {
      console.error('Failed to start MCP Debug Server:', error);
      throw error;
    }
  }

  /**
   * Stop HTTP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      // Close transport
      if (this.transport) {
        this.transport.close();
      }

      this.isRunning = false;
      console.log('MCP Debug Server stopped');
    } catch (error) {
      console.error('Error stopping MCP Debug Server:', error);
      throw error;
    }
  }

  /**
   * Register MCP tools from imported modules
   */
  private registerTools(): void {
    const allTools = {
      ...breakpointTools,
      ...debugControlTools,
      ...stateInspectionTools,
      ...configurationTools
    };

    for (const [toolName, toolDef] of Object.entries(allTools)) {
      const toolDefTyped = toolDef as any;
      
      this.mcpServer.registerTool(toolName, {
        title: toolDefTyped.config?.title || toolName,
        description: toolDefTyped.description || `${toolName} debugging tool`,
        inputSchema: toolDefTyped.inputSchema || { type: 'object', properties: {} }
      }, async (args: any, extra: any) => {
        try {
          const result = await toolDefTyped.handler(args);
          return {
            content: [
              {
                type: 'text' as const,
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      });
    }
  }

  /**
   * Register MCP resources from imported modules
   */
  private registerResources(): void {
    for (const [resourceName, resourceDef] of Object.entries(debugResources)) {
      const resourceDefTyped = resourceDef as any;
      const uri = resourceDefTyped.uri || `debug://${resourceName}`;
      
      this.mcpServer.registerResource(resourceName, uri, {
        title: resourceDefTyped.config?.title || resourceName,
        description: resourceDefTyped.description || `${resourceName} debugging resource`,
        mimeType: resourceDefTyped.config?.mimeType || 'application/json'
      }, async (uri: URL) => {
        try {
          const result = await resourceDefTyped.handler(uri);
          return result;
        } catch (error) {
          throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }
  }

  /**
   * Get server status information
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      port: this.port,
      activeTransports: this.transport ? 1 : 0,
      serverInfo: {
        name: 'mcp-agentify-debug',
        version: '1.0.0'
      },
      endpoints: [
        { path: '/health', method: 'GET' },
        { path: '/status', method: 'GET' },
        { path: '/mcp', method: 'POST' }
      ],
      timestamp: new Date().toISOString()
    };
  }
}