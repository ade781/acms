import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

/**
 * Helper aman penghapusan berkas fisik di direktori uploads
 * Mencegah celah path traversal dengan membatasi nama berkas via path.basename
 */
const safeUnlink = (targetPathOrUrl) => {
  if (!targetPathOrUrl) return;
  const fileName = path.basename(targetPathOrUrl);
  if (!fileName || fileName === '.' || fileName === '/') return;
  const safePath = path.resolve(uploadsDir, fileName);
  if (fs.existsSync(safePath)) {
    try {
      fs.unlinkSync(safePath);
    } catch (e) {
      console.warn(`Gagal menghapus berkas ${fileName}:`, e.message);
    }
  }
};

const formatDateOnly = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
};

const cleanPrefixes = (text) => {
  if (!text) return '';
  let str = String(text).trim();
  while (/^\[[^\]]+\]\s*/.test(str)) {
    str = str.replace(/^\[[^\]]+\]\s*/, '').trim();
  }
  return str;
};

/**
 * GET /api/readiness/maintenance
 * Mengambil daftar catatan pemeliharaan armada dengan dukungan filter
 */
export const getMaintenanceRecords = async (req, res) => {
  try {
    const { vehicle_id, status, start_date, end_date } = req.query;

    let query = `
      SELECT 
        vmr.id,
        vmr.vehicle_id,
        vmr.start_date,
        vmr.start_shift_number,
        vmr.start_team_group,
        vmr.reported_by_id,
        vmr.issue_category,
        vmr.issue_description,
        vmr.status,
        vmr.end_date,
        vmr.end_shift_number,
        vmr.end_team_group,
        vmr.resolved_by_id,
        vmr.resolution_notes,
        vmr.technician_vendor,
        vmr.document_type,
        vmr.document_url,
        vmr.document_name,
        vmr.created_at,
        vmr.updated_at,
        v.code_name AS vehicle_code,
        v.vehicle_name,
        v.license_plate,
        v.category AS vehicle_category,
        rep.full_name AS reported_by_name,
        rep.nip AS reported_by_nip,
        res_p.full_name AS resolved_by_name,
        res_p.nip AS resolved_by_nip
      FROM vehicle_maintenance_records vmr
      JOIN vehicles v ON v.id = vmr.vehicle_id
      LEFT JOIN personnel rep ON rep.id = vmr.reported_by_id
      LEFT JOIN personnel res_p ON res_p.id = vmr.resolved_by_id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id && vehicle_id !== 'all') {
      query += ' AND vmr.vehicle_id = ?';
      params.push(Number(vehicle_id));
    }

    if (status && status !== 'all') {
      query += ' AND vmr.status = ?';
      params.push(status);
    }

    if (start_date) {
      query += ' AND vmr.start_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND vmr.start_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY vmr.start_date DESC, vmr.id DESC';

    const [rows] = await pool.query(query, params);

    const formattedRows = rows.map((r) => ({
      ...r,
      start_date: formatDateOnly(r.start_date),
      end_date: formatDateOnly(r.end_date),
    }));

    return successResponse(res, 'Daftar catatan pemeliharaan armada berhasil diambil', formattedRows);
  } catch (error) {
    console.error('Error getMaintenanceRecords:', error);
    return errorResponse(res, 'Gagal mengambil data catatan pemeliharaan: ' + error.message, 500);
  }
};

/**
 * POST /api/readiness/maintenance
 * Menambahkan tiket/catatan pemeliharaan baru (dengan dukungan lampiran dokumen PDF/gambar)
 */
export const createMaintenanceRecord = async (req, res) => {
  try {
    const {
      vehicle_id,
      start_date,
      start_shift_number,
      start_team_group,
      reported_by_id,
      issue_category,
      issue_description,
      status = 'ongoing',
      end_date,
      end_shift_number,
      end_team_group,
      resolved_by_id,
      resolution_notes,
      technician_vendor
    } = req.body;

    if (!vehicle_id) {
      safeUnlink(req.file?.path);
      return errorResponse(res, 'ID armada kendaraan operasional wajib ditentukan', 400);
    }

    if (!issue_description || !String(issue_description).trim()) {
      safeUnlink(req.file?.path);
      return errorResponse(res, 'Deskripsi kendala atau pemeliharaan wajib diisi', 400);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const recStartDate = start_date || todayStr;
    const recStartShift = start_shift_number ? Number(start_shift_number) : 1;
    let recStartTeam = start_team_group ? String(start_team_group).trim() : null;

    if (!recStartTeam) {
      const [activeShift] = await pool.query(
        'SELECT team_group FROM personnel_shifts WHERE shift_date = ? AND shift_number = ? LIMIT 1',
        [recStartDate, recStartShift]
      );
      if (activeShift.length > 0 && activeShift[0].team_group) {
        recStartTeam = activeShift[0].team_group;
      } else {
        recStartTeam = 'Alpha';
      }
    }

    // Verifikasi validitas reported_by_id terhadap master tabel personnel
    let recReportedBy = null;
    const candidateReportedBy = reported_by_id ? Number(reported_by_id) : (req.user?.personnel_id || null);
    if (candidateReportedBy) {
      const [pRows] = await pool.query('SELECT id FROM personnel WHERE id = ?', [candidateReportedBy]);
      if (pRows.length > 0) {
        recReportedBy = pRows[0].id;
      }
    }

    const recCategory = null;
    const rawDesc = String(issue_description).trim();
    const recDescription = cleanPrefixes(rawDesc) || rawDesc;
    const recStatus = status === 'resolved' ? 'resolved' : 'ongoing';

    // Jika armada telah memiliki tiket ongoing yang aktif, perbarui tiket tersebut secara transparan (UPSERT)
    // agar upload berkas dan pembaruan catatan berhasil tanpa kegagalan error 400
    if (recStatus === 'ongoing') {
      const [openTickets] = await pool.query(
        'SELECT id, document_url, document_name FROM vehicle_maintenance_records WHERE vehicle_id = ? AND status = ?',
        [Number(vehicle_id), 'ongoing']
      );
      if (openTickets.length > 0) {
        const existingTicket = openTickets[0];
        let docUrl = existingTicket.document_url;
        let docName = existingTicket.document_name;

        if (req.file) {
          docUrl = `/uploads/${req.file.filename}`;
          docName = req.file.originalname;
          if (existingTicket.document_url && existingTicket.document_url !== docUrl) {
            safeUnlink(existingTicket.document_url);
          }
        } else if (req.body.remove_document === 'true' || req.body.remove_document === true) {
          if (existingTicket.document_url) {
            safeUnlink(existingTicket.document_url);
          }
          docUrl = null;
          docName = null;
        }

        await pool.query(
          `UPDATE vehicle_maintenance_records
           SET issue_description = COALESCE(?, issue_description),
               document_url = ?,
               document_name = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [recDescription, docUrl, docName, existingTicket.id]
        );

        return successResponse(res, 'Dokumen dan catatan pemeliharaan armada berhasil diperbarui', {
          id: existingTicket.id,
          vehicle_id: Number(vehicle_id),
          document_url: docUrl,
          document_name: docName
        });
      }
    }

    const recDocType = req.body.document_type || 'ba_kerusakan';

    let recEndDate = end_date || null;
    let recEndShift = end_shift_number ? Number(end_shift_number) : null;
    let recEndTeam = end_team_group || null;
    let recResolvedBy = null;
    const candidateResolvedBy = resolved_by_id ? Number(resolved_by_id) : null;
    if (candidateResolvedBy) {
      const [pRows] = await pool.query('SELECT id FROM personnel WHERE id = ?', [candidateResolvedBy]);
      if (pRows.length > 0) {
        recResolvedBy = pRows[0].id;
      }
    }
    let recResolutionNotes = resolution_notes ? String(resolution_notes).trim() : null;
    const recVendor = technician_vendor ? String(technician_vendor).trim() : null;

    if (recStatus === 'resolved') {
      if (!recEndDate) {
        recEndDate = recStartDate;
      }
      if (!recResolvedBy && req.user?.personnel_id) {
        const [pRows] = await pool.query('SELECT id FROM personnel WHERE id = ?', [req.user.personnel_id]);
        if (pRows.length > 0) {
          recResolvedBy = pRows[0].id;
        }
      }
    }

    let document_url = null;
    let document_name = null;
    if (req.file) {
      document_url = `/uploads/${req.file.filename}`;
      document_name = req.file.originalname;
    }

    const [result] = await pool.query(
      `INSERT INTO vehicle_maintenance_records (
        vehicle_id, start_date, start_shift_number, start_team_group, reported_by_id,
        issue_category, issue_description, status, end_date, end_shift_number,
        end_team_group, resolved_by_id, resolution_notes, technician_vendor,
        document_type, document_url, document_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(vehicle_id),
        recStartDate,
        recStartShift,
        recStartTeam,
        recReportedBy,
        recCategory,
        recDescription,
        recStatus,
        recEndDate,
        recEndShift,
        recEndTeam,
        recResolvedBy,
        recResolutionNotes,
        recVendor,
        recDocType,
        document_url,
        document_name
      ]
    );

    // Sinkronisasi dua arah ke log kesiapan armada operasional (vehicle_readiness_logs)
    try {
      const syncJustification = recDescription;
      if (recStatus === 'ongoing' && recStartTeam) {
        await pool.query(
          `INSERT INTO vehicle_readiness_logs (
            vehicle_id, shift_date, shift_number, team_group, pic_personnel_id,
            status, justification, follow_up_status, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'unserviceable', ?, 'in_progress', ?, NOW())
          ON DUPLICATE KEY UPDATE
            status = 'unserviceable',
            justification = VALUES(justification),
            follow_up_status = 'in_progress',
            notes = VALUES(notes),
            updated_at = NOW()`,
          [
            Number(vehicle_id),
            recStartDate,
            recStartShift,
            recStartTeam,
            recReportedBy,
            syncJustification,
            recDescription
          ]
        );
      } else if (recStatus === 'resolved') {
        const targetEndDate = recEndDate || recStartDate;
        const targetEndShift = recEndShift || recStartShift;
        const targetEndTeam = recEndTeam || recStartTeam || 'Alpha';
        await pool.query(
          `INSERT INTO vehicle_readiness_logs (
            vehicle_id, shift_date, shift_number, team_group, pic_personnel_id,
            status, justification, follow_up_status, resolved_at, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'serviceable', NULL, 'resolved', NOW(), ?, NOW())
          ON DUPLICATE KEY UPDATE
            status = 'serviceable',
            follow_up_status = 'resolved',
            resolved_at = NOW(),
            notes = VALUES(notes),
            updated_at = NOW()`,
          [
            Number(vehicle_id),
            targetEndDate,
            targetEndShift,
            targetEndTeam,
            recResolvedBy,
            recResolutionNotes || 'Pemeliharaan selesai'
          ]
        );
        await pool.query(
          `UPDATE vehicle_readiness_logs 
           SET follow_up_status = 'resolved', resolved_at = NOW() 
           WHERE vehicle_id = ? AND shift_date >= ? AND follow_up_status != 'resolved'`,
          [Number(vehicle_id), recStartDate]
        );
      }
    } catch (syncErr) {
      console.warn('Peringatan sinkronisasi vehicle_readiness_logs:', syncErr.message);
    }

    const [newRows] = await pool.query(
      `SELECT 
        vmr.*,
        v.code_name AS vehicle_code,
        v.vehicle_name,
        v.license_plate,
        v.category AS vehicle_category,
        rep.full_name AS reported_by_name,
        rep.nip AS reported_by_nip,
        res_p.full_name AS resolved_by_name,
        res_p.nip AS resolved_by_nip
      FROM vehicle_maintenance_records vmr
      JOIN vehicles v ON v.id = vmr.vehicle_id
      LEFT JOIN personnel rep ON rep.id = vmr.reported_by_id
      LEFT JOIN personnel res_p ON res_p.id = vmr.resolved_by_id
      WHERE vmr.id = ?`,
      [result.insertId]
    );

    const createdRecord = {
      ...newRows[0],
      start_date: formatDateOnly(newRows[0]?.start_date),
      end_date: formatDateOnly(newRows[0]?.end_date),
    };

    return successResponse(res, 'Catatan pemeliharaan armada berhasil disimpan', createdRecord, 201);
  } catch (error) {
    safeUnlink(req.file?.path);
    console.error('Error createMaintenanceRecord:', error);
    return errorResponse(res, 'Gagal menambahkan catatan pemeliharaan: ' + error.message, 500);
  }
};

/**
 * PUT /api/readiness/maintenance/:id
 * Memperbarui catatan pemeliharaan armada
 */
export const updateMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const [existingRows] = await pool.query(
      'SELECT * FROM vehicle_maintenance_records WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      // Jika record belum ada di tabel vehicle_maintenance_records (misal berasal dari legacy shift log),
      // lakukan fallback pembuatan record baru secara transparan (UPSERT) agar alur tidak terputus
      if (req.body.vehicle_id) {
        return createMaintenanceRecord(req, res);
      }
      safeUnlink(req.file?.path);
      return errorResponse(res, 'Catatan pemeliharaan tidak ditemukan', 404);
    }

    const existing = existingRows[0];

    let document_url = existing.document_url;
    let document_name = existing.document_name;

    if (req.file) {
      document_url = `/uploads/${req.file.filename}`;
      document_name = req.file.originalname;
      // Hapus berkas lama jika berbeda
      if (existing.document_url && existing.document_url !== document_url) {
        safeUnlink(existing.document_url);
      }
    } else if (req.body.remove_document === 'true' || req.body.remove_document === true) {
      if (existing.document_url) {
        safeUnlink(existing.document_url);
      }
      document_url = null;
      document_name = null;
    }

    const vehicleId = req.body.vehicle_id !== undefined ? Number(req.body.vehicle_id) : existing.vehicle_id;
    const startDate = req.body.start_date !== undefined ? req.body.start_date : existing.start_date;
    const startShiftNumber = req.body.start_shift_number !== undefined ? Number(req.body.start_shift_number) : existing.start_shift_number;
    let startTeamGroup = req.body.start_team_group !== undefined ? req.body.start_team_group : existing.start_team_group;

    if (!startTeamGroup) {
      const [activeShift] = await pool.query(
        'SELECT team_group FROM personnel_shifts WHERE shift_date = ? AND shift_number = ? LIMIT 1',
        [startDate, startShiftNumber]
      );
      if (activeShift.length > 0 && activeShift[0].team_group) {
        startTeamGroup = activeShift[0].team_group;
      } else {
        startTeamGroup = 'Alpha';
      }
    }

    let reportedById = existing.reported_by_id;
    if (req.body.reported_by_id !== undefined) {
      if (req.body.reported_by_id) {
        const [pRows] = await pool.query('SELECT id FROM personnel WHERE id = ?', [Number(req.body.reported_by_id)]);
        reportedById = pRows.length > 0 ? pRows[0].id : null;
      } else {
        reportedById = null;
      }
    }

    const issueCategory = null;
    const rawIssueDescription = req.body.issue_description !== undefined 
      ? String(req.body.issue_description).trim() 
      : existing.issue_description;
    const issueDescription = cleanPrefixes(rawIssueDescription) || rawIssueDescription;
    const status = req.body.status !== undefined ? req.body.status : existing.status;

    let endDate = req.body.end_date !== undefined ? (req.body.end_date || null) : existing.end_date;
    let endShiftNumber = req.body.end_shift_number !== undefined ? (req.body.end_shift_number ? Number(req.body.end_shift_number) : null) : existing.end_shift_number;
    let endTeamGroup = req.body.end_team_group !== undefined ? (req.body.end_team_group || null) : existing.end_team_group;
    
    let resolvedById = existing.resolved_by_id;
    if (req.body.resolved_by_id !== undefined) {
      if (req.body.resolved_by_id) {
        const [pRows] = await pool.query('SELECT id FROM personnel WHERE id = ?', [Number(req.body.resolved_by_id)]);
        resolvedById = pRows.length > 0 ? pRows[0].id : null;
      } else {
        resolvedById = null;
      }
    }

    let resolutionNotes = req.body.resolution_notes !== undefined ? req.body.resolution_notes : existing.resolution_notes;
    let technicianVendor = req.body.technician_vendor !== undefined ? req.body.technician_vendor : existing.technician_vendor;
    const documentType = req.body.document_type !== undefined ? req.body.document_type : (existing.document_type || 'ba_kerusakan');

    if (status === 'ongoing') {
      const [openTickets] = await pool.query(
        'SELECT id FROM vehicle_maintenance_records WHERE vehicle_id = ? AND status = ? AND id != ?',
        [vehicleId, 'ongoing', id]
      );
      if (openTickets.length > 0) {
        safeUnlink(req.file?.path);
        return errorResponse(
          res,
          `Armada ini telah memiliki tiket pemeliharaan aktif lain (#${openTickets[0].id}) yang berstatus Dalam Penanganan.`,
          400
        );
      }
    }

    if (status === 'resolved') {
      if (!endDate) {
        endDate = new Date().toISOString().split('T')[0];
      }
      if (!resolvedById && req.user?.personnel_id) {
        const [pRows] = await pool.query('SELECT id FROM personnel WHERE id = ?', [req.user.personnel_id]);
        if (pRows.length > 0) {
          resolvedById = pRows[0].id;
        }
      }
    } else if (status === 'ongoing' && (req.body.clear_resolution === 'true' || req.body.clear_resolution === true)) {
      endDate = null;
      endShiftNumber = null;
      endTeamGroup = null;
      resolvedById = null;
      resolutionNotes = null;
    }

    await pool.query(
      `UPDATE vehicle_maintenance_records SET
        vehicle_id = ?,
        start_date = ?,
        start_shift_number = ?,
        start_team_group = ?,
        reported_by_id = ?,
        issue_category = ?,
        issue_description = ?,
        status = ?,
        end_date = ?,
        end_shift_number = ?,
        end_team_group = ?,
        resolved_by_id = ?,
        resolution_notes = ?,
        technician_vendor = ?,
        document_type = ?,
        document_url = ?,
        document_name = ?
      WHERE id = ?`,
      [
        vehicleId,
        startDate,
        startShiftNumber,
        startTeamGroup,
        reportedById,
        issueCategory,
        issueDescription,
        status,
        endDate,
        endShiftNumber,
        endTeamGroup,
        resolvedById,
        resolutionNotes,
        technicianVendor,
        documentType,
        document_url,
        document_name,
        id
      ]
    );

    // Sinkronisasi dua arah ke log kesiapan armada operasional
    try {
      const syncJustification = issueDescription;
      if (status === 'ongoing' && startTeamGroup) {
        await pool.query(
          `INSERT INTO vehicle_readiness_logs (
            vehicle_id, shift_date, shift_number, team_group, pic_personnel_id,
            status, justification, follow_up_status, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'unserviceable', ?, 'in_progress', ?, NOW())
          ON DUPLICATE KEY UPDATE
            status = 'unserviceable',
            justification = VALUES(justification),
            follow_up_status = 'in_progress',
            notes = VALUES(notes),
            updated_at = NOW()`,
          [
            vehicleId,
            startDate,
            startShiftNumber,
            startTeamGroup,
            reportedById,
            syncJustification,
            issueDescription
          ]
        );
      } else if (status === 'resolved') {
        const targetEndDate = endDate || startDate;
        const targetEndShift = endShiftNumber || startShiftNumber;
        const targetEndTeam = endTeamGroup || startTeamGroup || 'Alpha';
        await pool.query(
          `INSERT INTO vehicle_readiness_logs (
            vehicle_id, shift_date, shift_number, team_group, pic_personnel_id,
            status, justification, follow_up_status, resolved_at, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'serviceable', NULL, 'resolved', NOW(), ?, NOW())
          ON DUPLICATE KEY UPDATE
            status = 'serviceable',
            follow_up_status = 'resolved',
            resolved_at = NOW(),
            notes = VALUES(notes),
            updated_at = NOW()`,
          [
            vehicleId,
            targetEndDate,
            targetEndShift,
            targetEndTeam,
            resolvedById,
            resolutionNotes || 'Pemeliharaan selesai'
          ]
        );
        await pool.query(
          `UPDATE vehicle_readiness_logs 
           SET follow_up_status = 'resolved', resolved_at = NOW() 
           WHERE vehicle_id = ? AND shift_date >= ? AND follow_up_status != 'resolved'`,
          [vehicleId, startDate]
        );
      }
    } catch (syncErr) {
      console.warn('Peringatan sinkronisasi update vehicle_readiness_logs:', syncErr.message);
    }

    const [updatedRows] = await pool.query(
      `SELECT 
        vmr.*,
        v.code_name AS vehicle_code,
        v.vehicle_name,
        v.license_plate,
        v.category AS vehicle_category,
        rep.full_name AS reported_by_name,
        rep.nip AS reported_by_nip,
        res_p.full_name AS resolved_by_name,
        res_p.nip AS resolved_by_nip
      FROM vehicle_maintenance_records vmr
      JOIN vehicles v ON v.id = vmr.vehicle_id
      LEFT JOIN personnel rep ON rep.id = vmr.reported_by_id
      LEFT JOIN personnel res_p ON res_p.id = vmr.resolved_by_id
      WHERE vmr.id = ?`,
      [id]
    );

    const updatedRecord = {
      ...updatedRows[0],
      start_date: formatDateOnly(updatedRows[0]?.start_date),
      end_date: formatDateOnly(updatedRows[0]?.end_date),
    };

    return successResponse(res, 'Catatan pemeliharaan armada berhasil diperbarui', updatedRecord);
  } catch (error) {
    safeUnlink(req.file?.path);
    console.error('Error updateMaintenanceRecord:', error);
    return errorResponse(res, 'Gagal memperbarui catatan pemeliharaan: ' + error.message, 500);
  }
};

