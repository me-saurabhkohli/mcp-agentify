# MCP Agentify

A comprehensive platform to generate Model Context Protocol (MCP) servers from existing REST APIs and endpoints with enterprise-grade features. Available as both a CLI tool and VS Code extension.

## Features

### Core Capabilities
- 🔍 **Smart Analysis**: Automatically detects and analyzes REST APIs, Node.js projects, and OpenAPI specifications
- 🚀 **Quick Generation**: Creates fully functional MCP servers with TypeScript support
- 🛠️ **Configurable**: Customizable templates and generation options
- 📚 **Well Documented**: Generates comprehensive documentation and examples
- 🧪 **Test Ready**: Includes test files and setup
- 🎯 **Multi-Language Support**: Supports JavaScript, Python, Java, Go, PHP, and Ruby projects

### Enterprise Features
- 🔐 **Security**: JWT authentication, RBAC, input validation, audit logging
- 🔌 **Plugin System**: Extensible architecture with custom plugins
- 💬 **Interactive Mode**: Guided setup wizard with smart defaults
- 📊 **Rich Analytics**: Project analysis with detailed insights
- 🔄 **Auto-Updates**: Automatic update checking and notifications

### VS Code Integration
- 🎨 **Rich UI**: Visual project analysis and endpoint detection
- ⚡ **Quick Actions**: One-click generation and setup
- 🔍 **IntelliSense**: Code snippets and auto-completion for MCP development
- 📋 **Task Integration**: Built-in VS Code tasks and commands

## Installation

### CLI Tool

```bash
npm install -g mcp-agentify
```

Or use directly with npx:

```bash
npx mcp-agentify generate --project ./my-api
```

### VS Code Extension

1. **From VS Code Marketplace** (Recommended):
   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X`)
   - Search for "MCP Agentify"
   - Click Install

2. **From VSIX file**:
   ```bash
   code --install-extension mcp-agentify-1.0.0.vsix
   ```

3. **Manual Installation**:
   - Download the `.vsix` file from releases
   - Open VS Code → Extensions → "..." → Install from VSIX

## Quick Start

### CLI Usage

1. **Analyze your project**:
```bash
agentify analyze --project ./my-rest-api
```

2. **Generate MCP server**:
```bash
agentify generate --project ./my-rest-api --output ./my-mcp-server
```

3. **Interactive setup**:
```bash
agentify interactive
```

4. **Run the generated server**:
```bash
cd my-mcp-server
npm install
npm run build
npm start
```

### VS Code Extension Usage

1. **Open your API project** in VS Code
2. **Open Command Palette** (`Ctrl+Shift+P`)
3. **Run "MCP Agentify: Analyze Project"** to detect endpoints
4. **Use "MCP Agentify: Generate MCP Server"** to create your server
5. **Or use "MCP Agentify: Quick Setup"** for one-click generation

The extension provides a rich UI with project overview, endpoint detection, and visual feedback.

## Commands

### `generate`

Generate an MCP server from an existing project:

```bash
agentify generate [options]
```

**Options:**
- `-p, --project <path>` - Path to the project directory (default: ".")
- `-o, --output <path>` - Output directory for generated MCP server (default: "./mcp-server")
- `-t, --type <type>` - Project type: rest-api, nodejs, openapi (default: "auto")
- `-c, --config <path>` - Configuration file path
- `--dry-run` - Show what would be generated without creating files

**Examples:**

```bash
# Generate from current directory
agentify generate

# Generate from specific project with custom output
agentify generate --project ./api --output ./my-mcp-server

# Generate from OpenAPI spec
agentify generate --project ./swagger.json --type openapi

# Dry run to see what would be generated
agentify generate --dry-run
```

### `analyze`

Analyze an existing project to see what endpoints would be detected:

```bash
agentify analyze [options]
```

**Options:**
- `-p, --project <path>` - Path to the project directory (default: ".")
- `-t, --type <type>` - Project type: rest-api, nodejs, openapi (default: "auto")
- `--json` - Output analysis results as JSON

**Examples:**

```bash
# Analyze current directory
agentify analyze

