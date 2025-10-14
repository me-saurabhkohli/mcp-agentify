import { ValidationService } from './ValidationService';
import { AuditLogger } from './AuditLogger';
import { RBACService, UserContext } from './RBACService';
import { SecretsManager } from './SecretsManager';

/**
 * Security middleware for CLI commands
 * Provides input validation, authentication, authorization, and audit logging
 */
export class SecurityMiddleware {
  private validationService: ValidationService;
  private auditLogger: AuditLogger;
  private rbacService: RBACService;
  private secretsManager: SecretsManager;
  private currentUser: UserContext | null = null;

  constructor() {
    this.validationService = new ValidationService();
    this.auditLogger = AuditLogger.getInstance();
    this.rbacService = RBACService.getInstance();
    this.secretsManager = SecretsManager.getInstance();
  }

  /**
   * Initialize security context for CLI session
   */
  async initialize(): Promise<void> {
    this.auditLogger.logSystemEvent('STARTUP', {
      version: process.env.npm_package_version || 'unknown',
      nodeVersion: process.version,
      platform: process.platform
    });

    // Check if RBAC is enabled
    const rbacEnabled = process.env.RBAC_ENABLED === 'true';
    if (rbacEnabled) {
      await this.authenticateUser();
    }

    // Initialize secrets manager
    const apiKey = await this.secretsManager.getSecret('MCP_API_KEY');
    if (apiKey) {
      this.auditLogger.logSecurityEvent('SECRET_LOADED', { secretType: 'API_KEY' });
    }
  }

  /**
   * Authenticate user for CLI session
   */
  private async authenticateUser(): Promise<void> {
    const token = process.env.MCP_AUTH_TOKEN;
    if (token) {
      const verification = this.rbacService.verifyToken(token);
      if (verification.valid && verification.user) {
        this.currentUser = verification.user;
        this.auditLogger.setUserId(verification.user.username);
        this.auditLogger.logSecurityEvent('USER_AUTHENTICATED', {
          username: verification.user.username,
          roles: verification.user.roles
        });
      } else {
        throw new Error('Invalid authentication token. Please login again.');
      }
    } else {
      throw new Error('Authentication required. Set MCP_AUTH_TOKEN environment variable.');
    }
  }