/**
 * DELETE /api/readiness/maintenance/:id
 * Menghapus catatan pemeliharaan armada beserta berkas lampiran fisiknya secara aman
 */
export const deleteMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Dukungan hapus periode kendala yang bersumber dari log kesiapan shift (id format: log-123)
    if (typeof id === 'string' && id.startsWith('log-')) {
      const logId = Number(id.replace('log-', ''));
      const [logRows] = await pool.query(
        'SELECT * FROM vehicle_readiness_logs WHERE id = ?',
        [logId]
      );

      if (logRows.length === 0) {
        return errorResponse(res, 'Catatan kendala log armada tidak ditemukan', 404);
      }

      const targetLog = logRows[0];
      if (targetLog.photo_webp_url) {
        safeUnlink(targetLog.photo_webp_url);
      }

      const targetDate = formatDateOnly(targetLog.shift_date);

      // Hapus log unserviceable awal
      await pool.query('DELETE FROM vehicle_readiness_logs WHERE id = ?', [logId]);

      // Bersihkan catatan perbaikan pada log pemulihan di shift terkait agar tidak meninggalkan catatan kendala yatim
      await pool.query(
        `UPDATE vehicle_readiness_logs
         SET notes = NULL
         WHERE vehicle_id = ? AND shift_date = ? AND status = 'serviceable'`,
        [targetLog.vehicle_id, targetDate]
      );

      // Bersihkan jika ada tiket pemeliharaan di tanggal yang sama
      await pool.query(
        'DELETE FROM vehicle_maintenance_records WHERE vehicle_id = ? AND start_date = ?',
        [targetLog.vehicle_id, targetDate]
      );

      return successResponse(res, 'Catatan periode kendala armada berhasil dihapus');
    }

    // 2. Hapus tiket pemeliharaan reguler (id berupa angka di vehicle_maintenance_records)
    const [existingRows] = await pool.query(
      'SELECT * FROM vehicle_maintenance_records WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      // Fallback: Cek apakah ID merujuk ke vehicle_readiness_logs secara langsung
      const [fallbackLogRows] = await pool.query(
        'SELECT * FROM vehicle_readiness_logs WHERE id = ?',
        [id]
      );
      if (fallbackLogRows.length > 0) {
        const targetLog = fallbackLogRows[0];
        if (targetLog.photo_webp_url) {
          safeUnlink(targetLog.photo_webp_url);
        }
        const targetDate = formatDateOnly(targetLog.shift_date);
        await pool.query('DELETE FROM vehicle_readiness_logs WHERE id = ?', [id]);
        await pool.query(
          `UPDATE vehicle_readiness_logs
           SET notes = NULL
           WHERE vehicle_id = ? AND shift_date = ? AND status = 'serviceable'`,
          [targetLog.vehicle_id, targetDate]
        );
        return successResponse(res, 'Catatan periode kendala armada berhasil dihapus');
      }

      return errorResponse(res, 'Catatan pemeliharaan tidak ditemukan', 404);
    }

    const record = existingRows[0];

    if (record.document_url) {
      safeUnlink(record.document_url);
    }

    await pool.query('DELETE FROM vehicle_maintenance_records WHERE id = ?', [id]);

    // Bersihkan juga log kesiapan terkait di vehicle_readiness_logs agar tidak menjadi zombie data unserviceable
    try {
      const recStartDate = formatDateOnly(record.start_date);
      const cleanDesc = record.issue_description ? String(record.issue_description).trim() : '';

      // Cari log kesiapan yang berkaitan dengan tiket pemeliharaan ini
      const [associatedLogs] = await pool.query(
        `SELECT id, photo_webp_url, status, justification, notes
         FROM vehicle_readiness_logs
         WHERE vehicle_id = ?
           AND (
             (shift_date = ? AND shift_number = ?)
             OR justification LIKE ?
             OR notes LIKE ?
           )`,
        [
          record.vehicle_id,
          recStartDate,
          record.start_shift_number || 1,
          `%${cleanDesc}%`,
          `%${cleanDesc}%`
        ]
      );

      for (const log of associatedLogs) {
        // Jika log ini dibuat otomatis dari tiket pemeliharaan (tanpa bukti foto lapangan), hapus log agar bersih
        if (!log.photo_webp_url && (log.justification?.includes(cleanDesc) || log.notes?.includes(cleanDesc) || log.status === 'unserviceable')) {
          await pool.query('DELETE FROM vehicle_readiness_logs WHERE id = ?', [log.id]);
        } else if (log.status === 'unserviceable') {
          // Jika terdapat input lapangan namun tercatat unserviceable karena kendala ini, pulihkan statusnya
          await pool.query(
            `UPDATE vehicle_readiness_logs
             SET status = 'serviceable', follow_up_status = 'resolved', resolved_at = NOW()
             WHERE id = ?`,
            [log.id]
          );
        }
      }

      // Pastikan jika tidak ada tiket pemeliharaan aktif lain pada armada ini, tidak ada kendala 'in_progress' yang menggantung
      const [otherOngoing] = await pool.query(
        'SELECT id FROM vehicle_maintenance_records WHERE vehicle_id = ? AND status = ? AND id != ?',
        [record.vehicle_id, 'ongoing', id]
      );

      if (otherOngoing.length === 0) {
        await pool.query(
          `UPDATE vehicle_readiness_logs
           SET follow_up_status = 'resolved', resolved_at = NOW()
           WHERE vehicle_id = ? AND follow_up_status = 'in_progress' AND shift_date >= ?`,
          [record.vehicle_id, recStartDate]
        );
      }
    } catch (syncErr) {
      console.warn('Peringatan pembersihan log kesiapan armada pasca-hapus pemeliharaan:', syncErr.message);
    }

    return successResponse(res, 'Catatan pemeliharaan armada berhasil dihapus');
  } catch (error) {
    console.error('Error deleteMaintenanceRecord:', error);
    return errorResponse(res, 'Gagal menghapus catatan pemeliharaan: ' + error.message, 500);
  }
};
