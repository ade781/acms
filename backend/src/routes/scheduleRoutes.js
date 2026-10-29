import { Router } from 'express';
import {
  getMonthlySchedule,
  saveScheduleOverride,
  deleteScheduleOverride,
  updateAnchorDate,
  getScheduleCyclePreview,
  saveScheduleCycle,
  resetScheduleCycles,
} from '../controllers/scheduleController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getMonthlySchedule);
router.get('/monthly', getMonthlySchedule);
router.get('/cycle', getScheduleCyclePreview);
router.post('/cycle', requireRole(['admin', 'supervisor', 'chief', 'chief_assistant', 'operation_chief', 'dept_head']), saveScheduleCycle);
router.delete('/cycle', requireRole(['admin', 'supervisor', 'chief', 'chief_assistant', 'operation_chief', 'dept_head']), resetScheduleCycles);

router.post('/override', requireRole(['admin', 'supervisor', 'chief', 'chief_assistant', 'operation_chief', 'dept_head']), saveScheduleOverride);
router.delete('/override/:date', requireRole(['admin', 'supervisor', 'chief', 'chief_assistant', 'operation_chief', 'dept_head']), deleteScheduleOverride);
router.post('/anchor', requireRole(['admin']), updateAnchorDate);

export default router;
