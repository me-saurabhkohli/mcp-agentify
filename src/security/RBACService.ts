import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { AuditLogger } from './AuditLogger';

/**
 * Enterprise Role-Based Access Control (RBAC) service
 * Manages user authentication, authorization, and role-based permissions
 */
export class RBACService {
  private static instance: RBACService;
  private auditLogger: AuditLogger;
  private jwtSecret: string;
  private users: Map<string, User> = new Map();
  private roles: Map<string, Role> = new Map();
  private sessions: Map<string, Session> = new Map();

  private constructor() {
    this.auditLogger = AuditLogger.getInstance();
    this.jwtSecret = process.env.JWT_SECRET || this.generateJWTSecret();
    this.initializeDefaultRoles();
    this.initializeDefaultUsers();
  }

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  private generateJWTSecret(): string {
    const crypto = require('crypto');
    const secret = crypto.randomBytes(64).toString('hex');
    console.warn('Generated JWT secret. In production, set JWT_SECRET environment variable.');
    return secret;
  }

  private initializeDefaultRoles(): void {
    // Define default roles and permissions
    this.roles.set('admin', {
      id: 'admin',
      name: 'Administrator',
      permissions: [
        'generate:*',
        'analyze:*',
        'config:read',
        'config:write',
        'users:read',
        'users:write',
        'users:delete',
        'audit:read',
        'system:read',
        'system:write'
      ],
      description: 'Full system access'
    });

    this.roles.set('developer', {
      id: 'developer',
      name: 'Developer',
      permissions: [
        'generate:read',
        'generate:write',
        'analyze:read',
        'analyze:write',
        'config:read',
        'config:write'
      ],
      description: 'Development and generation access'
    });

    this.roles.set('viewer', {
      id: 'viewer',
      name: 'Viewer',
      permissions: [
        'generate:read',
        'analyze:read',
        'config:read'
      ],
      description: 'Read-only access'
    });

    this.roles.set('operator', {
      id: 'operator',
      name: 'Operator',
      permissions: [
        'generate:read',
        'generate:execute',
        'analyze:read',
        'analyze:execute',
        'config:read'
      ],
      description: 'Operational access for running commands'
    });
  }

  private initializeDefaultUsers(): void {
    // Create default admin user (in production, this should be done through proper user management)
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123!';
    
    if (process.env.NODE_ENV !== 'production') {
      this.createUser('admin', defaultAdminPassword, 'admin', {
        email: 'admin@company.com',
        fullName: 'System Administrator'
      });
    }
  }

  /**
   * Authenticate user with username and password
   */
  async authenticate(username: string, password: string, clientIp?: string): Promise<AuthResult> {
    this.auditLogger.logSecurityEvent('AUTHENTICATION_ATTEMPT', {
      username,
      clientIp,
      timestamp: new Date().toISOString()
    });

    const user = this.users.get(username);
    if (!user) {
      this.auditLogger.logSecurityEvent('AUTHENTICATION_FAILED', {
        username,
        reason: 'USER_NOT_FOUND',
        clientIp
      }, 'warn');
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.active) {
      this.auditLogger.logSecurityEvent('AUTHENTICATION_FAILED', {
        username,
        reason: 'USER_INACTIVE',
        clientIp
      }, 'warn');
      return { success: false, error: 'Account is inactive' };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      user.failedLoginAttempts++;
      user.lastFailedLogin = new Date();

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.active = false;
        this.auditLogger.logSecurityEvent('ACCOUNT_LOCKED', {
          username,
          reason: 'TOO_MANY_FAILED_ATTEMPTS',
          clientIp
        }, 'error');
      }

      this.auditLogger.logSecurityEvent('AUTHENTICATION_FAILED', {
        username,
        reason: 'INVALID_PASSWORD',
        failedAttempts: user.failedLoginAttempts,
        clientIp
      }, 'warn');

      return { success: false, error: 'Invalid credentials' };
    }

