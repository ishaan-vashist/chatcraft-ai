import { PrismaClient } from '@prisma/client';
import { CreateContactRequest } from './contacts.types';

const prisma = new PrismaClient();

/**
 * Contacts service for managing user contacts
 */
export class ContactsService {
  /**
   * Get all contacts for a user
   */
  async getContacts(userId: string) {
    // For the MVP, we'll implement a simple approach
    // In a real app, we would need to handle this with a proper contacts table
    // For now, we'll find all users except the current user
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: userId,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Transform to contact response format
    return users.map(user => ({
      id: user.id, // In a real app, this would be the contact entry ID
      userId,
      contactId: user.id,
      contactEmail: user.email,
      contactName: user.name,
      alias: null, // No alias support in MVP
      createdAt: user.createdAt.toISOString(),
    }));
  }

  /**
   * Add a contact
   */
  async addContact(userId: string, data: CreateContactRequest) {
    // Find the user to add as a contact
    const contactUser = await prisma.user.findUnique({
      where: { email: data.contactEmail },
    });

    if (!contactUser) {
      const error = new Error('User with this email not found');
      (error as any).statusCode = 404;
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }

    // Check if trying to add self as contact
    if (contactUser.id === userId) {
      const error = new Error('Cannot add yourself as a contact');
      (error as any).statusCode = 400;
      (error as any).code = 'INVALID_CONTACT';
      throw error;
    }

    // In a real app, we would create a contact entry in the database
    // For the MVP, we'll just return the user data as a contact
    return {
      id: contactUser.id, // In a real app, this would be the contact entry ID
      userId,
      contactId: contactUser.id,
      contactEmail: contactUser.email,
      contactName: contactUser.name,
      alias: data.alias || null,
      createdAt: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const contactsService = new ContactsService();
