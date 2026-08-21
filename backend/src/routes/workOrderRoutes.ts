import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  createWorkOrder,
  getWorkOrders,
  updateWorkOrderStatus,
  createWorkOrderSchema,
  updateWorkOrderStatusSchema,
} from '../controllers/workOrderController';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  getWorkOrders
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateRequest({ body: createWorkOrderSchema }),
  createWorkOrder
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  validateRequest({ body: updateWorkOrderStatusSchema }),
  updateWorkOrderStatus
);

export default router;
