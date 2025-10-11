#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

class AgentifyMcpServer {
  private server: Server;
  private baseUrl: string;

  constructor() {
    this.server = new Server(
      {
        name: 'agentify-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.baseUrl = process.env.API_BASE_URL || '' || 'http://localhost:3000';
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_api_orders',
            description: 'Next.js API route from pages/api/orders.js',
            inputSchema: {
              type: 'object',
              properties: {
              }
            }
          },
          {
            name: 'post_api_orders',
            description: 'Next.js API route from pages/api/orders.js',
            inputSchema: {
              type: 'object',
              properties: {
              }
            }
          },
          {
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
            }
          },
          {
            name: 'post_api_orders_id',
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
            }
          },
          {
            name: 'get_api_products',
            description: 'Flask endpoint from flask_api.py',
            inputSchema: {
              type: 'object',
              properties: {
              }
            }
          },
          {
            name: 'post_api_products',
            description: 'Flask endpoint from flask_api.py',
            inputSchema: {
              type: 'object',
              properties: {
              }
            }
          },
          {
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
            }
          },
          {
            name: 'put_api_products_&lt;intid&gt;',
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
            }
          },
          {
            name: 'delete_api_products_&lt;intid&gt;',
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
            }
          },
          {
            name: 'get_api_categories',
            description: 'Flask endpoint from flask_api.py',
            inputSchema: {
              type: 'object',
              properties: {
              }
            }
          },
          {
            name: 'post_api_categories',
            description: 'Flask endpoint from flask_api.py',
            inputSchema: {
              type: 'object',
              properties: {
              }
            }
          },
          {
            name: 'get_api_items',
            description: 'Go endpoint from main.go',
            inputSchema: {
              type: 'object',
              properties: {
              }
            }
          },
          {
            name: 'post_api_items',
            description: 'Go endpoint from main.go',
            inputSchema: {
              type: 'object',
              properties: {
              }
            }
          },
          {
            name: 'get_api_items_id',
            description: 'Go endpoint from main.go',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Path parameter: id',
                  required: true
                }
              }
            }
          },
          {
            name: 'put_api_items_id',
            description: 'Go endpoint from main.go',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Path parameter: id',
                  required: true
                }
              }
            }
          },
          {
            name: 'delete_api_items_id',
            description: 'Go endpoint from main.go',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Path parameter: id',
                  required: true
                }
              }
            }
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_api_orders':
            return await this.handleGetApiOrders(args);
          case 'post_api_orders':
            return await this.handlePostApiOrders(args);
          case 'get_api_orders_id':
            return await this.handleGetApiOrdersId(args);
          case 'post_api_orders_id':
            return await this.handlePostApiOrdersId(args);
          case 'get_api_products':
            return await this.handleGetApiProducts(args);
          case 'post_api_products':
            return await this.handlePostApiProducts(args);
          case 'get_api_products_&lt;intid&gt;':
            return await this.handleGetApiProducts&lt;intid&gt;(args);
          case 'put_api_products_&lt;intid&gt;':
            return await this.handlePutApiProducts&lt;intid&gt;(args);
          case 'delete_api_products_&lt;intid&gt;':
            return await this.handleDeleteApiProducts&lt;intid&gt;(args);
          case 'get_api_categories':
            return await this.handleGetApiCategories(args);
          case 'post_api_categories':
            return await this.handlePostApiCategories(args);
          case 'get_api_items':
            return await this.handleGetApiItems(args);
          case 'post_api_items':
            return await this.handlePostApiItems(args);
          case 'get_api_items_id':
            return await this.handleGetApiItemsId(args);
          case 'put_api_items_id':
            return await this.handlePutApiItemsId(args);
          case 'delete_api_items_id':
            return await this.handleDeleteApiItemsId(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error}`
        );
      }
    });
  }

  private async handleGetApiOrders(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/orders`;
    const config = {
      method: 'GET',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handlePostApiOrders(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/orders`;
    const config = {
      method: 'POST',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      data: args.body || {},
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handleGetApiOrdersId(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/orders/{id}`;
    const config = {
      method: 'GET',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handlePostApiOrdersId(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/orders/{id}`;
    const config = {
      method: 'POST',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      data: args.body || {},
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handleGetApiProducts(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/products`;
    const config = {
      method: 'GET',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handlePostApiProducts(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/products`;
    const config = {
      method: 'POST',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      data: args.body || {},
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handleGetApiProducts&lt;intid&gt;(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/products/&lt;int:id&gt;`;
    const config = {
      method: 'GET',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handlePutApiProducts&lt;intid&gt;(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/products/&lt;int:id&gt;`;
    const config = {
      method: 'PUT',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handleDeleteApiProducts&lt;intid&gt;(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/products/&lt;int:id&gt;`;
    const config = {
      method: 'DELETE',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handleGetApiCategories(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/categories`;
    const config = {
      method: 'GET',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handlePostApiCategories(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/categories`;
    const config = {
      method: 'POST',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      data: args.body || {},
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handleGetApiItems(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/items`;
    const config = {
      method: 'GET',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handlePostApiItems(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/items`;
    const config = {
      method: 'POST',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      data: args.body || {},
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handleGetApiItemsId(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/items/:id`;
    const config = {
      method: 'GET',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handlePutApiItemsId(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/items/:id`;
    const config = {
      method: 'PUT',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }

  private async handleDeleteApiItemsId(args: any): Promise<any> {
    const url = `${this.baseUrl}/api/items/:id`;
    const config = {
      method: 'DELETE',
      url: url.replace(/\{([^}]+)\}/g, (match, key) => args[key] || match),
      params: {},
      headers: {
        'Content-Type': 'application/json',
        ...args.headers
      }
    };

    // Add query parameters

    const response = await axios(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }


  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('agentify-mcp-server running on stdio');
  }
}

const server = new AgentifyMcpServer();
server.run().catch(console.error);
