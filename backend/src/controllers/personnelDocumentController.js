import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';
import { mapRankPositionToRole } from '../utils/roleMapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

/**
 * Controller Khusus Manajemen Dokumen & Tanda Tangan Digital Kepegawaian ARFF YIA
 */

export const getPersonnelDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    const [docs] = await pool.query(
      `SELECT pd.*, u.name as uploader_name
       FROM personnel_documents pd
       LEFT JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.personnel_id = ?
       ORDER BY pd.created_at DESC`,
      [id]
    );

    const formattedDocs = (docs || []).map((doc) => ({
      ...doc,
      view_url: `/api/documents/${doc.id}/view`,
      download_url: `/api/documents/${doc.id}/download`,
    }));

    return successResponse(res, 'Daftar dokumen personel berhasil diambil', formattedDocs);
  } catch (error) {
    console.error('Error getPersonnelDocuments:', error);
    return errorResponse(res, 'Gagal mengambil dokumen personel', 500);
  }
};

export const uploadPersonnelDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, document_type = 'dokumen_lain' } = req.body;

    if (!req.file) {
      return errorResponse(res, 'Berkas dokumen wajib diunggah (PDF, PNG, JPG, WebP)', 400);
    }

    const [rows] = await pool.query(
      `SELECT p.*, u.id as user_acc_id FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const target = rows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant'].includes(currentUserRole);
    const isSelf = (req.user.personnel_id && Number(req.user.personnel_id) === Number(id)) ||
                   (target.user_id && Number(req.user.id) === Number(target.user_id));

    if (!isLeadership && !isSelf) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk mengunggah dokumen personel ini', 403);
    }

    const docTitle = title && title.trim().length > 0 ? title.trim() : req.file.originalname;
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileSize = req.file.size || 0;
    const mimeType = req.file.mimetype || 'application/octet-stream';

    const [result] = await pool.query(
      `INSERT INTO personnel_documents (
        personnel_id, title, document_type, file_name, file_url, file_size, mime_type, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, docTitle, document_type, req.file.originalname, fileUrl, fileSize, mimeType, req.user.id]
    );

    const [newDocRows] = await pool.query(
      `SELECT pd.*, u.name as uploader_name
       FROM personnel_documents pd
       LEFT JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.id = ?`,
      [result.insertId]
    );

    const createdDoc = {
      ...newDocRows[0],
      view_url: `/api/documents/${newDocRows[0].id}/view`,
      download_url: `/api/documents/${newDocRows[0].id}/download`,
    };

    return successResponse(res, 'Dokumen personel berhasil diunggah', createdDoc, 201);
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    console.error('Error uploadPersonnelDocument:', error);
    return errorResponse(res, 'Gagal mengunggah dokumen: ' + error.message, 500);
  }
};

export const deletePersonnelDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;

    const [docRows] = await pool.query(
      `SELECT pd.*, p.user_id
       FROM personnel_documents pd
       JOIN personnel p ON p.id = pd.personnel_id
       WHERE pd.id = ? AND pd.personnel_id = ?`,
      [docId, id]
    );

    if (docRows.length === 0) {
      return errorResponse(res, 'Dokumen tidak ditemukan', 404);
    }

    const doc = docRows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head'].includes(currentUserRole);
    const isUploader = doc.uploaded_by && Number(doc.uploaded_by) === Number(req.user.id);
    const isSelf = (req.user.personnel_id && Number(req.user.personnel_id) === Number(id)) ||
                   (doc.user_id && Number(req.user.id) === Number(doc.user_id));

    if (!isLeadership && !isUploader && !isSelf) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus dokumen ini', 403);
    }

    // Hapus file fisik dari storage jika ada
    if (doc.file_url) {
      const filePath = path.resolve(__dirname, '../../', doc.file_url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {}
      }
    }

    await pool.query('DELETE FROM personnel_documents WHERE id = ?', [docId]);

    return successResponse(res, 'Dokumen personel berhasil dihapus');
  } catch (error) {
    console.error('Error deletePersonnelDocument:', error);
    return errorResponse(res, 'Gagal menghapus dokumen', 500);
  }
};

