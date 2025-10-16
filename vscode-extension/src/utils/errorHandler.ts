import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * Enhanced error handler with user-friendly messaging and automatic reporting
 */
export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Handle errors with consistent logging and user messaging
   */
  handleError(message: string, error: any, showToUser = true): void {
    const errorMessage = this.extractErrorMessage(error);
    
    // Log the error
    this.logger.error(message, error);

    // Show to user if requested
    if (showToUser) {
      this.showErrorToUser(message, errorMessage);
    }
  }

  /**
   * Handle warnings with consistent logging and user messaging
   */
  handleWarning(message: string, details?: any, showToUser = true): void {
    this.logger.warn(message, details);

    if (showToUser) {
      vscode.window.showWarningMessage(message);
    }
  }

  /**
   * Handle async errors in a Promise chain
   */
  async handleAsync<T>(
    operation: Promise<T>,
    errorMessage: string,
    showToUser = true
  ): Promise<T | null> {
    try {
      return await operation;
    } catch (error) {
      this.handleError(errorMessage, error, showToUser);
      return null;
    }
  }

  /**
   * Create an error handler for Promise.catch()
   */
  createAsyncHandler(errorMessage: string, showToUser = true) {
    return (error: any) => {
      this.handleError(errorMessage, error, showToUser);
      return null;
    };
  }

  private extractErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object') {
      return error.message || error.toString() || 'Unknown error';
    }
    return String(error);
  }

  private showErrorToUser(context: string, errorMessage: string): void {
    const fullMessage = `${context}: ${errorMessage}`;
    
    // Show with action buttons based on error type
    if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
      vscode.window.showErrorMessage(
        fullMessage,
        'Check Configuration',
        'View Logs'
      ).then(selection => {
        if (selection === 'Check Configuration') {
          vscode.commands.executeCommand('mcp-agentify.openSettings');
        } else if (selection === 'View Logs') {
          vscode.commands.executeCommand('workbench.action.output.show.MCP Agentify');
        }
      });
    } else if (errorMessage.includes('permission') || errorMessage.includes('EACCES')) {
      vscode.window.showErrorMessage(
        fullMessage,
        'View Logs',
        'Help'
      ).then(selection => {
        if (selection === 'View Logs') {
          vscode.commands.executeCommand('workbench.action.output.show.MCP Agentify');
        } else if (selection === 'Help') {
          vscode.commands.executeCommand('mcp-agentify.showDocumentation');
        }
      });
    } else {
      vscode.window.showErrorMessage(fullMessage, 'View Logs').then(selection => {
        if (selection === 'View Logs') {
          vscode.commands.executeCommand('workbench.action.output.show.MCP Agentify');
        }
      });
    }
  }
}