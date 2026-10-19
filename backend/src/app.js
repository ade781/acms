import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import personnelRoutes from './routes/personnelRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import readinessRoutes from './routes/readinessRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware dasar
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Akses berkas statis WebP / upload
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

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

// Handler 404 rute tidak ditemukan
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`
  });
});

// Handler error terpusat
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: 'Kesalahan unggah berkas: ' + err.message
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server'
  });
});

export default app;
