import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';
import { calculateDefaultRoster, resolveRosterForDate } from './scheduleController.js';

/**
 * Controller Khusus Pengelolaan Cuti & Izin Operasional ARFF YIA
 * Mematuhi Aturan GEMINI.md No. 15 (Hak prerogatif personel mandiri / self-service)
 * dan No. 19 (Batas maksimal 2 cuti aktif & validasi anti-overlap dengan proteksi transaksi atomik).
 */

export const requestLeaveRange = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { personnel_id, start_date, end_date, absent_reason = 'cuti', notes } = req.body;

    if (!start_date || !end_date) {
      connection.release();
      return errorResponse(res, 'Tanggal mulai dan tanggal selesai cuti wajib diisi', 400);
    }

    // GEMINI.md Butir 15: Pengajuan cuti adalah hak prerogatif mandiri personel operasional.
    // Admin maupun pimpinan dilarang memiliki tombol/fitur untuk mengajukan cuti sepihak atas nama staf.
    if (!req.user.personnel_id) {
      connection.release();
      return errorResponse(
        res,
        'Pengajuan cuti merupakan hak prerogatif mandiri personel operasional. Akun Administrator tanpa keterkaitan data personel tidak berwenang mengajukan cuti.',
        403
      );
    }

    if (personnel_id && Number(personnel_id) !== Number(req.user.personnel_id)) {
      connection.release();
      return errorResponse(
        res,
        'Akses ditolak: Pengajuan cuti adalah hak prerogatif mandiri. Anda tidak berwenang mengajukan cuti atas nama personel lain.',
        403
      );
    }

    const targetPersonnelId = Number(req.user.personnel_id);

    // Sanitasi absent_reason agar sesuai ENUM MySQL ('cuti', 'sakit', 'dinas', 'tukar_dinas')
    const VALID_REASONS = ['cuti', 'sakit', 'dinas', 'tukar_dinas'];
    let sanitizedReason = String(absent_reason || 'cuti').toLowerCase().trim();
    if (!VALID_REASONS.includes(sanitizedReason)) {
      sanitizedReason = 'cuti';
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    if (startDateObj > endDateObj) {
      connection.release();
      return errorResponse(res, 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai', 400);
    }

    // MULAI TRANSAKSI ATOMIK (Mencegah Race Condition Double-Click Cuti - Temuan No. 32)
    await connection.beginTransaction();

    // 0. Kunci baris personel terkait dengan FOR UPDATE untuk memblokir double submission serentak
    const [pRows] = await connection.query('SELECT * FROM personnel WHERE id = ? FOR UPDATE', [targetPersonnelId]);
    if (pRows.length === 0) {
      await connection.rollback();
      connection.release();
      return errorResponse(res, 'Data personel tidak ditemukan', 404);
    }
    const person = pRows[0];
    const teamGroup = person.team_group || 'Alpha';

    // 1. Validasi Anti-Overlap dengan Row Locking FOR UPDATE
    const [overlapRows] = await connection.query(`
      SELECT pd.id, ps.shift_date
      FROM personnel_deployments pd
      JOIN personnel_shifts ps ON pd.shift_id = ps.id
      WHERE pd.personnel_id = ?
        AND pd.deployment_type = 'absent'
        AND ps.shift_date >= ?
        AND ps.shift_date <= ?
      LIMIT 1
      FOR UPDATE
    `, [targetPersonnelId, start_date, end_date]);

    if (overlapRows.length > 0) {
      await connection.rollback();
      connection.release();
      const conflictDate = overlapRows[0].shift_date instanceof Date
        ? overlapRows[0].shift_date.toISOString().split('T')[0]
        : String(overlapRows[0].shift_date).split('T')[0];
      return errorResponse(
        res,
        `Pengajuan ditolak: Personel sudah memiliki jadwal cuti/izin pada tanggal ${conflictDate}. Harap batalkan pengajuan sebelumnya terlebih dahulu jika ingin mengganti tanggal cuti.`,
        400
      );
    }

    // 2. Validasi Kuota Maksimal 2 Cuti yang Sedang / Akan Berjalan (Active / Upcoming)
    // Gunakan zona waktu lokal WIB (UTC+7) agar tidak terjadi pergeseran tanggal saat pergantian hari
    const todayDateStr = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0];
    const [activeRows] = await connection.query(`
      SELECT pd.id, pd.notes, ps.shift_date, pd.absent_reason
      FROM personnel_deployments pd
      JOIN personnel_shifts ps ON pd.shift_id = ps.id
      WHERE pd.personnel_id = ?
        AND pd.deployment_type = 'absent'
        AND ps.shift_date >= ?
      ORDER BY ps.shift_date ASC
      FOR UPDATE
    `, [targetPersonnelId, todayDateStr]);

    const activePackages = [];
    const processedActiveIds = new Set();

    for (const r of activeRows) {
      if (processedActiveIds.has(r.id)) continue;
      const match = (r.notes || '').match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
      const rStartDate = match ? match[1] : (r.shift_date instanceof Date ? r.shift_date.toISOString().split('T')[0] : String(r.shift_date).split('T')[0]);
      const rEndDate = match ? match[2] : (r.shift_date instanceof Date ? r.shift_date.toISOString().split('T')[0] : String(r.shift_date).split('T')[0]);

      const related = activeRows.filter(other =>
        other.absent_reason === r.absent_reason &&
        (match
          ? (other.notes || '').includes(match[0])
          : (other.shift_date instanceof Date ? other.shift_date.toISOString().split('T')[0] : String(other.shift_date).split('T')[0]) === rStartDate
        )
      );
      related.forEach(item => processedActiveIds.add(item.id));

      activePackages.push({
        start_date: rStartDate,
        end_date: rEndDate
      });
    }

    if (activePackages.length >= 2) {
      await connection.rollback();
      connection.release();
      return errorResponse(
        res,
        'Batas kuota tercapai: Anda sudah memiliki 2 pengajuan cuti yang sedang/akan berjalan. Harap tunggu hingga tanggal cuti sebelumnya selesai terlewati atau batalkan salah satu pengajuan cuti yang ada sebelum mengajukan kembali.',
        400
      );
    }

    // Jika ada lampiran berkas dokumen bukti cuti (opsional)
    let uploadedDocUrl = null;
    if (req.file) {
      uploadedDocUrl = `/uploads/${req.file.filename}`;
      const docTitle = `Bukti Cuti (${absent_reason.toUpperCase()} ${start_date} s/d ${end_date})`;
      const fileName = req.file.originalname || req.file.filename;
      const fileSize = req.file.size || 0;
      const mimeType = req.file.mimetype || 'application/octet-stream';

      await connection.query(
        `INSERT INTO personnel_documents (
          personnel_id, title, document_type, file_name, file_url, file_size, mime_type, uploaded_by
        ) VALUES (?, ?, 'dokumen_lain', ?, ?, ?, ?, ?)`,
        [
          targetPersonnelId,
          docTitle,
          fileName,
          uploadedDocUrl,
          fileSize,
          mimeType,
          req.user.id
        ]
      );
    }

    // Baca anchor date & cycle dari tabel system_settings jika tersedia
    let anchorDate = '2026-10-19';
    try {
      const [settings] = await connection.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'schedule_anchor_date'"
      );
      if (settings.length > 0 && settings[0].setting_value) {
        anchorDate = settings[0].setting_value;
      }
    } catch {
      // fallback default
    }

    let storedCycles = [];
    try {
      const [cycleRows] = await connection.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'schedule_custom_cycle'"
      );
      if (cycleRows.length > 0 && cycleRows[0].setting_value) {
        const parsed = JSON.parse(cycleRows[0].setting_value);
        if (Array.isArray(parsed)) storedCycles = parsed;
        else if (parsed && parsed.start_date && parsed.pattern) storedCycles = [parsed];
      }
    } catch {
      // fallback default
    }

    // Ambil override manual dari schedule_rosters untuk rentang ini jika ada
    const overrideMap = new Map();
    try {
      const [overrides] = await connection.query(
        `SELECT DATE_FORMAT(roster_date, '%Y-%m-%d') as roster_date, shift_1_team, shift_2_team, shift_3_team, off_team
         FROM schedule_rosters
         WHERE roster_date >= ? AND roster_date <= ?`,
        [start_date, end_date]
      );
      overrides.forEach((row) => overrideMap.set(String(row.roster_date).split('T')[0], row));
    } catch {
      // fallback default
    }

    let cur = new Date(startDateObj);
    let daysCount = 0;

    while (cur <= endDateObj) {
      const curDateStr = cur.toISOString().split('T')[0];
      let shiftNum = 1;

      if (overrideMap.has(curDateStr)) {
        const o = overrideMap.get(curDateStr);
        if (o.shift_1_team === teamGroup) shiftNum = 1;
        else if (o.shift_2_team === teamGroup) shiftNum = 2;
        else if (o.shift_3_team === teamGroup) shiftNum = 3;
        else shiftNum = 1;
      } else {
        const roster = resolveRosterForDate(curDateStr, storedCycles, anchorDate);
        if (roster.shift_1 === teamGroup) shiftNum = 1;
        else if (roster.shift_2 === teamGroup) shiftNum = 2;
        else if (roster.shift_3 === teamGroup) shiftNum = 3;
        else shiftNum = 1; // regu libur, tetap dicatat di shift 1 agar terekam
      }

      // Pastikan personnel_shifts ada
      const [exShifts] = await connection.query(
        'SELECT id FROM personnel_shifts WHERE shift_date = ? AND shift_number = ? AND team_group = ?',
        [curDateStr, shiftNum, teamGroup]
      );

      let shiftId;
      if (exShifts.length > 0) {
        shiftId = exShifts[0].id;
      } else {
        const [ins] = await connection.query(
          `INSERT INTO personnel_shifts (shift_date, shift_number, team_group, status)
           VALUES (?, ?, ?, 'open')`,
          [curDateStr, shiftNum, teamGroup]
        );
        shiftId = ins.insertId;
      }

      // Cek apakah personel sedang terploting di unit atau sebagai PIC pada shift ini
      const [oldDeployments] = await connection.query(
        'SELECT vehicle_id, is_pic FROM personnel_deployments WHERE shift_id = ? AND personnel_id = ?',
        [shiftId, targetPersonnelId]
      );
      for (const od of oldDeployments) {
        if (od.is_pic && od.vehicle_id) {
          await connection.query(
            `UPDATE vehicle_readiness_logs SET pic_personnel_id = NULL
             WHERE vehicle_id = ? AND shift_date = ? AND shift_number = ? AND pic_personnel_id = ?`,
            [od.vehicle_id, curDateStr, shiftNum, targetPersonnelId]
          );
        }
      }

      // Hapus ploting lama personel pada shift ini (jika sebelumnya sudah terploting di unit)
      await connection.query(
        'DELETE FROM personnel_deployments WHERE shift_id = ? AND personnel_id = ?',
        [shiftId, targetPersonnelId]
      );

      // Masukkan entri absent
      const noteText = notes
        ? `${notes} (Rentang: ${start_date} s/d ${end_date})`
        : `Pengajuan Cuti (${start_date} s/d ${end_date})`;

      await connection.query(
        `INSERT INTO personnel_deployments (
          shift_id, personnel_id, deployment_type, is_pic, absent_reason, assigned_by, notes
        ) VALUES (?, ?, 'absent', 0, ?, ?, ?)`,
        [shiftId, targetPersonnelId, sanitizedReason, req.user.id, noteText]
      );

      daysCount++;
      cur.setDate(cur.getDate() + 1);
    }

    await connection.commit();

    return successResponse(res, `Pengajuan cuti untuk ${person.full_name} berhasil dicatat sebanyak ${daysCount} hari.`, {
      personnel_id: targetPersonnelId,
      full_name: person.full_name,
      start_date,
      end_date,
      days_count: daysCount,
      document_url: uploadedDocUrl
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error requestLeaveRange:', error);
    return errorResponse(res, 'Gagal memproses pengajuan cuti. Silakan coba kembali atau hubungi administrator.', 500);
  } finally {
    connection.release();
  }
};

