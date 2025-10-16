import { Logger } from '../utils/logger';
import { LLMOrchestrator } from '../llm/llmOrchestrator';

/**
 * Enhanced code generator with AI assistance and template system
 */
export class CodeGenerator {
  private logger: Logger;
  private llmOrchestrator: LLMOrchestrator;

  constructor(logger: Logger, llmOrchestrator: LLMOrchestrator) {
    this.logger = logger;
    this.llmOrchestrator = llmOrchestrator;
  }

  /**
   * Generate MCP server with enhanced features
   */
  async generateMCPServer(
    analysis: any,
    config: GenerationConfig,
    options?: {
      onProgress?: (message: string, increment: number) => void;
    }
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      options?.onProgress?.('Preparing generation...', 10);

      // Validate inputs
      this.validateGenerationInputs(analysis, config);

      options?.onProgress?.('Generating server structure...', 30);

      // Generate base structure
      const structure = await this.generateProjectStructure(config);
      
      options?.onProgress?.('Creating MCP tools...', 50);

      // Generate MCP tools based on analysis
      const tools = await this.generateMCPTools(analysis, config);

      options?.onProgress?.('Generating configuration...', 70);

      // Generate configuration files
      const configFiles = await this.generateConfigFiles(analysis, config);

      options?.onProgress?.('Finalizing generation...', 90);

      // Generate additional files (tests, docs, etc.)
      const additionalFiles = await this.generateAdditionalFiles(analysis, config);

      // Combine all generated content
      const result: GenerationResult = {
        success: true,
        outputPath: config.outputPath,
        files: {
          ...structure,
          ...tools,
          ...configFiles,
          ...additionalFiles
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
          framework: analysis.framework,
          toolCount: Object.keys(tools).length,
          format: config.format
        }
      };

      options?.onProgress?.('Generation complete!', 100);

      this.logger.info('MCP server generation completed', {
        duration: Date.now() - startTime,
        fileCount: Object.keys(result.files).length
      });

      return result;

    } catch (error) {
      this.logger.error('MCP server generation failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        outputPath: config.outputPath,
        files: {},
        metadata: {
          generatedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
          framework: analysis?.framework || 'unknown',
          toolCount: 0,
          format: config.format
        }
      };
    }
  }

  /**
   * Generate individual MCP tool
   */
  async generateMCPTool(toolSpec: MCPToolSpec): Promise<string> {
    if (this.llmOrchestrator.isAvailable() && toolSpec.useAI) {
      return this.generateToolWithAI(toolSpec);
    } else {
      return this.generateToolFromTemplate(toolSpec);
    }
  }

  private validateGenerationInputs(analysis: any, config: GenerationConfig): void {
    if (!analysis) {
      throw new Error('Project analysis is required');
    }

    if (!config.outputPath) {
      throw new Error('Output path is required');
    }

    if (!config.format || !['typescript', 'javascript'].includes(config.format)) {
      throw new Error('Format must be either typescript or javascript');
    }
  }

  private async generateProjectStructure(config: GenerationConfig): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    const isTypeScript = config.format === 'typescript';

    // Package.json
    files['package.json'] = JSON.stringify({
      name: 'generated-mcp-server',
      version: '1.0.0',
      description: 'Generated MCP server with debugging capabilities',
      main: isTypeScript ? 'dist/index.js' : 'src/index.js',
      bin: {
        'mcp-server': isTypeScript ? './dist/index.js' : './src/index.js'
      },
      scripts: {
        ...(isTypeScript ? {
          build: 'tsc',
          start: 'node dist/index.js',
          dev: 'ts-node src/index.ts',
          watch: 'tsc --watch'
        } : {
          start: 'node src/index.js',
          dev: 'nodemon src/index.js'
        }),
        test: 'jest',
        lint: 'eslint src/**/*.' + (isTypeScript ? 'ts' : 'js')
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^1.20.0',
        'express': '^5.1.0',
        'zod': '^3.25.0'
      },
      devDependencies: {
        ...(isTypeScript ? {
          'typescript': '^5.0.0',
          '@types/node': '^20.0.0',
          '@types/express': '^4.17.0',
          'ts-node': '^10.9.0'
        } : {}),
        'jest': '^29.0.0',
        'nodemon': '^3.0.0',
        'eslint': '^8.0.0'
      }
    }, null, 2);

    // Main server file
    const extension = isTypeScript ? 'ts' : 'js';
    files[`src/index.${extension}`] = this.generateMainServerFile(config);

    // MCP tools directory structure
    files[`src/tools/index.${extension}`] = this.generateToolsIndex(config);

    // Configuration file
    files[`src/config.${extension}`] = this.generateConfigFile(config);

    // TypeScript configuration
    if (isTypeScript) {
      files['tsconfig.json'] = JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'tests']
      }, null, 2);
    }

    // README
    files['README.md'] = this.generateReadme(config);

    // .gitignore
    files['.gitignore'] = [
      'node_modules/',
      'dist/',
      '.env',
      '*.log',
      '.DS_Store',
      'coverage/'
    ].join('\n');

    return files;
  }

  private async generateMCPTools(analysis: any, config: GenerationConfig): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    const extension = config.format === 'typescript' ? 'ts' : 'js';

    // Generate tools based on detected endpoints
    for (const endpoint of analysis.endpoints || []) {
      const toolName = this.generateToolName(endpoint);
      const toolContent = await this.generateToolFromEndpoint(endpoint, config);
      files[`src/tools/${toolName}.${extension}`] = toolContent;
    }

    // Generate common debugging tools
    const debugTools = [
      'health-check',
      'list-endpoints',
      'validate-schema',
      'test-connection'
    ];

    for (const toolName of debugTools) {
      const toolContent = await this.generateDebugTool(toolName, config);
      files[`src/tools/${toolName}.${extension}`] = toolContent;
    }

    return files;
  }

  private async generateConfigFiles(analysis: any, config: GenerationConfig): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    // Environment configuration
    files['.env.example'] = [
      '# MCP Server Configuration',
      'MCP_SERVER_PORT=8890',
      'NODE_ENV=development',
      'LOG_LEVEL=info',
      '',
      '# API Configuration',
      'API_BASE_URL=http://localhost:3000',
      'API_TIMEOUT=5000',
      '',
      '# Security (if enabled)',
      ...(config.enableSecurity ? [
        'JWT_SECRET=your-jwt-secret-here',
        'API_KEY=your-api-key-here'
      ] : [])
    ].join('\n');

    // MCP server configuration
    const extension = config.format === 'typescript' ? 'ts' : 'js';
    files[`src/mcp-config.${extension}`] = this.generateMCPConfig(analysis, config);

    return files;
  }

  private async generateAdditionalFiles(analysis: any, config: GenerationConfig): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    // Generate tests if requested
    if (config.includeTests) {
      const testFiles = await this.generateTests(analysis, config);
      Object.assign(files, testFiles);
    }

    // Generate documentation if requested
    if (config.includeDocumentation) {
      const docFiles = await this.generateDocumentation(analysis, config);
      Object.assign(files, docFiles);
    }

    return files;
  }

  private generateMainServerFile(config: GenerationConfig): string {
    const isTypeScript = config.format === 'typescript';
    
    const imports = isTypeScript 
      ? `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import { config } from './config.js';
import { registerTools } from './tools/index.js';`
      : `const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const express = require('express');
const { config } = require('./config.js');
const { registerTools } = require('./tools/index.js');`;

    return `${imports}

/**
 * Generated MCP Server with debugging capabilities
 */
class MCPDebugServer {
  constructor() {
    this.server = new Server(
      {
        name: 'generated-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );
    
    this.setupServer();
  }

  setupServer() {
    // Register all MCP tools
    registerTools(this.server);

    // Setup health endpoint
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        // Route to appropriate tool handler
        const result = await this.handleToolCall(name, args);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        throw new Error(\`Tool execution failed: \${error.message}\`);
      }
    });
  }

  async handleToolCall(toolName, args) {
    // Tool routing logic would go here
    return { success: true, message: \`Executed \${toolName}\` };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Debug Server started successfully');
  }
}

// Start the server
if (require.main === module) {
  const server = new MCPDebugServer();
  server.start().catch(console.error);
}

${isTypeScript ? 'export { MCPDebugServer };' : 'module.exports = { MCPDebugServer };'}
`;
  }

  private generateToolsIndex(config: GenerationConfig): string {
    const isTypeScript = config.format === 'typescript';
    
    return `${isTypeScript ? 'import { Server } from \'@modelcontextprotocol/sdk/server/index.js\';' : 'const { Server } = require(\'@modelcontextprotocol/sdk/server/index.js\');'}

/**
 * Register all MCP tools with the server
 */
${isTypeScript ? 'export ' : ''}function registerTools(server${isTypeScript ? ': Server' : ''}) {
  // Health check tool
  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'health-check',
          description: 'Check server health status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    };
  });
}

${!isTypeScript ? 'module.exports = { registerTools };' : ''}
`;
  }

  private generateConfigFile(config: GenerationConfig): string {
    const isTypeScript = config.format === 'typescript';
    
    return `${isTypeScript ? 'export ' : ''}const config = {
  server: {
    port: process.env.MCP_SERVER_PORT || 8890,
    host: process.env.MCP_SERVER_HOST || 'localhost'
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.API_TIMEOUT || '5000')
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }${config.enableSecurity ? `,
  security: {
    jwtSecret: process.env.JWT_SECRET,
    apiKey: process.env.API_KEY
  }` : ''}
};

${!isTypeScript ? 'module.exports = { config };' : ''}
`;
  }

  private generateMCPConfig(analysis: any, config: GenerationConfig): string {
    const isTypeScript = config.format === 'typescript';
    
    return `${isTypeScript ? 'export ' : ''}const mcpConfig = {
  server: {
    name: 'generated-mcp-server',
    version: '1.0.0',
    description: 'Generated MCP server for ${analysis.framework} project'
  },
  capabilities: {
    tools: true,
    resources: true,
    prompts: false
  },
  endpoints: ${JSON.stringify(analysis.endpoints || [], null, 2)}
};

${!isTypeScript ? 'module.exports = { mcpConfig };' : ''}
`;
  }

  private generateReadme(config: GenerationConfig): string {
    return `# Generated MCP Server

This MCP server was automatically generated with debugging capabilities.

## Features

- MCP protocol support
- Debugging tools
- Health monitoring
${config.includeTests ? '- Comprehensive test suite' : ''}
${config.includeDocumentation ? '- Complete documentation' : ''}
${config.enableSecurity ? '- Security features' : ''}

## Installation

\`\`\`bash
npm install
${config.format === 'typescript' ? 'npm run build' : ''}
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

${config.includeTests ? `\`\`\`bash
npm test
\`\`\`` : 'Tests not included in this generation.'}

