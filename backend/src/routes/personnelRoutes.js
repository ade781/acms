import { Router } from 'express';
import {
  getPersonnelList,
  getPersonnelById,
  exportPersonnelPdf,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  uploadSignature,
  deleteSignature,
  getPersonnelDocuments,
  uploadPersonnelDocument,
  deletePersonnelDocument
} from '../controllers/personnelController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { uploadSingleImage, uploadSingleDocument } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getPersonnelList);
router.get('/export/pdf', exportPersonnelPdf);
router.get('/:id', getPersonnelById);
router.post('/', requireRole(['admin', 'supervisor']), createPersonnel);
router.put('/:id', updatePersonnel);
router.delete('/:id', requireRole(['admin', 'supervisor']), deletePersonnel);

// Rute tanda tangan khusus dept_head, chief, dan chief_assistant
router.post(
  '/:id/signature',
  requireRole(['admin', 'dept_head', 'chief', 'chief_assistant']),
  uploadSingleImage('signature'),
  uploadSignature
);
router.delete(
  '/:id/signature',
  requireRole(['admin', 'dept_head', 'chief', 'chief_assistant']),
  deleteSignature
);

// Rute berkas & dokumen personel (lisensi STKP, sertifikat diklat, MCU, SK)
router.get('/:id/documents', getPersonnelDocuments);
router.post(
  '/:id/documents',
  uploadSingleDocument('document'),
  uploadPersonnelDocument
);
router.delete('/:id/documents/:docId', deletePersonnelDocument);

export default router;

