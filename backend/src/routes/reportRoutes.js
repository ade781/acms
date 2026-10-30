import { Router } from 'express';
import {
  getShiftReportPdf,
  getVehicleIssuesAudit,
  getVehiclesReportPdf,
  getActivitiesReportPdf,
  getShiftSummaryReport,
} from '../controllers/reportController.js';
import { getIncidentSummaryReportPdf } from '../controllers/incidentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/shift-summary', getShiftSummaryReport);
router.get('/pdf', getShiftReportPdf);
router.get('/vehicle-issues', getVehicleIssuesAudit);
router.get('/vehicles/pdf', getVehiclesReportPdf);
router.get('/incidents/pdf', getIncidentSummaryReportPdf);
router.get('/activities/pdf', getActivitiesReportPdf);

export default router;
