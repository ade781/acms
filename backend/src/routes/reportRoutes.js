import { Router } from 'express';
import { getShiftReportPdf } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/pdf', getShiftReportPdf);

export default router;
