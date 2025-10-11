// Tool implementation for GET /api/products
export const getApiProductsTool = {
  name: 'get_api_products',
  description: 'Flask endpoint from flask_api.py',
  inputSchema: {
    type: 'object',
    properties: {
    }
  },
  execute: async (args: any) => {
    // Implementation will be handled by the main server
    throw new Error('Tool execution should be handled by the main MCP server');
  }
};