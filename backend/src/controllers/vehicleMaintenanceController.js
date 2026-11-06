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

const getWibDateStr = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
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
 * Helper terpadu untuk sinkronisasi tiket pemeliharaan ke log kesiapan armada
 * Dijalankan dalam konteks koneksi/transaksi aktif
 */
const syncMaintenanceToReadinessLogs = async (
  connection,
  {
    vehicle_id,
    status,
    start_date,
    start_shift_number,
    start_team_group,
    reported_by_id,
    issue_description,
    end_date,
    end_shift_number,
    end_team_group,
    resolved_by_id,
    resolution_notes
  }
) => {
  const vId = Number(vehicle_id);
  const todayStr = getWibDateStr();

  if (status === 'ongoing' && start_team_group) {
    await connection.query(
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
        vId,
        start_date,
        start_shift_number,
        start_team_group,
        reported_by_id,
        issue_description,
        issue_description
      ]
    );
  } else if (status === 'resolved') {
    let targetEndDate = end_date || todayStr;
    if (targetEndDate > todayStr) {
      targetEndDate = todayStr;
    }
    const targetEndShift = end_shift_number || start_shift_number || 1;
    const targetEndTeam = end_team_group || start_team_group || 'Alpha';

    await connection.query(
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
        vId,
        targetEndDate,
        targetEndShift,
        targetEndTeam,
        resolved_by_id,
        resolution_notes || 'Pemeliharaan selesai'
      ]
    );

    await connection.query(
      `UPDATE vehicle_readiness_logs 
       SET follow_up_status = 'resolved', resolved_at = NOW() 
       WHERE vehicle_id = ? AND shift_date >= ? AND follow_up_status != 'resolved'`,
      [vId, start_date]
    );
  }
};

/**
 * Helper mengambil data record pemeliharaan lengkap beserta join
 */
