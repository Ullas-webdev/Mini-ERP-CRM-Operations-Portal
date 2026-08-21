import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getLocations } from '../controllers/locationController';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'OPERATIONS', 'SALES'),
  getLocations
);

export default router;
