import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/:id', usersController.getUserById.bind(usersController));
router.patch('/', usersController.updateUser.bind(usersController));

export default router;
