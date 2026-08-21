import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getChallans } from '../controllers/challanController';

const router = Router();

router.get('/', authenticate, getChallans);

export default router;
