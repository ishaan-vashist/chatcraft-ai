import { Request, Response } from 'express';
import { authService } from './auth.service';
import { loginSchema, registerSchema } from './auth.types';

/**
 * Authentication controller for handling HTTP requests
 */
export class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response) {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);
      
      // Register user
      const result = await authService.register(validatedData);
      
      // Set JWT token as HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      // Return user data
      return res.status(201).json({ user: result.user });
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors,
          },
        });
      }
      
      // Handle service errors
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      });
    }
  }

  /**
   * Login a user
   */
  async login(req: Request, res: Response) {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      
      // Login user
      const result = await authService.login(validatedData);
      
      // Set JWT token as HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      // Return user data
      return res.status(200).json({ user: result.user });
    } catch (error: any) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors,
          },
        });
      }
      
      // Handle service errors
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      });
    }
  }

  /**
   * Get current user
   */
  async me(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Get user data
      const user = await authService.getUserById(userId);
      
      // Return user data
      return res.status(200).json({ user });
    } catch (error: any) {
      // Handle service errors
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      });
    }
  }

  /**
   * Logout user
   */
  logout(req: Request, res: Response) {
    // Clear token cookie
    res.clearCookie('token');
    
    // Return success
    return res.status(200).json({ message: 'Logged out successfully' });
  }
}

// Export singleton instance
export const authController = new AuthController();
