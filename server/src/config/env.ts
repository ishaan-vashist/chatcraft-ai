import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define environment variable schema with validation
const envSchema = z.object({
  // Server
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  ENCRYPTION_KEY_HEX: z.string().length(64), // 32 bytes in hex = 64 chars
  
  // AI
  OPENAI_API_KEY: z.string(),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Export validated environment variables
export default {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: '24h',
  },
  encryption: {
    keyHex: env.ENCRYPTION_KEY_HEX,
  },
  ai: {
    openaiApiKey: env.OPENAI_API_KEY,
  },
};
