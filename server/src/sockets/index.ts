import { Server, Socket } from 'socket.io';
import { verifyJwtToken } from '../domain/auth/auth.middleware';
import { handleSocketEvents } from './events';

// Define socket middleware for authentication
const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Get token from handshake auth or query
    const token = 
      socket.handshake.auth?.token || 
      socket.handshake.query?.token as string;
    
    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }

    // Verify JWT token
    const decoded = await verifyJwtToken(token);
    
    // Attach user data to socket
    socket.data.user = decoded;
    
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

/**
 * Setup Socket.IO server with authentication and event handlers
 */
export const setupSocketIO = (io: Server): void => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  // Handle connection event
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.data.user.id}`);
    
    // Setup event handlers
    handleSocketEvents(io, socket);
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.user.id}`);
    });
  });
};
