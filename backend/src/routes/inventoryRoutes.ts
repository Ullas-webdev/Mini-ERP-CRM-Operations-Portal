import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  getInventory,
  createInventory,
  adjustInventory,
  createInventorySchema,
  adjustInventorySchema,
} from '../controllers/inventoryController';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS', 'SALES'),
  getInventory
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  validateRequest({ body: createInventorySchema }),
  createInventory
);

router.post(
  '/adjust',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  validateRequest({ body: adjustInventorySchema }),
  adjustInventory
);

export default router;
