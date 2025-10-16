import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Breakpoint Management Tools
 * Implements the 5 breakpoint-related MCP tools
 */

export interface MCPTool {
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
  config?: {
    title?: string;
    mimeType?: string;
  };
}

export const breakpointTools: Record<string, MCPTool> = {
  'add-breakpoint': {
    description: 'Add breakpoint with conditional support',
    inputSchema: {
      type: 'object',
      properties: {
        file: { 
          type: 'string', 
          description: 'File path relative to workspace root' 
        },
        line: { 
          type: 'number', 
          description: 'Line number (1-based)' 
        },
        condition: { 
          type: 'string', 
          description: 'Optional breakpoint condition expression' 
        }
      },
      required: ['file', 'line']
    },
    config: {
      title: 'Add Breakpoint'
    },
    handler: async (args: { file: string; line: number; condition?: string }) => {
      const { file, line, condition } = args;

      // Get workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      // Convert relative path to absolute
      const absolutePath = path.isAbsolute(file) 
        ? file 
        : path.resolve(workspaceFolder.uri.fsPath, file);
      
      const uri = vscode.Uri.file(absolutePath);

      // Verify file exists
      try {
        await vscode.workspace.fs.stat(uri);
      } catch (error) {
        throw new Error(`File not found: ${file}`);
      }

      // Create breakpoint
      const location = new vscode.Location(uri, new vscode.Position(line - 1, 0));
      const breakpoint = new vscode.SourceBreakpoint(location, true, condition);

      // Add breakpoint
      vscode.debug.addBreakpoints([breakpoint]);

      return {
        success: true,
        message: `Breakpoint added at ${file}:${line}${condition ? ` with condition: ${condition}` : ''}`,
        breakpoint: {
          file: file,
          line: line,
          condition: condition || null,
          enabled: true
        }
      };
    }
  },

  'add-breakpoints': {
    description: 'Add multiple breakpoints at once',
    inputSchema: {
      type: 'object',
      properties: {
        breakpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string', description: 'File path relative to workspace' },
              line: { type: 'number', description: 'Line number (1-based)' },
              condition: { type: 'string', description: 'Optional condition' }
            },
            required: ['file', 'line']
          },
          description: 'Array of breakpoints to add'
        }
      },
      required: ['breakpoints']
    },
    config: {
      title: 'Add Multiple Breakpoints'
    },
    handler: async (args: { breakpoints: Array<{ file: string; line: number; condition?: string }> }) => {
      const { breakpoints } = args;
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      const vscodeBreakpoints: vscode.SourceBreakpoint[] = [];
      const results: any[] = [];

      for (const bp of breakpoints) {
        try {
          const absolutePath = path.isAbsolute(bp.file) 
            ? bp.file 
            : path.resolve(workspaceFolder.uri.fsPath, bp.file);
          
          const uri = vscode.Uri.file(absolutePath);
          
          // Verify file exists
          await vscode.workspace.fs.stat(uri);
          
          const location = new vscode.Location(uri, new vscode.Position(bp.line - 1, 0));
          const breakpoint = new vscode.SourceBreakpoint(location, true, bp.condition);
          
          vscodeBreakpoints.push(breakpoint);
          results.push({
            file: bp.file,
            line: bp.line,
            condition: bp.condition || null,
            success: true
          });
        } catch (error) {
          results.push({
            file: bp.file,
            line: bp.line,
            success: false,
            error: (error as Error).message
          });
        }
      }

      // Add all valid breakpoints
      if (vscodeBreakpoints.length > 0) {
        vscode.debug.addBreakpoints(vscodeBreakpoints);
      }

      return {
        success: true,
        message: `Added ${vscodeBreakpoints.length} breakpoints (${breakpoints.length - vscodeBreakpoints.length} failed)`,
        results: results
      };
    }
  },

  'remove-breakpoint': {
    description: 'Remove specific breakpoint',
    inputSchema: {
      type: 'object',
      properties: {
        file: { 
          type: 'string', 
          description: 'File path relative to workspace' 
        },
        line: { 
          type: 'number', 
          description: 'Line number (1-based)' 
        }
      },
      required: ['file', 'line']
    },
    config: {
      title: 'Remove Breakpoint'
    },
    handler: async (args: { file: string; line: number }) => {
      const { file, line } = args;
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }

      const absolutePath = path.isAbsolute(file) 
        ? file 
        : path.resolve(workspaceFolder.uri.fsPath, file);
      
      const uri = vscode.Uri.file(absolutePath);

      // Find matching breakpoints
      const breakpointsToRemove = vscode.debug.breakpoints.filter(bp => {
        if (bp instanceof vscode.SourceBreakpoint) {
          return bp.location.uri.fsPath === uri.fsPath && 
                 bp.location.range.start.line === line - 1;
        }
        return false;
      });

      if (breakpointsToRemove.length === 0) {
        return {
          success: false,
          message: `No breakpoint found at ${file}:${line}`
        };
      }

      // Remove breakpoints
      vscode.debug.removeBreakpoints(breakpointsToRemove);

      return {
        success: true,
        message: `Removed breakpoint at ${file}:${line}`,
        removed: breakpointsToRemove.length
      };
    }
  },

  'clear-breakpoints': {
    description: 'Clear all breakpoints or breakpoints in specific file',
    inputSchema: {
      type: 'object',
      properties: {
        file: { 
          type: 'string', 
          description: 'Optional: file path to clear breakpoints from (clears all if not specified)' 
        }
      }
    },
    config: {
      title: 'Clear Breakpoints'
    },
    handler: async (args: { file?: string }) => {
      const { file } = args;

      if (file) {
        // Clear breakpoints in specific file
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error('No workspace folder found');
        }

        const absolutePath = path.isAbsolute(file) 
          ? file 
          : path.resolve(workspaceFolder.uri.fsPath, file);
        
        const uri = vscode.Uri.file(absolutePath);

        const breakpointsToRemove = vscode.debug.breakpoints.filter(bp => {
          if (bp instanceof vscode.SourceBreakpoint) {
            return bp.location.uri.fsPath === uri.fsPath;
          }
          return false;
        });

        vscode.debug.removeBreakpoints(breakpointsToRemove);

        return {
          success: true,
          message: `Cleared ${breakpointsToRemove.length} breakpoints from ${file}`,
          removed: breakpointsToRemove.length
        };
      } else {
        // Clear all breakpoints
        const allBreakpoints = vscode.debug.breakpoints;
        vscode.debug.removeBreakpoints(allBreakpoints);

        return {
          success: true,
          message: `Cleared all ${allBreakpoints.length} breakpoints`,
          removed: allBreakpoints.length
        };
      }
    }
  },

  'list-breakpoints': {
    description: 'List all breakpoints in the workspace',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    config: {
      title: 'List Breakpoints'
    },
    handler: async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const workspacePath = workspaceFolder?.uri.fsPath || '';

      const breakpoints = vscode.debug.breakpoints
        .filter(bp => bp instanceof vscode.SourceBreakpoint)
        .map(bp => {
          const sourceBp = bp as vscode.SourceBreakpoint;
          const filePath = sourceBp.location.uri.fsPath;
          
          // Convert to relative path if within workspace
          const relativePath = workspacePath && filePath.startsWith(workspacePath)
            ? path.relative(workspacePath, filePath)
            : filePath;

          return {
            file: relativePath,
            line: sourceBp.location.range.start.line + 1,
            enabled: sourceBp.enabled,
            condition: sourceBp.condition || null,
            hitCondition: sourceBp.hitCondition || null,
            logMessage: sourceBp.logMessage || null
          };
        });

      return {
        success: true,
        breakpoints: breakpoints,
        count: breakpoints.length,
        message: `Found ${breakpoints.length} breakpoints`
      };
    }
  }
};