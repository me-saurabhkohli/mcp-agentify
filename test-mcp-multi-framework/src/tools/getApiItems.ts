// Tool implementation for GET /api/items
export const getApiItemsTool = {
  name: 'get_api_items',
  description: 'Go endpoint from main.go',
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