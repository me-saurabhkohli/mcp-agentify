import winston from 'winston';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';

/**
 * Enterprise audit logging service
 * Provides structured, tamper-evident audit trails for all operations
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private logger!: winston.Logger;
  private sessionId: string;
  private userId: string = 'anonymous';

  private constructor() {
    this.sessionId = crypto.randomUUID();
    this.initializeLogger();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private initializeLogger(): void {
    const logDir = process.env.AUDIT_LOG_DIR || path.join(process.cwd(), 'logs');
    
    // Ensure log directory exists
    require('fs').mkdirSync(logDir, { recursive: true });

    this.logger = winston.createLogger({
      level: process.env.AUDIT_LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info) => {
          // Add audit-specific metadata
          const auditInfo = {
            ...info,
            sessionId: this.sessionId,
            userId: this.userId,
            hostname: os.hostname(),
            pid: process.pid,
            version: process.env.npm_package_version || 'unknown',
            hash: this.generateHash(info)
          };
          return JSON.stringify(auditInfo);
        })
      ),
      transports: [
        // File transport for audit logs
        new winston.transports.File({
          filename: path.join(logDir, 'audit.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
          tailable: true
        }),
        // Separate file for security events
        new winston.transports.File({
          filename: path.join(logDir, 'security.log'),
          level: 'warn',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 10
        })
      ]
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  /**
   * Generate hash for log integrity
   */
  private generateHash(logEntry: any): string {
    const content = JSON.stringify({
      timestamp: logEntry.timestamp,
      level: logEntry.level,
      message: logEntry.message,
      sessionId: this.sessionId
    });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Set the current user ID for audit context
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.logSecurityEvent('USER_CONTEXT_SET', { userId });
  }

  /**
   * Log command execution
   */
  logCommand(command: string, args: any, result: 'success' | 'failure', duration?: number): void {
    this.logger.info('COMMAND_EXECUTED', {
      eventType: 'COMMAND_EXECUTION',
      command,
      args: this.sanitizeArgs(args),
      result,
      duration,
      workingDirectory: process.cwd()
    });
  }

  /**
   * Log file system operations
   */
  logFileOperation(operation: 'READ' | 'WRITE' | 'DELETE' | 'CREATE', filePath: string, success: boolean): void {
    this.logger.info('FILE_OPERATION', {
      eventType: 'FILE_SYSTEM',
      operation,
      filePath: this.sanitizePath(filePath),
      success,
      cwd: process.cwd()
    });
  }

  /**
   * Log configuration changes
   */
  logConfigChange(configType: string, changes: any, source: string): void {
    this.logger.info('CONFIG_CHANGED', {
      eventType: 'CONFIGURATION',
      configType,
      changes: this.sanitizeConfig(changes),
      source
    });
  }

  /**
   * Log security events (authentication, authorization, validation failures)
   */
  logSecurityEvent(eventType: string, details: any, severity: 'info' | 'warn' | 'error' = 'info'): void {
    this.logger.log(severity, 'SECURITY_EVENT', {
      eventType: 'SECURITY',
      securityEventType: eventType,
      details: this.sanitizeSecurityDetails(details)
    });
  }

  /**
   * Log validation failures
   */
  logValidationFailure(inputType: string, input: any, errors: string[]): void {
    this.logSecurityEvent('VALIDATION_FAILURE', {
      inputType,
      input: this.sanitizeInput(input),
      errors
    }, 'warn');
  }

  /**
   * Log access attempts
   */
  logAccessAttempt(resource: string, permission: string, granted: boolean, reason?: string): void {
    this.logSecurityEvent('ACCESS_ATTEMPT', {
      resource,
      permission,
      granted,
      reason
    }, granted ? 'info' : 'warn');
  }

  /**
   * Log network operations
   */
  logNetworkOperation(operation: string, endpoint: string, success: boolean, responseCode?: number): void {
    this.logger.info('NETWORK_OPERATION', {
      eventType: 'NETWORK',
      operation,
      endpoint: this.sanitizeUrl(endpoint),
      success,
      responseCode
    });
  }

  /**
   * Log error events
   */
  logError(error: Error, context?: any): void {
    this.logger.error('ERROR_OCCURRED', {
      eventType: 'ERROR',
      errorMessage: error.message,
      errorStack: error.stack,
      context: context ? this.sanitizeContext(context) : undefined
    });
  }

  /**
   * Log startup and shutdown events
   */
  logSystemEvent(eventType: 'STARTUP' | 'SHUTDOWN', details?: any): void {
    this.logger.info('SYSTEM_EVENT', {
      eventType: 'SYSTEM',
      systemEventType: eventType,
      details,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });
  }

  // Sanitization methods to prevent sensitive data leakage

  private sanitizeArgs(args: any): any {
    if (!args || typeof args !== 'object') return args;
    
    const sanitized = { ...args };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizePath(filePath: string): string {
    // Remove user home directory from paths for privacy
    const homeDir = os.homedir();
    return filePath.replace(homeDir, '~');
  }

  private sanitizeConfig(config: any): any {
    if (!config || typeof config !== 'object') return config;
    
    const sanitized = JSON.parse(JSON.stringify(config));
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    const sanitizeRecursive = (obj: any): void => {
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeRecursive(obj[key]);
        }
      }
    };
    
    sanitizeRecursive(sanitized);
    return sanitized;
  }

  private sanitizeSecurityDetails(details: any): any {
    if (!details || typeof details !== 'object') return details;
    
    const sanitized = { ...details };
    
    // Always redact certain fields in security events
    const alwaysRedact = ['password', 'token', 'secret', 'hash', 'credential'];
    for (const key of alwaysRedact) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Truncate long inputs
      return input.length > 500 ? input.substring(0, 500) + '...[TRUNCATED]' : input;
    }
    return input;
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove query parameters that might contain sensitive data
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      return '[INVALID_URL]';
    }
  }

  private sanitizeContext(context: any): any {
    if (!context || typeof context !== 'object') return context;
    
    const sanitized = JSON.parse(JSON.stringify(context));
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Flush all pending logs (useful for shutdown)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.end(() => {
        resolve();
      });
    });
  }
}