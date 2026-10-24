import { Router } from 'express';
import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncidentStatus,
  getIncidentCategories,
  createIncidentCategory,
  getIncidentSummaryReport,
  getIncidentSummaryReportPdf
} from '../controllers/incidentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { uploadMultipleImages } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/categories', getIncidentCategories);
router.post('/categories', requireRole(['admin']), createIncidentCategory);

router.get('/summary-report', getIncidentSummaryReport);
router.get('/summary-report/pdf', getIncidentSummaryReportPdf);

router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.post(
  '/',
  requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor']),
  uploadMultipleImages('photos', 5),
  createIncident
);
router.put('/:id/status', requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor']), updateIncidentStatus);

export default router;
