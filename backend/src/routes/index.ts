import { Router } from 'express';
import healthRouter from './health';
import customerRouter from './customerRoutes';
import productRouter from './productRoutes';
import challanRouter from './challanRoutes';
import dashboardRouter from './dashboardRoutes';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate, authorize } from '../middleware/auth';
import { login, refresh, logout, loginSchema, refreshSchema } from '../controllers/authController';
import { getAuditLogs, auditLogQuerySchema } from '../controllers/auditLogController';

const router = Router();

// Mount Health routes
router.use('/health', healthRouter);

// Authentication Routes
router.post('/auth/login', authRateLimiter, validateRequest({ body: loginSchema }), login);
router.post('/auth/refresh', authRateLimiter, validateRequest({ body: refreshSchema }), refresh);
router.post('/auth/logout', authenticate, logout);

// Admin-Only Audit Log Traceability Route
router.get('/audit-logs', authenticate, authorize('ADMIN'), validateRequest({ query: auditLogQuerySchema }), getAuditLogs);

// Customer CRM Routes
router.use('/customers', customerRouter);

// Product & Inventory Stock Routes
router.use('/products', productRouter);

// Sales Challan Routes
router.use('/challans', challanRouter);

// Dashboard Aggregation Routes
router.use('/dashboard', dashboardRouter);

export default router;