export const cancelLeave = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const deploymentId = req.params.id || req.body.deployment_id;
    const { deployment_ids, personnel_id, shift_id, shift_date, shift_number, start_date, end_date } = req.body;

    const isPrivileged = ['admin', 'supervisor', 'chief', 'chief_assistant', 'dept_head'].includes(req.user.role);
    const targetPersonnelId = (isPrivileged && personnel_id) ? Number(personnel_id) : (req.user.personnel_id ? Number(req.user.personnel_id) : null);

    let deletedCount = 0;

    // MULAI TRANSAKSI ATOMIK (Temuan No. 35)
    await connection.beginTransaction();

    // Helper internal untuk menghapus seluruh rentang paket secara atomik
    const deletePackageRange = async (pId, sDate, eDate) => {
      const [resDel] = await connection.query(`
        DELETE pd FROM personnel_deployments pd
        JOIN personnel_shifts ps ON pd.shift_id = ps.id
        WHERE pd.personnel_id = ?
          AND pd.deployment_type = 'absent'
          AND ps.shift_date >= ?
          AND ps.shift_date <= ?
      `, [pId, sDate, eDate]);
      return resDel.affectedRows;
    };

    // Skenario A: Diberikan array deployment_ids eksplisit (misal dari paket cuti di UI)
    if (Array.isArray(deployment_ids) && deployment_ids.length > 0) {
      const [depRows] = await connection.query(`
        SELECT pd.id, pd.personnel_id, pd.notes, pd.absent_reason, ps.shift_date
        FROM personnel_deployments pd
        JOIN personnel_shifts ps ON pd.shift_id = ps.id
        WHERE pd.id IN (?) AND pd.deployment_type = 'absent'
      `, [deployment_ids]);

      if (depRows.length === 0) {
        await connection.rollback();
        connection.release();
        return errorResponse(res, 'Data izin/cuti tidak ditemukan', 404);
      }

      if (!isPrivileged) {
        const unauthorized = depRows.some((r) => r.personnel_id !== req.user.personnel_id);
        if (unauthorized) {
          await connection.rollback();
          connection.release();
          return errorResponse(res, 'Anda tidak berwenang membatalkan cuti personel lain', 403);
        }
      }

      const pIds = [...new Set(depRows.map((r) => r.personnel_id))];
      await connection.query('SELECT id FROM personnel WHERE id IN (?) FOR UPDATE', [pIds]);

      // Evaluasi apakah ada paket rentang tanggal pada notes atau body (pembatalan paket utuh)
      const processedRanges = new Set();
      for (const row of depRows) {
        const match = (row.notes || '').match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
        const sDate = (start_date && end_date) ? start_date : (match ? match[1] : null);
        const eDate = (start_date && end_date) ? end_date : (match ? match[2] : null);

        if (sDate && eDate) {
          const rangeKey = `${row.personnel_id}_${sDate}_${eDate}`;
          if (!processedRanges.has(rangeKey)) {
            processedRanges.add(rangeKey);
            const count = await deletePackageRange(row.personnel_id, sDate, eDate);
            deletedCount += count;
          }
        }
      }

      // Jika tidak ditemukan rentang paket pada notes, hapus berdasarkan ID langsung
      if (processedRanges.size === 0) {
        let delQuery = 'DELETE FROM personnel_deployments WHERE id IN (?) AND deployment_type = "absent"';
        let delParams = [deployment_ids];
        if (!isPrivileged) {
          delQuery += ' AND personnel_id = ?';
          delParams.push(req.user.personnel_id);
        }
        const [resDel] = await connection.query(delQuery, delParams);
        deletedCount = resDel.affectedRows;
      }
    }
    // Skenario B: Diberikan single deploymentId (bisa berupa perwakilan paket rentang tanggal)
    else if (deploymentId) {
      const [targetRows] = await connection.query(`
        SELECT pd.id, pd.personnel_id, pd.notes, pd.absent_reason, ps.shift_date
        FROM personnel_deployments pd
        JOIN personnel_shifts ps ON pd.shift_id = ps.id
        WHERE pd.id = ? AND pd.deployment_type = 'absent'
      `, [deploymentId]);

      if (targetRows.length === 0) {
        await connection.rollback();
        connection.release();
        return errorResponse(res, 'Data izin/cuti tidak ditemukan', 404);
      }

      const target = targetRows[0];
      if (!isPrivileged && target.personnel_id !== req.user.personnel_id) {
        await connection.rollback();
        connection.release();
        return errorResponse(res, 'Anda tidak berwenang membatalkan cuti personel lain', 403);
      }

      // Kunci baris personel terlebih dahulu (konsisten dengan requestLeaveRange untuk mencegah deadlock)
      await connection.query('SELECT id FROM personnel WHERE id = ? FOR UPDATE', [target.personnel_id]);

      // Periksa apakah entri cuti ini merupakan bagian dari paket rentang tanggal
      const match = (target.notes || '').match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
      const sDate = (start_date && end_date) ? start_date : (match ? match[1] : null);
      const eDate = (start_date && end_date) ? end_date : (match ? match[2] : null);

      if (sDate && eDate) {
        deletedCount = await deletePackageRange(target.personnel_id, sDate, eDate);
      } else {
        const [resDel] = await connection.query(
          'DELETE FROM personnel_deployments WHERE id = ? AND deployment_type = "absent"',
          [deploymentId]
        );
        deletedCount = resDel.affectedRows;
      }
    }
    // Skenario C: Diberikan shift_id & targetPersonnelId
    else if (targetPersonnelId && shift_id) {
      await connection.query('SELECT id FROM personnel WHERE id = ? FOR UPDATE', [targetPersonnelId]);
      const [targetRows] = await connection.query(`
        SELECT pd.id, pd.notes, ps.shift_date
        FROM personnel_deployments pd
        JOIN personnel_shifts ps ON pd.shift_id = ps.id
        WHERE pd.shift_id = ? AND pd.personnel_id = ? AND pd.deployment_type = 'absent'
      `, [shift_id, targetPersonnelId]);

      if (targetRows.length > 0) {
        const match = (targetRows[0].notes || '').match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
        const sDate = (start_date && end_date) ? start_date : (match ? match[1] : null);
        const eDate = (start_date && end_date) ? end_date : (match ? match[2] : null);

        if (sDate && eDate) {
          deletedCount = await deletePackageRange(targetPersonnelId, sDate, eDate);
        } else {
          const [resDel] = await connection.query(
            'DELETE FROM personnel_deployments WHERE shift_id = ? AND personnel_id = ? AND deployment_type = "absent"',
            [shift_id, targetPersonnelId]
          );
          deletedCount = resDel.affectedRows;
        }
      }
    }
    // Skenario D: Diberikan shift_date & targetPersonnelId
    else if (targetPersonnelId && shift_date) {
      await connection.query('SELECT id FROM personnel WHERE id = ? FOR UPDATE', [targetPersonnelId]);
      const [targetRows] = await connection.query(`
        SELECT pd.id, pd.notes, ps.shift_date
        FROM personnel_deployments pd
        JOIN personnel_shifts ps ON pd.shift_id = ps.id
        WHERE ps.shift_date = ? AND pd.personnel_id = ? AND pd.deployment_type = 'absent'
      `, [shift_date, targetPersonnelId]);

      if (targetRows.length > 0) {
        const match = (targetRows[0].notes || '').match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
        const sDate = (start_date && end_date) ? start_date : (match ? match[1] : null);
        const eDate = (start_date && end_date) ? end_date : (match ? match[2] : null);

        if (sDate && eDate) {
          deletedCount = await deletePackageRange(targetPersonnelId, sDate, eDate);
        } else {
          const [resDel] = await connection.query(
            'DELETE FROM personnel_deployments WHERE id = ? AND deployment_type = "absent"',
            [targetRows[0].id]
          );
          deletedCount = resDel.affectedRows;
        }
      }
    } else {
      await connection.rollback();
      connection.release();
      return errorResponse(res, 'Data identitas cuti yang akan dibatalkan tidak lengkap', 400);
    }

    await connection.commit();
    connection.release();

    if (deletedCount === 0) {
      return errorResponse(res, 'Data izin/cuti tidak ditemukan atau Anda tidak memiliki akses untuk membatalkannya', 404);
    }

    return successResponse(res, 'Pengajuan cuti berhasil dibatalkan. Personel dikembalikan ke status aktif berdinas.', {
      affectedRows: deletedCount
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error cancelLeave:', error);
    return errorResponse(res, 'Gagal membatalkan cuti. Silakan coba kembali atau hubungi administrator.', 500);
  }
};

