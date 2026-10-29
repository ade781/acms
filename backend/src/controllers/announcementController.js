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
        a.is_pinned,
        a.file_path,
        a.file_name,
        a.published_date,
        a.created_by,
        a.created_at,
        a.updated_at,
        u.name as creator_name,
        IF(ar.read_at IS NOT NULL, 1, 0) AS is_read,
        IF(ar.archived_at IS NOT NULL, 1, 0) AS is_archived
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
      ORDER BY a.is_pinned DESC, a.published_date DESC, a.created_at DESC`,
      [userId]
    );

    const [unreadRows] = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM announcements a
       LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
       WHERE ar.read_at IS NULL AND (ar.archived_at IS NULL)`,
      [userId]
    );

    const unreadCount = Number(unreadRows[0]?.unread_count || 0);

    return successResponse(res, 'Daftar pengumuman berhasil dimuat', {
      announcements,
      unread_count: unreadCount
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
        IF(ar.read_at IS NOT NULL, 1, 0) AS is_read,
        IF(ar.archived_at IS NOT NULL, 1, 0) AS is_archived
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
    const isPinned = req.body.is_pinned === '1' || req.body.is_pinned === 1 || req.body.is_pinned === true || req.body.is_pinned === 'true' || title.toUpperCase().includes('[MENDESAK]') ? 1 : 0;

    const [result] = await pool.query(
      `INSERT INTO announcements (title, circular_number, description, is_pinned, file_path, file_name, published_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), circular_number?.trim() || null, description?.trim() || null, isPinned, filePath, fileName, pubDate, createdBy]
    );

    return createdResponse(res, 'Pengumuman dan dokumen edaran berhasil dipublikasikan', {
      id: result.insertId,
      title: title.trim(),
      circular_number,
      is_pinned: isPinned,
      file_path: filePath,
      file_name: fileName,
      published_date: pubDate
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('Gagal membersihkan orphan file:', e.message);
      }
    }
    console.error('Error createAnnouncement:', err);
    return errorResponse(res, 'Gagal membuat pengumuman', 500);
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Pengguna tidak terotentikasi', 401);
    }

    if (!id) {
      return errorResponse(res, 'ID pengumuman tidak valid', 400);
    }

    const [existing] = await pool.query('SELECT id FROM announcements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
    }

    await pool.query(
      `INSERT INTO announcement_reads (announcement_id, user_id, read_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE read_at = NOW()`,
      [id, userId]
    );

    return successResponse(res, 'Pengumuman ditandai telah dibaca', {
      announcement_id: Number(id),
      user_id: userId,
      is_read: 1
    });
  } catch (err) {
    console.error('Error markAsRead:', err);
    return errorResponse(res, 'Gagal menandai pengumuman telah dibaca', 500);
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`SELECT file_path FROM announcements WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
    }

    await pool.query(`DELETE FROM announcements WHERE id = ?`, [id]);

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

    return successResponse(res, 'Pengumuman berhasil dihapus');
  } catch (err) {
    console.error('Error deleteAnnouncement:', err);
    return errorResponse(res, 'Gagal menghapus pengumuman', 500);
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, circular_number, description, published_date, is_pinned } = req.body;
    const file = req.file;

    const [existing] = await pool.query('SELECT * FROM announcements WHERE id = ?', [id]);
    if (existing.length === 0) {
      if (file?.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) { }
      }
      return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
    }

    const currentAnn = existing[0];
    const newTitle = title !== undefined && title !== null ? String(title).trim() : currentAnn.title;
    if (!newTitle) {
      if (file?.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) { }
      }
      return errorResponse(res, 'Judul pengumuman wajib diisi', 400);
    }

    const newCircular = circular_number !== undefined ? (circular_number ? String(circular_number).trim() : null) : currentAnn.circular_number;
    const newDesc = description !== undefined ? (description ? String(description).trim() : null) : currentAnn.description;

    let newPinned = currentAnn.is_pinned;
    if (is_pinned !== undefined) {
      newPinned = (is_pinned === '1' || is_pinned === 1 || is_pinned === true || is_pinned === 'true') ? 1 : 0;
    }

    let pubDate = currentAnn.published_date;
    if (published_date) {
      if (published_date.includes('T')) {
        pubDate = published_date.replace('T', ' ').slice(0, 19);
      } else if (published_date.length === 10) {
        const currentTime = new Date().toTimeString().slice(0, 8);
        pubDate = `${published_date} ${currentTime}`;
      } else {
        pubDate = published_date;
      }
    }

    let filePath = currentAnn.file_path;
    let fileName = currentAnn.file_name;

    if (file) {
      filePath = `/uploads/${file.filename}`;
      fileName = file.originalname;

      if (currentAnn.file_path) {
        const cleanOldFileName = path.basename(currentAnn.file_path);
        const oldFullPath = path.resolve(__dirname, '../../uploads', cleanOldFileName);
        if (fs.existsSync(oldFullPath)) {
          try {
            fs.unlinkSync(oldFullPath);
          } catch (e) {
            console.warn('Gagal menghapus berkas lama saat pembaruan:', e.message);
          }
        }
      }
    }

    await pool.query(
      `UPDATE announcements 
       SET title = ?, circular_number = ?, description = ?, is_pinned = ?, file_path = ?, file_name = ?, published_date = ?, updated_at = NOW()
       WHERE id = ?`,
      [newTitle, newCircular, newDesc, newPinned, filePath, fileName, pubDate, id]
    );

    return successResponse(res, 'Pengumuman berhasil diperbarui', {
      id: Number(id),
      title: newTitle,
      circular_number: newCircular,
      description: newDesc,
      is_pinned: newPinned,
      file_path: filePath,
      file_name: fileName,
      published_date: pubDate
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) { }
    }
    console.error('Error updateAnnouncement:', err);
    return errorResponse(res, 'Gagal memperbarui pengumuman: ' + err.message, 500);
  }
};

