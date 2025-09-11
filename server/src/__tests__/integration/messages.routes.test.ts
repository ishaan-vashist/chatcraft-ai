/// <reference types="jest" />
// Import the mock first to ensure it's loaded before any other imports
import { mockPrisma } from '../utils/prisma-mock';

import request from 'supertest';
import { app } from '../../app';
import jwt from 'jsonwebtoken';
import { mockUsers, mockMessages } from '../utils/mocks';
import { cryptoService } from '../../domain/crypto/crypto.service';

jest.mock('jsonwebtoken');

jest.mock('../../domain/crypto/crypto.service', () => ({
  cryptoService: {
    encrypt: jest.fn(),
    decrypt: jest.fn()
  }
}));

describe('Messages API Routes', () => {
  const conversationId = '1';
  const userId = '1';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock JWT verify for authentication
    (jwt.verify as jest.Mock).mockReturnValue({ id: userId, email: mockUsers[0].email });
  });
  
  describe('GET /api/conversations/:conversationId/messages', () => {
    it('should return messages for a conversation', async () => {
      // Mock user is a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        id: '1',
        conversationId,
        userId
      });
      
      // Mock messages found
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      
      // Mock decryption
      (cryptoService.decrypt as jest.Mock).mockReturnValue('Decrypted message');
      
      // Make request
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', 'Bearer mock_token')
        .query({ limit: 10 })
        .expect(200);
      
      // Verify response structure
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(mockMessages.length);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('content', 'Decrypted message');
      expect(response.body[0]).toHaveProperty('senderId');
      expect(response.body[0]).toHaveProperty('createdAt');
    });
    
    it('should return 403 if user is not a participant', async () => {
      // Mock user is not a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
      
      // Make request
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', 'Bearer mock_token')
        .query({ limit: 10 })
        .expect(403);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'NOT_PARTICIPANT',
          message: 'You are not a participant in this conversation'
        }
      });
    });
    
    it('should handle pagination with before parameter', async () => {
      // Mock user is a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        id: '1',
        conversationId,
        userId
      });
      
      // Mock messages found
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      
      // Mock decryption
      (cryptoService.decrypt as jest.Mock).mockReturnValue('Decrypted message');
      
      // Make request with pagination
      const beforeDate = '2023-01-15T00:00:00Z';
      await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', 'Bearer mock_token')
        .query({ 
          limit: 10,
          before: beforeDate
        })
        .expect(200);
      
      // Verify query included pagination
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lt: new Date(beforeDate)
            })
          })
        })
      );
    });
    
    it('should return 401 for unauthenticated request', async () => {
      // Mock JWT verify to throw error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Make request without valid token
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    });
  });
  
  describe('POST /api/conversations/:conversationId/messages', () => {
    const messageData = {
      content: 'Hello, world!'
    };
    
    it('should create a new message', async () => {
      // Mock user is a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        id: '1',
        conversationId,
        userId
      });
      
      // Mock encryption
      const encryptedData = {
        ciphertext: Buffer.from('encrypted data'),
        nonce: Buffer.from('nonce')
      };
      (cryptoService.encrypt as jest.Mock).mockReturnValue(encryptedData);
      
      // Mock message creation
      const createdMessage = {
        id: '3',
        conversationId,
        senderId: userId,
        type: 'text',
        ciphertext: encryptedData.ciphertext,
        nonce: encryptedData.nonce,
        createdAt: new Date(),
        sender: mockUsers[0]
      } as any; // Use type assertion to avoid TypeScript errors
      mockPrisma.message.create.mockResolvedValue(createdMessage);
      
      // Make request
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', 'Bearer mock_token')
        .send(messageData)
        .expect(201);
      
      // Verify response structure
      expect(response.body).toHaveProperty('id', createdMessage.id);
      expect(response.body).toHaveProperty('content', messageData.content);
      expect(response.body).toHaveProperty('senderId', userId);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('sender');
    });
    
    it('should return 403 if user is not a participant', async () => {
      // Mock user is not a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
      
      // Make request
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', 'Bearer mock_token')
        .send(messageData)
        .expect(403);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'NOT_PARTICIPANT',
          message: 'You are not a participant in this conversation'
        }
      });
    });
    
    it('should return 400 for invalid input', async () => {
      // Make request with empty content
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', 'Bearer mock_token')
        .send({ content: '' })
        .expect(400);
      
      // Verify error response
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should return 401 for unauthenticated request', async () => {
      // Mock JWT verify to throw error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Make request without valid token
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', 'Bearer invalid_token')
        .send(messageData)
        .expect(401);
      
      // Verify error response
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    });
  });
});
