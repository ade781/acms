import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', getDashboardSummary);

export default router;
