import { Router } from 'express';
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  markAsRead,
  deleteAnnouncement
} from '../controllers/announcementController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { uploadSingleDocument } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);
router.post(
  '/',
  requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor']),
  uploadSingleDocument('file'),
  createAnnouncement
);
router.post('/:id/read', markAsRead);
router.delete(
  '/:id',
  requireRole(['admin', 'dept_head']),
  deleteAnnouncement
);

export default router;
