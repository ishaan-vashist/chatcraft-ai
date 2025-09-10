import { z } from 'zod';

// User response type
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

// Update user schema
export const updateUserSchema = z.object({
  name: z.string().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
