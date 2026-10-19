import { Router } from 'express';
import { login, getMe, changePassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);

export default router;
