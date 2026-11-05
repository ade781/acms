import { Router } from 'express';
import {
  getShiftReportPdf,
  getVehiclesReportPdf,
  getActivitiesReportPdf,
  getPersonnelReportPdf,
  getShiftSummaryReport,
} from '../controllers/reportController.js';
import { getIncidentSummaryReportPdf } from '../controllers/incidentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/shift-summary', getShiftSummaryReport);
router.get('/pdf', getShiftReportPdf);
router.get('/vehicles/pdf', getVehiclesReportPdf);
router.get('/incidents/pdf', getIncidentSummaryReportPdf);
router.get('/activities/pdf', getActivitiesReportPdf);
router.get('/personnel/pdf', getPersonnelReportPdf);

export default router;
