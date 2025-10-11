// Test for GET /api/categories tool
import { getApiCategoriesTool } from '../src/tools/getApiCategories';

describe('getApiCategoriesTool', () => {
  it('should have correct name and description', () => {
    expect(getApiCategoriesTool.name).toBe('get_api_categories');
    expect(getApiCategoriesTool.description).toBeDefined();
  });

  it('should have valid input schema', () => {
    expect(getApiCategoriesTool.inputSchema).toBeDefined();
    expect(getApiCategoriesTool.inputSchema.type).toBe('object');
  });
});