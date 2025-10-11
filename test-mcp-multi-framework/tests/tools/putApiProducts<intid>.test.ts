// Test for PUT /api/products/&lt;int:id&gt; tool
import { putApiProducts&lt;intid&gt;Tool } from '../src/tools/putApiProducts&lt;intid&gt;';

describe('putApiProducts&lt;intid&gt;Tool', () => {
  it('should have correct name and description', () => {
    expect(putApiProducts&lt;intid&gt;Tool.name).toBe('put_api_products_&lt;intid&gt;');
    expect(putApiProducts&lt;intid&gt;Tool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(putApiProducts&lt;intid&gt;Tool.inputSchema).toBeDefined();
    expect(putApiProducts&lt;intid&gt;Tool.inputSchema.type).toBe('object');
  });
});