const fetchMaintenanceRecordById = async (id, conn = pool) => {
  const [rows] = await conn.query(
    `SELECT 
      vmr.id,
      vmr.vehicle_id,
      vmr.start_date,
      vmr.start_shift_number,
      vmr.start_team_group,
      vmr.reported_by_id,
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
    WHERE vmr.id = ?`,
    [id]
  );
  if (rows.length === 0) return null;
  return {
    ...rows[0],
    start_date: formatDateOnly(rows[0]?.start_date),
    end_date: formatDateOnly(rows[0]?.end_date),
  };
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
 * Menambahkan tiket/catatan pemeliharaan baru (dengan dukungan lampiran dokumen PDF)
 * Dijalankan dalam transaksi atomik dengan pola pembersihan berkas post-commit
 */
export const createMaintenanceRecord = async (req, res) => {
  const filesToUnlink = [];
  const connection = await pool.getConnection();

  try {
    const {
      vehicle_id,
      start_date,
      start_shift_number,
      start_team_group,
      reported_by_id,
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
      if (req.file?.path) safeUnlink(req.file.path);
      return errorResponse(res, 'ID armada kendaraan operasional wajib ditentukan', 400);
    }

    if (!issue_description || !String(issue_description).trim()) {
      if (req.file?.path) safeUnlink(req.file.path);
      return errorResponse(res, 'Deskripsi kendala atau pemeliharaan wajib diisi', 400);
    }

    const todayStr = getWibDateStr();
    let recStartDate = start_date || todayStr;
    if (recStartDate > todayStr) {
      recStartDate = todayStr;
    }
    const recStartShift = start_shift_number ? Number(start_shift_number) : 1;
    let recStartTeam = start_team_group ? String(start_team_group).trim() : null;

    await connection.beginTransaction();

    if (!recStartTeam) {
      const [activeShift] = await connection.query(
        'SELECT team_group FROM personnel_shifts WHERE shift_date = ? AND shift_number = ? LIMIT 1',
        [recStartDate, recStartShift]
      );
      if (activeShift.length > 0 && activeShift[0].team_group) {
        recStartTeam = activeShift[0].team_group;
      } else {
        recStartTeam = 'Alpha';
      }
    }

    let recReportedBy = null;
    const candidateReportedBy = reported_by_id ? Number(reported_by_id) : (req.user?.personnel_id || null);
    if (candidateReportedBy) {
      const [pRows] = await connection.query('SELECT id FROM personnel WHERE id = ?', [candidateReportedBy]);
      if (pRows.length > 0) {
        recReportedBy = pRows[0].id;
      }
    }

    const rawDesc = String(issue_description).trim();
    const recDescription = cleanPrefixes(rawDesc) || rawDesc;
    const recStatus = status === 'resolved' ? 'resolved' : 'ongoing';

    // Jika armada telah memiliki tiket ongoing aktif, perbarui tiket tersebut secara transparan (UPSERT)
    if (recStatus === 'ongoing') {
      const [openTickets] = await connection.query(
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
            filesToUnlink.push(existingTicket.document_url);
          }
        } else if (req.body.remove_document === 'true' || req.body.remove_document === true) {
          if (existingTicket.document_url) {
            filesToUnlink.push(existingTicket.document_url);
          }
          docUrl = null;
          docName = null;
        }

        await connection.query(
          `UPDATE vehicle_maintenance_records
           SET issue_description = COALESCE(?, issue_description),
               document_url = ?,
               document_name = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [recDescription, docUrl, docName, existingTicket.id]
        );

        await connection.commit();

        // Pola post-commit cleanup untuk berkas fisik
        for (const f of filesToUnlink) {
          safeUnlink(f);
        }

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
      const [pRows] = await connection.query('SELECT id FROM personnel WHERE id = ?', [candidateResolvedBy]);
      if (pRows.length > 0) {
        recResolvedBy = pRows[0].id;
      }
    }
    let recResolutionNotes = resolution_notes ? String(resolution_notes).trim() : null;
    const recVendor = technician_vendor ? String(technician_vendor).trim() : null;

    if (recStatus === 'resolved') {
      if (!recEndDate) {
        recEndDate = todayStr;
      }
      if (recEndDate > todayStr) {
        recEndDate = todayStr;
      }
      if (recEndDate < recStartDate) {
        await connection.rollback();
        if (req.file?.path) safeUnlink(req.file.path);
        return errorResponse(res, 'Tanggal pemulihan tidak boleh lebih awal dari tanggal mulai kendala.', 400);
      }
      if (!recResolvedBy && req.user?.personnel_id) {
        const [pRows] = await connection.query('SELECT id FROM personnel WHERE id = ?', [req.user.personnel_id]);
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

    const [result] = await connection.query(
      `INSERT INTO vehicle_maintenance_records (
        vehicle_id, start_date, start_shift_number, start_team_group, reported_by_id,
        issue_description, status, end_date, end_shift_number,
        end_team_group, resolved_by_id, resolution_notes, technician_vendor,
        document_type, document_url, document_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(vehicle_id),
        recStartDate,
        recStartShift,
        recStartTeam,
        recReportedBy,
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

    // Sinkronisasi status ke log kesiapan armada operasional dalam transaksi yang sama
    await syncMaintenanceToReadinessLogs(connection, {
      vehicle_id,
      status: recStatus,
      start_date: recStartDate,
      start_shift_number: recStartShift,
      start_team_group: recStartTeam,
      reported_by_id: recReportedBy,
      issue_description: recDescription,
      end_date: recEndDate,
      end_shift_number: recEndShift,
      end_team_group: recEndTeam,
      resolved_by_id: recResolvedBy,
      resolution_notes: recResolutionNotes
    });

    await connection.commit();

    // Pola post-commit cleanup untuk berkas fisik
    for (const f of filesToUnlink) {
      safeUnlink(f);
    }

    const createdRecord = await fetchMaintenanceRecordById(result.insertId);
    return successResponse(res, 'Catatan pemeliharaan armada berhasil disimpan', createdRecord, 201);
  } catch (error) {
    await connection.rollback();
    if (req.file?.path) safeUnlink(req.file.path);
    console.error('Error createMaintenanceRecord:', error);
    return errorResponse(res, 'Gagal menambahkan catatan pemeliharaan: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/readiness/maintenance/:id
 * Memperbarui catatan pemeliharaan armada
 * Jika entri kendala berawalan 'log-' diberi dokumen atau teknisi, entri tersebut dipromosikan
 * menjadi baris resmi di tabel vehicle_maintenance_records.
 */
export const updateMaintenanceRecord = async (req, res) => {
  const filesToUnlink = [];
  const connection = await pool.getConnection();

  try {
    const rawId = String(req.params.id || '');
    const isLog = rawId.startsWith('log-');
    const cleanId = rawId.replace('log-', '');
    const recordId = Number(cleanId);

    if (!recordId) {
      if (req.file?.path) safeUnlink(req.file.path);
      return errorResponse(res, 'ID catatan pemeliharaan atau log tidak valid', 400);
    }

    const todayStr = getWibDateStr();
    await connection.beginTransaction();

    // 1. Tangani jika ID secara eksplisit adalah log harian kesiapan armada (awalan 'log-')
    if (isLog) {
      const [readinessRows] = await connection.query(
        'SELECT * FROM vehicle_readiness_logs WHERE id = ?',
        [recordId]
      );
      if (readinessRows.length === 0) {
        await connection.rollback();
        if (req.file?.path) safeUnlink(req.file.path);
        return errorResponse(res, 'Log kesiapan armada tidak ditemukan', 404);
      }

      const readinessLog = readinessRows[0];
      const hasDocOrTech = Boolean(
        req.file ||
        (req.body.technician_vendor && String(req.body.technician_vendor).trim()) ||
        req.body.document_type ||
        req.body.promote_to_maintenance
      );

      const targetStatus = req.body.status === 'resolved' ? 'serviceable' : 'unserviceable';
      const recStatus = req.body.status === 'resolved' ? 'resolved' : 'ongoing';
      const followUp = req.body.status === 'resolved' ? 'resolved' : 'in_progress';
      const resolvedAt = req.body.status === 'resolved' ? new Date() : null;
      const rawDesc = req.body.issue_description !== undefined ? String(req.body.issue_description).trim() : readinessLog.justification;
      const cleanDesc = cleanPrefixes(rawDesc) || rawDesc;

      let recEndDate = req.body.end_date || null;
      if (recStatus === 'resolved') {
        if (!recEndDate) {
          recEndDate = todayStr;
        }
        if (recEndDate > todayStr) {
          recEndDate = todayStr;
        }
      }

      // Jika ada dokumen atau data teknisi, promosikan ke vehicle_maintenance_records resmi
      if (hasDocOrTech) {
        let document_url = null;
        let document_name = null;
        if (req.file) {
          document_url = `/uploads/${req.file.filename}`;
          document_name = req.file.originalname;
        }

        const recStartDate = req.body.start_date || formatDateOnly(readinessLog.shift_date) || todayStr;
        const recStartShift = req.body.start_shift_number ? Number(req.body.start_shift_number) : (readinessLog.shift_number || 1);
        const recStartTeam = req.body.start_team_group || readinessLog.team_group || 'Alpha';
        const recReportedBy = req.body.reported_by_id ? Number(req.body.reported_by_id) : (readinessLog.pic_personnel_id || req.user?.personnel_id || null);
        const recEndShift = req.body.end_shift_number ? Number(req.body.end_shift_number) : 1;
        const recEndTeam = req.body.end_team_group || 'Alpha';
        const recResolvedBy = req.body.resolved_by_id ? Number(req.body.resolved_by_id) : (req.user?.personnel_id || null);
        const recResolutionNotes = req.body.resolution_notes || readinessLog.notes || null;
        const recVendor = req.body.technician_vendor ? String(req.body.technician_vendor).trim() : null;
        const recDocType = req.body.document_type || 'ba_kerusakan';

        const [insertResult] = await connection.query(
          `INSERT INTO vehicle_maintenance_records (
            vehicle_id, start_date, start_shift_number, start_team_group, reported_by_id,
            issue_description, status, end_date, end_shift_number,
            end_team_group, resolved_by_id, resolution_notes, technician_vendor,
            document_type, document_url, document_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            readinessLog.vehicle_id,
            recStartDate,
            recStartShift,
            recStartTeam,
            recReportedBy,
            cleanDesc || readinessLog.justification || 'Kendala Armada',
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

        // Perbarui log harian agar sinkron
        await connection.query(
          `UPDATE vehicle_readiness_logs SET
            status = ?,
            justification = ?,
            follow_up_status = ?,
            resolved_at = ?,
            notes = ?,
            pic_personnel_id = COALESCE(?, pic_personnel_id),
            updated_at = NOW()
          WHERE id = ?`,
          [
            targetStatus,
            cleanDesc || readinessLog.justification,
            followUp,
            resolvedAt,
            recResolutionNotes || cleanDesc,
            recReportedBy,
            recordId
          ]
        );

        await connection.commit();

        const promotedRecord = await fetchMaintenanceRecordById(insertResult.insertId);
        return successResponse(
          res,
          'Catatan kendala berhasil dipromosikan menjadi catatan pemeliharaan resmi',
          promotedRecord
        );
      }

      // Pembaruan ringan pada log harian kesiapan tanpa dokumen/teknisi
      await connection.query(
        `UPDATE vehicle_readiness_logs SET
          status = ?,
          justification = ?,
          follow_up_status = ?,
          resolved_at = ?,
          notes = ?,
          pic_personnel_id = COALESCE(?, pic_personnel_id),
          updated_at = NOW()
        WHERE id = ?`,
        [
          targetStatus,
          cleanDesc || readinessLog.justification,
          followUp,
          resolvedAt,
          req.body.resolution_notes || readinessLog.notes || cleanDesc,
          req.body.reported_by_id ? Number(req.body.reported_by_id) : readinessLog.pic_personnel_id,
          recordId
        ]
      );

      await connection.commit();

      return successResponse(res, 'Log kesiapan armada berhasil diperbarui', {
        id: `log-${recordId}`,
        vehicle_id: readinessLog.vehicle_id,
        status: req.body.status || (targetStatus === 'serviceable' ? 'resolved' : 'ongoing'),
        issue_description: cleanDesc || readinessLog.justification,
        resolution_notes: req.body.resolution_notes || readinessLog.notes,
        is_maintenance_record: false
      });
    }

    // 2. Cari di vehicle_maintenance_records
    const [existingRows] = await connection.query(
      'SELECT * FROM vehicle_maintenance_records WHERE id = ?',
      [recordId]
    );

    if (existingRows.length === 0) {
      // Periksa apakah ID ini adalah log kendala harian tanpa awalan 'log-'
      const [readinessRows] = await connection.query(
        'SELECT * FROM vehicle_readiness_logs WHERE id = ?',
        [recordId]
      );

      if (readinessRows.length > 0) {
        const readinessLog = readinessRows[0];
        const hasDocOrTech = Boolean(
          req.file ||
          (req.body.technician_vendor && String(req.body.technician_vendor).trim()) ||
          req.body.document_type ||
          req.body.promote_to_maintenance
        );

        const targetStatus = req.body.status === 'resolved' ? 'serviceable' : 'unserviceable';
        const recStatus = req.body.status === 'resolved' ? 'resolved' : 'ongoing';
        const followUp = req.body.status === 'resolved' ? 'resolved' : 'in_progress';
        const resolvedAt = req.body.status === 'resolved' ? new Date() : null;
        const rawDesc = req.body.issue_description !== undefined ? String(req.body.issue_description).trim() : readinessLog.justification;
        const cleanDesc = cleanPrefixes(rawDesc) || rawDesc;

        let recEndDate = req.body.end_date || null;
        if (recStatus === 'resolved') {
          if (!recEndDate) {
            recEndDate = todayStr;
          }
          if (recEndDate > todayStr) {
            recEndDate = todayStr;
          }
        }

        if (hasDocOrTech) {
          let document_url = null;
          let document_name = null;
          if (req.file) {
            document_url = `/uploads/${req.file.filename}`;
            document_name = req.file.originalname;
          }

          const recStartDate = req.body.start_date || formatDateOnly(readinessLog.shift_date) || todayStr;
          const recStartShift = req.body.start_shift_number ? Number(req.body.start_shift_number) : (readinessLog.shift_number || 1);
          const recStartTeam = req.body.start_team_group || readinessLog.team_group || 'Alpha';
          const recReportedBy = req.body.reported_by_id ? Number(req.body.reported_by_id) : (readinessLog.pic_personnel_id || req.user?.personnel_id || null);
          const recEndShift = req.body.end_shift_number ? Number(req.body.end_shift_number) : 1;
          const recEndTeam = req.body.end_team_group || 'Alpha';
          const recResolvedBy = req.body.resolved_by_id ? Number(req.body.resolved_by_id) : (req.user?.personnel_id || null);
          const recResolutionNotes = req.body.resolution_notes || readinessLog.notes || null;
          const recVendor = req.body.technician_vendor ? String(req.body.technician_vendor).trim() : null;
          const recDocType = req.body.document_type || 'ba_kerusakan';

          const [insertResult] = await connection.query(
            `INSERT INTO vehicle_maintenance_records (
              vehicle_id, start_date, start_shift_number, start_team_group, reported_by_id,
              issue_description, status, end_date, end_shift_number,
              end_team_group, resolved_by_id, resolution_notes, technician_vendor,
              document_type, document_url, document_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              readinessLog.vehicle_id,
              recStartDate,
              recStartShift,
              recStartTeam,
              recReportedBy,
              cleanDesc || readinessLog.justification || 'Kendala Armada',
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

          await connection.query(
            `UPDATE vehicle_readiness_logs SET
              status = ?,
              justification = ?,
              follow_up_status = ?,
              resolved_at = ?,
              notes = ?,
              pic_personnel_id = COALESCE(?, pic_personnel_id),
              updated_at = NOW()
            WHERE id = ?`,
            [
              targetStatus,
              cleanDesc || readinessLog.justification,
              followUp,
              resolvedAt,
              recResolutionNotes || cleanDesc,
              recReportedBy,
              recordId
            ]
          );

          await connection.commit();

          const promotedRecord = await fetchMaintenanceRecordById(insertResult.insertId);
          return successResponse(
            res,
            'Catatan kendala berhasil dipromosikan menjadi catatan pemeliharaan resmi',
            promotedRecord
          );
        }

        await connection.query(
          `UPDATE vehicle_readiness_logs SET
            status = ?,
            justification = ?,
            follow_up_status = ?,
            resolved_at = ?,
            notes = ?,
            pic_personnel_id = COALESCE(?, pic_personnel_id),
            updated_at = NOW()
          WHERE id = ?`,
          [
            targetStatus,
            cleanDesc || readinessLog.justification,
            followUp,
            resolvedAt,
            req.body.resolution_notes || readinessLog.notes || cleanDesc,
            req.body.reported_by_id ? Number(req.body.reported_by_id) : readinessLog.pic_personnel_id,
            recordId
          ]
        );

        await connection.commit();
        return successResponse(res, 'Log kesiapan armada berhasil diperbarui', {
          id: `log-${recordId}`,
          vehicle_id: readinessLog.vehicle_id,
          status: req.body.status || (targetStatus === 'serviceable' ? 'resolved' : 'ongoing'),
          issue_description: cleanDesc || readinessLog.justification,
          resolution_notes: req.body.resolution_notes || readinessLog.notes,
          is_maintenance_record: false
        });
      }

      await connection.rollback();
      if (req.file?.path) safeUnlink(req.file.path);
      return errorResponse(res, 'Catatan pemeliharaan tidak ditemukan', 404);
    }

    const existing = existingRows[0];

    let document_url = existing.document_url;
    let document_name = existing.document_name;

    if (req.file) {
      document_url = `/uploads/${req.file.filename}`;
      document_name = req.file.originalname;
      if (existing.document_url && existing.document_url !== document_url) {
        filesToUnlink.push(existing.document_url);
      }
    } else if (req.body.remove_document === 'true' || req.body.remove_document === true) {
      if (existing.document_url) {
        filesToUnlink.push(existing.document_url);
      }
      document_url = null;
      document_name = null;
    }

    const vehicleId = req.body.vehicle_id !== undefined ? Number(req.body.vehicle_id) : existing.vehicle_id;
    const startDate = req.body.start_date !== undefined ? req.body.start_date : existing.start_date;
    const startShiftNumber = req.body.start_shift_number !== undefined ? Number(req.body.start_shift_number) : existing.start_shift_number;
    let startTeamGroup = req.body.start_team_group !== undefined ? req.body.start_team_group : existing.start_team_group;

    if (!startTeamGroup) {
      const [activeShift] = await connection.query(
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
        const [pRows] = await connection.query('SELECT id FROM personnel WHERE id = ?', [Number(req.body.reported_by_id)]);
        reportedById = pRows.length > 0 ? pRows[0].id : null;
      } else {
        reportedById = null;
      }
    }

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
        const [pRows] = await connection.query('SELECT id FROM personnel WHERE id = ?', [Number(req.body.resolved_by_id)]);
        resolvedById = pRows.length > 0 ? pRows[0].id : null;
      } else {
        resolvedById = null;
      }
    }

    let resolutionNotes = req.body.resolution_notes !== undefined ? req.body.resolution_notes : existing.resolution_notes;
    let technicianVendor = req.body.technician_vendor !== undefined ? req.body.technician_vendor : existing.technician_vendor;
    const documentType = req.body.document_type !== undefined ? req.body.document_type : (existing.document_type || 'ba_kerusakan');

    if (status === 'ongoing') {
      const [openTickets] = await connection.query(
        'SELECT id FROM vehicle_maintenance_records WHERE vehicle_id = ? AND status = ? AND id != ?',
        [vehicleId, 'ongoing', recordId]
      );
      if (openTickets.length > 0) {
        await connection.rollback();
        if (req.file?.path) safeUnlink(req.file.path);
        return errorResponse(
          res,
          `Armada ini telah memiliki tiket pemeliharaan aktif lain (#${openTickets[0].id}) yang berstatus Dalam Penanganan.`,
          400
        );
      }
    }

    if (status === 'resolved') {
      if (!endDate) {
        endDate = todayStr;
      }
      if (endDate > todayStr) {
        endDate = todayStr;
      }
      if (startDate && endDate < startDate) {
        await connection.rollback();
        if (req.file?.path) safeUnlink(req.file.path);
        return errorResponse(res, 'Tanggal pemulihan tidak boleh lebih awal dari tanggal mulai kendala.', 400);
      }
      if (!resolvedById && req.user?.personnel_id) {
        const [pRows] = await connection.query('SELECT id FROM personnel WHERE id = ?', [req.user.personnel_id]);
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

    await connection.query(
      `UPDATE vehicle_maintenance_records SET
        vehicle_id = ?,
        start_date = ?,
        start_shift_number = ?,
        start_team_group = ?,
        reported_by_id = ?,
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
        recordId
      ]
    );

    // Sinkronisasi status ke log kesiapan armada operasional dalam transaksi yang sama
    await syncMaintenanceToReadinessLogs(connection, {
      vehicle_id: vehicleId,
      status,
      start_date: startDate,
      start_shift_number: startShiftNumber,
      start_team_group: startTeamGroup,
      reported_by_id: reportedById,
      issue_description: issueDescription,
      end_date: endDate,
      end_shift_number: endShiftNumber,
      end_team_group: endTeamGroup,
      resolved_by_id: resolvedById,
      resolution_notes: resolutionNotes
    });

    await connection.commit();

    // Pola post-commit cleanup untuk berkas fisik
    for (const f of filesToUnlink) {
      safeUnlink(f);
    }

    const updatedRecord = await fetchMaintenanceRecordById(recordId);
    return successResponse(res, 'Catatan pemeliharaan armada berhasil diperbarui', updatedRecord);
  } catch (error) {
    await connection.rollback();
    if (req.file?.path) safeUnlink(req.file.path);
    console.error('Error updateMaintenanceRecord:', error);
    return errorResponse(res, 'Gagal memperbarui catatan pemeliharaan: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

/**
 * DELETE /api/readiness/maintenance/:id
 * Menghapus catatan pemeliharaan armada beserta berkas lampiran fisiknya secara langsung
 * Log historis shift yang sudah lampau dilindungi dan tidak diubah massal menjadi serviceable.
 */
export const deleteMaintenanceRecord = async (req, res) => {
  const filesToUnlink = [];
  const connection = await pool.getConnection();

  try {
    const rawId = String(req.params.id || '');
    const isLog = rawId.startsWith('log-');
    const cleanId = rawId.replace('log-', '');
    const recordId = Number(cleanId);

    if (!recordId) {
      return errorResponse(res, 'ID catatan pemeliharaan atau log tidak valid', 400);
    }

    await connection.beginTransaction();

    if (isLog) {
      const [readinessRows] = await connection.query(
        'SELECT * FROM vehicle_readiness_logs WHERE id = ?',
        [recordId]
      );

      if (readinessRows.length === 0) {
        await connection.rollback();
        return errorResponse(res, 'Log kesiapan armada tidak ditemukan', 404);
      }

      await connection.query(
        `UPDATE vehicle_readiness_logs
         SET status = 'serviceable',
             justification = NULL,
             follow_up_status = 'resolved',
             resolved_at = NOW(),
             notes = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [recordId]
      );

      await connection.commit();
      return successResponse(res, 'Catatan kendala armada pada log kesiapan berhasil dipulihkan');
    }

    const [existingRows] = await connection.query(
      'SELECT * FROM vehicle_maintenance_records WHERE id = ?',
      [recordId]
    );

    if (existingRows.length === 0) {
      // Periksa apakah ID ini adalah log kendala kesiapan armada harian tanpa prefix
      const [readinessRows] = await connection.query(
        'SELECT * FROM vehicle_readiness_logs WHERE id = ?',
        [recordId]
      );

      if (readinessRows.length > 0) {
        await connection.query(
          `UPDATE vehicle_readiness_logs
           SET status = 'serviceable',
               justification = NULL,
               follow_up_status = 'resolved',
               resolved_at = NOW(),
               notes = NULL,
               updated_at = NOW()
           WHERE id = ?`,
          [recordId]
        );

        await connection.commit();
        return successResponse(res, 'Catatan kendala armada pada log kesiapan berhasil dipulihkan');
      }

      await connection.rollback();
      return errorResponse(res, 'Catatan pemeliharaan tidak ditemukan', 404);
    }

    const record = existingRows[0];
    if (record.document_url) {
      filesToUnlink.push(record.document_url);
    }

    await connection.query('DELETE FROM vehicle_maintenance_records WHERE id = ?', [recordId]);

    // PERHATIAN: Query pemulihan massal historis berbasis shift_date >= start_date
    // DIHAPUS sesuai aturan sistem agar tidak mengubah log historis shift lampau menjadi serviceable.

    await connection.commit();

    // Pola post-commit cleanup untuk berkas fisik
    for (const f of filesToUnlink) {
      safeUnlink(f);
    }

    return successResponse(res, 'Catatan pemeliharaan armada berhasil dihapus');
  } catch (error) {
    await connection.rollback();
    console.error('Error deleteMaintenanceRecord:', error);
    return errorResponse(res, 'Gagal menghapus catatan pemeliharaan: ' + error.message, 500);
  } finally {
    connection.release();
  }
};
