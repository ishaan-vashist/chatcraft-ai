import { PrismaClient, User, Conversation, ConversationParticipant, Message } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Request, Response } from 'express';

// Mock Prisma client - export the mock factory function instead of the instance
export const createMockPrisma = () => mockDeep<PrismaClient>();
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Mock Express request and response
export const mockRequest = () => {
  const req = {} as Request;
  req.body = {};
  req.params = {};
  req.query = {};
  req.cookies = {};
  req.headers = {};
  return req;
};

export const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  res.cookie = jest.fn().mockReturnThis();
  res.clearCookie = jest.fn().mockReturnThis();
  return res;
};

// Mock user data
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'user1@example.com',
    name: 'User One',
    passwordHash: '$2b$10$dGlzIGlzIGEgdGVzdCBoYXNo', // Mock hash
    createdAt: new Date('2023-01-01T00:00:00Z'),
  },
  {
    id: '2',
    email: 'user2@example.com',
    name: 'User Two',
    passwordHash: '$2b$10$dGlzIGlzIGEgdGVzdCBoYXNo', // Mock hash
    createdAt: new Date('2023-01-02T00:00:00Z'),
  },
];

// Mock conversation data
export const mockConversations: Conversation[] = [
  {
    id: '1',
    isGroup: false,
    retentionDays: 30,
    createdAt: new Date('2023-01-10T00:00:00Z'),
  },
  {
    id: '2',
    isGroup: true,
    retentionDays: 30,
    createdAt: new Date('2023-01-15T00:00:00Z'),
  },
];

// Mock conversation participants
export const mockParticipants: ConversationParticipant[] = [
  {
    id: '1',
    conversationId: '1',
    userId: '1',
  },
  {
    id: '2',
    conversationId: '1',
    userId: '2',
  },
  {
    id: '3',
    conversationId: '2',
    userId: '1',
  },
];

// Mock messages
export const mockMessages: (Message & { sender: User })[] = [
  {
    id: '1',
    conversationId: '1',
    senderId: '1',
    type: 'text',
    ciphertext: Buffer.from('encrypted message 1'),
    nonce: Buffer.from('nonce1'),
    createdAt: new Date('2023-01-10T12:00:00Z'),
    sender: mockUsers[0],
  },
  {
    id: '2',
    conversationId: '1',
    senderId: '2',
    type: 'text',
    ciphertext: Buffer.from('encrypted message 2'),
    nonce: Buffer.from('nonce2'),
    createdAt: new Date('2023-01-10T12:05:00Z'),
    sender: mockUsers[1],
  },
];

// Mock JWT token for testing
export const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6InVzZXIxQGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Add a dummy test to prevent Jest from failing
describe('Mocks', () => {
  it('should provide mock data for tests', () => {
    expect(mockUsers).toBeDefined();
    expect(mockMessages).toBeDefined();
    expect(createMockPrisma()).toBeDefined();
  });
});
