import { Router } from 'express';
import {
  getVehicleReadiness,
  submitVehicleReadiness,
  getWatchroomReadiness,
  submitWatchroomReadiness
} from '../controllers/readinessController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/vehicles', getVehicleReadiness);
router.post('/vehicles', uploadSingleImage('photo'), submitVehicleReadiness);

router.get('/watchroom', getWatchroomReadiness);
router.post('/watchroom', submitWatchroomReadiness);

export default router;
