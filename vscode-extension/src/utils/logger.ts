import * as vscode from 'vscode';

/**
 * Enhanced logger utility with structured logging and different output channels
 */
export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(outputChannel: vscode.OutputChannel, logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.outputChannel = outputChannel;
    this.logLevel = logLevel;
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.outputChannel.appendLine(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.outputChannel.appendLine(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.outputChannel.appendLine(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error;
      this.outputChannel.appendLine(this.formatMessage('error', message, errorData));
    }
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }
}