// Test for POST /api/products tool
import { postApiProductsTool } from '../src/tools/postApiProducts';

describe('postApiProductsTool', () => {
  it('should have correct name and description', () => {
    expect(postApiProductsTool.name).toBe('post_api_products');
    expect(postApiProductsTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(postApiProductsTool.inputSchema).toBeDefined();
    expect(postApiProductsTool.inputSchema.type).toBe('object');
  });
});