import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/auditLogger';
import { validateRequest } from '../middleware/validateRequest';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  addCustomerNote,
  getCustomerNotes,
  createCustomerSchema,
  updateCustomerSchema,
  createNoteSchema,
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

// Get Customers List (Read-only access for Warehouse & Accounts)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  validateRequest({ query: customerQuerySchema }),
  getCustomers
);

// Get Customer Profile by ID
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
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

// Add Customer Note (Admin & Sales)
router.post(
  '/:id/notes',
  authenticate,
  authorize('ADMIN', 'SALES'),
  auditLog('NOTE_ADDED', 'CUSTOMER_NOTE'),
  validateRequest({ body: createNoteSchema }),
  addCustomerNote
);

// Get Customer Notes Timeline
router.get(
  '/:id/notes',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  getCustomerNotes
);

export default router;
