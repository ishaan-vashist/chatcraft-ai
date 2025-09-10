import { Router } from 'express';
import { conversationsController } from './conversations.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/', conversationsController.getConversations.bind(conversationsController));
router.post('/', conversationsController.createConversation.bind(conversationsController));
router.get('/:id', conversationsController.getConversationById.bind(conversationsController));

export default router;