export const getLeaveHistory = async (req, res) => {
  try {
    const { month, year, team, personnel_id, date, status } = req.query;
    let query = `
      SELECT 
        pd.id,
        pd.shift_id,
        pd.personnel_id,
        pd.absent_reason,
        pd.notes,
        pd.created_at,
        ps.shift_date,
        ps.shift_number,
        ps.team_group AS shift_team,
        p.full_name AS personnel_name,
        p.nip AS personnel_nip,
        p.team_group AS personnel_team,
        p.rank_position AS personnel_role
      FROM personnel_deployments pd
      JOIN personnel_shifts ps ON pd.shift_id = ps.id
      JOIN personnel p ON pd.personnel_id = p.id
      WHERE pd.deployment_type = 'absent'
    `;
    const params = [];

    if (date) {
      query += ' AND ps.shift_date = ?';
      params.push(date);
    } else {
      if (year) {
        query += ' AND YEAR(ps.shift_date) = ?';
        params.push(Number(year));
      }
      if (month) {
        query += ' AND MONTH(ps.shift_date) = ?';
        params.push(Number(month));
      }
    }

    if (team && team !== 'all' && team !== 'Semua' && team !== 'ALL') {
      query += ' AND (p.team_group = ? OR ps.team_group = ?)';
      params.push(team, team);
    }

    if (personnel_id) {
      query += ' AND pd.personnel_id = ?';
      params.push(Number(personnel_id));
    }

    if (status === 'berjalan' || status === 'ongoing') {
      const todayFilterStr = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0];
      query += ' AND ps.shift_date >= ?';
      params.push(todayFilterStr);
    }

    query += ' ORDER BY ps.shift_date DESC, pd.id DESC';

    const [rows] = await pool.query(query, params);

    // Agregasi entri cuti harian menjadi Paket Pengajuan Cuti (Grouped Packages)
    // Mencegah tampilan dobel-dobel di riwayat jika cuti diajukan untuk beberapa hari sekaligus (WIB UTC+7)
    const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0];
    const groupedPackages = [];
    const processedIds = new Set();

    for (const r of rows) {
      if (processedIds.has(r.id)) continue;

      const dateStr = r.shift_date instanceof Date
        ? r.shift_date.toISOString().split('T')[0]
        : String(r.shift_date).split('T')[0];

      const match = (r.notes || '').match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
      let startDate = dateStr;
      let endDate = dateStr;

      if (match) {
        startDate = match[1];
        endDate = match[2];
      }

      // Cari baris-baris terkait dari personel yang sama dalam paket rentang tanggal yang sama
      const relatedRows = rows.filter(other => {
        const otherDateStr = other.shift_date instanceof Date
          ? other.shift_date.toISOString().split('T')[0]
          : String(other.shift_date).split('T')[0];

        return (
          other.personnel_id === r.personnel_id &&
          other.absent_reason === r.absent_reason &&
          (match
            ? (other.notes || '').includes(match[0]) || (otherDateStr >= startDate && otherDateStr <= endDate)
            : otherDateStr === dateStr
          )
        );
      });

      relatedRows.forEach(item => processedIds.add(item.id));

      const isOngoing = endDate >= todayStr;
      const cleanNoteText = (r.notes || '')
        .replace(/\((?:Rentang:\s*)?[0-9]{4}-[0-9]{2}-[0-9]{2}\s*s\/?d\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\)/gi, '')
        .trim();

      let totalDays = relatedRows.length;
      if (match && startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
        if (diff > 0) totalDays = diff;
      }

      groupedPackages.push({
        id: r.id,
        deployment_ids: relatedRows.map(item => item.id),
        personnel_id: r.personnel_id,
        personnel_name: r.personnel_name,
        personnel_nip: r.personnel_nip,
        personnel_team: r.personnel_team,
        personnel_role: r.personnel_role,
        absent_reason: r.absent_reason,
        start_date: startDate,
        end_date: endDate,
        days_count: totalDays,
        is_ongoing: isOngoing,
        status: isOngoing ? 'berjalan' : 'selesai',
        notes: cleanNoteText || '-',
        raw_notes: r.notes,
        shift_date: startDate,
        shift_number: r.shift_number || 1,
        shift_team: r.shift_team,
        created_at: r.created_at
      });
    }

    let finalPackages = groupedPackages;
    if (status === 'berjalan' || status === 'ongoing') {
      finalPackages = groupedPackages.filter(item => item.is_ongoing);
    } else if (status === 'selesai' || status === 'completed') {
      finalPackages = groupedPackages.filter(item => !item.is_ongoing);
    }

    return successResponse(res, 'Riwayat cuti berhasil diambil', finalPackages);
  } catch (error) {
    console.error('Error getLeaveHistory:', error);
    return errorResponse(res, 'Gagal mengambil riwayat cuti: ' + error.message, 500);
  }
};
