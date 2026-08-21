import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getAdminStats } from '../controllers/dashboardController';

const dashboardRouter = Router();

// All routes require authentication
dashboardRouter.use(authenticate);

dashboardRouter.get('/stats', authorize('ADMIN', 'OPERATIONS', 'SALES'), getAdminStats);

export default dashboardRouter;
