import { z } from 'zod';

// Conversation response type
export interface ConversationResponse {
  id: string;
  isGroup: boolean;
  retentionDays: number;
  createdAt: string;
  participants: {
    id: string;
    userId: string;
    name: string | null;
    email: string;
  }[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
}

// Create conversation schema
export const createConversationSchema = z.object({
  participantUserId: z.string().uuid('Invalid user ID'),
});

export type CreateConversationRequest = z.infer<typeof createConversationSchema>;
