import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  createCustomerOrder,
  getCustomerOrders,
  createOrderSchema,
} from '../controllers/customerOrderController';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SALES'),
  getCustomerOrders
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SALES'),
  validateRequest({ body: createOrderSchema }),
  createCustomerOrder
);

export default router;
