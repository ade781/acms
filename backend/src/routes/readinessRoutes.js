import { Router } from 'express';
import {
  getVehicleReadiness,
  submitVehicleReadiness,
  getWatchroomReadiness,
  submitWatchroomReadiness,
  getVehicleTransitionsReport
} from '../controllers/readinessController.js';
import {
  getMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord
} from '../controllers/vehicleMaintenanceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { uploadSingleImage, uploadSingleDocument } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/vehicles', getVehicleReadiness);
router.post('/vehicles', uploadSingleImage('photo'), submitVehicleReadiness);

router.get('/watchroom', getWatchroomReadiness);
router.post(
  '/watchroom',
  requireRole(['admin', 'supervisor', 'chief', 'chief_assistant', 'dept_head', 'senior_firefighter', 'junior_firefighter', 'basic_firefighter']),
  submitWatchroomReadiness
);

router.get('/transitions-report', getVehicleTransitionsReport);

// Manajemen Rekam Jejak Pemeliharaan & Downtime Armada (CRUD)
router.get('/maintenance', getMaintenanceRecords);
router.post('/maintenance', uploadSingleDocument('document'), createMaintenanceRecord);
router.put('/maintenance/:id', uploadSingleDocument('document'), updateMaintenanceRecord);
router.delete('/maintenance/:id', deleteMaintenanceRecord);

export default router;
