// Test for PUT /api/items/:id tool
import { putApiItemsIdTool } from '../src/tools/putApiItemsId';

describe('putApiItemsIdTool', () => {
  it('should have correct name and description', () => {
    expect(putApiItemsIdTool.name).toBe('put_api_items_id');
    expect(putApiItemsIdTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(putApiItemsIdTool.inputSchema).toBeDefined();
    expect(putApiItemsIdTool.inputSchema.type).toBe('object');
  });
});