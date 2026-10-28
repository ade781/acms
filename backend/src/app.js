import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';
import jwt from 'jsonwebtoken';
import pool from './config/db.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getShiftSummaryReport } from './controllers/reportController.js';

import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import personnelRoutes from './routes/personnelRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import readinessRoutes from './routes/readinessRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import documentRoutes from './routes/documentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware kompresi respons HTTP (Gzip/Brotli)
app.use(compression());

// Middleware dasar
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Akses berkas unggahan dengan proteksi berkas rahasia
const uploadsDir = path.resolve(__dirname, '../uploads');

// Middleware pengaman akses /uploads untuk berkas privat (dokumen kepegawaian & tanda tangan)
app.use('/uploads', async (req, res, next) => {
  const filename = path.basename(req.path);
  if (!filename || filename === '.' || filename === '/') {
    return next();
  }

  // Tentukan apakah file tergolong privat/sensitif (dokumen personel, bukti cuti, tanda tangan digital)
  const isPrivateDoc = filename.startsWith('document-') ||
                       filename.startsWith('signature-') ||
                       (filename.toLowerCase().endsWith('.pdf') && !filename.startsWith('announcement-') && !filename.startsWith('file-'));

  // Berkas operasional publik (foto inspeksi armada, foto insiden, edaran pengumuman)
  if (!isPrivateDoc) {
    const publicFilePath = path.resolve(uploadsDir, filename);
    if (fs.existsSync(publicFilePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.sendFile(publicFilePath);
    }
    return next();
  }

  // --- BERKAS PRIVAT: WAJIB TERAUTENTIKASI & TEROTORISASI ---
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak: Berkas ini bersifat rahasia dan memerlukan autentikasi login'
      });
    }

    const secret = process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak valid atau telah kedaluwarsa'
      });
    }

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.role, p.id as personnel_id
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid: Pengguna tidak ditemukan'
      });
    }

    const user = users[0];
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user.role);

    if (filename.startsWith('signature-')) {
      if (!isLeadership) {
        const [sigOwner] = await pool.query(
          'SELECT id FROM personnel WHERE signature_url LIKE ? AND (id = ? OR user_id = ?)',
          [`%${filename}`, user.personnel_id || 0, user.id]
        );
        if (sigOwner.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses tanda tangan ini'
          });
        }
      }
    } else {
      if (!isLeadership) {
        const [docRows] = await pool.query(
          `SELECT pd.id, pd.personnel_id, pd.uploaded_by, p.user_id
           FROM personnel_documents pd
           LEFT JOIN personnel p ON p.id = pd.personnel_id
           WHERE pd.file_name = ? OR pd.file_url = ?`,
          [filename, `/uploads/${filename}`]
        );

        if (docRows.length > 0) {
          const doc = docRows[0];
          const isOwner = (user.personnel_id && Number(user.personnel_id) === Number(doc.personnel_id)) ||
                          (doc.user_id && Number(user.id) === Number(doc.user_id)) ||
                          (doc.uploaded_by && Number(user.id) === Number(doc.uploaded_by));
          if (!isOwner) {
            return res.status(403).json({
              success: false,
              message: 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat dokumen kepegawaian ini'
            });
          }
        }
      }
    }

    const filePath = path.resolve(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Berkas tidak ditemukan pada server'
      });
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving protected upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses permintaan akses berkas'
    });
  }
});

// Fallback untuk berkas statis dengan Cache-Control 7 hari
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true, lastModified: true }));

// Route cek kesehatan server
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'ARFF Operations & Personnel Monitoring System Backend API',
    timestamp: new Date().toISOString()
  });
});

// Pendaftaran rute API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/readiness', readinessRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/activities', activityRoutes);
app.get('/api/reports/shift-summary', requireAuth, getShiftSummaryReport);
app.use('/api/reports', reportRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/documents', documentRoutes);

// Handler 404 rute tidak ditemukan
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`
  });
});

// Handler error terpusat (Sanitasi HTTP 500 & MulterError)
app.use(errorHandler);

export default app;
