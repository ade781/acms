import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';
import { generateIncidentSummaryReportPdf, streamPdfToResponse } from '../services/incidentPdfService.js';
import { getOfficialSignatory } from '../utils/officialHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

const formatWIBDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
};

const removeUploadedFiles = (files) => {
  if (!files) return;
  const list = Array.isArray(files) ? files : [files];
  for (const file of list) {
    if (!file) continue;
    const targetPath = file.path || (file.filename ? path.resolve(uploadsDir, file.filename) : null);
    if (targetPath && fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (e) {
        console.warn('Gagal menghapus file multer:', e.message);
      }
    }
  }
};

function getDateKey(incidentDate) {
  if (incidentDate && typeof incidentDate === 'string' && incidentDate.includes('-')) {
    const clean = incidentDate.split('T')[0].replace(/-/g, '');
    if (clean.length === 8 && !isNaN(Number(clean))) {
      return clean;
    }
  }
  return formatWIBDate().replace(/-/g, '');
}

// Fungsi bantuan nomor laporan berurutan: INC-YYYYMMDD-XXXX (berbasis tanggal kejadian) dengan proteksi penguncian atomik (FOR UPDATE)
async function generateNextReportNumber(connection, incidentDate) {
  const dateKey = getDateKey(incidentDate);
  const [rows] = await connection.query(
    `SELECT report_number FROM incidents
     WHERE report_number LIKE CONCAT('INC-', ?, '-%')
     ORDER BY id DESC LIMIT 1
     FOR UPDATE`,
    [dateKey]
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const parts = rows[0].report_number.split('-');
    const lastSeqStr = parts[2] || parts[parts.length - 1];
    const lastNum = parseInt(lastSeqStr, 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `INC-${dateKey}-${String(nextSeq).padStart(4, '0')}`;
}

export const getIncidents = async (req, res) => {
  try {
    const { date, start_date, end_date, period, shift, team_group, status, priority, category, page, limit } = req.query;

    let baseWhere = ' WHERE 1=1';
    const params = [];

    if (date) {
      baseWhere += ` AND i.incident_date = ?`;
      params.push(date);
    } else if (start_date && end_date) {
      baseWhere += ` AND i.incident_date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    } else if (start_date) {
      baseWhere += ` AND i.incident_date >= ?`;
      params.push(start_date);
    } else if (end_date) {
      baseWhere += ` AND i.incident_date <= ?`;
      params.push(end_date);
    } else if (period) {
      const today = new Date();
      const past = new Date(today);
      if (period === '1week') past.setDate(today.getDate() - 7);
      else if (period === '3months') past.setDate(today.getDate() - 90);
      else if (period === '1year') past.setDate(today.getDate() - 365);
      else past.setDate(today.getDate() - 30); // 1month
      baseWhere += ` AND i.incident_date BETWEEN ? AND ?`;
      params.push(formatWIBDate(past), formatWIBDate(today));
    }
    if (shift) {
      baseWhere += ` AND i.shift_number = ?`;
      params.push(Number(shift));
    }
    if (team_group) {
      baseWhere += ` AND i.team_group = ?`;
      params.push(team_group);
    }
    if (category && category !== 'ALL') {
      baseWhere += ` AND i.category = ?`;
      params.push(category);
    }
    if (status && status !== 'ALL') {
      baseWhere += ` AND i.status = ?`;
      params.push(status);
    }
    if (priority) {
      const p = String(priority).toLowerCase();
      if (p === 'emergency' || p === 'darurat') {
        baseWhere += ` AND i.priority_level IN ('high', 'critical')`;
      } else {
        const PRIORITY_MAP = {
          rendah: 'low',
          sedang: 'medium',
          tinggi: 'high',
          kritis: 'critical',
          low: 'low',
          medium: 'medium',
          high: 'high',
          critical: 'critical',
        };
        const normalizedPriority = PRIORITY_MAP[p] || priority;
        baseWhere += ` AND i.priority_level = ?`;
        params.push(normalizedPriority);
      }
    }

    // Hitung total baris untuk pagination metadata
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM incidents i ${baseWhere}`,
      params
    );
    const totalCount = countRows[0]?.total || 0;

    const safeLimit = Math.min(Number(limit) || 50, 100);
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const offset = (pageNum - 1) * safeLimit;

    let query = `
      SELECT i.*,
             i.category as category_name, i.category as category_code,
             u.name as reporter_name,
             (SELECT COUNT(*) FROM incident_attachments WHERE incident_id = i.id) as attachment_count
      FROM incidents i
      LEFT JOIN users u ON u.id = i.reporter_id
      ${baseWhere}
      ORDER BY i.incident_date DESC, i.incident_time DESC, i.id DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, safeLimit, offset];
    const [rows] = await pool.query(query, queryParams);

    return res.status(200).json({
      success: true,
      message: 'Daftar insiden berhasil diambil',
      data: rows,
      pagination: {
        page: pageNum,
        limit: safeLimit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / safeLimit),
        totalPages: Math.ceil(totalCount / safeLimit),
        has_more: pageNum * safeLimit < totalCount,
      },
    });
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
              i.category as category_name, i.category as category_code,
              u.name as reporter_name,
              s.name as supervisor_name
       FROM incidents i
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
  const allowedRoles = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'];
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: Hanya Chief, Asisten Chief, Supervisor, Section Head, atau Admin yang berhak melaporkan atau memperbarui status penanganan insiden.'
    });
  }

  const connection = await pool.getConnection();
  try {
    const {
      incident_date,
      incident_time,
      report_time,
      team_group,
      shift_number,
      category = 'other',
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
      removeUploadedFiles(req.files || req.file);
      return errorResponse(res, 'Tanggal, waktu kejadian, judul, lokasi, dan kronologi wajib diisi', 400);
    }

    if (activation_time && incident_time && incident_date) {
      const incTimeStr = incident_time.length === 5 ? `${incident_time}:00` : incident_time;
      const actTimeStr = activation_time.length === 5 ? `${activation_time}:00` : activation_time;

      const incDateTime = new Date(`${incident_date}T${incTimeStr}`);
      let actDateTime = new Date(`${incident_date}T${actTimeStr}`);

      // Tangani skenario respon yang melintasi tengah malam (misal kejadian 23:55 WIB ke aktivasi 00:05 WIB)
      if (actDateTime < incDateTime) {
        const nextDayAct = new Date(actDateTime.getTime() + 24 * 60 * 60 * 1000);
        if (nextDayAct >= incDateTime && (nextDayAct - incDateTime) <= 12 * 60 * 60 * 1000) {
          actDateTime = nextDayAct;
        }
      }

      if (actDateTime < incDateTime) {
        removeUploadedFiles(req.files || req.file);
        return errorResponse(res, 'Waktu tiba unit di TKP tidak boleh lebih awal dari waktu alarm kejadian.', 400);
      }
    }

    await connection.beginTransaction();

    const nowTime = new Date().toTimeString().split(' ')[0];
    const PRIORITY_MAP = {
      rendah: 'low',
      sedang: 'medium',
      tinggi: 'high',
      kritis: 'critical',
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical'
    };
    const mappedPriority = PRIORITY_MAP[String(priority_level || '').toLowerCase()] || 'medium';

    const VALID_CATEGORIES = [
      'aircraft_accident',
      'aircraft_incident',
      'full_emergency',
      'local_standby',
      'fuel_spill',
      'structure_fire',
      'bomb_threat',
      'hazmat',
      'medical_emergency',
      'wildlife_hazard',
      'fire',
      'other'
    ];
    const finalCategory = VALID_CATEGORIES.includes(category) ? category : 'other';

    let result;
    let reportNumber;
    let insertAttempts = 0;
    while (insertAttempts < 3) {
      try {
        await connection.query('SAVEPOINT sp_incident_insert');
        reportNumber = await generateNextReportNumber(connection, incident_date);
        const [res] = await connection.query(
          `INSERT INTO incidents (
            report_number, incident_date, incident_time, report_time,
            team_group, shift_number, reporter_id, category,
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
            finalCategory,
            title,
            location,
            chronology,
            source_info || null,
            aircraft_info || null,
            mappedPriority,
            activation_time || null,
            action_taken || null,
            last_condition || null,
            coordinated_parties || null,
            status
          ]
        );
        result = res;
        await connection.query('RELEASE SAVEPOINT sp_incident_insert');
        break;
      } catch (insertErr) {
        await connection.query('ROLLBACK TO SAVEPOINT sp_incident_insert');
        if (insertErr.code === 'ER_DUP_ENTRY' && insertAttempts < 2) {
          insertAttempts++;
          continue;
        }
        throw insertErr;
      }
    }

    const incidentId = result.insertId;

    // Simpan file lampiran WebP yang diunggah
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const safeOriginalName = path.basename(file.originalname);
        await connection.query(
          `INSERT INTO incident_attachments (incident_id, file_name, file_path, file_type)
           VALUES (?, ?, ?, ?)`,
          [incidentId, safeOriginalName, `/uploads/${file.filename}`, file.mimetype]
        );
      }
    } else if (req.file) {
      const safeOriginalName = path.basename(req.file.originalname);
      await connection.query(
        `INSERT INTO incident_attachments (incident_id, file_name, file_path, file_type)
         VALUES (?, ?, ?, ?)`,
        [incidentId, safeOriginalName, `/uploads/${req.file.filename}`, req.file.mimetype]
      );
    }

    await connection.commit();

    const [created] = await pool.query('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    return createdResponse(res, 'Laporan insiden berhasil dibuat dengan nomor: ' + reportNumber, created[0]);
  } catch (error) {
    await connection.rollback();
    // Hapus berkas fisik yang diunggah multer jika terjadi rollback database
    if (req.files && req.files.length > 0) {
      removeUploadedFiles(req.files);
    } else if (req.file) {
      removeUploadedFiles(req.file);
    }
    console.error('Error createIncident:', error);
    return errorResponse(res, 'Gagal membuat laporan insiden: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const updateIncidentStatus = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Hanya Chief, Asisten Chief, Supervisor, Section Head, atau Admin yang berhak memperbarui status penanganan insiden.'
      });
    }

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
        last_condition = COALESCE(?, last_condition),
        supervisor_id = CASE WHEN ? = 'selesai' THEN ? ELSE supervisor_id END
       WHERE id = ?`,
      [status, action_taken || null, last_condition || null, status, req.user.id, id]
    );

    const [updated] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);
    return successResponse(res, 'Status insiden berhasil diperbarui', updated[0]);
  } catch (error) {
    console.error('Error updateIncidentStatus:', error);
    return errorResponse(res, 'Gagal memperbarui status insiden', 500);
  }
};

export const getIncidentCategories = async (req, res) => {
  const defaultCategories = [
    { id: 1, name: 'Aircraft Accident', code: 'aircraft_accident' },
    { id: 2, name: 'Aircraft Incident', code: 'aircraft_incident' },
    { id: 3, name: 'Full Emergency', code: 'full_emergency' },
    { id: 4, name: 'Local Standby', code: 'local_standby' },
    { id: 5, name: 'Fuel Spill', code: 'fuel_spill' },
    { id: 6, name: 'Structure Fire', code: 'structure_fire' },
    { id: 7, name: 'Bomb Threat', code: 'bomb_threat' },
    { id: 8, name: 'Hazmat Incident', code: 'hazmat' },
    { id: 9, name: 'Medical Emergency', code: 'medical_emergency' },
    { id: 10, name: 'Wildlife Hazard', code: 'wildlife_hazard' },
    { id: 11, name: 'Lainnya / Khusus', code: 'other' }
  ];
  return successResponse(res, 'Daftar kategori insiden berhasil diambil', defaultCategories);
};

export const createIncidentCategory = async (req, res) => {
  return successResponse(res, 'Kategori insiden bersifat ENUM baku operasional');
};

/**
 * Endpoint Agregasi Laporan Rekapitulasi Insiden (Layer 1 & Layer 2 Data)
 */
export const getIncidentSummaryReport = async (req, res) => {
  try {
    const { period, start_date, end_date, category, status } = req.query;

    const today = new Date();
    let startDateStr = start_date;
    let endDateStr = end_date || formatWIBDate(today);

    if (!startDateStr) {
      const past = new Date(today);
      if (period === '3months') {
        past.setDate(past.getDate() - 90);
      } else if (period === '1year') {
        past.setDate(past.getDate() - 365);
      } else {
        // default: 1 bulan (30 hari)
        past.setDate(past.getDate() - 30);
      }
      startDateStr = formatWIBDate(past);
    }

    let query = `
      SELECT i.*,
             i.category as category_name, i.category as category_code,
             u.name as reporter_name,
             (SELECT COUNT(*) FROM incident_attachments WHERE incident_id = i.id) as attachment_count
      FROM incidents i
      LEFT JOIN users u ON u.id = i.reporter_id
      WHERE i.incident_date BETWEEN ? AND ?
    `;
    const params = [startDateStr, endDateStr];

    if (category && category !== 'ALL') {
      query += ` AND i.category = ?`;
      params.push(category);
    }
    if (status && status !== 'ALL') {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY i.incident_date DESC, i.incident_time DESC, i.id DESC`;

    const [incidents] = await pool.query(query, params);

    // Ambil lampiran foto untuk insiden terkait
    if (incidents.length > 0) {
      const incidentIds = incidents.map((inc) => inc.id);
      const [attachments] = await pool.query(
        `SELECT id, incident_id, file_name, file_path, file_type, uploaded_at
         FROM incident_attachments
         WHERE incident_id IN (?)`,
        [incidentIds]
      );
      const attMap = {};
      attachments.forEach((att) => {
        if (!attMap[att.incident_id]) attMap[att.incident_id] = [];
        attMap[att.incident_id].push(att);
      });
      incidents.forEach((inc) => {
        inc.attachments = attMap[inc.id] || [];
      });
    }

    // Hitung statistik ringkasan
    const stats = {
      total: incidents.length,
      selesai: incidents.filter((i) => (i.status || '').toLowerCase() === 'selesai').length,
      dalam_proses: incidents.filter((i) => (i.status || '').toLowerCase() === 'dalam_proses').length,
      menunggu_tindak_lanjut: incidents.filter((i) => (i.status || '').toLowerCase() === 'menunggu_tindak_lanjut').length,
      kritis: incidents.filter((i) => {
        const l = (i.priority_level || '').toLowerCase();
        return l === 'kritis' || l === 'critical';
      }).length,
    };

    return successResponse(res, 'Rekapitulasi laporan insiden berhasil diambil', {
      startDate: startDateStr,
      endDate: endDateStr,
      period: period || '1month',
      stats,
      incidents,
    });
  } catch (error) {
    console.error('Error getIncidentSummaryReport:', error);
    return errorResponse(res, 'Gagal mengambil rekapitulasi laporan insiden', 500);
  }
};

