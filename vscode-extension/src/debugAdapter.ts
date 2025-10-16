import * as vscode from 'vscode';
import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * MCP Debug Session Manager
 * Manages debugging sessions for MCP servers using VS Code's built-in Node.js debugging
 */
export class MCPDebugSession {
  private _session: vscode.DebugSession | undefined;
  private _serverProcess: ChildProcess | undefined;
  private _outputChannel: vscode.OutputChannel;
  private _breakpoints = new Map<string, vscode.SourceBreakpoint[]>();

  constructor(private context: vscode.ExtensionContext) {
    this._outputChannel = vscode.window.createOutputChannel('MCP Debug');
  }

  /**
   * Start a debug session for an MCP server
   */
  async startDebugSession(config: vscode.DebugConfiguration): Promise<boolean> {
    try {
      this._outputChannel.show();
      this._outputChannel.appendLine(`Starting MCP debug session: ${config.name}`);

      if (config.request === 'launch') {
        await this.launchMCPServer(config);
      }

      // Start VS Code debug session using Node.js debugger
      const nodeConfig = this.convertToNodeDebugConfig(config);
      
      const success = await vscode.debug.startDebugging(
        vscode.workspace.workspaceFolders?.[0],
        nodeConfig
      );

      if (success) {
        this._session = vscode.debug.activeDebugSession;
        this.setupDebugSessionHandlers();
        this._outputChannel.appendLine('Debug session started successfully');
        return true;
      } else {
        this._outputChannel.appendLine('Failed to start debug session');
        return false;
      }

    } catch (error) {
      this._outputChannel.appendLine(`Error starting debug session: ${error}`);
      vscode.window.showErrorMessage(`Failed to start MCP debug session: ${error}`);
      return false;
    }
  }

