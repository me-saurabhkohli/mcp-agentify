import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Debug Resources
 * Implements the 6 MCP debugging resources for read-only information access
 */

export interface MCPResource {
  description: string;
  uri?: string;
  handler: (uri: URL) => Promise<any>;
  config?: {
    title?: string;
    mimeType?: string;
  };
}

// DAP Message Logger for dap-log resource
class DAPMessageLogger {
  private static instance: DAPMessageLogger;
  private messages: any[] = [];
  private maxMessages = 1000; // Limit to prevent memory issues

  static getInstance(): DAPMessageLogger {
    if (!DAPMessageLogger.instance) {
      DAPMessageLogger.instance = new DAPMessageLogger();
    }
    return DAPMessageLogger.instance;
  }

  initialize() {
    // Register debug adapter tracker to capture DAP messages
    vscode.debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker: (session) => ({
        onWillReceiveMessage: (message) => {
          this.logMessage('client->server', message, session);
        },
        onDidSendMessage: (message) => {
          this.logMessage('server->client', message, session);
        }
      })
    });
  }

  private logMessage(direction: string, message: any, session: vscode.DebugSession) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      direction,
      session: {
        id: session.id,
        name: session.name,
        type: session.type
      },
      message: message
    };

    this.messages.push(logEntry);

    // Keep only the last N messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  getMessages(): any[] {
    return [...this.messages]; // Return copy
  }

  clearMessages(): void {
    this.messages = [];
  }
}

