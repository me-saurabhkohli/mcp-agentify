// Test for GET /api/products/&lt;int:id&gt; tool
import { getApiProducts&lt;intid&gt;Tool } from '../src/tools/getApiProducts&lt;intid&gt;';

describe('getApiProducts&lt;intid&gt;Tool', () => {
  it('should have correct name and description', () => {
    expect(getApiProducts&lt;intid&gt;Tool.name).toBe('get_api_products_&lt;intid&gt;');
    expect(getApiProducts&lt;intid&gt;Tool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(getApiProducts&lt;intid&gt;Tool.inputSchema).toBeDefined();
    expect(getApiProducts&lt;intid&gt;Tool.inputSchema.type).toBe('object');
  });
});