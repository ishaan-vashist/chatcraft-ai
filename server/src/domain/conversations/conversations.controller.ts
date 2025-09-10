import { Request, Response } from 'express';
import { conversationsService } from './conversations.service';
import { createConversationSchema } from './conversations.types';

/**
 * Conversations controller for handling HTTP requests
 */
export class ConversationsController {
  /**
   * Get all conversations for a user
   */
  async getConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Get conversations
      const conversations = await conversationsService.getConversations(userId);
      
      // Return conversations
      return res.status(200).json({ conversations });
    } catch (error: any) {
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
   * Create a new conversation
   */
  async createConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Validate request body
      const validatedData = createConversationSchema.parse(req.body);
      
      // Create conversation
      const conversation = await conversationsService.createConversation(userId, validatedData);
      
      // Return conversation
      return res.status(201).json({ conversation });
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

  /**
   * Get a conversation by ID
   */
  async getConversationById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const conversationId = req.params.id;
      
      // Get conversation
      const conversation = await conversationsService.getConversationById(conversationId, userId);
      
      // Return conversation
      return res.status(200).json({ conversation });
    } catch (error: any) {
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
export const conversationsController = new ConversationsController();
