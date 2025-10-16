import * as vscode from 'vscode';

/**
 * Enhanced configuration manager with validation and defaults
 */
export class ConfigurationManager {
  private configuration: vscode.WorkspaceConfiguration;

  constructor() {
    this.configuration = vscode.workspace.getConfiguration('mcp-agentify');
  }

  /**
   * Refresh configuration cache
   */
  refresh(): void {
    this.configuration = vscode.workspace.getConfiguration('mcp-agentify');
  }

  /**
   * Get configuration value with type safety and defaults
   */
  get<T>(key: string, defaultValue: T): T {
    return this.configuration.get<T>(key) ?? defaultValue;
  }

  /**
   * Set configuration value
   */
  async set(key: string, value: any, target?: vscode.ConfigurationTarget): Promise<void> {
    await this.configuration.update(key, value, target || vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Get all configuration as an object
   */
  getAll(): Record<string, any> {
    return {
      cliPath: this.get('cliPath', 'npx mcp-agentify'),
      autoAnalyze: this.get('autoAnalyze', true),
      autoStartMCPServer: this.get('autoStartMCPServer', true),
      outputDirectory: this.get('outputDirectory', './mcp-server'),
      preferredFormat: this.get('preferredFormat', 'typescript'),
      includeTests: this.get('includeTests', true),
      includeDocumentation: this.get('includeDocumentation', true),
      enableSecurity: this.get('enableSecurity', false),
      enablePlugins: this.get('enablePlugins', true),
      showNotifications: this.get('showNotifications', true),
      debugMode: this.get('debugMode', false),
      mcpServerPort: this.get('mcpServerPort', 8890),
      openaiApiKey: this.get('openaiApiKey', ''),
      enableAI: this.get('enableAI', false),
      logLevel: this.get('logLevel', 'info'),
      telemetryEnabled: this.get('telemetryEnabled', true)
    };
  }

  /**
   * Validate configuration and return any issues
   */
  validate(): Array<{ key: string; issue: string }> {
    const issues: Array<{ key: string; issue: string }> = [];
    const config = this.getAll();

    // Validate port
    if (config.mcpServerPort < 1024 || config.mcpServerPort > 65535) {
      issues.push({
        key: 'mcpServerPort',
        issue: 'Port must be between 1024 and 65535'
      });
    }

    // Validate output directory
    if (!config.outputDirectory || config.outputDirectory.trim() === '') {
      issues.push({
        key: 'outputDirectory',
        issue: 'Output directory cannot be empty'
      });
    }

    // Validate CLI path
    if (!config.cliPath || config.cliPath.trim() === '') {
      issues.push({
        key: 'cliPath',
        issue: 'CLI path cannot be empty'
      });
    }

    // Validate AI settings
    if (config.enableAI && !config.openaiApiKey) {
      issues.push({
        key: 'openaiApiKey',
        issue: 'OpenAI API key required when AI features are enabled'
      });
    }

    return issues;
  }

  /**
   * Export configuration to a shareable format
   */
  async exportConfiguration(): Promise<Record<string, any>> {
    const config = this.getAll();
    
    // Remove sensitive data
    const exportConfig = { ...config };
    delete exportConfig.openaiApiKey;

    return {
      version: '2.0',
      timestamp: new Date().toISOString(),
      configuration: exportConfig
    };
  }

  /**
   * Import configuration from exported format
   */
  async importConfiguration(importedConfig: any): Promise<void> {
    if (!importedConfig.configuration) {
      throw new Error('Invalid configuration format');
    }

    const config = importedConfig.configuration;
    
    // Update each configuration value
    for (const [key, value] of Object.entries(config)) {
      if (key !== 'openaiApiKey') { // Skip sensitive data
        await this.set(key, value);
      }
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = {
      cliPath: 'npx mcp-agentify',
      autoAnalyze: true,
      autoStartMCPServer: true,
      outputDirectory: './mcp-server',
      preferredFormat: 'typescript',
      includeTests: true,
      includeDocumentation: true,
      enableSecurity: false,
      enablePlugins: true,
      showNotifications: true,
      debugMode: false,
      mcpServerPort: 8890,
      enableAI: false,
      logLevel: 'info',
      telemetryEnabled: true
    };

    for (const [key, value] of Object.entries(defaultConfig)) {
      await this.set(key, value);
    }
  }

  /**
   * Get generation configuration from user via UI
   */
  async getGenerationConfigFromUser(): Promise<any | null> {
    // Output path
    const outputPath = await vscode.window.showInputBox({
      prompt: 'Enter output directory for MCP server',
      value: this.get('outputDirectory', './mcp-server'),
      validateInput: (value) => {
        if (!value || value.trim() === '') {
          return 'Output directory is required';
        }
        return null;
      }
    });

    if (!outputPath) return null;

    // Format selection
    const formatOptions = [
      { label: 'TypeScript', value: 'typescript' as const },
      { label: 'JavaScript', value: 'javascript' as const }
    ];

    const format = await vscode.window.showQuickPick(formatOptions, { 
      placeHolder: 'Choose output format'
    });

    if (!format) return null;

    // Options selection
    const availableOptions = [
      { label: 'Include tests', picked: this.get('includeTests', true) },
      { label: 'Include documentation', picked: this.get('includeDocumentation', true) },
      { label: 'Enable security features', picked: this.get('enableSecurity', false) },
      { label: 'Enable AI enhancements', picked: this.get('enableAI', false) }
    ];

    const selectedOptions = await vscode.window.showQuickPick(availableOptions, { 
      placeHolder: 'Select options',
      canPickMany: true
    });

    return {
      outputPath,
      format: format.value,
      includeTests: selectedOptions?.some(o => o.label === 'Include tests') ?? true,
      includeDocumentation: selectedOptions?.some(o => o.label === 'Include documentation') ?? true,
      enableSecurity: selectedOptions?.some(o => o.label === 'Enable security features') ?? false,
      enableAI: selectedOptions?.some(o => o.label === 'Enable AI enhancements') ?? false,
      plugins: [] // TODO: Add plugin selection
    };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: 'ai' | 'security' | 'plugins' | 'telemetry' | 'debug'): boolean {
    switch (feature) {
      case 'ai':
        return this.get('enableAI', false) && !!this.get('openaiApiKey', '');
      case 'security':
        return this.get('enableSecurity', false);
      case 'plugins':
        return this.get('enablePlugins', true);
      case 'telemetry':
        return this.get('telemetryEnabled', true);
      case 'debug':
        return this.get('debugMode', false);
      default:
        return false;
    }
  }
}