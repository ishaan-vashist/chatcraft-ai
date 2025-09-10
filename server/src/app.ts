import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { configureSecurityMiddleware } from './config/security';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { setupSocketIO } from './sockets';
import env from './config/env';

// Import routes
import authRoutes from './domain/auth/auth.routes';
import usersRoutes from './domain/users/users.routes';
import contactsRoutes from './domain/contacts/contacts.routes';
import conversationsRoutes from './domain/conversations/conversations.routes';
import messagesRoutes from './domain/messages/messages.routes';
import metricsRoutes from './domain/metrics/metrics.routes';

// Create Express application
const app: Express = express();

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: env.isDevelopment ? 'http://localhost:5173' : process.env.CORS_ORIGIN,
    credentials: true,
  },
});

// Setup Socket.IO
setupSocketIO(io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure security middleware
configureSecurityMiddleware(app);

// API routes
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/conversations/:conversationId/messages', messagesRoutes);
app.use('/api/metrics', metricsRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  const statusCode = 'statusCode' in err ? (err as any).statusCode : 500;
  const message = env.isDevelopment || statusCode < 500 
    ? err.message 
    : 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      code: (err as any).code || 'INTERNAL_ERROR',
      message,
      ...(env.isDevelopment && { stack: err.stack }),
    }
  });
});

export { app, httpServer, io };
