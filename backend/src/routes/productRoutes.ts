import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/auditLogger';
import { validateRequest } from '../middleware/validateRequest';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../controllers/productController';

const router = Router();

// Create Product (Admin & Operations)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  auditLog('PRODUCT_CREATED', 'PRODUCT'),
  validateRequest({ body: createProductSchema }),
  createProduct
);

// Get Products Catalog List (Read-only for all roles)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS', 'SALES'),
  validateRequest({ query: productQuerySchema }),
  getProducts
);

// Get Single Product by ID
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATIONS', 'SALES'),
  getProductById
);

// Update Product Metadata (Admin & Operations)
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  auditLog('PRODUCT_UPDATED', 'PRODUCT'),
  validateRequest({ body: updateProductSchema }),
  updateProduct
);

export default router;
