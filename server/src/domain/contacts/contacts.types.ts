import { z } from 'zod';

// Contact response type
export interface ContactResponse {
  id: string;
  userId: string;
  contactId: string;
  contactEmail: string;
  contactName: string | null;
  alias: string | null;
  createdAt: string;
}

// Create contact schema
export const createContactSchema = z.object({
  contactEmail: z.string().email('Invalid email address'),
  alias: z.string().optional(),
});

export type CreateContactRequest = z.infer<typeof createContactSchema>;
