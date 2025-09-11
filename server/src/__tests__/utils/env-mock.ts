// Mock environment configuration for tests

const mockEnv = {
  port: 4000,
  nodeEnv: 'test',
  isDevelopment: false,
  isProduction: false,
  isTest: true,
  database: {
    url: 'postgresql://test:test@localhost:5432/test',
  },
  jwt: {
    secret: 'test-jwt-secret',
    expiresIn: '24h',
  },
  encryption: {
    keyHex: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
  ai: {
    openaiApiKey: 'test-api-key',
  },
};

export default mockEnv;
