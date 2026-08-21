import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  createTransfer,
  getTransfers,
  dispatchTransfer,
  receiveTransfer,
  createTransferSchema,
} from '../controllers/transferController';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  getTransfers
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  validateRequest({ body: createTransferSchema }),
  createTransfer
);

router.post(
  '/:id/dispatch',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  dispatchTransfer
);

router.post(
  '/:id/receive',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  receiveTransfer
);

export default router;
