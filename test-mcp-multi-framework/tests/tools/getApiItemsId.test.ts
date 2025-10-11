// Test for GET /api/items/:id tool
import { getApiItemsIdTool } from '../src/tools/getApiItemsId';

describe('getApiItemsIdTool', () => {
  it('should have correct name and description', () => {
    expect(getApiItemsIdTool.name).toBe('get_api_items_id');
    expect(getApiItemsIdTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(getApiItemsIdTool.inputSchema).toBeDefined();
    expect(getApiItemsIdTool.inputSchema.type).toBe('object');
  });
});