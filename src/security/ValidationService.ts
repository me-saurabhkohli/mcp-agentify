import Joi from 'joi';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Enterprise-grade input validation service using Joi
 * Provides comprehensive validation for all CLI inputs and configurations
 */
export class ValidationService {
  // Base schemas for common data types
  private static readonly pathSchema = Joi.string()
    .pattern(/^[a-zA-Z0-9._\/-]+$/)
    .min(1)
    .max(500)
    .custom((value, helpers) => {
      // Prevent path traversal attacks
      if (value.includes('..') || value.includes('~')) {
        return helpers.error('any.invalid');
      }
      return value;
    });

  private static readonly projectNameSchema = Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Project name must contain only alphanumeric characters',
      'string.min': 'Project name must be at least 3 characters long',
      'string.max': 'Project name cannot exceed 50 characters'
    });

  private static readonly versionSchema = Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/)
    .required()
    .messages({
      'string.pattern.base': 'Version must follow semantic versioning (e.g., 1.0.0)'
    });

  // CLI command validation schemas
  private static readonly generateCommandSchema = Joi.object({
    project: this.pathSchema.default('.'),
    output: this.pathSchema.default('./mcp-server'),
    type: Joi.string().valid('rest-api', 'nodejs', 'openapi', 'auto').default('auto'),
    config: this.pathSchema.optional(),
    dryRun: Joi.boolean().default(false)
  }).unknown(false);

  private static readonly analyzeCommandSchema = Joi.object({
    project: this.pathSchema.default('.'),
    type: Joi.string().valid('rest-api', 'nodejs', 'openapi', 'auto').default('auto'),
    json: Joi.boolean().default(false)
  }).unknown(false);

  // Configuration file validation schema
  private static readonly configSchema = Joi.object({
    serverName: this.projectNameSchema,
    description: Joi.string().min(10).max(200).required(),
    version: this.versionSchema,
    outputFormat: Joi.string().valid('typescript', 'javascript').default('typescript'),
    includeTests: Joi.boolean().default(true),
    includeDocumentation: Joi.boolean().default(true),
    excludeEndpoints: Joi.array().items(
      Joi.string().pattern(/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD):\/.*$/)
    ).default([]),
    transformRules: Joi.array().items(
      Joi.object({
        pattern: Joi.string().required(),
        replacement: Joi.string().required(),
        type: Joi.string().valid('endpoint', 'parameter').required()
      })
    ).default([]),
    security: Joi.object({
      enableAuditLogging: Joi.boolean().default(true),
      enableRBAC: Joi.boolean().default(false),
      secretsProvider: Joi.string().valid('env', 'vault', 'aws', 'azure').default('env'),
      allowedOrigins: Joi.array().items(Joi.string().uri()).default([]),
      rateLimiting: Joi.object({
        enabled: Joi.boolean().default(true),
        maxRequests: Joi.number().integer().min(1).max(10000).default(100),
        windowMs: Joi.number().integer().min(1000).max(3600000).default(60000) // 1 minute
      }).default({})
    }).default({})
  });

  // Enterprise configuration schema
  private static readonly enterpriseConfigSchema = Joi.object({
    enterprise: Joi.object({
      security: Joi.object({
        vault: Joi.object({
          provider: Joi.string().valid('hashicorp', 'aws', 'azure', 'gcp').required(),
          endpoint: Joi.string().uri().required(),
          authMethod: Joi.string().valid('token', 'kubernetes', 'aws', 'azure').required(),
          namespace: Joi.string().optional()
        }).optional(),
        rbac: Joi.object({
          enabled: Joi.boolean().required(),
          provider: Joi.string().valid('okta', 'azure-ad', 'ldap', 'local').required(),
          groups: Joi.array().items(Joi.string()).required()
        }).optional(),
        compliance: Joi.object({
          auditLevel: Joi.string().valid('minimal', 'standard', 'verbose').default('standard'),
          retentionDays: Joi.number().integer().min(1).max(2555).default(90), // Max 7 years
          encryptionAtRest: Joi.boolean().default(true)
        }).default({})
      }).required(),
      monitoring: Joi.object({
        metrics: Joi.object({
          provider: Joi.string().valid('prometheus', 'datadog', 'newrelic').required(),
          endpoint: Joi.string().uri().optional()
        }).optional(),
        logging: Joi.object({
          level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
          format: Joi.string().valid('json', 'text').default('json'),
          destination: Joi.string().optional()
        }).default({})
      }).optional()
    }).required()
  });

  /**
   * Validate CLI command arguments
   */
  static validateCommand(command: string, args: any): { error?: string; value?: any } {
    let schema: Joi.ObjectSchema;
    
    switch (command) {
      case 'generate':
        schema = this.generateCommandSchema;
        break;
      case 'analyze':
        schema = this.analyzeCommandSchema;
        break;
      default:
        return { error: `Unknown command: ${command}` };
    }

    const { error, value } = schema.validate(args, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return { 
        error: error.details.map(detail => detail.message).join('; ') 
      };
    }

    return { value };
  }

  /**
   * Validate configuration file
   */
  static validateConfig(config: any): { error?: string; value?: any } {
    const { error, value } = this.configSchema.validate(config, {
      abortEarly: false,
      allowUnknown: false
    });

    if (error) {
      return { 
        error: error.details.map(detail => detail.message).join('; ') 
      };
    }

    return { value };
  }

  /**
   * Validate enterprise configuration
   */
  static validateEnterpriseConfig(config: any): { error?: string; value?: any } {
    const { error, value } = this.enterpriseConfigSchema.validate(config, {
      abortEarly: false,
      allowUnknown: false
    });

    if (error) {
      return { 
        error: error.details.map(detail => detail.message).join('; ') 
      };
    }

    return { value };
  }

  /**
   * Sanitize file path to prevent directory traversal
   */
  static sanitizePath(inputPath: string): string {
    // Resolve path and ensure it's within allowed boundaries
    const resolvedPath = path.resolve(inputPath);
    const normalizedPath = path.normalize(resolvedPath);
    
    // Remove any attempts at directory traversal
    return normalizedPath.replace(/\.\./g, '').replace(/~/g, '');
  }

  /**
   * Validate that a path exists and is accessible
   */
  static async validatePathExists(filePath: string): Promise<{ exists: boolean; isDirectory: boolean; error?: string }> {
    try {
      const sanitizedPath = this.sanitizePath(filePath);
      const stats = await fs.promises.stat(sanitizedPath);
      
      return {
        exists: true,
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      return {
        exists: false,
        isDirectory: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate endpoint pattern
   */
  static validateEndpointPattern(endpoint: string): boolean {
    const endpointPattern = /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD):\/[a-zA-Z0-9\/_\-{}:*]*$/;
    return endpointPattern.test(endpoint);
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"'%;()&+]/g, '') // Remove potentially dangerous characters
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate API endpoint URL
   */
  static validateApiEndpoint(url: string): { valid: boolean; error?: string } {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
      }
      
      // Prevent localhost/private network access in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = urlObj.hostname;
        if (hostname === 'localhost' || 
            hostname.startsWith('127.') || 
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
          return { valid: false, error: 'Private network access not allowed in production' };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
}