import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Metrics controller for providing system statistics
 */
export class MetricsController {
  /**
   * Get system metrics
   */
  async getMetrics(req: Request, res: Response) {
    try {
      // Get total users count
      const totalUsers = await prisma.user.count();
      
      // Get total messages count
      const totalMessages = await prisma.message.count();
      
      // Get messages sent today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const messagesToday = await prisma.message.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      });
      
      // Return metrics
      return res.status(200).json({
        metrics: {
          totalUsers,
          totalMessages,
          messagesToday,
          // In a real app, we would track AI message count and latency
          aiMessageCount: 0,
          avgAiLatencyMs: 0,
        },
      });
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      
      // Handle service errors
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch metrics',
        },
      });
    }
  }
}

// Export singleton instance
export const metricsController = new MetricsController();
