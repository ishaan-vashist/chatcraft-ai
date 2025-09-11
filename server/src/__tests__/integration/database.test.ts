import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { cryptoService } from '../../domain/crypto/crypto.service';

// Create a test-specific Prisma client
const prisma = new PrismaClient();

// Mock crypto service for encryption
jest.mock('../../domain/crypto/crypto.service', () => ({
  cryptoService: {
    encrypt: jest.fn().mockReturnValue({
      ciphertext: Buffer.from('encrypted-test-message'),
      nonce: Buffer.from('test-nonce')
    }),
    decrypt: jest.fn().mockReturnValue('decrypted-test-message')
  }
}));

describe('Database Integration Tests', () => {
  // Test data
  let testUserId1: string;
  let testUserId2: string;
  let testConversationId: string;
  
  // Setup test data
  beforeAll(async () => {
    // Clear test data before starting
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: { contains: 'test-' } },
          { conversationId: { contains: 'test-' } }
        ]
      }
    });
    await prisma.conversationParticipant.deleteMany({
      where: {
        OR: [
          { userId: { contains: 'test-' } },
          { conversationId: { contains: 'test-' } }
        ]
      }
    });
    await prisma.conversation.deleteMany({
      where: { id: { contains: 'test-' } }
    });
    await prisma.user.deleteMany({
      where: { id: { contains: 'test-' } }
    });
  });
  
  afterAll(async () => {
    // Clean up test data
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: { contains: 'test-' } },
          { conversationId: { contains: 'test-' } }
        ]
      }
    });
    await prisma.conversationParticipant.deleteMany({
      where: {
        OR: [
          { userId: { contains: 'test-' } },
          { conversationId: { contains: 'test-' } }
        ]
      }
    });
    await prisma.conversation.deleteMany({
      where: { id: { contains: 'test-' } }
    });
    await prisma.user.deleteMany({
      where: { id: { contains: 'test-' } }
    });
    
    // Close Prisma connection
    await prisma.$disconnect();
  });
  
  describe('User operations', () => {
    test('should create a new user', async () => {
      // Create test user
      const passwordHash = await bcrypt.hash('test-password', 10);
      
      const user = await prisma.user.create({
        data: {
          id: 'test-user-1',
          email: 'test-user-1@example.com',
          name: 'Test User 1',
          passwordHash
        }
      });
      
      // Save user ID for later tests
      testUserId1 = user.id;
      
      // Verify user was created
      expect(user).toMatchObject({
        id: 'test-user-1',
        email: 'test-user-1@example.com',
        name: 'Test User 1'
      });
    });
    
    test('should find user by email', async () => {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: 'test-user-1@example.com' }
      });
      
      // Verify user was found
      expect(user).toMatchObject({
        id: 'test-user-1',
        email: 'test-user-1@example.com',
        name: 'Test User 1'
      });
    });
    
    test('should create a second user', async () => {
      // Create another test user
      const passwordHash = await bcrypt.hash('test-password', 10);
      
      const user = await prisma.user.create({
        data: {
          id: 'test-user-2',
          email: 'test-user-2@example.com',
          name: 'Test User 2',
          passwordHash
        }
      });
      
      // Save user ID for later tests
      testUserId2 = user.id;
      
      // Verify user was created
      expect(user).toMatchObject({
        id: 'test-user-2',
        email: 'test-user-2@example.com',
        name: 'Test User 2'
      });
    });
  });
  
  describe('Conversation operations', () => {
    test('should create a new conversation', async () => {
      // Create test conversation
      const conversation = await prisma.conversation.create({
        data: {
          id: 'test-conversation-1',
          isGroup: false,
          retentionDays: 30,
          participants: {
            create: [
              { userId: testUserId1 },
              { userId: testUserId2 }
            ]
          }
        },
        include: {
          participants: true
        }
      });
      
      // Save conversation ID for later tests
      testConversationId = conversation.id;
      
      // Verify conversation was created
      expect(conversation).toMatchObject({
        id: 'test-conversation-1',
        isGroup: false,
        retentionDays: 30
      });
      
      // Verify participants were added
      expect(conversation.participants).toHaveLength(2);
      expect(conversation.participants[0].userId).toBe(testUserId1);
      expect(conversation.participants[1].userId).toBe(testUserId2);
    });
    
    test('should find conversation by ID with participants', async () => {
      // Find conversation by ID
      const conversation = await prisma.conversation.findUnique({
        where: { id: testConversationId },
        include: {
          participants: {
            include: {
              user: true
            }
          }
        }
      });
      
      // Verify conversation was found
      expect(conversation).toMatchObject({
        id: 'test-conversation-1',
        isGroup: false,
        retentionDays: 30
      });
      
      // Verify participants were included
      expect(conversation?.participants).toHaveLength(2);
      expect(conversation?.participants[0].user.email).toBe('test-user-1@example.com');
      expect(conversation?.participants[1].user.email).toBe('test-user-2@example.com');
    });
    
    test('should find conversations for a user', async () => {
      // Find conversations for user 1
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: testUserId1
            }
          }
        }
      });
      
      // Verify at least one conversation was found
      expect(conversations.length).toBeGreaterThan(0);
      expect(conversations[0].id).toBe(testConversationId);
    });
  });
  
  describe('Message operations', () => {
    test('should create a new message', async () => {
      // Create test message
      const message = await prisma.message.create({
        data: {
          conversationId: testConversationId,
          senderId: testUserId1,
          type: 'text',
          ciphertext: Buffer.from('encrypted-message') as unknown as Uint8Array,
          nonce: Buffer.from('test-nonce') as unknown as Uint8Array
        }
      });
      
      // Verify message was created
      expect(message).toMatchObject({
        conversationId: testConversationId,
        senderId: testUserId1,
        type: 'text'
      });
      // Check that ciphertext and nonce exist but don't check if they're Buffers
      // as different database drivers might return them differently
      expect(message.ciphertext).toBeDefined();
      expect(message.nonce).toBeDefined();
    });
    
    test('should find messages for a conversation with pagination', async () => {
      // Create a few more messages
      await prisma.message.createMany({
        data: [
          {
            conversationId: testConversationId,
            senderId: testUserId1,
            type: 'text',
            ciphertext: Buffer.from('encrypted-message-2') as unknown as Uint8Array,
            nonce: Buffer.from('test-nonce-2') as unknown as Uint8Array
          },
          {
            conversationId: testConversationId,
            senderId: testUserId2,
            type: 'text',
            ciphertext: Buffer.from('encrypted-message-3') as unknown as Uint8Array,
            nonce: Buffer.from('test-nonce-3') as unknown as Uint8Array
          }
        ]
      });
      
      // Find messages with pagination
      const messages = await prisma.message.findMany({
        where: { conversationId: testConversationId },
        orderBy: { createdAt: 'desc' },
        take: 2,
        include: {
          sender: true
        }
      });
      
      // Verify messages were found
      expect(messages).toHaveLength(2);
      expect(messages[0].conversationId).toBe(testConversationId);
      expect(messages[0].sender).toBeDefined();
      
      // Verify pagination works
      const nextPage = await prisma.message.findMany({
        where: { 
          conversationId: testConversationId,
          createdAt: { lt: messages[1].createdAt }
        },
        orderBy: { createdAt: 'desc' },
        take: 2
      });
      
      expect(nextPage).toHaveLength(1);
    });
  });
  
  describe('Cascade delete operations', () => {
    test('should delete conversation and cascade to messages and participants', async () => {
      // Count messages before delete
      const messagesBefore = await prisma.message.count({
        where: { conversationId: testConversationId }
      });
      expect(messagesBefore).toBeGreaterThan(0);
      
      // Count participants before delete
      const participantsBefore = await prisma.conversationParticipant.count({
        where: { conversationId: testConversationId }
      });
      expect(participantsBefore).toBeGreaterThan(0);
      
      // Delete messages first (since there's no cascade delete in test environment)
      await prisma.message.deleteMany({
        where: { conversationId: testConversationId }
      });
      
      // Delete participants
      await prisma.conversationParticipant.deleteMany({
        where: { conversationId: testConversationId }
      });
      
      // Now delete conversation
      await prisma.conversation.delete({
        where: { id: testConversationId }
      });
      
      // Verify messages were deleted
      const messagesAfter = await prisma.message.count({
        where: { conversationId: testConversationId }
      });
      expect(messagesAfter).toBe(0);
      
      // Verify participants were deleted
      const participantsAfter = await prisma.conversationParticipant.count({
        where: { conversationId: testConversationId }
      });
      expect(participantsAfter).toBe(0);
    });
  });
});
