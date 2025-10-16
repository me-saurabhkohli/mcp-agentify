import * as vscode from 'vscode';

/**
 * Debug Control Tools
 * Implements the 7 debug control MCP tools
 */

import { MCPTool } from './breakpointTools';

export const debugControlTools: Record<string, MCPTool> = {
  'start-debug': {
    description: 'Start a debug session with optional configuration',
    inputSchema: {
      type: 'object',
      properties: {
        config: { 
          type: 'string', 
          description: 'Optional debug configuration name to use' 
        },
        noDebug: {
          type: 'boolean',
          description: 'Start without debugging (run mode)'
        }
      }
    },
    config: {
      title: 'Start Debug Session'
    },
    handler: async (args: { config?: string; noDebug?: boolean }) => {
      const { config, noDebug = false } = args;
      
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      // Get debug configurations
      const launchConfig = vscode.workspace.getConfiguration('launch', workspaceFolder);
      const configurations = launchConfig.get<any[]>('configurations', []);

      let targetConfig: any;

      if (config) {
        // Find specific configuration
        targetConfig = configurations.find(c => c.name === config);
        if (!targetConfig) {
          throw new Error(`Debug configuration '${config}' not found. Available: ${configurations.map(c => c.name).join(', ')}`);
        }
      } else {
        // Use first configuration
        targetConfig = configurations[0];
        if (!targetConfig) {
          throw new Error('No debug configurations found in launch.json');
        }
      }

      // Start debugging
      const success = await vscode.debug.startDebugging(workspaceFolder, targetConfig, { noDebug });

      if (success) {
        return {
          success: true,
          message: `Debug session started with configuration: ${targetConfig.name}`,
          configuration: targetConfig.name,
          mode: noDebug ? 'run' : 'debug'
        };
      } else {
        throw new Error(`Failed to start debug session with configuration: ${targetConfig.name}`);
      }
    }
  },

  'stop-debug': {
    description: 'Stop the active debug session',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Stop Debug Session'
    },
    handler: async () => {
      const activeSession = vscode.debug.activeDebugSession;
      
      if (!activeSession) {
        return {
          success: false,
          message: 'No active debug session to stop'
        };
      }

      const sessionName = activeSession.name;
      
      // Stop the debug session
      await vscode.debug.stopDebugging(activeSession);

      return {
        success: true,
        message: `Debug session '${sessionName}' stopped`,
        stoppedSession: sessionName
      };
    }
  },

  'continue': {
    description: 'Continue execution from current breakpoint',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Continue Execution'
    },
    handler: async () => {
      const activeSession = vscode.debug.activeDebugSession;
      
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      // Execute continue command
      await vscode.commands.executeCommand('workbench.action.debug.continue');

      return {
        success: true,
        message: 'Continued execution',
        session: activeSession.name
      };
    }
  },

  'step-over': {
    description: 'Step over the current line',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Step Over'
    },
    handler: async () => {
      const activeSession = vscode.debug.activeDebugSession;
      
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      // Execute step over command
      await vscode.commands.executeCommand('workbench.action.debug.stepOver');

      return {
        success: true,
        message: 'Stepped over current line',
        session: activeSession.name
      };
    }
  },

  'step-into': {
    description: 'Step into the current function call',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Step Into'
    },
    handler: async () => {
      const activeSession = vscode.debug.activeDebugSession;
      
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      // Execute step into command
      await vscode.commands.executeCommand('workbench.action.debug.stepInto');

      return {
        success: true,
        message: 'Stepped into function',
        session: activeSession.name
      };
    }
  },

  'step-out': {
    description: 'Step out of the current function',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Step Out'
    },
    handler: async () => {
      const activeSession = vscode.debug.activeDebugSession;
      
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      // Execute step out command
      await vscode.commands.executeCommand('workbench.action.debug.stepOut');

      return {
        success: true,
        message: 'Stepped out of function',
        session: activeSession.name
      };
    }
  },

  'pause': {
    description: 'Pause execution of the debug session',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Pause Execution'
    },
    handler: async () => {
      const activeSession = vscode.debug.activeDebugSession;
      
      if (!activeSession) {
        throw new Error('No active debug session');
      }

      // Execute pause command
      await vscode.commands.executeCommand('workbench.action.debug.pause');

      return {
        success: true,
        message: 'Paused execution',
        session: activeSession.name
      };
    }
  }
};