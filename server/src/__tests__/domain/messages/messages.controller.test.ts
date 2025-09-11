/// <reference types="jest" />
import { MessagesController } from '../../../domain/messages/messages.controller';
import { messagesService } from '../../../domain/messages/messages.service';
import { mockRequest, mockResponse, mockMessages } from '../../utils/mocks';
import { Request, Response } from 'express';

// Mock messages service
jest.mock('../../../domain/messages/messages.service', () => ({
  messagesService: {
    getMessages: jest.fn(),
    createMessage: jest.fn()
  }
}));

describe('MessagesController', () => {
  let messagesController: MessagesController;
  let req: Request;
  let res: Response;
  
  beforeEach(() => {
    jest.clearAllMocks();
    messagesController = new MessagesController();
    req = mockRequest();
    res = mockResponse();
    
    // Setup request with user data (added by auth middleware)
    (req as any).user = { id: '1', email: 'user@example.com' };
    
    // Setup request params
    req.params = { conversationId: '1' };
  });
  
  describe('getMessages', () => {
    it('should return messages for a conversation', async () => {
      // Setup request query
      req.query = { limit: '10' };
      
      // Mock service response
      const formattedMessages = mockMessages.map(message => ({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: message.type,
        content: 'Decrypted message',
        createdAt: message.createdAt.toISOString(),
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          email: message.sender.email
        }
      }));
      (messagesService.getMessages as jest.Mock).mockResolvedValue(formattedMessages);
      
      // Call controller method
      await messagesController.getMessages(req, res);
      
      // Verify service was called
      expect(messagesService.getMessages).toHaveBeenCalledWith(
        '1', // conversationId
        '1', // userId
        { limit: 10 } // query
      );
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ messages: formattedMessages });
    });
    
    it('should handle pagination with before parameter', async () => {
      // Setup request query
      req.query = { 
        limit: '10',
        before: '2023-01-15T00:00:00Z'
      };
      
      // Mock service response
      (messagesService.getMessages as jest.Mock).mockResolvedValue([]);
      
      // Call controller method
      await messagesController.getMessages(req, res);
      
      // Verify service was called with pagination params
      expect(messagesService.getMessages).toHaveBeenCalledWith(
        '1', // conversationId
        '1', // userId
        { 
          limit: 10,
          before: '2023-01-15T00:00:00Z'
        }
      );
    });
    
    it('should use default limit if not provided', async () => {
      // Setup request query without limit
      req.query = {};
      
      // Mock service response
      (messagesService.getMessages as jest.Mock).mockResolvedValue([]);
      
      // Call controller method
      await messagesController.getMessages(req, res);
      
      // Verify service was called with default limit
      expect(messagesService.getMessages).toHaveBeenCalledWith(
        '1', // conversationId
        '1', // userId
        { limit: 30 } // default limit
      );
    });
    
    it('should handle service errors', async () => {
      // Setup request query
      req.query = { limit: '10' };
      
      // Mock service error
      const serviceError = new Error('You are not a participant in this conversation');
      (serviceError as any).statusCode = 403;
      (serviceError as any).code = 'NOT_PARTICIPANT';
      (messagesService.getMessages as jest.Mock).mockRejectedValue(serviceError);
      
      // Call controller method
      await messagesController.getMessages(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_PARTICIPANT',
          message: 'You are not a participant in this conversation'
        }
      });
    });
  });
  
  describe('createMessage', () => {
    const messageData = {
      content: 'Hello, world!'
    };
    
    const createdMessage = {
      id: '3',
      conversationId: '1',
      senderId: '1',
      type: 'text',
      content: 'Hello, world!',
      createdAt: '2023-01-15T12:00:00Z',
      sender: {
        id: '1',
        name: 'User One',
        email: 'user1@example.com'
      }
    };
    
    it('should create a new message', async () => {
      // Setup request body
      req.body = messageData;
      
      // Mock service response
      (messagesService.createMessage as jest.Mock).mockResolvedValue(createdMessage);
      
      // Call controller method
      await messagesController.createMessage(req, res);
      
      // Verify service was called
      expect(messagesService.createMessage).toHaveBeenCalledWith(
        '1', // conversationId
        '1', // userId
        messageData
      );
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: createdMessage });
    });
    
    it('should handle validation errors', async () => {
      // Setup request with empty content
      req.body = { content: '' };
      
      // Mock Zod validation error
      const zodError = new Error('Validation error');
      zodError.name = 'ZodError';
      (zodError as any).errors = [{ path: ['content'], message: 'Content cannot be empty' }];
      
      // Mock service to throw error
      (messagesService.createMessage as jest.Mock).mockRejectedValue(zodError);
      
      // Call controller method
      await messagesController.createMessage(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.any(Array)
        }
      });
    });
    
    it('should handle service errors', async () => {
      // Setup request body
      req.body = messageData;
      
      // Mock service error
      const serviceError = new Error('You are not a participant in this conversation');
      (serviceError as any).statusCode = 403;
      (serviceError as any).code = 'NOT_PARTICIPANT';
      (messagesService.createMessage as jest.Mock).mockRejectedValue(serviceError);
      
      // Call controller method
      await messagesController.createMessage(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_PARTICIPANT',
          message: 'You are not a participant in this conversation'
        }
      });
    });
  });
});
