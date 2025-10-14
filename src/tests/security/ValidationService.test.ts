import { ValidationService } from '../../security/ValidationService';

describe('ValidationService', () => {
  describe('validateCommand', () => {
    it('should validate generate command with valid arguments', () => {
      const result = ValidationService.validateCommand('generate', {
        project: './test-project',
        output: './output',
        type: 'rest-api',
        dryRun: false
      });

      expect(result.error).toBeUndefined();
      expect(result.value).toBeDefined();
      expect(result.value.project).toBe('./test-project');
      expect(result.value.type).toBe('rest-api');
    });

    it('should reject generate command with invalid project type', () => {
      const result = ValidationService.validateCommand('generate', {
        type: 'invalid-type'
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('must be one of');
    });

    it('should reject command with path traversal attempt', () => {
      const result = ValidationService.validateCommand('generate', {
        project: '../../../etc/passwd'
      });

      expect(result.error).toBeDefined();
    });

    it('should validate analyze command', () => {
      const result = ValidationService.validateCommand('analyze', {
        project: './test',
        json: true
      });

      expect(result.error).toBeUndefined();
      expect(result.value).toBeDefined();
      expect(result.value.json).toBe(true);
    });
  });

  describe('sanitizePath', () => {
    it('should remove path traversal attempts', () => {
      const sanitized = ValidationService.sanitizePath('../../../etc/passwd');
      expect(sanitized).not.toContain('..');
    });

    it('should remove tilde expansion attempts', () => {
      const sanitized = ValidationService.sanitizePath('~/secrets');
      expect(sanitized).not.toContain('~');
    });
  });

  describe('validateApiEndpoint', () => {
    it('should accept valid HTTPS URLs', () => {
      const result = ValidationService.validateApiEndpoint('https://api.example.com/v1');
      expect(result.valid).toBe(true);
    });

    it('should accept valid HTTP URLs', () => {
      const result = ValidationService.validateApiEndpoint('http://localhost:3000');
      expect(result.valid).toBe(true);
    });

    it('should reject non-HTTP protocols', () => {
      const result = ValidationService.validateApiEndpoint('ftp://example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTP and HTTPS');
    });

    it('should reject invalid URLs', () => {
      const result = ValidationService.validateApiEndpoint('not-a-url');
      expect(result.valid).toBe(false);
    });

    it('should reject localhost in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = ValidationService.validateApiEndpoint('http://localhost:3000');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Private network access');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const sanitized = ValidationService.sanitizeInput('<script>alert("xss")</script>');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should limit input length', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = ValidationService.sanitizeInput(longInput);
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    it('should trim whitespace', () => {
      const sanitized = ValidationService.sanitizeInput('  test  ');
      expect(sanitized).toBe('test');
    });
  });
});