import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

// Fungsi bantuan nomor laporan berurutan: INC-0001, INC-0002, dst.
async function generateNextReportNumber(connection) {
  const [rows] = await connection.query(
    `SELECT report_number FROM incidents
     WHERE report_number LIKE 'INC-%'
     ORDER BY id DESC LIMIT 1`
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const lastNumStr = rows[0].report_number.replace('INC-', '');
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `INC-${String(nextSeq).padStart(4, '0')}`;
}

export const getIncidents = async (req, res) => {
  try {
    const { date, shift, team_group, status, priority } = req.query;

    let query = `
      SELECT i.*,
             ic.name as category_name, ic.code as category_code,
             u.name as reporter_name,
             (SELECT COUNT(*) FROM incident_attachments WHERE incident_id = i.id) as attachment_count
      FROM incidents i
      LEFT JOIN incident_categories ic ON ic.id = i.category_id
      LEFT JOIN users u ON u.id = i.reporter_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND i.incident_date = ?`;
      params.push(date);
    }
    if (shift) {
      query += ` AND i.shift_number = ?`;
      params.push(Number(shift));
    }
    if (team_group) {
      query += ` AND i.team_group = ?`;
      params.push(team_group);
    }
    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }
    if (priority) {
      query += ` AND i.priority_level = ?`;
      params.push(priority);
    }

    query += ` ORDER BY i.incident_date DESC, i.incident_time DESC, i.id DESC`;

    const [rows] = await pool.query(query, params);
    return successResponse(res, 'Daftar insiden berhasil diambil', rows);
  } catch (error) {
    console.error('Error getIncidents:', error);
    return errorResponse(res, 'Gagal mengambil daftar insiden', 500);
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT i.*,
              ic.name as category_name, ic.code as category_code,
              u.name as reporter_name,
              s.name as supervisor_name
       FROM incidents i
       LEFT JOIN incident_categories ic ON ic.id = i.category_id
       LEFT JOIN users u ON u.id = i.reporter_id
       LEFT JOIN users s ON s.id = i.supervisor_id
       WHERE i.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Data insiden tidak ditemukan', 404);
    }

    const incident = rows[0];

    const [attachments] = await pool.query(
      `SELECT id, file_name, file_path, file_type, uploaded_at
       FROM incident_attachments
       WHERE incident_id = ?`,
      [id]
    );

    incident.attachments = attachments;

    return successResponse(res, 'Detail insiden berhasil diambil', incident);
  } catch (error) {
    console.error('Error getIncidentById:', error);
    return errorResponse(res, 'Gagal mengambil detail insiden', 500);
  }
};

export const createIncident = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      incident_date,
      incident_time,
      report_time,
      team_group,
      shift_number,
      category_id,
      title,
      location,
      chronology,
      source_info,
      aircraft_info,
      priority_level = 'medium',
      activation_time,
      action_taken,
      last_condition,
      coordinated_parties,
      status = 'dalam_proses'
    } = req.body;

    if (!incident_date || !incident_time || !title || !location || !chronology) {
      return errorResponse(res, 'Tanggal, waktu kejadian, judul, lokasi, dan kronologi wajib diisi', 400);
    }

    await connection.beginTransaction();

    const reportNumber = await generateNextReportNumber(connection);
    const nowTime = new Date().toTimeString().split(' ')[0];

    const [result] = await connection.query(
      `INSERT INTO incidents (
        report_number, incident_date, incident_time, report_time,
        team_group, shift_number, reporter_id, category_id,
        title, location, chronology, source_info, aircraft_info,
        priority_level, activation_time, action_taken, last_condition,
        coordinated_parties, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportNumber,
        incident_date,
        incident_time,
        report_time || nowTime,
        team_group || req.user.team_group || 'Alpha',
        shift_number ? Number(shift_number) : 1,
        req.user.id,
        category_id || null,
        title,
        location,
        chronology,
        source_info || null,
        aircraft_info || null,
        priority_level,
        activation_time || null,
        action_taken || null,
        last_condition || null,
        coordinated_parties || null,
        status
      ]
    );

    const incidentId = result.insertId;

    // Simpan file lampiran WebP yang diunggah
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await connection.query(
          `INSERT INTO incident_attachments (incident_id, file_name, file_path, file_type)
           VALUES (?, ?, ?, ?)`,
          [incidentId, file.originalname, `/uploads/${file.filename}`, file.mimetype]
        );
      }
    } else if (req.file) {
      await connection.query(
        `INSERT INTO incident_attachments (incident_id, file_name, file_path, file_type)
         VALUES (?, ?, ?, ?)`,
        [incidentId, req.file.originalname, `/uploads/${req.file.filename}`, req.file.mimetype]
      );
    }

    await connection.commit();

    const [created] = await pool.query('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    return createdResponse(res, 'Laporan insiden berhasil dibuat dengan nomor: ' + reportNumber, created[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Error createIncident:', error);
    return errorResponse(res, 'Gagal membuat laporan insiden: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action_taken, last_condition } = req.body;

    if (!status || !['dalam_proses', 'selesai', 'menunggu_tindak_lanjut'].includes(status)) {
      return errorResponse(res, 'Status tidak valid. Pilihan: dalam_proses, selesai, menunggu_tindak_lanjut', 400);
    }

    const [existing] = await pool.query('SELECT id FROM incidents WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Laporan insiden tidak ditemukan', 404);
    }

    await pool.query(
      `UPDATE incidents SET
        status = ?,
        action_taken = COALESCE(?, action_taken),
        last_condition = COALESCE(?, last_condition)
       WHERE id = ?`,
      [status, action_taken || null, last_condition || null, id]
    );

    const [updated] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);
    return successResponse(res, 'Status insiden berhasil diperbarui', updated[0]);
  } catch (error) {
    console.error('Error updateIncidentStatus:', error);
    return errorResponse(res, 'Gagal memperbarui status insiden', 500);
  }
};

export const getIncidentCategories = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM incident_categories WHERE is_active = 1 ORDER BY name ASC');
    return successResponse(res, 'Daftar kategori insiden berhasil diambil', rows);
  } catch (error) {
    console.error('Error getIncidentCategories:', error);
    return errorResponse(res, 'Gagal mengambil kategori insiden', 500);
  }
};

export const createIncidentCategory = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return errorResponse(res, 'Nama kategori dan kode wajib diisi', 400);
    }

    const [result] = await pool.query(
      'INSERT INTO incident_categories (name, code, description, is_active) VALUES (?, ?, ?, 1)',
      [name, code, description || null]
    );

    const [created] = await pool.query('SELECT * FROM incident_categories WHERE id = ?', [result.insertId]);
    return createdResponse(res, 'Kategori insiden berhasil ditambahkan', created[0]);
  } catch (error) {
    console.error('Error createIncidentCategory:', error);
    return errorResponse(res, 'Gagal menambahkan kategori insiden', 500);
  }
};
