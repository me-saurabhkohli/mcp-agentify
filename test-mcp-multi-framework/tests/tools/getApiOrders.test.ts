// Test for GET /api/orders tool
import { getApiOrdersTool } from '../src/tools/getApiOrders';

describe('getApiOrdersTool', () => {
  it('should have correct name and description', () => {
    expect(getApiOrdersTool.name).toBe('get_api_orders');
    expect(getApiOrdersTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(getApiOrdersTool.inputSchema).toBeDefined();
    expect(getApiOrdersTool.inputSchema.type).toBe('object');
  });
});