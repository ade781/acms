import { Router } from 'express';
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity
} from '../controllers/activityController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getActivities);
router.post('/', requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor']), createActivity);
router.put('/:id', requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor']), updateActivity);
router.delete('/:id', requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor']), deleteActivity);

export default router;
