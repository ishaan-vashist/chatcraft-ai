import { Request, Response } from 'express';
import { contactsService } from './contacts.service';
import { createContactSchema } from './contacts.types';

/**
 * Contacts controller for handling HTTP requests
 */
export class ContactsController {
  /**
   * Get all contacts for a user
   */
  async getContacts(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Get contacts
      const contacts = await contactsService.getContacts(userId);
      
      // Return contacts
      return res.status(200).json({ contacts });
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
   * Add a contact
   */
  async addContact(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Validate request body
      const validatedData = createContactSchema.parse(req.body);
      
      // Add contact
      const contact = await contactsService.addContact(userId, validatedData);
      
      // Return contact
      return res.status(201).json({ contact });
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
export const contactsController = new ContactsController();
