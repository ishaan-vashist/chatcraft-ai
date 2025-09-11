import { PrismaClient } from '@prisma/client';
import { CreateMessageRequest, GetMessagesQuery } from './messages.types';
import { cryptoService } from '../crypto/crypto.service';

const prisma = new PrismaClient();

/**
 * Messages service for handling chat messages
 */
export class MessagesService {
  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(conversationId: string, userId: string, query: GetMessagesQuery) {
    // Check if user is a participant in the conversation
    const isParticipant = await this.isUserParticipant(conversationId, userId);

    if (!isParticipant) {
      const error = new Error('You are not a participant in this conversation');
      (error as any).statusCode = 403;
      (error as any).code = 'NOT_PARTICIPANT';
      throw error;
    }

    // Build query conditions
    const conditions: any = {
      conversationId,
    };

    // Add cursor-based pagination if 'before' is provided
    if (query.before) {
      const beforeDate = new Date(query.before);
      conditions.createdAt = {
        lt: beforeDate,
      };
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: conditions,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Decrypt messages and transform to response format
    return messages.map(message => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      // Decrypt the message content
      content: cryptoService.decrypt(
        Buffer.isBuffer(message.ciphertext) ? message.ciphertext : Buffer.from(message.ciphertext),
        Buffer.isBuffer(message.nonce) ? message.nonce : Buffer.from(message.nonce)
      ),
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
      },
    }));
  }

  /**
   * Create a new message
   */
  async createMessage(conversationId: string, userId: string, data: CreateMessageRequest) {
    // Check if user is a participant in the conversation
    const isParticipant = await this.isUserParticipant(conversationId, userId);

    if (!isParticipant) {
      const error = new Error('You are not a participant in this conversation');
      (error as any).statusCode = 403;
      (error as any).code = 'NOT_PARTICIPANT';
      throw error;
    }

    // Encrypt message content
    const { ciphertext, nonce } = cryptoService.encrypt(data.content);

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'text',
        ciphertext,
        nonce,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Return message with decrypted content
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      content: data.content, // Original content since we just encrypted it
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
      },
    };
  }

  /**
   * Check if a user is a participant in a conversation
   */
  private async isUserParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    return !!participant;
  }
}

// Export singleton instance
export const messagesService = new MessagesService();
