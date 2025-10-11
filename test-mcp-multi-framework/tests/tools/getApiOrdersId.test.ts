// Test for GET /api/orders/{id} tool
import { getApiOrdersIdTool } from '../src/tools/getApiOrdersId';

describe('getApiOrdersIdTool', () => {
  it('should have correct name and description', () => {
    expect(getApiOrdersIdTool.name).toBe('get_api_orders_id');
    expect(getApiOrdersIdTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(getApiOrdersIdTool.inputSchema).toBeDefined();
    expect(getApiOrdersIdTool.inputSchema.type).toBe('object');
  });
});