export const debugResources: Record<string, MCPResource> = {
  'dap-log': {
    description: 'Debug Adapter Protocol message log',
    uri: 'dap-log://current',
    config: {
      title: 'DAP Message Log',
      mimeType: 'application/json'
    },
    handler: async (uri: URL) => {
      const logger = DAPMessageLogger.getInstance();
      const messages = logger.getMessages();

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({
            messages: messages,
            count: messages.length,
            lastUpdated: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  },

  'debug-breakpoints': {
    description: 'Current breakpoint information',
    uri: 'debug://breakpoints',
    config: {
      title: 'Current Breakpoints',
      mimeType: 'application/json'
    },
    handler: async (uri: URL) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const workspacePath = workspaceFolder?.uri.fsPath || '';

      const breakpoints = vscode.debug.breakpoints.map(bp => {
        if (bp instanceof vscode.SourceBreakpoint) {
          const filePath = bp.location.uri.fsPath;
          const relativePath = workspacePath && filePath.startsWith(workspacePath)
            ? path.relative(workspacePath, filePath)
            : filePath;

          return {
            type: 'source',
            file: relativePath,
            line: bp.location.range.start.line + 1,
            column: bp.location.range.start.character,
            enabled: bp.enabled,
            condition: bp.condition || null,
            hitCondition: bp.hitCondition || null,
            logMessage: bp.logMessage || null
          };
        } else if (bp instanceof vscode.FunctionBreakpoint) {
          return {
            type: 'function',
            functionName: bp.functionName,
            enabled: bp.enabled,
            condition: bp.condition || null,
            hitCondition: bp.hitCondition || null
          };
        } else {
          return {
            type: 'unknown',
            enabled: bp.enabled,
            id: bp.id
          };
        }
      });

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({
            breakpoints: breakpoints,
            count: breakpoints.length,
            byType: {
              source: breakpoints.filter(bp => bp.type === 'source').length,
              function: breakpoints.filter(bp => bp.type === 'function').length,
              unknown: breakpoints.filter(bp => bp.type === 'unknown').length
            },
            lastUpdated: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  },

  'debug-active-session': {
    description: 'Active debug session information',
    uri: 'debug://active-session',
    config: {
      title: 'Active Debug Session',
      mimeType: 'application/json'
    },
    handler: async (uri: URL) => {
      const activeSession = vscode.debug.activeDebugSession;

      if (!activeSession) {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              active: false,
              message: 'No active debug session',
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      const sessionInfo: any = {
        active: true,
        session: {
          id: activeSession.id,
          name: activeSession.name,
          type: activeSession.type,
          workspaceFolder: activeSession.workspaceFolder ? {
            name: activeSession.workspaceFolder.name,
            uri: activeSession.workspaceFolder.uri.toString()
          } : null
        },
        timestamp: new Date().toISOString()
      };

      // Try to get additional session information
      try {
        const threadsResult = await activeSession.customRequest('threads');
        sessionInfo.session.threads = threadsResult.threads?.map((t: any) => ({
          id: t.id,
          name: t.name
        })) || [];
      } catch (error) {
        // Threads request not supported or session not ready
      }

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(sessionInfo, null, 2)
        }]
      };
    }
  },

  'debug-console': {
    description: 'Debug console output',
    uri: 'debug://console',
    config: {
      title: 'Debug Console Output',
      mimeType: 'text/plain'
    },
    handler: async (uri: URL) => {
      // Note: VS Code doesn't provide direct access to debug console content
      // This is a placeholder implementation
      return {
        contents: [{
          uri: uri.href,
          text: 'Debug console content access is limited in VS Code extension API.\nUse evaluate-expression tool to interact with debug console.'
        }]
      };
    }
  },

  'debug-call-stack': {
    description: 'Current call stack information',
    uri: 'debug://call-stack',
    config: {
      title: 'Call Stack Information',
      mimeType: 'application/json'
    },
    handler: async (uri: URL) => {
      const activeSession = vscode.debug.activeDebugSession;

      if (!activeSession) {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              available: false,
              message: 'No active debug session',
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      try {
        // Get threads
        const threadsResult = await activeSession.customRequest('threads');
        const threads = threadsResult.threads || [];

        if (threads.length === 0) {
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify({
                available: false,
                message: 'No threads available',
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        }

        // Get stack trace for first thread
        const threadId = threads[0].id;
        const stackResult = await activeSession.customRequest('stackTrace', {
          threadId: threadId,
          startFrame: 0,
          levels: 20
        });

        const callStackInfo = {
          available: true,
          threadId: threadId,
          threadName: threads[0].name,
          stackFrames: stackResult.stackFrames?.map((frame: any, index: number) => ({
            id: frame.id,
            name: frame.name,
            source: frame.source ? {
              name: frame.source.name,
              path: frame.source.path
            } : null,
            line: frame.line,
            column: frame.column,
            index: index
          })) || [],
          totalFrames: stackResult.totalFrames,
          timestamp: new Date().toISOString()
        };

        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(callStackInfo, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              available: false,
              message: `Failed to get call stack: ${(error as Error).message}`,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }
    }
  },

  'debug-variables-scope': {
    description: 'Variable scope information',
    uri: 'debug://variables-scope',
    config: {
      title: 'Variable Scope Information',
      mimeType: 'application/json'
    },
    handler: async (uri: URL) => {
      const activeSession = vscode.debug.activeDebugSession;

      if (!activeSession) {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              available: false,
              message: 'No active debug session',
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      try {
        // Get threads
        const threadsResult = await activeSession.customRequest('threads');
        const threads = threadsResult.threads || [];

        if (threads.length === 0) {
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify({
                available: false,
                message: 'No threads available',
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        }

        // Get stack trace for first thread
        const threadId = threads[0].id;
        const stackResult = await activeSession.customRequest('stackTrace', {
          threadId: threadId,
          startFrame: 0,
          levels: 1 // Just get the top frame
        });

        if (!stackResult.stackFrames || stackResult.stackFrames.length === 0) {
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify({
                available: false,
                message: 'No stack frames available',
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        }

        // Get scopes for the top frame
        const frameId = stackResult.stackFrames[0].id;
        const scopesResult = await activeSession.customRequest('scopes', {
          frameId: frameId
        });

        const scopes = scopesResult.scopes || [];
        const scopeInfo: any[] = [];

        // Get variables for each scope
        for (const scope of scopes) {
          try {
            const variablesResult = await activeSession.customRequest('variables', {
              variablesReference: scope.variablesReference
            });

            scopeInfo.push({
              name: scope.name,
              expensive: scope.expensive || false,
              variablesReference: scope.variablesReference,
              variables: variablesResult.variables?.map((variable: any) => ({
                name: variable.name,
                value: variable.value,
                type: variable.type,
                variablesReference: variable.variablesReference,
                namedVariables: variable.namedVariables,
                indexedVariables: variable.indexedVariables
              })) || []
            });
          } catch (error) {
            scopeInfo.push({
              name: scope.name,
              expensive: scope.expensive || false,
              variablesReference: scope.variablesReference,
              error: `Failed to get variables: ${(error as Error).message}`,
              variables: []
            });
          }
        }

        const variablesInfo = {
          available: true,
          threadId: threadId,
          frameId: frameId,
          frameName: stackResult.stackFrames[0].name,
          scopes: scopeInfo,
          timestamp: new Date().toISOString()
        };

        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(variablesInfo, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              available: false,
              message: `Failed to get variable scope: ${(error as Error).message}`,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }
    }
  }
};

// Initialize DAP message logging
export function initializeDAPLogging() {
  const logger = DAPMessageLogger.getInstance();
  logger.initialize();
  console.log('📡 DAP message logging initialized');
}