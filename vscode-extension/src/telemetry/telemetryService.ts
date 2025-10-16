import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/configurationManager';

/**
 * Privacy-focused telemetry service for usage analytics
 */
export class TelemetryService {
  private context: vscode.ExtensionContext;
  private configManager: ConfigurationManager;
  private sessionId: string;
  private isEnabled: boolean;

  constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager) {
    this.context = context;
    this.configManager = configManager;
    this.sessionId = this.generateSessionId();
    this.isEnabled = configManager.isFeatureEnabled('telemetry');
  }

  /**
   * Initialize telemetry service
   */
  async initialize(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    // Track session start
    this.trackEvent('session.started', {
      sessionId: this.sessionId,
      version: this.getExtensionVersion(),
      vscodeVersion: vscode.version
    });
  }

  /**
   * Track an event with optional properties
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) {
      return;
    }

    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      properties: this.sanitizeProperties(properties || {})
    };

    // Store locally for privacy (no external transmission)
    this.storeEventLocally(event);
  }

  /**
   * Track command execution
   */
  trackCommand(commandName: string, duration?: number, success?: boolean): void {
    this.trackEvent('command.executed', {
      command: commandName,
      duration,
      success
    });
  }

  /**
   * Track error occurrence
   */
  trackError(errorType: string, errorMessage: string, context?: string): void {
    this.trackEvent('error.occurred', {
      type: errorType,
      message: this.sanitizeErrorMessage(errorMessage),
      context
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>): void {
    this.trackEvent('feature.used', {
      feature,
      action,
      metadata: this.sanitizeProperties(metadata || {})
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.trackEvent('performance.measured', {
      operation,
      duration,
      metadata: this.sanitizeProperties(metadata || {})
    });
  }

  /**
   * Get usage statistics (local only)
   */
  getUsageStatistics(): UsageStatistics {
    const events = this.getStoredEvents();
    
    return {
      totalEvents: events.length,
      sessionCount: new Set(events.map(e => e.sessionId)).size,
      mostUsedCommands: this.getMostUsedCommands(events),
      errorCount: events.filter(e => e.name === 'error.occurred').length,
      featureUsage: this.getFeatureUsageStats(events),
      timeRange: events.length > 0 ? {
        start: events[0].timestamp,
        end: events[events.length - 1].timestamp
      } : null
    };
  }

  /**
   * Clear all stored telemetry data
   */
  clearData(): void {
    this.context.globalState.update('telemetry.events', []);
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.trackEvent('telemetry.disabled');
    } else {
      this.trackEvent('telemetry.enabled');
    }
  }

  /**
   * Dispose telemetry service
   */
  dispose(): void {
    if (this.isEnabled) {
      this.trackEvent('session.ended', {
        sessionId: this.sessionId,
        duration: Date.now() - this.getSessionStartTime()
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getExtensionVersion(): string {
    return this.context.extension?.packageJSON?.version || 'unknown';
  }

  private getSessionStartTime(): number {
    return this.context.globalState.get('telemetry.sessionStart', Date.now());
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      // Remove sensitive information
      if (this.isSensitiveKey(key)) {
        continue;
      }
      
      // Sanitize values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.length; // Only store array length
      } else if (value && typeof value === 'object') {
        sanitized[key] = '[object]'; // Don't store object contents
      }
    }
    
    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /key/i,
      /secret/i,
      /auth/i,
      /credential/i,
      /api[_-]?key/i,
      /access[_-]?token/i
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  private sanitizeString(value: string): string {
    // Remove file paths, replace with generic indicators
    if (value.includes('/') || value.includes('\\')) {
      return '[file_path]';
    }
    
    // Remove URLs
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return '[url]';
    }
    
    // Truncate long strings
    if (value.length > 100) {
      return value.substring(0, 100) + '...[truncated]';
    }
    
    return value;
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove file paths from error messages
    return message
      .replace(/\/[^\s]+/g, '[path]')
      .replace(/\\[^\s]+/g, '[path]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]')
      .substring(0, 200); // Limit error message length
  }

  private storeEventLocally(event: TelemetryEvent): void {
    const events = this.getStoredEvents();
    events.push(event);
    
    // Keep only last 1000 events to prevent storage bloat
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    this.context.globalState.update('telemetry.events', events);
  }

  private getStoredEvents(): TelemetryEvent[] {
    return this.context.globalState.get<TelemetryEvent[]>('telemetry.events', []);
  }

  private getMostUsedCommands(events: TelemetryEvent[]): Array<{ command: string; count: number }> {
    const commandCounts: Record<string, number> = {};
    
    events
      .filter(e => e.name === 'command.executed')
      .forEach(e => {
        const command = e.properties.command;
        if (command) {
          commandCounts[command] = (commandCounts[command] || 0) + 1;
        }
      });
    
    return Object.entries(commandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([command, count]) => ({ command, count }));
  }

  private getFeatureUsageStats(events: TelemetryEvent[]): Record<string, number> {
    const featureCounts: Record<string, number> = {};
    
    events
      .filter(e => e.name === 'feature.used')
      .forEach(e => {
        const feature = e.properties.feature;
        if (feature) {
          featureCounts[feature] = (featureCounts[feature] || 0) + 1;
        }
      });
    
    return featureCounts;
  }
}

/**
 * Telemetry event interface
 */
interface TelemetryEvent {
  name: string;
  timestamp: string;
  sessionId: string;
  properties: Record<string, any>;
}

/**
 * Usage statistics interface
 */
interface UsageStatistics {
  totalEvents: number;
  sessionCount: number;
  mostUsedCommands: Array<{ command: string; count: number }>;
  errorCount: number;
  featureUsage: Record<string, number>;
  timeRange: { start: string; end: string } | null;
}