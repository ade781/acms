import { Router } from 'express';
import {
  getMonthlySchedule,
  saveScheduleOverride,
  deleteScheduleOverride,
  updateAnchorDate
} from '../controllers/scheduleController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/monthly', getMonthlySchedule);
router.post('/override', requireRole(['admin', 'supervisor']), saveScheduleOverride);
router.delete('/override/:date', requireRole(['admin', 'supervisor']), deleteScheduleOverride);
router.post('/anchor', requireRole(['admin']), updateAnchorDate);

export default router;
