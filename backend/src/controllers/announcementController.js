import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.id || 0;

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
        u.name as creator_name,
        CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END as is_read,
        ar.read_at
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
      ORDER BY a.published_date DESC, a.created_at DESC`,
      [userId]
    );

    const [[{ unread_count }]] = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM announcements a
       LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
       WHERE ar.id IS NULL`,
      [userId]
    );

    return successResponse(res, 'Daftar pengumuman berhasil dimuat', {
      announcements,
      unread_count: Number(unread_count || 0)
    });
  } catch (err) {
    console.error('Error getAnnouncements:', err);
    return errorResponse(res, 'Gagal memuat pengumuman', 500);
  }
};

export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 0;

    const [rows] = await pool.query(
      `SELECT 
        a.*,
        u.name as creator_name,
        CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END as is_read,
        ar.read_at
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
      WHERE a.id = ?`,
      [userId, id]
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

    const pubDate = published_date || new Date().toISOString().split('T')[0];
    const filePath = `/uploads/${file.filename}`;
    const fileName = file.originalname;
    const createdBy = req.user?.id || null;

    const [result] = await pool.query(
      `INSERT INTO announcements (title, circular_number, description, file_path, file_name, published_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), circular_number?.trim() || null, description?.trim() || null, filePath, fileName, pubDate, createdBy]
    );

    // Otomatis tandai pembuat sudah membaca
    if (createdBy) {
      await pool.query(
        `INSERT IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)`,
        [result.insertId, createdBy]
      );
    }

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
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Sesi tidak valid', 401);
    }

    await pool.query(
      `INSERT IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)`,
      [id, userId]
    );

    return successResponse(res, 'Pengumuman ditandai telah dibaca');
  } catch (err) {
    console.error('Error markAsRead:', err);
    return errorResponse(res, 'Gagal memperbarui status baca pengumuman', 500);
  }
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