# Analyze specific project
agentify analyze --project ./my-api

# Get JSON output
agentify analyze --json > analysis.json
```

### `init`

Initialize a configuration file:

```bash
agentify init [options]
```

**Options:**
- `-o, --output <path>` - Configuration file output path (default: "./agentify.config.json")

## Configuration

Create a configuration file to customize the generation process:

```bash
agentify init
```

This creates an `agentify.config.json` file:

```json
{
  "serverName": "my-mcp-server",
  "description": "Generated MCP server",
  "version": "1.0.0",
  "outputFormat": "typescript",
  "includeTests": true,
  "includeDocumentation": true,
  "excludeEndpoints": [],
  "transformRules": []
}
```

### Configuration Options

- `serverName` - Name of the generated MCP server
- `description` - Description for the MCP server
- `version` - Version number
- `outputFormat` - Output format: "typescript" or "javascript"
- `includeTests` - Generate test files
- `includeDocumentation` - Generate documentation
- `excludeEndpoints` - Array of endpoints to exclude (format: "METHOD:/path")
- `transformRules` - Rules to transform endpoint names or parameters

## Supported Project Types

### Node.js Projects

Automatically detects endpoints in:
- Express.js applications
- Fastify applications
- Koa applications
- NestJS applications

**Supported patterns:**
```javascript
app.get('/users', handler);
router.post('/users/:id', handler);
fastify.put('/users/{id}', handler);
```

### OpenAPI/Swagger

Supports:
- OpenAPI 3.x specifications
- Swagger 2.x specifications
- JSON and YAML formats

### REST API Projects

Detects endpoints in various languages:

**Python (Django, Flask, FastAPI):**
```python
@app.route('/users', methods=['GET'])
@router.get('/users/{id}')
```

**Java (Spring Boot):**
```java
@GetMapping("/users")
@RequestMapping(value = "/users", method = RequestMethod.POST)
```

**Go (Gin, Echo):**
```go
router.GET("/users", handler)
e.POST("/users/:id", handler)
```

**PHP (Laravel):**
```php
Route::get('/users', 'UserController@index');
```

**Ruby (Rails):**
```ruby
get '/users', to: 'users#index'
```

## Generated MCP Server

The generated MCP server includes:

### File Structure
```
my-mcp-server/
├── src/
│   ├── index.ts          # Main MCP server
│   ├── tools/            # Individual tool implementations
│   └── types/            # TypeScript type definitions
├── tests/                # Test files (if enabled)
├── docs/                 # Documentation (if enabled)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Features

- **Full MCP Compliance**: Implements the Model Context Protocol specification
- **Type Safety**: Full TypeScript support with proper type definitions
- **Error Handling**: Comprehensive error handling and validation
- **Environment Configuration**: Configurable via environment variables
- **Logging**: Built-in logging and debugging support
- **Testing**: Unit tests for all generated tools
- **Documentation**: Auto-generated API documentation

### Usage in MCP Clients

The generated server can be used with any MCP-compatible client:

```json
{
  "mcpServers": {
    "my-api": {
      "command": "node",
      "args": ["path/to/my-mcp-server/dist/index.js"]
    }
  }
}
```

## Advanced Usage

### Custom Templates

Create custom templates for generation:

1. Create a `templates/` directory in your project
2. Add Handlebars templates (`.hbs` files)
3. Reference in configuration:

```json
{
  "customTemplates": "./templates"
}
```

### Transform Rules

Modify endpoint names and parameters during generation:

```json
{
  "transformRules": [
    {
      "pattern": "get_user_by_id",
      "replacement": "getUser",
      "type": "endpoint"
    }
  ]
}
```

### Excluding Endpoints

Skip certain endpoints during generation:

```json
{
  "excludeEndpoints": [
    "GET:/health",
    "POST:/internal/*"
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## VS Code Extension Features

The MCP Agentify VS Code extension provides a rich development experience:

### Activity Bar Views
- **Project Overview**: Framework detection, endpoint count, and project statistics
- **Detected Endpoints**: Interactive list of all discovered API endpoints
- **Generated Servers**: Management of created MCP servers
- **Plugins**: Plugin status and configuration

### Commands
- `MCP Agentify: Analyze Project` - Detect API endpoints
- `MCP Agentify: Generate MCP Server` - Create MCP server with options
- `MCP Agentify: Interactive Setup` - Guided wizard
- `MCP Agentify: Quick Setup` - One-click generation
- `MCP Agentify: View Endpoints` - Browse detected endpoints
- `MCP Agentify: Install CLI` - Install/update CLI tool

### Code Snippets
- `mcp-server` - Complete MCP server template
- `mcp-tool` - Tool definition and handler
- `mcp-resource` - Resource provider template
- `mcp-prompt` - Prompt template

### Settings
Configure the extension behavior:
```json
{
  "mcp-agentify.autoAnalyze": true,
  "mcp-agentify.outputDirectory": "./mcp-server",
  "mcp-agentify.preferredFormat": "typescript",
  "mcp-agentify.enableSecurity": false
}
```

## Enterprise Security Features

MCP Agentify includes comprehensive security features:

### Authentication & Authorization
- **JWT-based Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: Fine-grained permission management
- **API Key Management**: Secure API key generation and validation

### Data Protection
- **Input Validation**: Joi schema-based request validation
- **Secrets Management**: Secure storage and handling of sensitive data
- **Audit Logging**: Tamper-evident logging of all operations

### Security Monitoring
- **Vulnerability Scanning**: Automated security vulnerability detection
- **Access Monitoring**: Real-time access pattern analysis
- **Security Alerts**: Automated alerts for suspicious activities

## Plugin Architecture

Extend MCP Agentify with custom plugins:

### Built-in Plugins
- **REST API Analyzer**: Detects and analyzes REST endpoints
- **Template Engine**: Customizable code generation templates
- **Security Plugin**: Enterprise security features
- **Documentation Generator**: Automated API documentation

### Custom Plugin Development
```javascript
// Example plugin structure
module.exports = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  analyze: async (project) => {
    // Custom analysis logic
  },
  generate: async (analysis, config) => {
    // Custom generation logic
  }
};
```

## Interactive Mode

Launch the interactive setup wizard:

```bash
agentify interactive
```

Features:
- **Project Detection**: Automatically detects framework and structure
- **Smart Defaults**: Intelligent configuration suggestions
- **Step-by-Step Guidance**: Clear prompts and help text
- **Progress Tracking**: Visual progress indicators
- **Configuration Validation**: Real-time validation of inputs

## Update Management

Stay up-to-date with automatic update checking:

- **Version Checking**: Automatic checks for new versions
- **Update Notifications**: Desktop notifications for available updates
- **Changelog Display**: View release notes and changes
- **Background Updates**: Non-intrusive update process

## Performance & Reliability

- **Efficient Analysis**: Fast project scanning and endpoint detection
- **Memory Optimized**: Low memory footprint during generation
- **Error Recovery**: Robust error handling and recovery
- **Progress Tracking**: Real-time feedback on long operations
- **Concurrent Processing**: Parallel processing for faster generation

## Support

- 📖 [Documentation](https://github.com/me-saurabhkohli/agentify/docs)
- 🐛 [Issues](https://github.com/me-saurabhkohli/agentify/issues)
- 💬 [Discussions](https://github.com/me-saurabhkohli/agentify/discussions)
- 🎬 [Video Tutorials](https://github.com/me-saurabhkohli/agentify/wiki/tutorials)
- 📧 [Email Support](mailto:me.saurabhkohli@gmail.com)