  /**
   * Validate and secure command execution
   */
  async validateCommand(command: string, args: any): Promise<SecureCommandResult> {
    const startTime = Date.now();

    try {
      // 1. Input validation
      const validation = ValidationService.validateCommand(command, args);
      if (validation.error) {
        this.auditLogger.logValidationFailure('command', { command, args }, [validation.error]);
        return {
          success: false,
          error: `Input validation failed: ${validation.error}`,
          securityViolation: true
        };
      }

      // 2. Authorization check
      if (this.currentUser) {
        const permission = `${command}:execute`;
        if (!this.rbacService.hasPermission(this.currentUser, permission)) {
          this.auditLogger.logSecurityEvent('AUTHORIZATION_FAILED', {
            username: this.currentUser.username,
            command,
            permission,
            reason: 'INSUFFICIENT_PERMISSIONS'
          }, 'warn');
          
          return {
            success: false,
            error: `Access denied. Required permission: ${permission}`,
            securityViolation: true
          };
        }
      }

      // 3. Path validation
      if (validation.value?.project) {
        const pathValidation = await ValidationService.validatePathExists(validation.value.project);
        if (!pathValidation.exists) {
          this.auditLogger.logSecurityEvent('PATH_ACCESS_DENIED', {
            path: validation.value.project,
            reason: 'PATH_NOT_EXISTS'
          }, 'warn');
          
          return {
            success: false,
            error: `Project path does not exist: ${validation.value.project}`,
            securityViolation: false
          };
        }
      }

      // 4. Rate limiting (if enabled)
      if (process.env.RATE_LIMITING_ENABLED === 'true') {
        const rateLimitResult = await this.checkRateLimit(command);
        if (!rateLimitResult.allowed) {
          this.auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
            command,
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining
          }, 'warn');
          
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            securityViolation: true
          };
        }
      }

      const duration = Date.now() - startTime;
      this.auditLogger.logCommand(command, validation.value, 'success', duration);

      return {
        success: true,
        validatedArgs: validation.value
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.auditLogger.logCommand(command, args, 'failure', duration);
      this.auditLogger.logError(error as Error, { command, args });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown security error',
        securityViolation: true
      };
    }
  }

  /**
   * Validate file operations
   */
  async validateFileOperation(operation: 'READ' | 'WRITE' | 'DELETE' | 'CREATE', filePath: string): Promise<boolean> {
    try {
      // Sanitize path
      const sanitizedPath = ValidationService.sanitizePath(filePath);
      
      // Check if user has file operation permissions
      if (this.currentUser) {
        const permission = `file:${operation.toLowerCase()}`;
        if (!this.rbacService.hasPermission(this.currentUser, permission)) {
          this.auditLogger.logSecurityEvent('FILE_ACCESS_DENIED', {
            username: this.currentUser.username,
            operation,
            filePath: sanitizedPath,
            reason: 'INSUFFICIENT_PERMISSIONS'
          }, 'warn');
          return false;
        }
      }

      this.auditLogger.logFileOperation(operation, sanitizedPath, true);
      return true;

    } catch (error) {
      this.auditLogger.logFileOperation(operation, filePath, false);
      this.auditLogger.logError(error as Error, { operation, filePath });
      return false;
    }
  }

  /**
   * Validate network operations
   */
  async validateNetworkOperation(url: string): Promise<boolean> {
    try {
      // Validate URL format and security
      const urlValidation = ValidationService.validateApiEndpoint(url);
      if (!urlValidation.valid) {
        this.auditLogger.logSecurityEvent('NETWORK_ACCESS_DENIED', {
          url,
          reason: urlValidation.error
        }, 'warn');
        return false;
      }

      // Check network permissions
      if (this.currentUser && !this.rbacService.hasPermission(this.currentUser, 'network:access')) {
        this.auditLogger.logSecurityEvent('NETWORK_ACCESS_DENIED', {
          username: this.currentUser.username,
          url,
          reason: 'INSUFFICIENT_PERMISSIONS'
        }, 'warn');
        return false;
      }

      this.auditLogger.logNetworkOperation('REQUEST', url, true);
      return true;

    } catch (error) {
      this.auditLogger.logNetworkOperation('REQUEST', url, false);
      this.auditLogger.logError(error as Error, { url });
      return false;
    }
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(command: string): Promise<RateLimitResult> {
    // Simple in-memory rate limiting (in production, use Redis or similar)
    const key = `rate_limit:${this.currentUser?.username || 'anonymous'}:${command}`;
    const limit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 1 minute

    // This is a simplified implementation
    // In production, use a proper rate limiting library
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetTime: Date.now() + windowMs
    };
  }

  /**
   * Log configuration changes
   */
  logConfigChange(configType: string, oldConfig: any, newConfig: any): void {
    const changes = this.detectConfigChanges(oldConfig, newConfig);
    this.auditLogger.logConfigChange(configType, changes, 'cli');
  }

  /**
   * Detect configuration changes
   */
  private detectConfigChanges(oldConfig: any, newConfig: any): any {
    const changes: any = {};
    
    // Simple diff implementation
    const allKeys = new Set([...Object.keys(oldConfig || {}), ...Object.keys(newConfig || {})]);
    
    for (const key of allKeys) {
      const oldValue = oldConfig?.[key];
      const newValue = newConfig?.[key];
      
      if (oldValue !== newValue) {
        changes[key] = {
          from: oldValue,
          to: newValue
        };
      }
    }
    
    return changes;
  }

  /**
   * Get current user context
   */
  getCurrentUser(): UserContext | null {
    return this.currentUser;
  }

  /**
   * Cleanup security context
   */
  async cleanup(): Promise<void> {
    this.auditLogger.logSystemEvent('SHUTDOWN');
    await this.auditLogger.flush();
  }
}

// Type definitions
interface SecureCommandResult {
  success: boolean;
  error?: string;
  validatedArgs?: any;
  securityViolation?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export { SecureCommandResult, RateLimitResult };