export const togglePinAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id, is_pinned, title FROM announcements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
    }

    const currentPinned = existing[0].is_pinned || 0;
    let nextPinned;
    if (req.body?.is_pinned !== undefined) {
      nextPinned = (req.body.is_pinned === '1' || req.body.is_pinned === 1 || req.body.is_pinned === true || req.body.is_pinned === 'true') ? 1 : 0;
    } else {
      nextPinned = currentPinned === 1 ? 0 : 1;
    }

    await pool.query('UPDATE announcements SET is_pinned = ?, updated_at = NOW() WHERE id = ?', [nextPinned, id]);

    return successResponse(res, nextPinned === 1 ? 'Pengumuman berhasil dipin (mendesak)' : 'Pin pengumuman berhasil dilepas', {
      id: Number(id),
      is_pinned: nextPinned
    });
  } catch (err) {
    console.error('Error togglePinAnnouncement:', err);
    return errorResponse(res, 'Gagal mengubah status pin pengumuman', 500);
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
    const ext = path.extname(cleanFileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    return res.sendFile(filePath);
  } catch (err) {
    console.error('Error getAnnouncementAttachment:', err);
    return errorResponse(res, 'Gagal mengambil lampiran pengumuman: ' + err.message, 500);
  }
};

/**
 * Endpoint ringan penghitungan jumlah pengumuman yang belum dibaca (untuk polling badge)
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id || 0;

    const [unreadRows] = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM announcements a
       LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
       WHERE ar.read_at IS NULL AND (ar.archived_at IS NULL)`,
      [userId]
    );

    const unreadCount = Number(unreadRows[0]?.unread_count || 0);

    return successResponse(res, 'Jumlah pengumuman belum dibaca berhasil diambil', {
      unread_count: unreadCount
    });
  } catch (err) {
    console.error('Error getUnreadCount:', err);
    return errorResponse(res, 'Gagal memuat jumlah pengumuman belum dibaca', 500);
  }
};

/**
 * Mengarsipkan pengumuman secara personal untuk pengguna saat ini
 */
export const archiveAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Pengguna tidak terotentikasi', 401);
    }

    if (!id) {
      return errorResponse(res, 'ID pengumuman tidak valid', 400);
    }

    const [existing] = await pool.query('SELECT id FROM announcements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Pengumuman tidak ditemukan', 404);
    }

    await pool.query(
      `INSERT INTO announcement_reads (announcement_id, user_id, read_at, archived_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE archived_at = NOW(), read_at = COALESCE(read_at, NOW())`,
      [id, userId]
    );

    return successResponse(res, 'Pengumuman berhasil diarsipkan', {
      announcement_id: Number(id),
      user_id: userId,
      is_archived: 1
    });
  } catch (err) {
    console.error('Error archiveAnnouncement:', err);
    return errorResponse(res, 'Gagal mengarsipkan pengumuman', 500);
  }
};

/**
 * Mengembalikan pengumuman dari arsip ke aktif untuk pengguna saat ini
 */
export const unarchiveAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, 'Pengguna tidak terotentikasi', 401);
    }

    if (!id) {
      return errorResponse(res, 'ID pengumuman tidak valid', 400);
    }

    await pool.query(
      `UPDATE announcement_reads SET archived_at = NULL WHERE announcement_id = ? AND user_id = ?`,
      [id, userId]
    );

    return successResponse(res, 'Pengumuman berhasil dikembalikan dari arsip', {
      announcement_id: Number(id),
      user_id: userId,
      is_archived: 0
    });
  } catch (err) {
    console.error('Error unarchiveAnnouncement:', err);
    return errorResponse(res, 'Gagal mengembalikan pengumuman dari arsip', 500);
  }
};

