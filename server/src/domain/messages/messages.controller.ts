import { Request, Response } from 'express';
import { messagesService } from './messages.service';
import { createMessageSchema, getMessagesQuerySchema } from './messages.types';

/**
 * Messages controller for handling HTTP requests
 */
export class MessagesController {
  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const conversationId = req.params.conversationId;
      
      // Validate query parameters
      const validatedQuery = getMessagesQuerySchema.parse(req.query);
      
      // Get messages
      const messages = await messagesService.getMessages(conversationId, userId, validatedQuery);
      
      // Return messages
      return res.status(200).json({ messages });
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
      }
      
      // Handle service errors
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      });
    }
  }

  /**
   * Create a new message
   */
  async createMessage(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const conversationId = req.params.conversationId;
      
      // Validate request body
      const validatedData = createMessageSchema.parse(req.body);
      
      // Create message
      const message = await messagesService.createMessage(conversationId, userId, validatedData);
      
      // Return message
      return res.status(201).json({ message });
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors,
          },
        });
      }
      
      // Handle service errors
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      });
    }
  }
}

// Export singleton instance
export const messagesController = new MessagesController();
