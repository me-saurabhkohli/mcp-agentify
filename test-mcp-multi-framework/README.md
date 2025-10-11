# agentify-mcp-server

Auto-generated MCP server via Agentify

## Description

This MCP server was automatically generated from the test-rest-sample project.
It provides access to 16 API endpoints through the Model Context Protocol.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npm start
```

## Available Tools

### get_api_orders

Next.js API route from pages/api/orders.js

- **Method:** GET
- **Path:** /api/orders

### post_api_orders

Next.js API route from pages/api/orders.js

- **Method:** POST
- **Path:** /api/orders

### get_api_orders_id

Next.js API route from pages/api/orders/[id].js

- **Method:** GET
- **Path:** /api/orders/{id}
- **Parameters:**
  - `id` (string, required): Path parameter: id

### post_api_orders_id

Next.js API route from pages/api/orders/[id].js

- **Method:** POST
- **Path:** /api/orders/{id}
- **Parameters:**
  - `id` (string, required): Path parameter: id

### get_api_products

Flask endpoint from flask_api.py

- **Method:** GET
- **Path:** /api/products

### post_api_products

Flask endpoint from flask_api.py

- **Method:** POST
- **Path:** /api/products

### get_api_products_&lt;intid&gt;

Flask endpoint from flask_api.py

- **Method:** GET
- **Path:** /api/products/&lt;int:id&gt;
- **Parameters:**
  - `id&gt;` (string, required): Path parameter: id&gt;

### put_api_products_&lt;intid&gt;

Flask endpoint from flask_api.py

- **Method:** PUT
- **Path:** /api/products/&lt;int:id&gt;
- **Parameters:**
  - `id&gt;` (string, required): Path parameter: id&gt;

### delete_api_products_&lt;intid&gt;

Flask endpoint from flask_api.py

- **Method:** DELETE
- **Path:** /api/products/&lt;int:id&gt;
- **Parameters:**
  - `id&gt;` (string, required): Path parameter: id&gt;

### get_api_categories

Flask endpoint from flask_api.py

- **Method:** GET
- **Path:** /api/categories

### post_api_categories

Flask endpoint from flask_api.py

- **Method:** POST
- **Path:** /api/categories

### get_api_items

Go endpoint from main.go

- **Method:** GET
- **Path:** /api/items

### post_api_items

Go endpoint from main.go

- **Method:** POST
- **Path:** /api/items

### get_api_items_id

Go endpoint from main.go

- **Method:** GET
- **Path:** /api/items/:id
- **Parameters:**
  - `id` (string, required): Path parameter: id

### put_api_items_id

Go endpoint from main.go

- **Method:** PUT
- **Path:** /api/items/:id
- **Parameters:**
  - `id` (string, required): Path parameter: id

### delete_api_items_id

Go endpoint from main.go

- **Method:** DELETE
- **Path:** /api/items/:id
- **Parameters:**
  - `id` (string, required): Path parameter: id


## Configuration

Copy `.env.example` to `.env` and update the configuration values:

```bash
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Testing

```bash
npm test
```
