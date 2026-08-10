import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog } from '../middleware/auditLogger';
import { validateRequest } from '../middleware/validateRequest';
import {
  createChallan,
  getChallans,
  getChallanById,
  updateChallan,
  confirmChallan,
  cancelChallan,
  createChallanSchema,
  updateChallanSchema,
  challanQuerySchema,
} from '../controllers/challanController';
import { exportChallanPdf } from '../controllers/challanPdfController';

const router = Router();

// Create Sales Challan (Draft)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SALES'),
  auditLog('CHALLAN_CREATED', 'SALES_CHALLAN'),
  validateRequest({ body: createChallanSchema }),
  createChallan
);

// Get Sales Challans Register (Warehouse & Accounts have read-only view)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  validateRequest({ query: challanQuerySchema }),
  getChallans
);

// Export Challan as PDF (must be above /:id to avoid route collision)
router.get(
  '/:id/pdf',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  exportChallanPdf
);

// Get Sales Challan Detail Snapshot
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  getChallanById
);

// Edit Draft Sales Challan
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SALES'),
  auditLog('CHALLAN_UPDATED', 'SALES_CHALLAN'),
  validateRequest({ body: updateChallanSchema }),
  updateChallan
);

// Confirm & Fulfill Sales Challan (Transactional Stock Deduction)
router.post(
  '/:id/confirm',
  authenticate,
  authorize('ADMIN', 'SALES'),
  auditLog('CHALLAN_CONFIRMED', 'SALES_CHALLAN'),
  confirmChallan
);

// Cancel Sales Challan (Stock Reversal if CONFIRMED)
router.post(
  '/:id/cancel',
  authenticate,
  authorize('ADMIN', 'SALES'),
  auditLog('CHALLAN_CANCELLED', 'SALES_CHALLAN'),
  cancelChallan
);

export default router;

