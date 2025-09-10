import { Router } from 'express';
import { metricsController } from './metrics.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/', metricsController.getMetrics.bind(metricsController));

export default router;
