// Test for DELETE /api/products/&lt;int:id&gt; tool
import { deleteApiProducts&lt;intid&gt;Tool } from '../src/tools/deleteApiProducts&lt;intid&gt;';

describe('deleteApiProducts&lt;intid&gt;Tool', () => {
  it('should have correct name and description', () => {
    expect(deleteApiProducts&lt;intid&gt;Tool.name).toBe('delete_api_products_&lt;intid&gt;');
    expect(deleteApiProducts&lt;intid&gt;Tool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(deleteApiProducts&lt;intid&gt;Tool.inputSchema).toBeDefined();
    expect(deleteApiProducts&lt;intid&gt;Tool.inputSchema.type).toBe('object');
  });
});