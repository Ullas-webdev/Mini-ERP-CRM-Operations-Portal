import { Router } from 'express';
import { getHealthStatus } from '../controllers/healthController';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router = Router();

const healthQuerySchema = z.object({
  verbose: z.enum(['true', 'false']).optional(),
});

// GET /api/v1/health with optional Zod query validation
router.get(
  '/',
  validateRequest({ query: healthQuerySchema }),
  getHealthStatus
);

export default router;
