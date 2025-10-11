# Agentify

A powerful CLI tool to generate Model Context Protocol (MCP) servers from existing REST APIs or Node.js endpoints.

## Features

- 🔍 **Smart Analysis**: Automatically detects and analyzes REST APIs, Node.js projects, and OpenAPI specifications
- 🚀 **Quick Generation**: Creates fully functional MCP servers with TypeScript support
- 🛠️ **Configurable**: Customizable templates and generation options
- 📚 **Well Documented**: Generates comprehensive documentation and examples
- 🧪 **Test Ready**: Includes test files and setup
- 🎯 **Multi-Language Support**: Supports JavaScript, Python, Java, Go, PHP, and Ruby projects

## Installation

```bash
npm install -g agentify
```

Or use directly with npx:

```bash
npx agentify generate --project ./my-api
```

## Quick Start

1. **Analyze your project**:
```bash
agentify analyze --project ./my-rest-api
```

2. **Generate MCP server**:
```bash
agentify generate --project ./my-rest-api --output ./my-mcp-server
```

3. **Run the generated server**:
```bash
cd my-mcp-server
npm install
npm run build
npm start
```

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

## Support

- 📖 [Documentation](https://github.com/agentify/mcp-generator-cli/docs)
- 🐛 [Issues](https://github.com/agentify/mcp-generator-cli/issues)
- 💬 [Discussions](https://github.com/agentify/mcp-generator-cli/discussions)