export const uploadSignature = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return errorResponse(res, 'Berkas tanda tangan belum dipilih atau format tidak sesuai', 400);
    }

    const [rows] = await pool.query(
      `SELECT p.*, u.role as user_role
       FROM personnel p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const target = rows[0];
    const targetRole = target.user_role || mapRankPositionToRole(target.rank_position);

    // HANYA dept_head, section_head, chief, dan chief_assistant yang berhak memiliki & mengunggah tanda tangan
    const allowedSignatureRoles = ['dept_head', 'section_head', 'chief', 'chief_assistant'];
    const isTargetEligible = allowedSignatureRoles.includes(targetRole);

    if (!isTargetEligible) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(
        res,
        'Akses ditolak: Opsi tanda tangan hanya diperuntukkan bagi Department Head, Section Head, Chief, dan Chief Assistant.',
        403
      );
    }

    // Pengecekan user yang mengunggah (hanya dept_head, section_head, chief, chief_assistant, atau admin)
    const currentUserRole = req.user.role;
    const isUploaderEligible = ['admin', 'dept_head', 'section_head', 'chief', 'chief_assistant'].includes(currentUserRole);

    if (!isUploaderEligible) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Anda tidak memiliki hak untuk mengunggah tanda tangan.', 403);
    }

    // Jika bukan admin, pastikan yang mengunggah adalah pemilik akun itu sendiri atau sesama pimpinan
    if (
      currentUserRole !== 'admin' &&
      target.user_id &&
      target.user_id !== req.user.id &&
      !['dept_head', 'section_head', 'chief'].includes(currentUserRole)
    ) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Anda hanya dapat mengunggah tanda tangan untuk akun Anda sendiri.', 403);
    }

    // Hapus berkas tanda tangan lama jika ada
    if (target.signature_url) {
      const oldPath = path.resolve(__dirname, '../../', target.signature_url.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn('Gagal menghapus tanda tangan lama:', e.message);
        }
      }
    }

    const signatureUrl = `/uploads/${req.file.filename}`;

    // Update signature_url di tabel personnel
    await pool.query('UPDATE personnel SET signature_url = ? WHERE id = ?', [signatureUrl, id]);

    // Update signature_url di tabel users jika terhubung
    if (target.user_id) {
      await pool.query('UPDATE users SET signature_url = ? WHERE id = ?', [signatureUrl, target.user_id]);
    }

    return successResponse(res, 'Spesimen tanda tangan digital berhasil diperbarui', {
      personnel_id: Number(id),
      signature_url: signatureUrl
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    console.error('Error uploadSignature:', error);
    return errorResponse(res, 'Gagal mengunggah tanda tangan: ' + error.message, 500);
  }
};

export const deleteSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT p.*, u.role as user_role
       FROM personnel p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const target = rows[0];
    const currentUserRole = req.user.role;

    if (!['admin', 'dept_head', 'section_head', 'chief', 'chief_assistant'].includes(currentUserRole)) {
      return errorResponse(res, 'Anda tidak memiliki hak untuk menghapus tanda tangan.', 403);
    }

    if (target.signature_url) {
      const oldPath = path.resolve(__dirname, '../../', target.signature_url.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {}
      }
    }

    await pool.query('UPDATE personnel SET signature_url = NULL WHERE id = ?', [id]);
    if (target.user_id) {
      await pool.query('UPDATE users SET signature_url = NULL WHERE id = ?', [target.user_id]);
    }

    return successResponse(res, 'Tanda tangan digital berhasil dihapus');
  } catch (error) {
    console.error('Error deleteSignature:', error);
    return errorResponse(res, 'Gagal menghapus tanda tangan', 500);
  }
};

