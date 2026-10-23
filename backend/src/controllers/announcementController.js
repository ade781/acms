import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAnnouncements = async (req, res) => {
  try {
    const [announcements] = await pool.query(
      `SELECT 
        a.id,
        a.title,
        a.circular_number,
        a.description,
        a.file_path,
        a.file_name,
        a.published_date,
        a.created_by,
        a.created_at,
        a.updated_at,
        u.name as creator_name
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      ORDER BY a.published_date DESC, a.created_at DESC`
    );

    return successResponse(res, 'Daftar pengumuman berhasil dimuat', {
      announcements,
      unread_count: 0
    });
  } catch (err) {
    console.error('Error getAnnouncements:', err);
    return errorResponse(res, 'Gagal memuat pengumuman', 500);
  }
};

export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
        a.*,
        u.name as creator_name
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
    }

    return successResponse(res, 'Detail pengumuman berhasil dimuat', rows[0]);
  } catch (err) {
    console.error('Error getAnnouncementById:', err);
    return errorResponse(res, 'Gagal memuat detail pengumuman', 500);
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { title, circular_number, description, published_date } = req.body;
    const file = req.file;

    if (!title || !title.trim()) {
      return errorResponse(res, 'Judul pengumuman wajib diisi', 400);
    }

    if (!file) {
      return errorResponse(res, 'Berkas dokumen PDF pengumuman wajib diunggah', 400);
    }

    let pubDate = published_date;
    if (!pubDate) {
      pubDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    } else if (pubDate.includes('T')) {
      pubDate = pubDate.replace('T', ' ').slice(0, 19);
    } else if (pubDate.length === 10) {
      const currentTime = new Date().toTimeString().slice(0, 8);
      pubDate = `${pubDate} ${currentTime}`;
    }

    const filePath = `/uploads/${file.filename}`;
    const fileName = file.originalname;
    const createdBy = req.user?.id || null;

    const [result] = await pool.query(
      `INSERT INTO announcements (title, circular_number, description, file_path, file_name, published_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), circular_number?.trim() || null, description?.trim() || null, filePath, fileName, pubDate, createdBy]
    );

    return createdResponse(res, 'Pengumuman dan dokumen edaran berhasil dipublikasikan', {
      id: result.insertId,
      title: title.trim(),
      circular_number,
      file_path: filePath,
      file_name: fileName,
      published_date: pubDate
    });
  } catch (err) {
    console.error('Error createAnnouncement:', err);
    return errorResponse(res, 'Gagal membuat pengumuman', 500);
  }
};

export const markAsRead = async (req, res) => {
  return successResponse(res, 'Pengumuman ditandai telah dibaca');
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`SELECT file_path FROM announcements WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
    }

    const filePath = rows[0].file_path;
    if (filePath) {
      const fullPath = path.resolve(__dirname, '../../', filePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          console.warn('Gagal menghapus file fisik:', e.message);
        }
      }
    }

    await pool.query(`DELETE FROM announcements WHERE id = ?`, [id]);
    return successResponse(res, 'Pengumuman berhasil dihapus');
  } catch (err) {
    console.error('Error deleteAnnouncement:', err);
    return errorResponse(res, 'Gagal menghapus pengumuman', 500);
  }
};

export const getAnnouncementAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT file_path, file_name, title FROM announcements WHERE id = ?', [id]);
    if (rows.length === 0 || !rows[0].file_path) {
      return errorResponse(res, 'Lampiran pengumuman tidak ditemukan', 404);
    }

    const cleanFileName = path.basename(rows[0].file_path);
    const filePath = path.resolve(__dirname, '../../uploads', cleanFileName);

    if (!fs.existsSync(filePath)) {
      return errorResponse(res, 'Berkas fisik tidak ditemukan pada server', 404);
    }

    const downloadName = rows[0].file_name || cleanFileName;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);

    return res.sendFile(filePath);
  } catch (err) {
    console.error('Error getAnnouncementAttachment:', err);
    return errorResponse(res, 'Gagal mengambil lampiran pengumuman: ' + err.message, 500);
  }
};

