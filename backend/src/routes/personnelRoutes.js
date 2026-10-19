import { Router } from 'express';
import {
  getPersonnelList,
  getPersonnelById,
  exportPersonnelPdf,
  createPersonnel,
  updatePersonnel,
  deletePersonnel
} from '../controllers/personnelController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getPersonnelList);
router.get('/export/pdf', exportPersonnelPdf);
router.get('/:id', getPersonnelById);
router.post('/', requireRole(['admin', 'supervisor']), createPersonnel);
router.put('/:id', requireRole(['admin', 'supervisor']), updatePersonnel);
router.delete('/:id', requireRole(['admin']), deletePersonnel);

export default router;
