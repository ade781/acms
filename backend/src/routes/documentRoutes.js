import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  viewDocument,
  downloadDocument,
  viewSignature,
} from '../controllers/documentController.js';

const router = Router();

// Seluruh rute dokumen kepegawaian membutuhkan otentikasi
router.use(requireAuth);

router.get('/:id/view', viewDocument);
router.get('/:id/download', downloadDocument);
router.get('/signature/:personnelId', viewSignature);

export default router;
