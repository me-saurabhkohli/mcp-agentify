# agentify-mcp-server API Documentation

Auto-generated MCP server via Agentify

Generated from: test-rest-sample

## Available Endpoints

### GET /api/orders

Next.js API route from pages/api/orders.js

**Parameters:**

### POST /api/orders

Next.js API route from pages/api/orders.js

**Parameters:**

### GET /api/orders/{id}

Next.js API route from pages/api/orders/[id].js

**Parameters:**
- `id` (string) - Path parameter: id *Required*

### POST /api/orders/{id}

Next.js API route from pages/api/orders/[id].js

**Parameters:**
- `id` (string) - Path parameter: id *Required*

### GET /api/products

Flask endpoint from flask_api.py

**Parameters:**

### POST /api/products

Flask endpoint from flask_api.py

**Parameters:**

### GET /api/products/&lt;int:id&gt;

Flask endpoint from flask_api.py

**Parameters:**
- `id&gt;` (string) - Path parameter: id&gt; *Required*

### PUT /api/products/&lt;int:id&gt;

Flask endpoint from flask_api.py

**Parameters:**
- `id&gt;` (string) - Path parameter: id&gt; *Required*

### DELETE /api/products/&lt;int:id&gt;

Flask endpoint from flask_api.py

**Parameters:**
- `id&gt;` (string) - Path parameter: id&gt; *Required*

### GET /api/categories

Flask endpoint from flask_api.py

**Parameters:**

### POST /api/categories

Flask endpoint from flask_api.py

**Parameters:**

### GET /api/items

Go endpoint from main.go

**Parameters:**

### POST /api/items

Go endpoint from main.go

**Parameters:**

### GET /api/items/:id

Go endpoint from main.go

**Parameters:**
- `id` (string) - Path parameter: id *Required*

### PUT /api/items/:id

Go endpoint from main.go

**Parameters:**
- `id` (string) - Path parameter: id *Required*

### DELETE /api/items/:id

Go endpoint from main.go

**Parameters:**
- `id` (string) - Path parameter: id *Required*


## Usage

This MCP server can be integrated with any MCP-compatible client by configuring it in your client's settings.

## Environment Variables

- `API_BASE_URL` - Base URL for the API (default: )
- `API_KEY` - API key for authentication
- `PORT` - Port for the server (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)