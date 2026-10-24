import {
  getShiftReportPdf,
  getVehicleIssuesAudit,
  getVehiclesReportPdf,
  getIncidentsReportPdf,
} from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/pdf', getShiftReportPdf);
router.get('/export/pdf', getShiftReportPdf);
router.get('/vehicle-issues', getVehicleIssuesAudit);
router.get('/vehicles/pdf', getVehiclesReportPdf);
router.get('/incidents/pdf', getIncidentsReportPdf);

export default router;
