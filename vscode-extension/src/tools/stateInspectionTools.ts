import * as vscode from 'vscode';

/**
 * State Inspection Tools
 * Implements the 6 state inspection MCP tools
 */

import { MCPTool } from './breakpointTools';

export const stateInspectionTools: Record<string, MCPTool> = {
  'evaluate-expression': {
    description: 'Evaluate expression in the current debug context',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Expression to evaluate (e.g., "user.name", "items.length")'
        },
        frameId: {
          type: 'number',
          description: 'Optional stack frame ID (defaults to current frame)'
        },
        context: {
          type: 'string',
          enum: ['watch', 'repl', 'hover'],
          description: 'Evaluation context'
        }
      },
      required: ['expression']
    },
    config: {
      title: 'Evaluate Expression'
    },
    handler: async (args: { expression: string; frameId?: number; context?: string }) => {
      const { expression, frameId, context = 'repl' } = args;
      
      const activeSession = vscode.debug.activeDebugSession;
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      try {
        // Use DAP evaluate request
        const result = await activeSession.customRequest('evaluate', {
          expression: expression,
          frameId: frameId,
          context: context
        });

        return {
          success: true,
          expression: expression,
          result: result.result || 'undefined',
          type: result.type || 'unknown',
          variablesReference: result.variablesReference || 0,
          namedVariables: result.namedVariables,
          indexedVariables: result.indexedVariables,
          message: `Expression '${expression}' evaluated successfully`
        };
      } catch (error) {
        return {
          success: false,
          expression: expression,
          error: (error as Error).message,
          message: `Failed to evaluate expression '${expression}'`
        };
      }
    }
  },

  'get-variables-scope': {
    description: 'Get all variables in the current scope',
    inputSchema: {
      type: 'object',
      properties: {
        frameId: {
          type: 'number',
          description: 'Optional stack frame ID (defaults to current frame)'
        },
        filter: {
          type: 'string',
          description: 'Optional filter for variable names'
        }
      }
    },
    config: {
      title: 'Get Variables Scope'
    },
    handler: async (args: { frameId?: number; filter?: string }) => {
      const { frameId, filter } = args;
      
      const activeSession = vscode.debug.activeDebugSession;
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      try {
        // Get scopes first
        const scopesResult = await activeSession.customRequest('scopes', {
          frameId: frameId || 0
        });

        const allVariables: any[] = [];

        // Get variables for each scope
        for (const scope of scopesResult.scopes || []) {
          try {
            const variablesResult = await activeSession.customRequest('variables', {
              variablesReference: scope.variablesReference
            });

            const scopeVariables = (variablesResult.variables || []).map((variable: any) => ({
              ...variable,
              scope: scope.name
            }));

            allVariables.push(...scopeVariables);
          } catch (error) {
            console.warn(`Failed to get variables for scope ${scope.name}:`, error);
          }
        }

        // Apply filter if provided
        const filteredVariables = filter 
          ? allVariables.filter(v => v.name.toLowerCase().includes(filter.toLowerCase()))
          : allVariables;

        return {
          success: true,
          variables: filteredVariables,
          count: filteredVariables.length,
          totalCount: allVariables.length,
          scopes: scopesResult.scopes?.map((s: any) => s.name) || [],
          message: `Retrieved ${filteredVariables.length} variables${filter ? ` matching '${filter}'` : ''}`
        };
      } catch (error) {
        throw new Error(`Failed to get variables: ${(error as Error).message}`);
      }
    }
  },

  'inspect-variable': {
    description: 'Get detailed information about a specific variable',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Variable name to inspect'
        },
        variablesReference: {
          type: 'number',
          description: 'Optional variables reference for nested inspection'
        }
      },
      required: ['name']
    },
    config: {
      title: 'Inspect Variable'
    },
    handler: async (args: { name: string; variablesReference?: number }) => {
      const { name, variablesReference } = args;
      
      const activeSession = vscode.debug.activeDebugSession;
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      try {
        if (variablesReference) {
          // Get variables from specific reference
          const result = await activeSession.customRequest('variables', {
            variablesReference: variablesReference
          });

          const variable = result.variables?.find((v: any) => v.name === name);
          
          if (!variable) {
            throw new Error(`Variable '${name}' not found in reference ${variablesReference}`);
          }

          return {
            success: true,
            variable: variable,
            message: `Variable '${name}' inspected successfully`
          };
        } else {
          // Evaluate the variable
          const result = await activeSession.customRequest('evaluate', {
            expression: name,
            context: 'hover'
          });

          return {
            success: true,
            variable: {
              name: name,
              value: result.result,
              type: result.type,
              variablesReference: result.variablesReference
            },
            message: `Variable '${name}' inspected successfully`
          };
        }
      } catch (error) {
        throw new Error(`Failed to inspect variable '${name}': ${(error as Error).message}`);
      }
    }
  },

  'get-call-stack': {
    description: 'Get the current call stack',
    inputSchema: {
      type: 'object',
      properties: {
        threadId: {
          type: 'number',
          description: 'Optional thread ID (defaults to current thread)'
        },
        startFrame: {
          type: 'number',
          description: 'Starting frame index (default 0)'
        },
        levels: {
          type: 'number',
          description: 'Number of frames to retrieve (default 20)'
        }
      }
    },
    config: {
      title: 'Get Call Stack'
    },
    handler: async (args: { threadId?: number; startFrame?: number; levels?: number }) => {
      const { threadId, startFrame = 0, levels = 20 } = args;
      
      const activeSession = vscode.debug.activeDebugSession;
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      try {
        // Get threads first if no threadId specified
        let targetThreadId = threadId;
        
        if (!targetThreadId) {
          const threadsResult = await activeSession.customRequest('threads');
          const threads = threadsResult.threads || [];
          
          if (threads.length === 0) {
            throw new Error('No threads found');
          }
          
          targetThreadId = threads[0].id;
        }

        // Get stack trace
        const stackResult = await activeSession.customRequest('stackTrace', {
          threadId: targetThreadId,
          startFrame: startFrame,
          levels: levels
        });

        const stackFrames = stackResult.stackFrames || [];

        return {
          success: true,
          stackFrames: stackFrames.map((frame: any, index: number) => ({
            id: frame.id,
            name: frame.name,
            source: frame.source,
            line: frame.line,
            column: frame.column,
            index: startFrame + index,
            instructionPointerReference: frame.instructionPointerReference
          })),
          totalFrames: stackResult.totalFrames,
          threadId: targetThreadId,
          message: `Retrieved ${stackFrames.length} stack frames`
        };
      } catch (error) {
        throw new Error(`Failed to get call stack: ${(error as Error).message}`);
      }
    }
  },

  'get-thread-list': {
    description: 'Get list of all threads in the debug session',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Get Thread List'
    },
    handler: async () => {
      const activeSession = vscode.debug.activeDebugSession;
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      try {
        const result = await activeSession.customRequest('threads');
        const threads = result.threads || [];

        return {
          success: true,
          threads: threads.map((thread: any) => ({
            id: thread.id,
            name: thread.name
          })),
          count: threads.length,
          message: `Found ${threads.length} threads`
        };
      } catch (error) {
        throw new Error(`Failed to get thread list: ${(error as Error).message}`);
      }
    }
  },

  'get-exception-info': {
    description: 'Get information about the current exception (if paused on exception)',
    inputSchema: {
      type: 'object',
      properties: {
        threadId: {
          type: 'number',
          description: 'Optional thread ID (defaults to current thread)'
        }
      }
    },
    config: {
      title: 'Get Exception Info'
    },
    handler: async (args: { threadId?: number }) => {
      const { threadId } = args;
      
      const activeSession = vscode.debug.activeDebugSession;
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      try {
        // Get threads first if no threadId specified
        let targetThreadId = threadId;
        
        if (!targetThreadId) {
          const threadsResult = await activeSession.customRequest('threads');
          const threads = threadsResult.threads || [];
          
          if (threads.length === 0) {
            throw new Error('No threads found');
          }
          
          targetThreadId = threads[0].id;
        }

        // Try to get exception info
        try {
          const result = await activeSession.customRequest('exceptionInfo', {
            threadId: targetThreadId
          });

          return {
            success: true,
            exception: {
              exceptionId: result.exceptionId,
              description: result.description,
              breakMode: result.breakMode,
              details: result.details
            },
            threadId: targetThreadId,
            message: 'Exception information retrieved successfully'
          };
        } catch (error) {
          // Not all debug adapters support exceptionInfo
          return {
            success: false,
            message: 'No exception information available (not paused on exception or debug adapter does not support exception info)',
            threadId: targetThreadId
          };
        }
      } catch (error) {
        throw new Error(`Failed to get exception info: ${(error as Error).message}`);
      }
    }
  },

  'get-debug-state': {
    description: 'Get overall debug session state and information',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Get Debug State'
    },
    handler: async () => {
      const activeSession = vscode.debug.activeDebugSession;
      
      if (!activeSession) {
        return {
          success: true,
          state: 'inactive',
          message: 'No active debug session'
        };
      }

      try {
        // Get basic session info
        const sessionInfo = {
          id: activeSession.id,
          name: activeSession.name,
          type: activeSession.type,
          workspaceFolder: activeSession.workspaceFolder?.name
        };

        // Try to get threads
        let threadsInfo = null;
        try {
          const threadsResult = await activeSession.customRequest('threads');
          threadsInfo = {
            count: threadsResult.threads?.length || 0,
            threads: threadsResult.threads?.map((t: any) => ({ id: t.id, name: t.name })) || []
          };
        } catch (error) {
          console.warn('Could not get threads info:', error);
        }

        // Get breakpoints info
        const breakpointsInfo = {
          total: vscode.debug.breakpoints.length,
          source: vscode.debug.breakpoints.filter(bp => bp instanceof vscode.SourceBreakpoint).length,
          function: vscode.debug.breakpoints.filter(bp => bp instanceof vscode.FunctionBreakpoint).length,
          other: vscode.debug.breakpoints.filter(bp => !(bp instanceof vscode.SourceBreakpoint) && !(bp instanceof vscode.FunctionBreakpoint)).length
        };

        return {
          success: true,
          state: 'active',
          session: sessionInfo,
          threads: threadsInfo,
          breakpoints: breakpointsInfo,
          message: 'Debug state retrieved successfully'
        };
      } catch (error) {
        throw new Error(`Failed to get debug state: ${(error as Error).message}`);
      }
    }
  }
};