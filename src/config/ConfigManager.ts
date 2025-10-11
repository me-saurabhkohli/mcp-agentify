import * as fs from 'fs-extra';
import * as path from 'path';
import inquirer from 'inquirer';
import { MCPConfig } from '../types';

export class ConfigManager {
  private defaultConfig: MCPConfig = {
    serverName: 'agentify-mcp-server',
    description: 'Auto-generated MCP server via Agentify',
    version: '1.0.0',
    outputFormat: 'typescript',
    includeTests: true,
    includeDocumentation: true,
    excludeEndpoints: [],
    transformRules: []
  };

  async loadConfig(configPath?: string): Promise<MCPConfig> {
    if (configPath && await fs.pathExists(configPath)) {
      const userConfig = await fs.readJson(configPath);
      return { ...this.defaultConfig, ...userConfig };
    }

    // Look for default config files
    const defaultPaths = [
      './agentify.config.json',
      './mcp-generator.config.json',
      './.agentifyrc.json'
    ];

    for (const defaultPath of defaultPaths) {
      if (await fs.pathExists(defaultPath)) {
        const userConfig = await fs.readJson(defaultPath);
        return { ...this.defaultConfig, ...userConfig };
      }
    }

    return this.defaultConfig;
  }

  async init(outputPath: string): Promise<void> {
    console.log('🛠️  Let\'s configure your Agentify MCP generator...');
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'serverName',
        message: 'What should we name your MCP server?',
        default: this.defaultConfig.serverName
      },
      {
        type: 'input',
        name: 'description',
        message: 'Provide a description for your MCP server:',
        default: this.defaultConfig.description
      },
      {
        type: 'input',
        name: 'version',
        message: 'Version number:',
        default: this.defaultConfig.version
      },
      {
        type: 'list',
        name: 'outputFormat',
        message: 'Choose output format:',
        choices: [
          { name: 'TypeScript', value: 'typescript' },
          { name: 'JavaScript', value: 'javascript' }
        ],
        default: 'typescript'
      },
      {
        type: 'confirm',
        name: 'includeTests',
        message: 'Include test files?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeDocumentation',
        message: 'Generate documentation?',
        default: true
      }
    ]);

    const config: MCPConfig = {
      ...this.defaultConfig,
      ...answers
    };

    await fs.writeJson(outputPath, config, { spaces: 2 });
  }

  async saveConfig(config: MCPConfig, outputPath: string): Promise<void> {
    await fs.writeJson(outputPath, config, { spaces: 2 });
  }
}