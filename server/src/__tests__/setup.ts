// Global test setup file
import dotenv from 'dotenv';

// Load environment variables from .env.test if it exists, otherwise from .env
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ENCRYPTION_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars

// Global test teardown
afterAll(async () => {
  // Add any global cleanup here if needed
});

// Add a dummy test to prevent Jest from failing
describe('Test setup', () => {
  it('should set up the test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