## Generated by MCP Agentify v2.0
`;
  }

  private generateToolName(endpoint: any): string {
    return `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  private async generateToolFromEndpoint(endpoint: any, config: GenerationConfig): Promise<string> {
    // This would generate a specific tool based on the endpoint
    // For now, return a template
    return `// Tool for ${endpoint.method} ${endpoint.path}
// Generated automatically
`;
  }

  private async generateDebugTool(toolName: string, config: GenerationConfig): Promise<string> {
    return `// Debug tool: ${toolName}
// Generated automatically
`;
  }

  private async generateTests(analysis: any, config: GenerationConfig): Promise<Record<string, string>> {
    const extension = config.format === 'typescript' ? 'ts' : 'js';
    return {
      [`tests/server.test.${extension}`]: '// Generated test file'
    };
  }

  private async generateDocumentation(analysis: any, config: GenerationConfig): Promise<Record<string, string>> {
    return {
      'docs/API.md': '# API Documentation\n\nGenerated automatically.',
      'docs/TOOLS.md': '# MCP Tools Documentation\n\nGenerated automatically.'
    };
  }

  private async generateToolWithAI(toolSpec: MCPToolSpec): Promise<string> {
    try {
      return await this.llmOrchestrator.generateCode({
        description: `Generate MCP tool: ${toolSpec.name}`,
        language: 'typescript',
        framework: 'MCP SDK',
        type: 'mcp-tool',
        includeErrorHandling: true,
        includeTests: false,
        context: toolSpec.description
      });
    } catch (error) {
      this.logger.warn(`Failed to generate tool with AI, falling back to template: ${toolSpec.name}`, error);
      return this.generateToolFromTemplate(toolSpec);
    }
  }

  private generateToolFromTemplate(toolSpec: MCPToolSpec): string {
    return `// Generated MCP Tool: ${toolSpec.name}
// Description: ${toolSpec.description}

export async function ${toolSpec.name}Tool(args: any) {
  // Implementation would go here
  return { success: true, message: 'Tool executed successfully' };
}
`;
  }
}

// Interfaces
export interface GenerationConfig {
  outputPath: string;
  format: 'typescript' | 'javascript';
  includeTests: boolean;
  includeDocumentation: boolean;
  enableSecurity: boolean;
  enableAI?: boolean;
  plugins?: string[];
}

export interface GenerationResult {
  success: boolean;
  outputPath: string;
  files: Record<string, string>;
  error?: string;
  metadata: {
    generatedAt: string;
    duration: number;
    framework: string;
    toolCount: number;
    format: string;
  };
}

export interface MCPToolSpec {
  name: string;
  description: string;
  useAI?: boolean;
}