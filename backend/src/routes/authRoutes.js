import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe, changePassword, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// BUTIR TUGAS 4: Rate Limiting pada Endpoint Login (Temuan #29)
// Maksimal 10 percobaan gagal per 15 menit per IP address
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,
  skipSuccessfulRequests: true, // Hanya menghitung percobaan masuk yang gagal
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi dalam 15 menit.'
  },
  statusCode: 429
});

router.post('/login', loginLimiter, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);

export default router;
