import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from './auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.me.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
