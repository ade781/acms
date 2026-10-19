import { Router } from 'express';
import { getShiftReportPdf, getVehicleIssuesAudit } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/pdf', getShiftReportPdf);
router.get('/vehicle-issues', getVehicleIssuesAudit);

export default router;
