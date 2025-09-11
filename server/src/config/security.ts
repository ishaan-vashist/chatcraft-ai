import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { Express } from 'express';
import env from './env';

/**
 * Configure security middleware for the Express application
 */
export const configureSecurityMiddleware = (app: Express): void => {
  // Set security headers with Helmet
  app.use(helmet());

  // Configure CORS
  app.use(cors({
    origin: env.isDevelopment ? 'http://localhost:5173' : process.env.CORS_ORIGIN,
    credentials: true,
  }));

  // Skip rate limiting in test environment
  if (!env.isTest) {
    // Rate limiting
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: env.isDevelopment ? 1000 : 100, // limit each IP to 100 requests per windowMs in production
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
    });

    // Apply rate limiting to all routes
    app.use('/api', apiLimiter);

    // Authentication rate limiter (more strict)
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each IP to 10 login/register attempts per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'AUTH_RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts, please try again later.' } },
    });

    // Apply stricter rate limiting to auth routes
    app.use('/api/auth', authLimiter);
  }
};
