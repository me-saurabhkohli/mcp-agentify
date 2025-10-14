/**
 * Security module exports
 * Provides enterprise-grade security features for MCP Agentify CLI
 */

export { ValidationService } from './ValidationService';
export { AuditLogger } from './AuditLogger';
export { SecretsManager, SecretProvider } from './SecretsManager';
export { 
  RBACService, 
  User, 
  Role, 
  Session, 
  UserProfile, 
  AuthResult, 
  UserContext, 
  TokenVerificationResult 
} from './RBACService';
export { 
  SecurityMiddleware, 
  SecureCommandResult, 
  RateLimitResult 
} from './SecurityMiddleware';

/**
 * Security initialization utility
 */
export class SecurityManager {
  private static initialized = false;

  /**
   * Initialize all security services
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const auditLogger = AuditLogger.getInstance();
    const rbacService = RBACService.getInstance();
    const secretsManager = SecretsManager.getInstance();

    // Log security initialization
    auditLogger.logSystemEvent('STARTUP', {
      component: 'SECURITY',
      rbacEnabled: process.env.RBAC_ENABLED === 'true',
      auditingEnabled: process.env.ENABLE_AUDIT_LOGGING !== 'false',
      secretsProvider: process.env.SECRETS_PROVIDER || 'env',
      rateLimitingEnabled: process.env.RATE_LIMITING_ENABLED === 'true'
    });

    this.initialized = true;
  }

  /**
   * Check if security is properly configured
   */
  static validateSecurityConfig(): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check JWT secret in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be set and at least 32 characters long in production');
      }

      if (process.env.DEFAULT_ADMIN_PASSWORD === 'admin123!') {
        errors.push('DEFAULT_ADMIN_PASSWORD must be changed from default value in production');
      }
    }

    // Check RBAC configuration
    if (process.env.RBAC_ENABLED === 'true') {
      if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required when RBAC is enabled');
      }
    }

    // Check secrets provider configuration
    const secretsProvider = process.env.SECRETS_PROVIDER;
    if (secretsProvider === 'vault') {
      if (!process.env.VAULT_ENDPOINT || !process.env.VAULT_TOKEN) {
        errors.push('VAULT_ENDPOINT and VAULT_TOKEN are required for Vault secrets provider');
      }
    } else if (secretsProvider === 'aws') {
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        errors.push('AWS credentials are required for AWS Secrets Manager provider');
      }
    } else if (secretsProvider === 'azure') {
      if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET) {
        errors.push('Azure credentials are required for Azure Key Vault provider');
      }
    }

    // Security warnings
    if (!process.env.ENABLE_AUDIT_LOGGING || process.env.ENABLE_AUDIT_LOGGING !== 'true') {
      warnings.push('Audit logging is disabled - consider enabling for compliance');
    }

    if (!process.env.RATE_LIMITING_ENABLED || process.env.RATE_LIMITING_ENABLED !== 'true') {
      warnings.push('Rate limiting is disabled - consider enabling for security');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }
}

import { AuditLogger } from './AuditLogger';
import { RBACService } from './RBACService';
import { SecretsManager } from './SecretsManager';