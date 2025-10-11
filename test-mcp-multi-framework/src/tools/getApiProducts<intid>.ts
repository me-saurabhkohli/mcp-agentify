// Tool implementation for GET /api/products/&lt;int:id&gt;
export const getApiProducts&lt;intid&gt;Tool = {
  name: 'get_api_products_&lt;intid&gt;',
  description: 'Flask endpoint from flask_api.py',
  inputSchema: {
    type: 'object',
    properties: {
      id&gt;: {
        type: 'string',
        description: 'Path parameter: id&gt;',
        required: true
      }
    }
  },
  execute: async (args: any) => {
    // Implementation will be handled by the main server
    throw new Error('Tool execution should be handled by the main MCP server');
  }
};