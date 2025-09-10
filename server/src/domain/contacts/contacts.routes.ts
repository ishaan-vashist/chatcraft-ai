import { Router } from 'express';
import { contactsController } from './contacts.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/', contactsController.getContacts.bind(contactsController));
router.post('/', contactsController.addContact.bind(contactsController));

export default router;
