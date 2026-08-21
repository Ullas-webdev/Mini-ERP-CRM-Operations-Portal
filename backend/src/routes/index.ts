import { Router } from 'express';
import healthRouter from './health';
import locationRouter from './locationRoutes';
import inventoryRouter from './inventoryRoutes';
import workOrderRouter from './workOrderRoutes';
import transferRouter from './transferRoutes';
import customerOrderRouter from './customerOrderRoutes';
import customerRouter from './customerRoutes';
import productRouter from './productRoutes';
import dashboardRouter from './dashboardRoutes';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate, authorize } from '../middleware/auth';
import { login, refresh, logout, loginSchema, refreshSchema } from '../controllers/authController';
import { getAuditLogs, auditLogQuerySchema } from '../controllers/auditLogController';

const router = Router();

console.log('📌 V1 API Routes Initialized: /health, /auth, /locations, /inventory, /work-orders, /transfers, /customer-orders, /customers, /products, /dashboard');

// Mount Health route
router.use('/health', healthRouter);

// Authentication Routes
router.post('/auth/login', authRateLimiter, validateRequest({ body: loginSchema }), login);
router.post('/auth/refresh', authRateLimiter, validateRequest({ body: refreshSchema }), refresh);
router.post('/auth/logout', authenticate, logout);

// Admin-Only Audit Log Route
router.get('/audit-logs', authenticate, authorize('ADMIN'), validateRequest({ query: auditLogQuerySchema }), getAuditLogs);

// Target Operations ERP Routes
router.use('/locations', locationRouter);
router.use('/inventory', inventoryRouter);
router.use('/work-orders', workOrderRouter);
router.use('/transfers', transferRouter);
router.use('/customer-orders', customerOrderRouter);

// Legacy & Supporting Domain Routes
router.use('/customers', customerRouter);
router.use('/products', productRouter);
router.use('/dashboard', dashboardRouter);

export default router;
