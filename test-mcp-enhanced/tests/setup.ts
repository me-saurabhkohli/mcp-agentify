// Test setup for agentify-mcp-server
import { beforeAll, afterAll } from '@jest/globals';

beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup after tests
});