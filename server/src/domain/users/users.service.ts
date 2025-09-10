import { PrismaClient } from '@prisma/client';
import { UpdateUserRequest } from './users.types';

const prisma = new PrismaClient();

/**
 * Users service for user management
 */
export class UsersService {
  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserRequest) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      createdAt: updatedUser.createdAt.toISOString(),
    };
  }
}

// Export singleton instance
export const usersService = new UsersService();
