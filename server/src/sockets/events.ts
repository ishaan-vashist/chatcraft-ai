import { Server, Socket } from 'socket.io';

// Define message DTO type
export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text';
  content: string;
  createdAt: string;
}

/**
 * Handle Socket.IO events for a connected client
 */
export const handleSocketEvents = (io: Server, socket: Socket): void => {
  const userId = socket.data.user.id;

  // Handle room join event
  socket.on('room:join', ({ conversationId }: { conversationId: string }) => {
    // Join the room for this conversation
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${userId} joined conversation ${conversationId}`);
  });

  // Handle room leave event
  socket.on('room:leave', ({ conversationId }: { conversationId: string }) => {
    // Leave the room for this conversation
    socket.leave(`conversation:${conversationId}`);
    console.log(`User ${userId} left conversation ${conversationId}`);
  });

  // Handle message send event
  socket.on('message:send', async ({ conversationId, content }: { conversationId: string, content: string }) => {
    try {
      // This will be implemented in the messages service
      // const message = await messagesService.createMessage({
      //   conversationId,
      //   senderId: userId,
      //   content,
      // });

      // For now, we'll just emit a mock message
      const mockMessage: MessageDTO = {
        id: 'temp-id',
        conversationId,
        senderId: userId,
        type: 'text',
        content,
        createdAt: new Date().toISOString(),
      };

      // Emit to all clients in the conversation room
      io.to(`conversation:${conversationId}`).emit('message:new', mockMessage);

      // If this is a conversation with the AI, we would trigger the AI response here
      // This will be implemented later
    } catch (error) {
      console.error('Error sending message:', error);
      // Emit error to the sender
      socket.emit('error', { 
        code: 'MESSAGE_SEND_ERROR', 
        message: 'Failed to send message' 
      });
    }
  });

  // Handle typing indicators
  socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
    // Broadcast to others in the conversation that this user is typing
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      userId,
      isTyping: true,
      conversationId,
    });
  });

  socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
    // Broadcast to others in the conversation that this user stopped typing
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      userId,
      isTyping: false,
      conversationId,
    });
  });
};
