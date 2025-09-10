import { PrismaClient } from '@prisma/client';
import { CreateConversationRequest } from './conversations.types';

const prisma = new PrismaClient();

/**
 * Conversations service for managing chat conversations
 */
export class ConversationsService {
  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string) {
    // Get all conversations where the user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to response format
    return conversations.map(conversation => ({
      id: conversation.id,
      isGroup: conversation.isGroup,
      retentionDays: conversation.retentionDays,
      createdAt: conversation.createdAt.toISOString(),
      participants: conversation.participants.map(participant => ({
        id: participant.id,
        userId: participant.userId,
        name: participant.user.name,
        email: participant.user.email,
      })),
      lastMessage: conversation.messages[0] ? {
        id: conversation.messages[0].id,
        // In a real app, this would be decrypted
        content: 'Message content would be decrypted here',
        senderId: conversation.messages[0].senderId,
        createdAt: conversation.messages[0].createdAt.toISOString(),
      } : undefined,
    }));
  }

  /**
   * Create a new conversation or get existing 1:1 conversation
   */
  async createConversation(userId: string, data: CreateConversationRequest) {
    // Check if the participant exists
    const participant = await prisma.user.findUnique({
      where: { id: data.participantUserId },
    });

    if (!participant) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }

    // Check if a 1:1 conversation already exists between these users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: {
              in: [userId, data.participantUserId],
            },
          },
        },
        AND: [
          {
            participants: {
              some: {
                userId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: data.participantUserId,
              },
            },
          },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (existingConversation) {
      // Return existing conversation
      return {
        id: existingConversation.id,
        isGroup: existingConversation.isGroup,
        retentionDays: existingConversation.retentionDays,
        createdAt: existingConversation.createdAt.toISOString(),
        participants: existingConversation.participants.map(participant => ({
          id: participant.id,
          userId: participant.userId,
          name: participant.user.name,
          email: participant.user.email,
        })),
      };
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId },
            { userId: data.participantUserId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Return new conversation
    return {
      id: conversation.id,
      isGroup: conversation.isGroup,
      retentionDays: conversation.retentionDays,
      createdAt: conversation.createdAt.toISOString(),
      participants: conversation.participants.map(participant => ({
        id: participant.id,
        userId: participant.userId,
        name: participant.user.name,
        email: participant.user.email,
      })),
    };
  }

  /**
   * Get a conversation by ID
   */
  async getConversationById(conversationId: string, userId: string) {
    // Get conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      const error = new Error('Conversation not found');
      (error as any).statusCode = 404;
      (error as any).code = 'CONVERSATION_NOT_FOUND';
      throw error;
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      participant => participant.userId === userId
    );

    if (!isParticipant) {
      const error = new Error('You are not a participant in this conversation');
      (error as any).statusCode = 403;
      (error as any).code = 'NOT_PARTICIPANT';
      throw error;
    }

    // Return conversation
    return {
      id: conversation.id,
      isGroup: conversation.isGroup,
      retentionDays: conversation.retentionDays,
      createdAt: conversation.createdAt.toISOString(),
      participants: conversation.participants.map(participant => ({
        id: participant.id,
        userId: participant.userId,
        name: participant.user.name,
        email: participant.user.email,
      })),
    };
  }
}

// Export singleton instance
export const conversationsService = new ConversationsService();
