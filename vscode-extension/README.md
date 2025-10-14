# MCP Agentify - VS Code Extension

Transform your APIs into Model Context Protocol (MCP) servers with enterprise-grade features, directly from VS Code!

## Features

🚀 **Project Analysis**: Automatically detect REST API endpoints across multiple frameworks
🛠️ **Code Generation**: Generate complete MCP servers with TypeScript/JavaScript support
🔧 **Interactive Setup**: Guided wizard for easy configuration
⚡ **Quick Setup**: One-click MCP server generation
🏢 **Enterprise Security**: Built-in authentication, validation, and audit logging
🔌 **Plugin System**: Extensible architecture with custom plugins
📊 **Visual Interface**: Rich webview panel with project overview and endpoint visualization
🔍 **IntelliSense**: Code snippets and autocompletion for MCP development

## Quick Start

1. **Install the Extension**: Search for "MCP Agentify" in VS Code Extensions
2. **Open Your Project**: Open any REST API project (Node.js, Python, Java, Go)
3. **Analyze**: Click the rocket icon in the sidebar or use `Ctrl+Shift+P` → "MCP Agentify: Analyze Project"
4. **Generate**: Use "MCP Agentify: Generate MCP Server" to create your MCP server
5. **Done!**: Your MCP server is ready to use with AI assistants

## Supported Frameworks

- **Node.js**: Express.js, Fastify, Koa, NestJS
- **Python**: FastAPI, Flask, Django REST Framework
- **Java**: Spring Boot, JAX-RS
- **Go**: Gin, Fiber, Echo, Chi
- **Generic REST**: OpenAPI/Swagger specifications

## Commands

| Command | Description |
|---------|-------------|
| `MCP Agentify: Analyze Project` | Detect API endpoints in your project |
| `MCP Agentify: Generate MCP Server` | Create a complete MCP server |
| `MCP Agentify: Interactive Setup` | Guided setup wizard |
| `MCP Agentify: Quick Setup` | One-click generation with defaults |
| `MCP Agentify: View Endpoints` | Browse detected endpoints |
| `MCP Agentify: Install CLI` | Install the CLI tool |

## Extension Views

### Activity Bar
- **Project Overview**: Shows detected framework, endpoints count, and project stats
- **Detected Endpoints**: Lists all found API endpoints with quick navigation
- **Generated Servers**: Manage your generated MCP servers
- **Plugins**: View and manage available plugins

### Webview Panel
Rich interface showing:
- Project statistics and framework detection
- Endpoint visualization with HTTP methods
- One-click actions for analysis and generation
- Real-time project insights

## Settings

Configure the extension in VS Code Settings (`Ctrl+,`):

```json
{
  "mcp-agentify.cliPath": "npx mcp-agentify",
  "mcp-agentify.autoAnalyze": true,
  "mcp-agentify.outputDirectory": "./mcp-server",
  "mcp-agentify.preferredFormat": "typescript",
  "mcp-agentify.includeTests": true,
  "mcp-agentify.includeDocumentation": true,
  "mcp-agentify.enableSecurity": false,
  "mcp-agentify.showNotifications": true
}
```

## Code Snippets

The extension includes helpful code snippets for MCP development:

- `mcp-server`: Complete MCP server template
- `mcp-tool`: Tool definition and handler
- `mcp-resource`: Resource provider template  
- `mcp-prompt`: Prompt template

## Enterprise Features

### Security
- JWT-based authentication
- Role-based access control (RBAC)
- Input validation with Joi schemas
- Audit logging with tamper-evident logs
- Secrets management
- Vulnerability scanning

### Developer Experience
- Interactive project setup wizard
- Auto-completion for shell commands
- Plugin architecture for extensibility
- Automatic update notifications
- Rich error handling and debugging

## Requirements

- VS Code 1.74.0 or newer
- Node.js 16+ (for CLI functionality)
- One of the supported project types in your workspace

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "MCP Agentify"
4. Click Install

### From VSIX
1. Download the `.vsix` file
2. Run `code --install-extension mcp-agentify-1.0.0.vsix`

## Usage Examples

### Basic Analysis
1. Open a REST API project
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run "MCP Agentify: Analyze Project"
4. View results in the sidebar

### Generate MCP Server
1. After analysis, run "MCP Agentify: Generate MCP Server"
2. Choose output directory and format
3. Select options (tests, docs, security)
4. Your MCP server is generated!

### Interactive Setup
1. Run "MCP Agentify: Interactive Setup"
2. Follow the guided wizard
3. Customize settings and plugins
4. Generate with one click

## Generated MCP Server Structure

```
mcp-server/
├── src/
│   ├── index.ts          # Main server entry point
│   ├── tools/            # Generated tool handlers
│   ├── resources/        # Resource providers
│   └── types/            # TypeScript type definitions
├── tests/                # Generated tests
├── docs/                 # API documentation
├── package.json          # Dependencies and scripts
└── README.md            # Generated documentation
```

## CLI Integration

The extension integrates with the MCP Agentify CLI:

```bash
# Install globally
npm install -g mcp-agentify

# Or use with npx
npx mcp-agentify analyze ./my-api
npx mcp-agentify generate ./my-api --output ./mcp-server
```

## Troubleshooting

### Extension Not Working?
1. Check that Node.js is installed and accessible
2. Verify your project contains recognizable API files
3. Enable debug mode in settings for detailed logs
4. Check the Output panel for error messages

### CLI Command Failures?
1. Ensure the CLI path is correct in settings
2. Try installing the CLI globally: `npm install -g mcp-agentify`
3. Check that your project structure is supported

### No Endpoints Detected?
1. Verify your project uses a supported framework
2. Check that route/endpoint files are in standard locations
3. Run analysis on the root directory of your project

## Contributing

Found a bug or want to contribute? Visit our [GitHub repository](https://github.com/me-saurabhkohli/agentify).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Release Notes

### 1.0.0
- 🎉 Initial release
- ✅ Multi-framework API analysis
- ✅ Complete MCP server generation  
- ✅ Enterprise security features
- ✅ Interactive setup wizard
- ✅ Rich VS Code integration
- ✅ Plugin architecture
- ✅ Code snippets and IntelliSense

---

**Enjoy building with MCP Agentify!** 🚀

For more information, visit: https://github.com/me-saurabhkohli/agentify