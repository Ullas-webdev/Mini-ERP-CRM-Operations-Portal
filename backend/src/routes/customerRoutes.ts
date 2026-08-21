import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/auditLogger';
import { validateRequest } from '../middleware/validateRequest';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../controllers/customerController';

const router = Router();

// Create Customer (Admin & Sales)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SALES'),
  auditLog('CUSTOMER_CREATED', 'CUSTOMER'),
  validateRequest({ body: createCustomerSchema }),
  createCustomer
);

// Get Customers List (Read-only access for Operations)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS', 'SALES'),
  validateRequest({ query: customerQuerySchema }),
  getCustomers
);

// Get Customer Profile by ID
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'OPERATIONS', 'SALES'),
  getCustomerById
);

// Update Customer (Admin & Sales)
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SALES'),
  auditLog('CUSTOMER_UPDATED', 'CUSTOMER'),
  validateRequest({ body: updateCustomerSchema }),
  updateCustomer
);

export default router;
