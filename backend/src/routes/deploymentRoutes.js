import { Router } from 'express';
import {
  getCurrentDeployment,
  saveDeploymentBatch,
  requestLeaveRange,
  cancelLeave
} from '../controllers/deploymentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { uploadSingleDocument } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getCurrentDeployment);
router.get('/current', getCurrentDeployment);
router.post('/batch', requireRole(['admin', 'supervisor', 'chief', 'chief_assistant', 'dept_head']), saveDeploymentBatch);
router.post('/save', requireRole(['admin', 'supervisor', 'chief', 'chief_assistant', 'dept_head']), saveDeploymentBatch);
router.post('/leave-range', uploadSingleDocument('document'), requestLeaveRange);
router.post('/leave', uploadSingleDocument('document'), requestLeaveRange);
router.delete('/leave/:id', cancelLeave);
router.post('/leave/cancel', cancelLeave);
router.post('/cancel-leave', cancelLeave);

export default router;