  /**
   * Launch MCP server process in debug mode
   */
  private async launchMCPServer(config: vscode.DebugConfiguration): Promise<void> {
    return new Promise((resolve, reject) => {
      const program = config.program;
      const args = config.args || [];
      const debugPort = config.port || 9229;
      
      // Add Node.js debug flags
      const nodeArgs = [`--inspect=${debugPort}`, program, ...args];
      
      this._outputChannel.appendLine(`Launching: node ${nodeArgs.join(' ')}`);
      
      this._serverProcess = spawn('node', nodeArgs, {
        cwd: config.cwd,
        env: {
          ...process.env,
          ...config.env,
          NODE_ENV: 'development',
          MCP_DEBUG: 'true'
        }
      });

      this._serverProcess.stdout?.on('data', (data) => {
        this._outputChannel.append(data.toString());
      });

      this._serverProcess.stderr?.on('data', (data) => {
        this._outputChannel.append(data.toString());
      });

      this._serverProcess.on('error', (error) => {
        this._outputChannel.appendLine(`Server process error: ${error.message}`);
        reject(error);
      });

      this._serverProcess.on('exit', (code, signal) => {
        this._outputChannel.appendLine(`Server process exited with code ${code}, signal ${signal}`);
      });

      // Wait for server to be ready for debugging
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  /**
   * Convert MCP debug config to Node.js debug config
   */
  private convertToNodeDebugConfig(config: vscode.DebugConfiguration): vscode.DebugConfiguration {
    return {
      type: 'node',
      request: config.request === 'launch' ? 'attach' : 'attach', // Always attach to the process we launched
      name: `${config.name} (Node.js)`,
      port: config.port || 9229,
      address: config.host || 'localhost',
      localRoot: config.cwd || '${workspaceFolder}',
      remoteRoot: config.cwd || '${workspaceFolder}',
      sourceMaps: true,
      outFiles: ['${workspaceFolder}/**/*.js'],
      skipFiles: [
        '<node_internals>/**',
        'node_modules/**'
      ],
      trace: config.trace || false,
      console: config.console || 'integratedTerminal'
    };
  }

  /**
   * Setup debug session event handlers
   */
  private setupDebugSessionHandlers(): void {
    if (!this._session) return;

    // Listen for debug session events
    const sessionStarted = vscode.debug.onDidStartDebugSession((session) => {
      if (session === this._session) {
        this._outputChannel.appendLine('Debug session connected');
        this.onSessionStarted(session);
      }
    });

    const sessionTerminated = vscode.debug.onDidTerminateDebugSession((session) => {
      if (session === this._session) {
        this._outputChannel.appendLine('Debug session terminated');
        this.onSessionTerminated(session);
        sessionStarted.dispose();
        sessionTerminated.dispose();
      }
    });

    this.context.subscriptions.push(sessionStarted, sessionTerminated);
  }

  /**
   * Handle debug session started
   */
  private onSessionStarted(session: vscode.DebugSession): void {
    // Add MCP-specific debugging features
    this.setupMCPDebugging(session);
  }

  /**
   * Handle debug session terminated
   */
  private onSessionTerminated(session: vscode.DebugSession): void {
    if (this._serverProcess && !this._serverProcess.killed) {
      this._serverProcess.kill();
    }
    this._session = undefined;
    this._serverProcess = undefined;
  }

  /**
   * Setup MCP-specific debugging features
   */
  private setupMCPDebugging(session: vscode.DebugSession): void {
    // Register MCP tool debugging commands
    const commands = [
      vscode.commands.registerCommand('mcp-agentify.debug.inspectTool', (toolName: string) => {
        this.inspectMCPTool(toolName);
      }),
      vscode.commands.registerCommand('mcp-agentify.debug.listTools', () => {
        this.listMCPTools();
      }),
      vscode.commands.registerCommand('mcp-agentify.debug.callTool', (toolName: string, args: any) => {
        this.callMCPTool(toolName, args);
      }),
      vscode.commands.registerCommand('mcp-agentify.debug.inspectContext', () => {
        this.inspectMCPContext();
      })
    ];

    commands.forEach(cmd => this.context.subscriptions.push(cmd));

    // Setup MCP debugging UI
    this.createMCPDebugView();
  }

  /**
   * Inspect MCP tool execution
   */
  private async inspectMCPTool(toolName: string): Promise<void> {
    if (!this._session) return;

    try {
      // Evaluate tool in debug context
      const result = await this._session.customRequest('evaluate', {
        expression: `JSON.stringify(this.tools?.${toolName} || 'Tool not found')`,
        context: 'repl'
      });

      this._outputChannel.appendLine(`Tool ${toolName}: ${result.result}`);
      
      // Show tool details in a webview
      this.showToolDetails(toolName, result.result);
      
    } catch (error) {
      this._outputChannel.appendLine(`Error inspecting tool ${toolName}: ${error}`);
    }
  }

  /**
   * List all available MCP tools
   */
  private async listMCPTools(): Promise<void> {
    if (!this._session) return;

    try {
      const result = await this._session.customRequest('evaluate', {
        expression: 'Object.keys(this.tools || {})',
        context: 'repl'
      });

      this._outputChannel.appendLine(`Available MCP Tools: ${result.result}`);
      
      // Show tools in quick pick
      const tools = JSON.parse(result.result);
      if (tools.length > 0) {
        const selected = await vscode.window.showQuickPick(tools, {
          placeHolder: 'Select a tool to inspect'
        });
        
        if (selected) {
          this.inspectMCPTool(selected);
        }
      }
      
    } catch (error) {
      this._outputChannel.appendLine(`Error listing tools: ${error}`);
    }
  }

  /**
   * Call MCP tool with arguments
   */
  private async callMCPTool(toolName: string, args: any): Promise<void> {
    if (!this._session) return;

    try {
      const argsStr = JSON.stringify(args);
      const expression = `this.tools?.${toolName}?.call(${argsStr})`;
      
      const result = await this._session.customRequest('evaluate', {
        expression: expression,
        context: 'repl'
      });

      this._outputChannel.appendLine(`Tool ${toolName} result: ${result.result}`);
      
    } catch (error) {
      this._outputChannel.appendLine(`Error calling tool ${toolName}: ${error}`);
    }
  }

  /**
   * Inspect MCP context
   */
  private async inspectMCPContext(): Promise<void> {
    if (!this._session) return;

    try {
      const contextResult = await this._session.customRequest('evaluate', {
        expression: 'JSON.stringify({ serverInfo: this.serverInfo, capabilities: this.capabilities }, null, 2)',
        context: 'repl'
      });

      this._outputChannel.appendLine(`MCP Context: ${contextResult.result}`);
      
      // Show context in a document
      const doc = await vscode.workspace.openTextDocument({
        content: contextResult.result,
        language: 'json'
      });
      
      await vscode.window.showTextDocument(doc);
      
    } catch (error) {
      this._outputChannel.appendLine(`Error inspecting MCP context: ${error}`);
    }
  }

  /**
   * Show tool details in webview
   */
  private showToolDetails(toolName: string, toolData: string): void {
    const panel = vscode.window.createWebviewPanel(
      'mcpTool',
      `MCP Tool: ${toolName}`,
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    panel.webview.html = this.getToolDetailsHTML(toolName, toolData);
  }

  /**
   * Get HTML content for tool details webview
   */
  private getToolDetailsHTML(toolName: string, toolData: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Tool: ${toolName}</title>
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
          }
          .tool-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .tool-icon {
            font-size: 24px;
            margin-right: 10px;
          }
          .tool-data {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
          }
          .actions {
            margin-top: 20px;
            display: flex;
            gap: 10px;
          }
          .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
          }
          .btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="tool-header">
          <span class="tool-icon">🔧</span>
          <h1>MCP Tool: ${toolName}</h1>
        </div>
        
        <div class="tool-data">${toolData}</div>
        
        <div class="actions">
          <button class="btn" onclick="callTool()">Call Tool</button>
          <button class="btn" onclick="setBreakpoint()">Set Breakpoint</button>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          function callTool() {
            const args = prompt('Enter arguments (JSON format):');
            if (args) {
              try {
                const parsed = JSON.parse(args);
                vscode.postMessage({
                  command: 'callTool',
                  toolName: '${toolName}',
                  args: parsed
                });
              } catch (e) {
                alert('Invalid JSON format');
              }
            }
          }
          
          function setBreakpoint() {
            vscode.postMessage({
              command: 'setBreakpoint',
              toolName: '${toolName}'
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Create MCP debugging view in sidebar
   */
  private createMCPDebugView(): void {
    // This would be implemented as a TreeDataProvider
    // For now, we'll add debug commands to the command palette
    this._outputChannel.appendLine('MCP debugging features activated');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this._serverProcess && !this._serverProcess.killed) {
      this._serverProcess.kill();
    }
    this._outputChannel.dispose();
  }
}