import { Router } from 'express';
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity
} from '../controllers/activityController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(requireAuth);

// Seluruh personel dinas terautentikasi dapat melihat logbook aktivitas
router.get('/', getActivities);

// BUTIR TUGAS 3: Kru operasional diizinkan mencatat kegiatan baru ke logbook shift
router.post(
  '/',
  uploadSingleImage('photo'),
  createActivity
);

// Mutasi/edit aktivitas diizinkan bagi pembuat (crew) atau pimpinan (admin/chief satu regu)
router.put(
  '/:id',
  uploadSingleImage('photo'),
  updateActivity
);

// Hapus aktivitas dibatasi secara ketat hanya untuk Admin dan Chief/Pimpinan Regu
router.delete(
  '/:id',
  requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor']),
  deleteActivity
);

export default router;
