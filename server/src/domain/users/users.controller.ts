import { Request, Response } from 'express';
import { usersService } from './users.service';
import { updateUserSchema } from './users.types';

/**
 * Users controller for handling HTTP requests
 */
export class UsersController {
  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      
      // Get user data
      const user = await usersService.getUserById(userId);
      
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
   * Update user
   */
  async updateUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Validate request body
      const validatedData = updateUserSchema.parse(req.body);
      
      // Update user
      const user = await usersService.updateUser(userId, validatedData);
      
      // Return updated user data
      return res.status(200).json({ user });
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
}

// Export singleton instance
export const usersController = new UsersController();
