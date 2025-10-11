// Test for GET /api/items tool
import { getApiItemsTool } from '../src/tools/getApiItems';

describe('getApiItemsTool', () => {
  it('should have correct name and description', () => {
    expect(getApiItemsTool.name).toBe('get_api_items');
    expect(getApiItemsTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(getApiItemsTool.inputSchema).toBeDefined();
    expect(getApiItemsTool.inputSchema.type).toBe('object');
  });
});