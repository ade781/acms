import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

export const getVehicles = async (req, res) => {
  try {
    const { category, is_active } = req.query;
    let query = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(Number(is_active));
    }

    query += ' ORDER BY category ASC, code_name ASC';

    const [rows] = await pool.query(query, params);
    return successResponse(res, 'Daftar armada berhasil diambil', rows);
  } catch (error) {
    console.error('Error getVehicles:', error);
    return errorResponse(res, 'Gagal mengambil daftar armada', 500);
  }
};

export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (rows.length === 0) {
      return errorResponse(res, 'Armada tidak ditemukan', 404);
    }
    return successResponse(res, 'Data armada berhasil diambil', rows[0]);
  } catch (error) {
    console.error('Error getVehicleById:', error);
    return errorResponse(res, 'Gagal mengambil data armada', 500);
  }
};

export const createVehicle = async (req, res) => {
  try {
    const { code_name, vehicle_name, category = 'utama', license_plate, description } = req.body;

    if (!code_name || !vehicle_name) {
      return errorResponse(res, 'Kode armada (code_name) dan nama armada wajib diisi', 400);
    }

    const [existing] = await pool.query('SELECT id FROM vehicles WHERE code_name = ?', [code_name]);
    if (existing.length > 0) {
      return errorResponse(res, 'Kode armada sudah digunakan', 400);
    }

    const [result] = await pool.query(
      `INSERT INTO vehicles (code_name, vehicle_name, category, license_plate, description, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [code_name, vehicle_name, category, license_plate || null, description || null]
    );

    const [created] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [result.insertId]);
    return createdResponse(res, 'Armada berhasil ditambahkan', created[0]);
  } catch (error) {
    console.error('Error createVehicle:', error);
    return errorResponse(res, 'Gagal menambahkan armada', 500);
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { code_name, vehicle_name, category, license_plate, description, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Armada tidak ditemukan', 404);
    }

    if (code_name && code_name !== existing[0].code_name) {
      const [dup] = await pool.query('SELECT id FROM vehicles WHERE code_name = ? AND id != ?', [code_name, id]);
      if (dup.length > 0) {
        return errorResponse(res, 'Kode armada sudah digunakan oleh kendaraan lain', 400);
      }
    }

    await pool.query(
      `UPDATE vehicles SET
        code_name = COALESCE(?, code_name),
        vehicle_name = COALESCE(?, vehicle_name),
        category = COALESCE(?, category),
        license_plate = ?,
        description = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        code_name || null,
        vehicle_name || null,
        category || null,
        license_plate !== undefined ? license_plate : existing[0].license_plate,
        description !== undefined ? description : existing[0].description,
        is_active !== undefined ? is_active : existing[0].is_active,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [id]);
    return successResponse(res, 'Data armada berhasil diperbarui', updated[0]);
  } catch (error) {
    console.error('Error updateVehicle:', error);
    return errorResponse(res, 'Gagal memperbarui data armada', 500);
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Armada tidak ditemukan', 404);
    }

    const [logs] = await pool.query('SELECT id FROM vehicle_readiness_logs WHERE vehicle_id = ? LIMIT 1', [id]);
    if (logs.length > 0) {
      await pool.query('UPDATE vehicles SET is_active = 0 WHERE id = ?', [id]);
      return successResponse(res, 'Armada telah dinonaktifkan karena memiliki riwayat log kesiapan');
    }

    await pool.query('DELETE FROM vehicles WHERE id = ?', [id]);
    return successResponse(res, 'Data armada berhasil dihapus');
  } catch (error) {
    console.error('Error deleteVehicle:', error);
    return errorResponse(res, 'Gagal menghapus armada', 500);
  }
};
