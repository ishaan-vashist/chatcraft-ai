// Import the mock first to ensure it's loaded before any other imports
import { mockPrisma } from '../../utils/prisma-mock';

import { ConversationsService } from '../../../domain/conversations/conversations.service';
import { mockConversations, mockUsers, mockParticipants, mockMessages } from '../../utils/mocks';

describe('ConversationsService', () => {
  let conversationsService: ConversationsService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    conversationsService = new ConversationsService();
  });
  
  describe('getConversations', () => {
    const userId = '1';
    
    it('should return all conversations where user is a participant', async () => {
      // Mock conversations found
      const mockConversationsWithParticipants = [
        {
          ...mockConversations[0],
          participants: [
            {
              id: '1',
              conversationId: '1',
              userId: '1',
              user: mockUsers[0]
            },
            {
              id: '2',
              conversationId: '1',
              userId: '2',
              user: mockUsers[1]
            }
          ],
          messages: [mockMessages[0]]
        }
      ];
      
      mockPrisma.conversation.findMany.mockResolvedValue(mockConversationsWithParticipants);
      
      // Call getConversations
      const result = await conversationsService.getConversations(userId);
      
      // Verify conversations were fetched
      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: {
          participants: {
            some: {
              userId
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            }
          },
          messages: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Verify result structure
      expect(result).toHaveLength(mockConversationsWithParticipants.length);
      expect(result[0]).toEqual({
        id: mockConversationsWithParticipants[0].id,
        isGroup: mockConversationsWithParticipants[0].isGroup,
        retentionDays: mockConversationsWithParticipants[0].retentionDays,
        createdAt: mockConversationsWithParticipants[0].createdAt.toISOString(),
        participants: [
          {
            id: '1',
            userId: '1',
            name: mockUsers[0].name,
            email: mockUsers[0].email
          },
          {
            id: '2',
            userId: '2',
            name: mockUsers[1].name,
            email: mockUsers[1].email
          }
        ],
        lastMessage: {
          id: mockMessages[0].id,
          content: 'Message content would be decrypted here',
          senderId: mockMessages[0].senderId,
          createdAt: mockMessages[0].createdAt.toISOString()
        }
      });
    });
    
    it('should handle conversations with no messages', async () => {
      // Mock conversations found with no messages
      const mockConversationsWithParticipants = [
        {
          ...mockConversations[0],
          participants: [
            {
              id: '1',
              conversationId: '1',
              userId: '1',
              user: mockUsers[0]
            }
          ],
          messages: []
        }
      ];
      
      mockPrisma.conversation.findMany.mockResolvedValue(mockConversationsWithParticipants);
      
      // Call getConversations
      const result = await conversationsService.getConversations(userId);
      
      // Verify result structure
      expect(result[0].lastMessage).toBeUndefined();
    });
  });
  
  describe('createConversation', () => {
    const userId = '1';
    const participantUserId = '2';
    
    it('should create a new conversation if none exists', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[1]);
      
      // Mock no existing conversation
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      
      // Mock conversation creation
      const createdConversation = {
        ...mockConversations[0],
        participants: [
          {
            id: '1',
            conversationId: '1',
            userId: '1',
            user: mockUsers[0]
          },
          {
            id: '2',
            conversationId: '1',
            userId: '2',
            user: mockUsers[1]
          }
        ]
      };
      mockPrisma.conversation.create.mockResolvedValue(createdConversation);
      
      // Call createConversation
      const result = await conversationsService.createConversation(userId, { participantUserId });
      
      // Verify user was checked
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: participantUserId }
      });
      
      // Verify existing conversation was checked
      expect(mockPrisma.conversation.findFirst).toHaveBeenCalled();
      
      // Verify conversation was created
      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          isGroup: false,
          participants: {
            create: [
              { userId },
              { userId: participantUserId }
            ]
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            }
          }
        }
      });
      
      // Verify result structure
      expect(result).toEqual({
        id: createdConversation.id,
        isGroup: createdConversation.isGroup,
        retentionDays: createdConversation.retentionDays,
        createdAt: createdConversation.createdAt.toISOString(),
        participants: [
          {
            id: '1',
            userId: '1',
            name: mockUsers[0].name,
            email: mockUsers[0].email
          },
          {
            id: '2',
            userId: '2',
            name: mockUsers[1].name,
            email: mockUsers[1].email
          }
        ]
      });
    });
    
    it('should return existing conversation if one exists', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue(mockUsers[1]);
      
      // Mock existing conversation
      const existingConversation = {
        ...mockConversations[0],
        participants: [
          {
            id: '1',
            conversationId: '1',
            userId: '1',
            user: mockUsers[0]
          },
          {
            id: '2',
            conversationId: '1',
            userId: '2',
            user: mockUsers[1]
          }
        ]
      };
      mockPrisma.conversation.findFirst.mockResolvedValue(existingConversation);
      
      // Call createConversation
      const result = await conversationsService.createConversation(userId, { participantUserId });
      
      // Verify user was checked
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: participantUserId }
      });
      
      // Verify existing conversation was checked
      expect(mockPrisma.conversation.findFirst).toHaveBeenCalled();
      
      // Verify conversation was not created
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
      
      // Verify result structure
      expect(result).toEqual({
        id: existingConversation.id,
        isGroup: existingConversation.isGroup,
        retentionDays: existingConversation.retentionDays,
        createdAt: existingConversation.createdAt.toISOString(),
        participants: [
          {
            id: '1',
            userId: '1',
            name: mockUsers[0].name,
            email: mockUsers[0].email
          },
          {
            id: '2',
            userId: '2',
            name: mockUsers[1].name,
            email: mockUsers[1].email
          }
        ]
      });
    });
    
    it('should throw error if participant user not found', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Call createConversation and expect error
      await expect(conversationsService.createConversation(userId, { participantUserId }))
        .rejects.toThrow('User not found');
      
      // Verify user was checked
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: participantUserId }
      });
      
      // Verify conversation was not checked or created
      expect(mockPrisma.conversation.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });
  });
  
  describe('getConversationById', () => {
    const conversationId = '1';
    const userId = '1';
    
    it('should return conversation when user is a participant', async () => {
      // Mock conversation found
      const mockConversationWithParticipants = {
        ...mockConversations[0],
        participants: [
          {
            id: '1',
            conversationId: '1',
            userId: '1',
            user: mockUsers[0]
          },
          {
            id: '2',
            conversationId: '1',
            userId: '2',
            user: mockUsers[1]
          }
        ]
      };
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversationWithParticipants);
      
      // Call getConversationById
      const result = await conversationsService.getConversationById(conversationId, userId);
      
      // Verify conversation was fetched
      expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            }
          }
        }
      });
      
      // Verify result structure
      expect(result).toEqual({
        id: mockConversationWithParticipants.id,
        isGroup: mockConversationWithParticipants.isGroup,
        retentionDays: mockConversationWithParticipants.retentionDays,
        createdAt: mockConversationWithParticipants.createdAt.toISOString(),
        participants: [
          {
            id: '1',
            userId: '1',
            name: mockUsers[0].name,
            email: mockUsers[0].email
          },
          {
            id: '2',
            userId: '2',
            name: mockUsers[1].name,
            email: mockUsers[1].email
          }
        ]
      });
    });
    
    it('should throw error if conversation not found', async () => {
      // Mock conversation not found
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      
      // Call getConversationById and expect error
      await expect(conversationsService.getConversationById(conversationId, userId))
        .rejects.toThrow('Conversation not found');
      
      // Verify conversation was fetched
      expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: conversationId },
        include: expect.any(Object)
      });
    });
    
    it('should throw error if user is not a participant', async () => {
      // Mock conversation found but user is not a participant
      const mockConversationWithParticipants = {
        ...mockConversations[0],
        participants: [
          {
            id: '2',
            conversationId: '1',
            userId: '2',
            user: mockUsers[1]
          }
        ]
      };
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversationWithParticipants);
      
      // Call getConversationById and expect error
      await expect(conversationsService.getConversationById(conversationId, userId))
        .rejects.toThrow('You are not a participant in this conversation');
      
      // Verify conversation was fetched
      expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: conversationId },
        include: expect.any(Object)
      });
    });
  });
});
