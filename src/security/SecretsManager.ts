import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Enterprise secrets management service
 * Supports multiple secret providers: Environment variables, HashiCorp Vault, AWS Secrets Manager, Azure Key Vault
 */
export class SecretsManager {
  private static instance: SecretsManager;
  private provider: SecretProvider;
  private encryptionKey: Buffer;

  private constructor() {
    this.encryptionKey = this.generateOrLoadEncryptionKey();
    this.provider = this.initializeProvider();
  }

  static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  private initializeProvider(): SecretProvider {
    const providerType = process.env.SECRETS_PROVIDER || 'env';
    
    switch (providerType) {
      case 'vault':
        return new VaultProvider();
      case 'aws':
        return new AWSSecretsProvider();
      case 'azure':
        return new AzureKeyVaultProvider();
      case 'env':
      default:
        return new EnvironmentProvider();
    }
  }

  private generateOrLoadEncryptionKey(): Buffer {
    const keyPath = path.join(process.cwd(), '.secrets', 'encryption.key');
    
    try {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath);
      }
    } catch (error) {
      // Key file doesn't exist or can't be read, generate new one
    }

    // Generate new encryption key
    const key = crypto.randomBytes(32);
    
    try {
      fs.ensureDirSync(path.dirname(keyPath));
      fs.writeFileSync(keyPath, key, { mode: 0o600 }); // Restrict access
    } catch (error) {
      console.warn('Warning: Could not save encryption key to disk. Using in-memory key.');
    }

    return key;
  }

  /**
   * Get a secret value
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      return await this.provider.getSecret(key);
    } catch (error) {
      console.error(`Failed to retrieve secret '${key}':`, error);
      return null;
    }
  }

  /**
   * Set a secret value (for supported providers)
   */
  async setSecret(key: string, value: string): Promise<boolean> {
    try {
      return await this.provider.setSecret(key, value);
    } catch (error) {
      console.error(`Failed to set secret '${key}':`, error);
      return false;
    }
  }

  /**
   * Delete a secret (for supported providers)
   */
  async deleteSecret(key: string): Promise<boolean> {
    try {
      return await this.provider.deleteSecret(key);
    } catch (error) {
      console.error(`Failed to delete secret '${key}':`, error);
      return false;
    }
  }

  /**
   * Encrypt sensitive data for local storage
   */
  encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data from local storage
   */
  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get all available secrets (metadata only, not values)
   */
  async listSecrets(): Promise<string[]> {
    try {
      return await this.provider.listSecrets();
    } catch (error) {
      console.error('Failed to list secrets:', error);
      return [];
    }
  }
}

/**
 * Abstract base class for secret providers
 */
abstract class SecretProvider {
  abstract getSecret(key: string): Promise<string | null>;
  abstract setSecret(key: string, value: string): Promise<boolean>;
  abstract deleteSecret(key: string): Promise<boolean>;
  abstract listSecrets(): Promise<string[]>;
}

/**
 * Environment variables provider (default)
 */
class EnvironmentProvider extends SecretProvider {
  async getSecret(key: string): Promise<string | null> {
    return process.env[key] || null;
  }

  async setSecret(key: string, value: string): Promise<boolean> {
    process.env[key] = value;
    return true;
  }

  async deleteSecret(key: string): Promise<boolean> {
    delete process.env[key];
    return true;
  }

  async listSecrets(): Promise<string[]> {
    return Object.keys(process.env).filter(key => 
      key.includes('SECRET') || 
      key.includes('TOKEN') || 
      key.includes('PASSWORD') ||
      key.includes('KEY')
    );
  }
}

/**
 * HashiCorp Vault provider
 */
class VaultProvider extends SecretProvider {
  private vaultEndpoint: string;
  private vaultToken: string;
  private vaultNamespace: string;

  constructor() {
    super();
    this.vaultEndpoint = process.env.VAULT_ENDPOINT || 'http://localhost:8200';
    this.vaultToken = process.env.VAULT_TOKEN || '';
    this.vaultNamespace = process.env.VAULT_NAMESPACE || 'secret';

    if (!this.vaultToken) {
      throw new Error('VAULT_TOKEN environment variable is required for Vault provider');
    }
  }

  async getSecret(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.vaultEndpoint}/v1/${this.vaultNamespace}/data/${key}`, {
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Secret doesn't exist
        }
        throw new Error(`Vault API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.data?.value || null;
    } catch (error) {
      console.error('Vault getSecret error:', error);
      return null;
    }
  }

  async setSecret(key: string, value: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.vaultEndpoint}/v1/${this.vaultNamespace}/data/${key}`, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { value }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Vault setSecret error:', error);
      return false;
    }
  }

  async deleteSecret(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.vaultEndpoint}/v1/${this.vaultNamespace}/data/${key}`, {
        method: 'DELETE',
        headers: {
          'X-Vault-Token': this.vaultToken
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Vault deleteSecret error:', error);
      return false;
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const response = await fetch(`${this.vaultEndpoint}/v1/${this.vaultNamespace}/metadata?list=true`, {
        headers: {
          'X-Vault-Token': this.vaultToken
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data?.keys || [];
    } catch (error) {
      console.error('Vault listSecrets error:', error);
      return [];
    }
  }
}

/**
 * AWS Secrets Manager provider
 */
class AWSSecretsProvider extends SecretProvider {
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    super();
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials are required for AWS Secrets Manager provider');
    }
  }

  async getSecret(key: string): Promise<string | null> {
    // Note: This would require the AWS SDK
    // For now, return null to indicate the feature needs AWS SDK integration
    console.warn('AWS Secrets Manager provider requires AWS SDK integration');
    return null;
  }

  async setSecret(key: string, value: string): Promise<boolean> {
    console.warn('AWS Secrets Manager provider requires AWS SDK integration');
    return false;
  }

  async deleteSecret(key: string): Promise<boolean> {
    console.warn('AWS Secrets Manager provider requires AWS SDK integration');
    return false;
  }

  async listSecrets(): Promise<string[]> {
    console.warn('AWS Secrets Manager provider requires AWS SDK integration');
    return [];
  }
}

/**
 * Azure Key Vault provider
 */
class AzureKeyVaultProvider extends SecretProvider {
  private vaultUrl: string;
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;

  constructor() {
    super();
    this.vaultUrl = process.env.AZURE_KEY_VAULT_URL || '';
    this.clientId = process.env.AZURE_CLIENT_ID || '';
    this.clientSecret = process.env.AZURE_CLIENT_SECRET || '';
    this.tenantId = process.env.AZURE_TENANT_ID || '';

    if (!this.vaultUrl || !this.clientId || !this.clientSecret || !this.tenantId) {
      throw new Error('Azure Key Vault credentials are required for Azure provider');
    }
  }

  async getSecret(key: string): Promise<string | null> {
    // Note: This would require the Azure SDK
    // For now, return null to indicate the feature needs Azure SDK integration
    console.warn('Azure Key Vault provider requires Azure SDK integration');
    return null;
  }

  async setSecret(key: string, value: string): Promise<boolean> {
    console.warn('Azure Key Vault provider requires Azure SDK integration');
    return false;
  }

  async deleteSecret(key: string): Promise<boolean> {
    console.warn('Azure Key Vault provider requires Azure SDK integration');
    return false;
  }

  async listSecrets(): Promise<string[]> {
    console.warn('Azure Key Vault provider requires Azure SDK integration');
    return [];
  }
}

export { SecretProvider };