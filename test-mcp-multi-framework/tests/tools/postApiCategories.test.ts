// Test for POST /api/categories tool
import { postApiCategoriesTool } from '../src/tools/postApiCategories';

describe('postApiCategoriesTool', () => {
  it('should have correct name and description', () => {
    expect(postApiCategoriesTool.name).toBe('post_api_categories');
    expect(postApiCategoriesTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(postApiCategoriesTool.inputSchema).toBeDefined();
    expect(postApiCategoriesTool.inputSchema.type).toBe('object');
  });
});