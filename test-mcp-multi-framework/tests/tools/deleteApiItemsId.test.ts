// Test for DELETE /api/items/:id tool
import { deleteApiItemsIdTool } from '../src/tools/deleteApiItemsId';

describe('deleteApiItemsIdTool', () => {
  it('should have correct name and description', () => {
    expect(deleteApiItemsIdTool.name).toBe('delete_api_items_id');
    expect(deleteApiItemsIdTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(deleteApiItemsIdTool.inputSchema).toBeDefined();
    expect(deleteApiItemsIdTool.inputSchema.type).toBe('object');
  });
});