/**
 * Endpoint Ekspor Dokumen Resmi PDF Rekapitulasi Insiden (Format A4 Portrait)
 */
export const getIncidentSummaryReportPdf = async (req, res) => {
  try {
    const { period, start_date, end_date, category, status } = req.query;

    const today = new Date();
    let startDateStr = start_date;
    let endDateStr = end_date || (start_date ? start_date : formatWIBDate(today));

    let periodLabel = '1 Bulan Terakhir';
    if (!startDateStr) {
      const past = new Date(today);
      if (period === '1week') {
        past.setDate(past.getDate() - 7);
        periodLabel = '1 Minggu Terakhir';
      } else if (period === '3months') {
        past.setDate(past.getDate() - 90);
        periodLabel = '3 Bulan Terakhir';
      } else if (period === '1year') {
        past.setDate(past.getDate() - 365);
        periodLabel = '1 Tahun Terakhir';
      } else {
        past.setDate(past.getDate() - 30);
        periodLabel = '1 Bulan Terakhir';
      }
      startDateStr = formatWIBDate(past);
    } else if (start_date && end_date) {
      periodLabel = start_date === end_date ? 'Laporan Harian' : 'Rentang Kustom';
    }

    let query = `
      SELECT i.*,
             u.name as reporter_name
      FROM incidents i
      LEFT JOIN users u ON u.id = i.reporter_id
      WHERE i.incident_date BETWEEN ? AND ?
    `;
    const params = [startDateStr, endDateStr];

    if (category && category !== 'ALL') {
      query += ` AND i.category = ?`;
      params.push(category);
    }
    if (status && status !== 'ALL') {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY i.incident_date ASC, i.incident_time ASC`;
    const [incidents] = await pool.query(query, params);

    // Hitung ringkasan statistik untuk header laporan
    const resolvedCount = incidents.filter(i => (i.status || '').toLowerCase() === 'selesai').length;
    const inProgressCount = incidents.filter(i => (i.status || '').toLowerCase() === 'dalam_proses').length;
    const pendingCount = incidents.filter(i => (i.status || '').toLowerCase() === 'menunggu_tindak_lanjut').length;

    const catCounts = {};
    incidents.forEach(i => {
      if (i.category) {
        catCounts[i.category] = (catCounts[i.category] || 0) + 1;
      }
    });
    let topCategory = '-';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    }

    // Ambil tanda tangan & identitas pejabat pengesah resmi
    const signatory = await getOfficialSignatory(pool);

    // Hasilkan dokumen PDF terstandarisasi dari Incident PDF Service
    const doc = await generateIncidentSummaryReportPdf({
      periodLabel,
      startDate: startDateStr,
      endDate: endDateStr,
      incidents,
      summary: {
        resolvedCount,
        inProgressCount,
        pendingCount,
        topCategory
      },
      dept_head_name: signatory?.name || 'Airport Rescue & Fire Fighting Section Head',
      dept_head_nip: signatory?.nip || null,
      dept_head_signature_url: signatory?.signature_url || null,
    });

    const filename = startDateStr === endDateStr
      ? `Laporan-Rekap-Insiden-${startDateStr}.pdf`
      : `Laporan-Rekap-Insiden-${startDateStr}-${endDateStr}.pdf`;

    streamPdfToResponse(doc, res, req, {
      filename
    });
  } catch (error) {
    console.error('Error getIncidentSummaryReportPdf:', error);
    if (!res.headersSent) {
      return errorResponse(res, 'Gagal mencetak dokumen PDF rekap insiden', 500);
    }
  }
};
