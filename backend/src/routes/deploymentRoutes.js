import { Router } from 'express';
import {
  getCurrentDeployment,
  saveDeploymentBatch,
  requestLeaveRange
} from '../controllers/deploymentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { uploadSingleDocument } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getCurrentDeployment);
router.get('/current', getCurrentDeployment);
router.post('/batch', requireRole(['admin', 'supervisor', 'chief', 'chief_assistant', 'dept_head']), saveDeploymentBatch);
router.post('/leave-range', uploadSingleDocument('document'), requestLeaveRange);

export default router;
