import * as vscode from 'vscode';

/**
 * Configuration and Workspace Management Tools
 * Implements configuration and workspace MCP tools
 */

import { MCPTool } from './breakpointTools';

export const configurationTools: Record<string, MCPTool> = {
  'list-debug-configs': {
    description: 'List all available debug configurations',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceFolder: {
          type: 'string',
          description: 'Optional workspace folder name (defaults to first folder)'
        }
      }
    },
    config: {
      title: 'List Debug Configurations'
    },
    handler: async (args: { workspaceFolder?: string }) => {
      const { workspaceFolder } = args;
      
      let targetFolder: vscode.WorkspaceFolder | undefined;
      
      if (workspaceFolder) {
        targetFolder = vscode.workspace.workspaceFolders?.find(
          folder => folder.name === workspaceFolder
        );
        if (!targetFolder) {
          throw new Error(`Workspace folder '${workspaceFolder}' not found`);
        }
      } else {
        targetFolder = vscode.workspace.workspaceFolders?.[0];
        if (!targetFolder) {
          throw new Error('No workspace folders found');
        }
      }

      // Get launch configurations
      const launchConfig = vscode.workspace.getConfiguration('launch', targetFolder);
      const configurations = launchConfig.get<any[]>('configurations', []);

      const configList = configurations.map(config => ({
        name: config.name,
        type: config.type,
        request: config.request,
        program: config.program,
        cwd: config.cwd,
        args: config.args,
        env: config.env ? Object.keys(config.env) : [],
        console: config.console,
        stopOnEntry: config.stopOnEntry
      }));

      return {
        success: true,
        configurations: configList,
        count: configList.length,
        workspaceFolder: targetFolder.name,
        message: `Found ${configList.length} debug configurations in '${targetFolder.name}'`
      };
    }
  },

  'select-debug-config': {
    description: 'Select and validate a specific debug configuration',
    inputSchema: {
      type: 'object',
      properties: {
        configName: {
          type: 'string',
          description: 'Name of the debug configuration to select'
        },
        workspaceFolder: {
          type: 'string',
          description: 'Optional workspace folder name (defaults to first folder)'
        }
      },
      required: ['configName']
    },
    config: {
      title: 'Select Debug Configuration'
    },
    handler: async (args: { configName: string; workspaceFolder?: string }) => {
      const { configName, workspaceFolder } = args;
      
      let targetFolder: vscode.WorkspaceFolder | undefined;
      
      if (workspaceFolder) {
        targetFolder = vscode.workspace.workspaceFolders?.find(
          folder => folder.name === workspaceFolder
        );
        if (!targetFolder) {
          throw new Error(`Workspace folder '${workspaceFolder}' not found`);
        }
      } else {
        targetFolder = vscode.workspace.workspaceFolders?.[0];
        if (!targetFolder) {
          throw new Error('No workspace folders found');
        }
      }

      // Get launch configurations
      const launchConfig = vscode.workspace.getConfiguration('launch', targetFolder);
      const configurations = launchConfig.get<any[]>('configurations', []);

      const selectedConfig = configurations.find(config => config.name === configName);
      
      if (!selectedConfig) {
        const availableConfigs = configurations.map(c => c.name).join(', ');
        throw new Error(`Configuration '${configName}' not found. Available: ${availableConfigs}`);
      }

      // Validate configuration
      const validation = {
        hasProgram: !!selectedConfig.program,
        hasCwd: !!selectedConfig.cwd,
        hasValidType: !!selectedConfig.type,
        hasValidRequest: ['launch', 'attach'].includes(selectedConfig.request)
      };

      const isValid = Object.values(validation).every(v => v);

      return {
        success: true,
        configuration: {
          name: selectedConfig.name,
          type: selectedConfig.type,
          request: selectedConfig.request,
          program: selectedConfig.program,
          cwd: selectedConfig.cwd,
          args: selectedConfig.args || [],
          env: selectedConfig.env || {},
          console: selectedConfig.console,
          stopOnEntry: selectedConfig.stopOnEntry || false
        },
        validation: validation,
        isValid: isValid,
        workspaceFolder: targetFolder.name,
        message: `Configuration '${configName}' selected${isValid ? ' and validated' : ' but has validation issues'}`
      };
    }
  },

  'list-vscode-instances': {
    description: 'List information about VS Code workspace instances',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'List VS Code Instances'
    },
    handler: async () => {
      // Get current workspace information
      const workspaceFolders = vscode.workspace.workspaceFolders || [];
      const workspaceName = vscode.workspace.name;
      
      // Get extension information
      const extension = vscode.extensions.getExtension('SaurabhKohli.mcp-agentify');
      
      const instance = {
        id: `vscode-${process.pid}`,
        pid: process.pid,
        workspaceName: workspaceName,
        workspaceFolders: workspaceFolders.map(folder => ({
          name: folder.name,
          uri: folder.uri.toString(),
          path: folder.uri.fsPath
        })),
        extensionVersion: extension?.packageJSON?.version || 'unknown',
        isActive: extension?.isActive || false,
        debugSessionActive: !!vscode.debug.activeDebugSession,
        activeDebugSession: vscode.debug.activeDebugSession ? {
          id: vscode.debug.activeDebugSession.id,
          name: vscode.debug.activeDebugSession.name,
          type: vscode.debug.activeDebugSession.type
        } : null
      };

      return {
        success: true,
        instances: [instance], // Only current instance available
        currentInstance: instance,
        count: 1,
        message: 'Current VS Code instance information retrieved'
      };
    }
  },

  'get-workspace-info': {
    description: 'Get detailed workspace information',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'Get Workspace Info'
    },
    handler: async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders || [];
      const workspaceName = vscode.workspace.name;
      const workspaceFile = vscode.workspace.workspaceFile;

      // Get language information
      const activeEditor = vscode.window.activeTextEditor;
      const openEditors = vscode.window.tabGroups.all
        .flatMap(group => group.tabs)
        .filter(tab => tab.input instanceof vscode.TabInputText)
        .map(tab => {
          const input = tab.input as vscode.TabInputText;
          return {
            fileName: input.uri.fsPath.split('/').pop(),
            language: vscode.workspace.textDocuments.find(doc => doc.uri.toString() === input.uri.toString())?.languageId,
            isDirty: tab.isDirty,
            isActive: tab.isActive
          };
        });

      // Get debug configurations count
      let totalConfigs = 0;
      const configsByFolder: any[] = [];
      
      for (const folder of workspaceFolders) {
        const launchConfig = vscode.workspace.getConfiguration('launch', folder);
        const configurations = launchConfig.get<any[]>('configurations', []);
        totalConfigs += configurations.length;
        
        configsByFolder.push({
          folderName: folder.name,
          configCount: configurations.length,
          configNames: configurations.map(c => c.name)
        });
      }

      // Get breakpoints info
      const breakpointsInfo = {
        total: vscode.debug.breakpoints.length,
        byType: {
          source: vscode.debug.breakpoints.filter(bp => bp instanceof vscode.SourceBreakpoint).length,
          function: vscode.debug.breakpoints.filter(bp => bp instanceof vscode.FunctionBreakpoint).length
        }
      };

      return {
        success: true,
        workspace: {
          name: workspaceName,
          file: workspaceFile?.toString(),
          folders: workspaceFolders.map(folder => ({
            name: folder.name,
            uri: folder.uri.toString(),
            path: folder.uri.fsPath,
            index: folder.index
          })),
          folderCount: workspaceFolders.length
        },
        editors: {
          active: activeEditor ? {
            fileName: activeEditor.document.fileName.split('/').pop(),
            language: activeEditor.document.languageId,
            lineCount: activeEditor.document.lineCount,
            isDirty: activeEditor.document.isDirty
          } : null,
          open: openEditors,
          openCount: openEditors.length
        },
        debugging: {
          configurations: {
            total: totalConfigs,
            byFolder: configsByFolder
          },
          breakpoints: breakpointsInfo,
          activeSession: vscode.debug.activeDebugSession ? {
            id: vscode.debug.activeDebugSession.id,
            name: vscode.debug.activeDebugSession.name,
            type: vscode.debug.activeDebugSession.type,
            workspaceFolder: vscode.debug.activeDebugSession.workspaceFolder?.name
          } : null
        },
        extensions: {
          mcpAgentify: {
            isActive: vscode.extensions.getExtension('SaurabhKohli.mcp-agentify')?.isActive || false,
            version: vscode.extensions.getExtension('SaurabhKohli.mcp-agentify')?.packageJSON?.version || 'unknown'
          }
        },
        message: 'Workspace information retrieved successfully'
      };
    }
  }
};