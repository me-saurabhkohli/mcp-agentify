import * as fs from 'fs-extra';
import * as path from 'path';
import Handlebars from 'handlebars';

export class TemplateManager {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  
  constructor() {
    this.registerHelpers();
  }

  async getTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    // Try to load from templates directory first
    const templatePath = path.join(__dirname, '..', 'templates', templateName + '.hbs');
    
    let templateContent: string;
    
    if (await fs.pathExists(templatePath)) {
      templateContent = await fs.readFile(templatePath, 'utf8');
    } else {
      // Use built-in templates
      templateContent = this.getBuiltinTemplate(templateName);
    }

    const template = Handlebars.compile(templateContent);
    this.templates.set(templateName, template);
    return template;
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context, null, 2);
    });

    Handlebars.registerHelper('camelCase', (str: string) => {
      if (!str) return '';
      return str.replace(/[-_\\s\\/{}]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
                .replace(/[^a-zA-Z0-9]/g, '')
                .replace(/^(.)/, (_, c) => c.toLowerCase());
    });

    Handlebars.registerHelper('pascalCase', (str: string) => {
      if (!str) return '';
      // For strings that are already PascalCase, return as-is
      if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) return str;
      // Convert kebab-case, snake_case, etc. to PascalCase
      const camel = str.replace(/[-_\s/{}]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
                      .replace(/[^a-zA-Z0-9]/g, '');
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    });

    Handlebars.registerHelper('kebabCase', (str: string) => {
      return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    Handlebars.registerHelper('split', (str: string, delimiter: string) => {
      return str.split(delimiter);
    });

    Handlebars.registerHelper('replace', (str: string, search: string, replacement: string) => {
      return str.replace(new RegExp(search, 'g'), replacement);
    });

    Handlebars.registerHelper('safeFileName', (method: string, path: string) => {
      if (!method || !path) return 'unknownTool';
      // Split path and filter out empty parts
      const pathParts = path.toString().split('/').filter(part => part && part.trim() !== '');
      // Remove parameter brackets and convert to PascalCase
      const cleanParts = pathParts.map(part => {
        const cleanPart = part.replace(/[{}:]/g, '').trim();
        if (!cleanPart) return '';
        return cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1).toLowerCase();
      }).filter(part => part !== '');
      const methodPart = method.toString().toLowerCase();
      return `${methodPart}${cleanParts.join('')}`;
    });

    Handlebars.registerHelper('toolName', (method: string, path: string) => {
      // Split path and filter out empty parts
      const pathParts = path.split('/').filter(part => part && part !== '');
      // Remove parameter brackets and join with underscores
      const cleanParts = pathParts.map(part => part.replace(/[{}:]/g, '').toLowerCase());
      return `${method.toLowerCase()}_${cleanParts.join('_')}`;
    });

    Handlebars.registerHelper('methodName', (method: string, path: string) => {
      // Split path and filter out empty parts
      const pathParts = path.split('/').filter(part => part && part !== '');
      // Remove parameter brackets and convert to PascalCase
      const cleanParts = pathParts.map(part => {
        const cleanPart = part.replace(/[{}:]/g, '');
        return cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1).toLowerCase();
      });
      const methodName = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
      return `handle${methodName}${cleanParts.join('')}`;
    });
  }

  private getBuiltinTemplate(templateName: string): string {
    const templates: { [key: string]: string } = {
      'server.ts': `#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

class AgentifyMcpServer {
  private server: Server;
  private baseUrl: string;

  constructor() {
    this.server = new Server(
      {
        name: '{{config.serverName}}',
        version: '{{config.version}}',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.baseUrl = process.env.API_BASE_URL || '{{projectInfo.baseUrl}}' || 'http://localhost:3000';
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
{{#each endpoints}}
          {
            name: '{{toolName method path}}',
            description: '{{description}}',
            inputSchema: {
              type: 'object',
              properties: {
{{#each parameters}}
                {{name}}: {
                  type: '{{type}}',
                  description: '{{description}}'{{#if required}},
                  required: true{{/if}}
                }{{#unless @last}},{{/unless}}
{{/each}}
              }
            }
          }{{#unless @last}},{{/unless}}
{{/each}}
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
{{#each endpoints}}
          case '{{toolName method path}}':
            return await this.{{methodName method path}}(args);
{{/each}}
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              \`Unknown tool: \${name}\`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          \`Error executing tool \${name}: \${error}\`
        );
      }
    });
  }

{{#each endpoints}}
  private async {{methodName method path}}(args: any): Promise<any> {
    const url = \`\${this.baseUrl}{{path}}\`;
    const config = {
      method: '{{method}}',
      url: url.replace(/\\{([^}]+)\\}/g, (match, key) => args[key] || match),
{{#if (eq method 'POST')}}
      data: args.body || {},
{{/if}}
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters
{{#each parameters}}
{{#if (eq in 'query')}}
    if (args.{{name}}) {
      config.params.{{name}} = args.{{name}};
    }
{{/if}}
{{/each}}

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

{{/each}}

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('{{config.serverName}} running on stdio');
  }
}

const server = new AgentifyMcpServer();
server.run().catch(console.error);
`,

      'package.json': `{
  "name": "{{config.serverName}}",
  "version": "{{config.version}}",
  "description": "{{config.description}}",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
{{#if config.includeTests}}
    "test": "jest",
{{/if}}
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.8.0",
    "typescript": "^5.2.0",
    "tsx": "^4.0.0",
{{#if config.includeTests}}
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
{{/if}}
    "eslint": "^8.50.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}`,

      'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`,

      'tool.ts': `// Tool implementation for {{endpoint.method}} {{endpoint.path}}
export const {{safeFileName endpoint.method endpoint.path}}Tool = {
  name: '{{toolName endpoint.method endpoint.path}}',
  description: '{{endpoint.description}}',
  inputSchema: {
    type: 'object',
    properties: {
{{#each endpoint.parameters}}
      {{name}}: {
        type: '{{type}}',
        description: '{{description}}'{{#if required}},
        required: true{{/if}}
      }{{#unless @last}},{{/unless}}
{{/each}}
    }
  },
  execute: async (args: any) => {
    // Implementation will be handled by the main server
    throw new Error('Tool execution should be handled by the main MCP server');
  }
};`,

      'tools-index.ts': `// Auto-generated tools index
{{#each endpoints}}
import { {{safeFileName method path}}Tool } from './{{safeFileName method path}}';
{{/each}}

export const tools = [
{{#each endpoints}}
  {{safeFileName method path}}Tool{{#unless @last}},{{/unless}}
{{/each}}
];

export const toolMap = {
{{#each endpoints}}
  {{safeFileName method path}}Tool{{#unless @last}},{{/unless}}
{{/each}}
};`,

      'test-setup.ts': `// Test setup for {{config.serverName}}
import { beforeAll, afterAll } from '@jest/globals';

beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup after tests
});`,

      'tool-test.ts': `// Test for {{endpoint.method}} {{endpoint.path}} tool
import { {{safeFileName endpoint.method endpoint.path}}Tool } from '../src/tools/{{safeFileName endpoint.method endpoint.path}}';

describe('{{safeFileName endpoint.method endpoint.path}}Tool', () => {
  it('should have correct name and description', () => {
    expect({{safeFileName endpoint.method endpoint.path}}Tool.name).toBe('{{toolName endpoint.method endpoint.path}}');
    expect({{safeFileName endpoint.method endpoint.path}}Tool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect({{safeFileName endpoint.method endpoint.path}}Tool.inputSchema).toBeDefined();
    expect({{safeFileName endpoint.method endpoint.path}}Tool.inputSchema.type).toBe('object');
  });
});`,

      'docs.md': `# {{config.serverName}} API Documentation

{{config.description}}

Generated from: {{projectInfo.name}}

## Available Endpoints

{{#each endpoints}}
### {{method}} {{path}}

{{description}}

**Parameters:**
{{#each parameters}}
- \`{{name}}\` ({{type}}) - {{description}}{{#if required}} *Required*{{/if}}
{{/each}}

{{/each}}

## Usage

This MCP server can be integrated with any MCP-compatible client by configuring it in your client's settings.

## Environment Variables

- \`API_BASE_URL\` - Base URL for the API (default: {{projectInfo.baseUrl}})
- \`API_KEY\` - API key for authentication
- \`PORT\` - Port for the server (default: 3000)
- \`LOG_LEVEL\` - Logging level (default: info)`,

      'README.md': `# {{config.serverName}}

{{config.description}}

## Description

This MCP server was automatically generated from the {{projectInfo.name}} project.
It provides access to {{endpoints.length}} API endpoints through the Model Context Protocol.

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Available Tools

{{#each endpoints}}
### {{toolName method path}}

{{description}}

- **Method:** {{method}}
- **Path:** {{path}}
{{#if parameters}}
- **Parameters:**
{{#each parameters}}
  - \`{{name}}\` ({{type}}{{#if required}}, required{{/if}}): {{description}}
{{/each}}
{{/if}}

{{/each}}

## Configuration

Copy \`.env.example\` to \`.env\` and update the configuration values:

\`\`\`bash
cp .env.example .env
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

{{#if config.includeTests}}
## Testing

\`\`\`bash
npm test
\`\`\`
{{/if}}`
    };

    if (!templates[templateName]) {
      throw new Error(`Template not found: ${templateName}`);
    }

    return templates[templateName];
  }
}