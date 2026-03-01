import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import commonRoutes from './common.routes';
import appraisalRoutes from './appraisal.routes';
import documentRoutes from './document.routes';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  const dbStates: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStates[mongoose.connection.readyState] || 'unknown',
    memoryUsage: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    },
  });
});

// Register all routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/common', commonRoutes);
router.use('/appraisal', appraisalRoutes);

// /:department/:userId/* document routes — must be LAST so named routes above take priority.
// Matches e.g. /computer/25/generate-doc, /it/42/faculty-pdf, etc.
router.use('/:department', documentRoutes);

export default router;
