import { z } from 'zod';

// Message response type
export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  createdAt: string;
}

// Create message schema
export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

export type CreateMessageRequest = z.infer<typeof createMessageSchema>;

// Get messages query schema
export const getMessagesQuerySchema = z.object({
  before: z.string().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).default('30'),
});

export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;
