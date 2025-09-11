/// <reference types="jest" />
// Import the mock first to ensure it's loaded before any other imports
import { mockPrisma } from '../../utils/prisma-mock';

import { MessagesService } from '../../../domain/messages/messages.service';
import { CreateMessageRequest, GetMessagesQuery } from '../../../domain/messages/messages.types';
import { cryptoService } from '../../../domain/crypto/crypto.service';
import { mockMessages, mockUsers } from '../../utils/mocks';

jest.mock('../../../domain/crypto/crypto.service', () => ({
  cryptoService: {
    encrypt: jest.fn(),
    decrypt: jest.fn()
  }
}));

describe('MessagesService', () => {
  let messagesService: MessagesService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    messagesService = new MessagesService();
  });
  
  describe('getMessages', () => {
    const conversationId = '1';
    const userId = '1';
    const query = { limit: 10 };
    
    it('should return messages when user is a participant', async () => {
      // Mock user is a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        id: '1',
        conversationId,
        userId
      });
      
      // Mock messages found
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      
      // Mock decryption
      (cryptoService.decrypt as jest.Mock).mockImplementation((ciphertext, nonce) => {
        // Return a predictable message for testing with index
        return 'Decrypted message 1';
      });
      
      // Call getMessages
      const result = await messagesService.getMessages(conversationId, userId, query);
      
      // Verify user participation was checked
      expect(mockPrisma.conversationParticipant.findFirst).toHaveBeenCalledWith({
        where: {
          conversationId,
          userId
        }
      });
      
      // Verify messages were fetched
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Verify decryption was called for each message
      expect(cryptoService.decrypt).toHaveBeenCalledTimes(mockMessages.length);
      
      // Verify result structure
      expect(result).toHaveLength(mockMessages.length);
      expect(result[0]).toEqual({
        id: mockMessages[0].id,
        conversationId: mockMessages[0].conversationId,
        senderId: mockMessages[0].senderId,
        type: mockMessages[0].type,
        content: 'Decrypted message',
        createdAt: mockMessages[0].createdAt.toISOString(),
        sender: {
          id: mockMessages[0].sender.id,
          name: mockMessages[0].sender.name,
          email: mockMessages[0].sender.email
        }
      });
    });
    
    it('should throw error if user is not a participant', async () => {
      // Mock user is not a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
      
      // Call getMessages and expect error
      await expect(messagesService.getMessages(conversationId, userId, query))
        .rejects.toThrow('You are not a participant in this conversation');
      
      // Verify user participation was checked
      expect(mockPrisma.conversationParticipant.findFirst).toHaveBeenCalledWith({
        where: {
          conversationId,
          userId
        }
      });
      
      // Verify messages were not fetched
      expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
    });
    
    it('should handle cursor-based pagination', async () => {
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
      
      // Call getMessages with cursor
      const beforeDate = '2023-01-15T00:00:00Z';
      const result = await messagesService.getMessages(conversationId, userId, {
        limit: 10,
        before: beforeDate
      });
      
      // Verify pagination condition was included
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: {
          conversationId,
          createdAt: {
            lt: new Date(beforeDate)
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: expect.any(Object)
      });
    });
  });
  
  describe('createMessage', () => {
    const conversationId = '1';
    const userId = '1';
    const messageData = {
      content: 'Hello, world!'
    };
    
    it('should create a message when user is a participant', async () => {
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
      
      // Call createMessage
      const result = await messagesService.createMessage(conversationId, userId, messageData);
      
      // Verify user participation was checked
      expect(mockPrisma.conversationParticipant.findFirst).toHaveBeenCalledWith({
        where: {
          conversationId,
          userId
        }
      });
      
      // Verify content was encrypted
      expect(cryptoService.encrypt).toHaveBeenCalledWith(messageData.content);
      
      // Verify message was created
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId,
          senderId: userId,
          type: 'text',
          ciphertext: encryptedData.ciphertext,
          nonce: encryptedData.nonce
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Verify result structure
      expect(result).toEqual({
        id: createdMessage.id,
        conversationId: createdMessage.conversationId,
        senderId: createdMessage.senderId,
        type: createdMessage.type,
        content: messageData.content,
        createdAt: createdMessage.createdAt.toISOString(),
        sender: {
          id: createdMessage.sender.id,
          name: createdMessage.sender.name,
          email: createdMessage.sender.email
        }
      });
    });
    
    it('should throw error if user is not a participant', async () => {
      // Mock user is not a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
      
      // Call createMessage and expect error
      await expect(messagesService.createMessage(conversationId, userId, messageData))
        .rejects.toThrow('You are not a participant in this conversation');
      
      // Verify user participation was checked
      expect(mockPrisma.conversationParticipant.findFirst).toHaveBeenCalledWith({
        where: {
          conversationId,
          userId
        }
      });
      
      // Verify message was not created
      expect(mockPrisma.message.create).not.toHaveBeenCalled();
    });
  });
  
  describe('isUserParticipant', () => {
    it('should return true if user is a participant', async () => {
      // Mock user is a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        id: '1',
        conversationId: '1',
        userId: '1'
      });
      
      // Call isUserParticipant (private method access through a test instance)
      const service = new MessagesService();
      const isUserParticipant = (service as any).isUserParticipant.bind(service);
      const result = await isUserParticipant('1', '1');
      
      // Verify result
      expect(result).toBe(true);
    });
    
    it('should return false if user is not a participant', async () => {
      // Mock user is not a participant
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
      
      // Call isUserParticipant (private method access through a test instance)
      const service = new MessagesService();
      const isUserParticipant = (service as any).isUserParticipant.bind(service);
      const result = await isUserParticipant('1', '2');
      
      // Verify result
      expect(result).toBe(false);
    });
  });
});
