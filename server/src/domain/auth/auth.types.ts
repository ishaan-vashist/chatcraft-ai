import { z } from 'zod';

// User data stored in JWT token
export interface JwtPayload {
  id: string;
  email: string;
}

// Registration request schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof registerSchema>;

// Login request schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// Auth response types
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}
