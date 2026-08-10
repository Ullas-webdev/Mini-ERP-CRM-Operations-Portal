import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/auditLogger';
import { validateRequest } from '../middleware/validateRequest';
import {
  createProduct,
  getProducts,
  getLowStockProducts,
  getProductById,
  updateProduct,
  adjustStock,
  getProductMovements,
  createProductSchema,
  updateProductSchema,
  stockAdjustmentSchema,
  productQuerySchema,
} from '../controllers/productController';

const router = Router();

// Create Product (Admin & Warehouse)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'WAREHOUSE'),
  auditLog('PRODUCT_CREATED', 'PRODUCT'),
  validateRequest({ body: createProductSchema }),
  createProduct
);

// Get Products Catalog List (Read-only access for Sales & Accounts)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  validateRequest({ query: productQuerySchema }),
  getProducts
);

// Get Low-Stock Alerts List (All roles)
router.get(
  '/low-stock',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  getLowStockProducts
);

// Get Single Product by ID
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  getProductById
);

// Update Product Metadata (Admin & Warehouse; currentStock changes strictly stripped!)
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'WAREHOUSE'),
  auditLog('PRODUCT_UPDATED', 'PRODUCT'),
  validateRequest({ body: updateProductSchema }),
  updateProduct
);

// Transactional Stock Adjustment (Admin & Warehouse only)
router.post(
  '/:id/stock-adjustment',
  authenticate,
  authorize('ADMIN', 'WAREHOUSE'),
  auditLog('STOCK_ADJUSTED', 'STOCK_MOVEMENT'),
  validateRequest({ body: stockAdjustmentSchema }),
  adjustStock
);

// Get Product Movement Audit Ledger History
router.get(
  '/:id/movements',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  getProductMovements
);

export default router;
