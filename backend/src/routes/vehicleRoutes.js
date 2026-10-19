import { Router } from 'express';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
} from '../controllers/vehicleController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getVehicles);
router.get('/:id', getVehicleById);
router.post('/', requireRole(['admin']), createVehicle);
router.put('/:id', requireRole(['admin']), updateVehicle);
router.delete('/:id', requireRole(['admin']), deleteVehicle);

export default router;