    // Reset failed login attempts on successful authentication
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        roles: user.roles,
        permissions: this.getUserPermissions(user)
      },
      this.jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        issuer: 'mcp-agentify',
        audience: 'mcp-agentify-cli'
      } as jwt.SignOptions
    );

    // Create session
    const sessionId = require('crypto').randomUUID();
    this.sessions.set(sessionId, {
      id: sessionId,
      userId: user.id,
      username: user.username,
      createdAt: new Date(),
      lastActivity: new Date(),
      clientIp: clientIp || 'unknown',
      userAgent: process.env.USER_AGENT || 'cli'
    });

    this.auditLogger.logSecurityEvent('AUTHENTICATION_SUCCESS', {
      username,
      sessionId,
      clientIp
    });

    return {
      success: true,
      token,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles,
        permissions: this.getUserPermissions(user),
        profile: user.profile
      }
    };
  }

  /**
   * Verify JWT token and return user context
   */
  verifyToken(token: string): TokenVerificationResult {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Check if user still exists and is active
      const user = this.users.get(decoded.username);
      if (!user || !user.active) {
        return { valid: false, error: 'User no longer active' };
      }

      return {
        valid: true,
        user: {
          id: decoded.userId,
          username: decoded.username,
          roles: decoded.roles,
          permissions: decoded.permissions
        }
      };
    } catch (error) {
      this.auditLogger.logSecurityEvent('TOKEN_VERIFICATION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'warn');
      
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userContext: UserContext, permission: string): boolean {
    const hasPermission = userContext.permissions.some(p => {
      // Support wildcard permissions (e.g., "generate:*")
      if (p.endsWith('*')) {
        const prefix = p.slice(0, -1);
        return permission.startsWith(prefix);
      }
      return p === permission;
    });

    this.auditLogger.logAccessAttempt(permission, 'permission', hasPermission);
    
    return hasPermission;
  }

  /**
   * Check if user has specific role
   */
  hasRole(userContext: UserContext, role: string): boolean {
    const hasRole = userContext.roles.includes(role);
    this.auditLogger.logAccessAttempt(role, 'role', hasRole);
    return hasRole;
  }

  /**
   * Create new user
   */
  async createUser(username: string, password: string, roleId: string, profile?: UserProfile): Promise<boolean> {
    if (this.users.has(username)) {
      this.auditLogger.logSecurityEvent('USER_CREATION_FAILED', {
        username,
        reason: 'USER_EXISTS'
      }, 'warn');
      return false;
    }

    const role = this.roles.get(roleId);
    if (!role) {
      this.auditLogger.logSecurityEvent('USER_CREATION_FAILED', {
        username,
        reason: 'INVALID_ROLE',
        roleId
      }, 'warn');
      return false;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = require('crypto').randomUUID();

    const user: User = {
      id: userId,
      username,
      passwordHash,
      roles: [roleId],
      active: true,
      createdAt: new Date(),
      lastLogin: null,
      lastFailedLogin: null,
      failedLoginAttempts: 0,
      profile: profile || {}
    };

    this.users.set(username, user);

    this.auditLogger.logSecurityEvent('USER_CREATED', {
      username,
      userId,
      roles: [roleId]
    });

    return true;
  }

  /**
   * Delete user
   */
  deleteUser(username: string): boolean {
    const user = this.users.get(username);
    if (!user) {
      return false;
    }

    this.users.delete(username);

    // Invalidate all sessions for this user
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.username === username) {
        this.sessions.delete(sessionId);
      }
    }

    this.auditLogger.logSecurityEvent('USER_DELETED', {
      username,
      userId: user.id
    });

    return true;
  }

  /**
   * Add role to user
   */
  addUserRole(username: string, roleId: string): boolean {
    const user = this.users.get(username);
    const role = this.roles.get(roleId);

    if (!user || !role) {
      return false;
    }

    if (!user.roles.includes(roleId)) {
      user.roles.push(roleId);
      
      this.auditLogger.logSecurityEvent('USER_ROLE_ADDED', {
        username,
        roleId
      });
    }

    return true;
  }

  /**
   * Remove role from user
   */
  removeUserRole(username: string, roleId: string): boolean {
    const user = this.users.get(username);
    if (!user) {
      return false;
    }

    const roleIndex = user.roles.indexOf(roleId);
    if (roleIndex > -1) {
      user.roles.splice(roleIndex, 1);
      
      this.auditLogger.logSecurityEvent('USER_ROLE_REMOVED', {
        username,
        roleId
      });
    }

    return true;
  }

  /**
   * Get all permissions for a user
   */
  private getUserPermissions(user: User): string[] {
    const permissions = new Set<string>();
    
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (role) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    }
    
    return Array.from(permissions);
  }

  /**
   * Logout user (invalidate session)
   */
  logout(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      
      this.auditLogger.logSecurityEvent('USER_LOGOUT', {
        sessionId,
        username: session.username
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up expired sessions
   */
  cleanupSessions(): void {
    const now = new Date();
    const maxAge = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        
        this.auditLogger.logSecurityEvent('SESSION_EXPIRED', {
          sessionId,
          username: session.username
        });
      }
    }
  }
}

// Type definitions
interface User {
  id: string;
  username: string;
  passwordHash: string;
  roles: string[];
  active: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  lastFailedLogin: Date | null;
  failedLoginAttempts: number;
  profile: UserProfile;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  description: string;
}

interface Session {
  id: string;
  userId: string;
  username: string;
  createdAt: Date;
  lastActivity: Date;
  clientIp: string;
  userAgent: string;
}

interface UserProfile {
  email?: string;
  fullName?: string;
  department?: string;
  [key: string]: any;
}

interface AuthResult {
  success: boolean;
  token?: string;
  sessionId?: string;
  user?: UserContext;
  error?: string;
}

interface UserContext {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
  profile?: UserProfile;
}

interface TokenVerificationResult {
  valid: boolean;
  user?: UserContext;
  error?: string;
}

export { User, Role, Session, UserProfile, AuthResult, UserContext, TokenVerificationResult };