import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAdminStats,
  getSalesSummary,
  getWarehouseSummary,
  getAccountsSummary,
} from '../controllers/dashboardController';

const dashboardRouter = Router();

// All routes require authentication
dashboardRouter.use(authenticate);

dashboardRouter.get('/stats', authorize('ADMIN'), getAdminStats);
dashboardRouter.get('/sales-summary', authorize('ADMIN', 'SALES'), getSalesSummary);
dashboardRouter.get('/warehouse-summary', authorize('ADMIN', 'WAREHOUSE'), getWarehouseSummary);
dashboardRouter.get('/accounts-summary', authorize('ADMIN', 'ACCOUNTS'), getAccountsSummary);

export default dashboardRouter;
