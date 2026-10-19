import { Router } from 'express';
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity
} from '../controllers/activityController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getActivities);
router.post('/', createActivity);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;
