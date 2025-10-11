// Test for GET /api/products tool
import { getApiProductsTool } from '../src/tools/getApiProducts';

describe('getApiProductsTool', () => {
  it('should have correct name and description', () => {
    expect(getApiProductsTool.name).toBe('get_api_products');
    expect(getApiProductsTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(getApiProductsTool.inputSchema).toBeDefined();
    expect(getApiProductsTool.inputSchema.type).toBe('object');
  });
});