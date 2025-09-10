import { httpServer } from './app';
import env from './config/env';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Start the server
const PORT = env.port;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${env.nodeEnv} mode`);
});

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...');
  
  try {
    // Close database connection
    await prisma.$disconnect();
    console.log('Database connection closed');
    
    // Close HTTP server
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
