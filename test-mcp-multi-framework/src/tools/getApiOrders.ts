// Tool implementation for GET /api/orders
export const getApiOrdersTool = {
  name: 'get_api_orders',
  description: 'Next.js API route from pages/api/orders.js',
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