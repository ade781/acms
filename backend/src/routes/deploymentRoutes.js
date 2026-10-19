import { Router } from 'express';
import {
  getCurrentDeployment,
  saveDeploymentBatch,
  approveShift
} from '../controllers/deploymentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/current', getCurrentDeployment);
router.post('/batch', requireRole(['admin', 'supervisor']), saveDeploymentBatch);
router.post('/approve', requireRole(['admin', 'supervisor']), approveShift);

export default router;
