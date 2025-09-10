import { Router } from 'express';
import { messagesController } from './messages.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/', messagesController.getMessages.bind(messagesController));
router.post('/', messagesController.createMessage.bind(messagesController));

export default router;
