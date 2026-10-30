import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import { errorHandler } from './middleware/errorHandler.js';
import { protectPrivateUploads } from './middleware/protectPrivateUploads.js';

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

// Konfigurasi trust proxy agar Express dan express-rate-limit membaca IP asli klien dari header X-Forwarded-For saat berada di balik reverse proxy
app.set('trust proxy', 1);

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
app.use('/uploads', protectPrivateUploads);

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
