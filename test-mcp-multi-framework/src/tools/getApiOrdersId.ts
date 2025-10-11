// Tool implementation for GET /api/orders/{id}
export const getApiOrdersIdTool = {
  name: 'get_api_orders_id',
  description: 'Next.js API route from pages/api/orders/[id].js',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Path parameter: id',
        required: true
      }
    }
  },
  execute: async (args: any) => {
    // Implementation will be handled by the main server
    throw new Error('Tool execution should be handled by the main MCP server');
  }
};