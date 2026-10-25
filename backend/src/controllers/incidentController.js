import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';
import PDFDocument from 'pdfkit';

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
    const { date, shift, team_group, status, priority, category, page, limit } = req.query;

    let query = `
      SELECT i.*,
             i.category as category_name, i.category as category_code,
             u.name as reporter_name,
             (SELECT COUNT(*) FROM incident_attachments WHERE incident_id = i.id) as attachment_count
      FROM incidents i
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
    if (category) {
      query += ` AND i.category = ?`;
      params.push(category);
    }
    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }
    if (priority) {
      const PRIORITY_MAP = {
        rendah: 'low',
        sedang: 'medium',
        tinggi: 'high',
        kritis: 'critical',
      };
      const normalizedPriority = PRIORITY_MAP[String(priority).toLowerCase()] || priority;
      query += ` AND i.priority_level = ?`;
      params.push(normalizedPriority);
    }

    query += ` ORDER BY i.incident_date DESC, i.incident_time DESC, i.id DESC`;

    if (limit) {
      const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
      const limitNum = Math.max(1, parseInt(limit, 10));
      const offset = (pageNum - 1) * limitNum;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);
    }

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
  const allowedRoles = ['admin', 'chief', 'chief_assistant'];
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: Hanya Chief, Asisten Chief, atau Admin yang berhak melaporkan atau memperbarui status penanganan insiden.'
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
      return errorResponse(res, 'Tanggal, waktu kejadian, judul, lokasi, dan kronologi wajib diisi', 400);
    }

    if (activation_time && incident_time) {
      const cleanIncTime = incident_time.slice(0, 5);
      const cleanActTime = activation_time.slice(0, 5);
      if (cleanActTime < cleanIncTime) {
        return errorResponse(res, 'Waktu tiba unit di TKP tidak boleh lebih awal dari waktu alarm kejadian.', 400);
      }
    }

    await connection.beginTransaction();

    const reportNumber = await generateNextReportNumber(connection);
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

    const VALID_CATEGORIES = ['aircraft_accident', 'aircraft_incident', 'fire', 'medical_emergency', 'hazmat', 'other'];
    const finalCategory = VALID_CATEGORIES.includes(category) ? category : 'other';

    const [result] = await connection.query(
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
    const allowedRoles = ['admin', 'chief', 'chief_assistant'];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Hanya Chief, Asisten Chief, atau Admin yang berhak melaporkan atau memperbarui status penanganan insiden.'
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
  const defaultCategories = [
    { id: 1, name: 'Aircraft Accident', code: 'aircraft_accident' },
    { id: 2, name: 'Aircraft Incident', code: 'aircraft_incident' },
    { id: 3, name: 'Fire / Kebakaran', code: 'fire' },
    { id: 4, name: 'Medical Emergency', code: 'medical_emergency' },
    { id: 5, name: 'Hazmat Incident', code: 'hazmat' },
    { id: 6, name: 'Lainnya / Non-Aircraft', code: 'other' }
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
    let endDateStr = end_date || today.toISOString().split('T')[0];

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
      startDateStr = past.toISOString().split('T')[0];
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

    if (category) {
      query += ` AND i.category = ?`;
      params.push(category);
    }
    if (status) {
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
        return l === 'kritis' || l === 'critical' || l === 'tinggi' || l === 'high';
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
 * Endpoint Ekspor Dokumen Resmi PDF Rekapitulasi Insiden (Format A4 Landscape)
 */
export const getIncidentSummaryReportPdf = async (req, res) => {
  try {
    const { period, start_date, end_date, category, status } = req.query;

    const today = new Date();
    let startDateStr = start_date;
    let endDateStr = end_date || today.toISOString().split('T')[0];

    if (!startDateStr) {
      const past = new Date(today);
      if (period === '3months') {
        past.setDate(past.getDate() - 90);
      } else if (period === '1year') {
        past.setDate(past.getDate() - 365);
      } else {
        past.setDate(past.getDate() - 30);
      }
      startDateStr = past.toISOString().split('T')[0];
    }

    let query = `
      SELECT i.*,
             u.name as reporter_name
      FROM incidents i
      LEFT JOIN users u ON u.id = i.reporter_id
      WHERE i.incident_date BETWEEN ? AND ?
    `;
    const params = [startDateStr, endDateStr];

    if (category) {
      query += ` AND i.category = ?`;
      params.push(category);
    }
    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY i.incident_date ASC, i.incident_time ASC`;
    const [incidents] = await pool.query(query, params);

    // Buat PDF A4 Landscape
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 30, bottom: 30, left: 35, right: 35 },
      info: {
        Title: `Rekapitulasi Insiden ARFF YIA (${startDateStr} s.d. ${endDateStr})`,
        Author: 'Airport Rescue & Fire Fighting YIA',
        Subject: 'Rekapitulasi Laporan Kejadian & Insiden Operasional'
      },
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Laporan-Rekap-Insiden-${startDateStr}-${endDateStr}.pdf"`
    );
    doc.pipe(res);

    const startX = 35;
    let currentY = 30;

    // Header Laporan
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text(
      'UNIT AIRPORT RESCUE & FIRE FIGHTING (PKP-PK)',
      startX,
      currentY,
      { align: 'center', width: 772 }
    );
    currentY += 16;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#b91c1c').text(
      'YOGYAKARTA INTERNATIONAL AIRPORT (YIA)',
      startX,
      currentY,
      { align: 'center', width: 772 }
    );
    currentY += 14;

    doc.fontSize(9).font('Helvetica').fillColor('#475569').text(
      `DOKUMEN RESMI REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL • PERIODE: ${startDateStr} s.d. ${endDateStr}`,
      startX,
      currentY,
      { align: 'center', width: 772 }
    );
    currentY += 15;

    // Garis ganda pembatas header
    doc.moveTo(startX, currentY).lineTo(startX + 772, currentY).lineWidth(1.5).strokeColor('#0f172a').stroke();
    currentY += 3;
    doc.moveTo(startX, currentY).lineTo(startX + 772, currentY).lineWidth(0.5).strokeColor('#64748b').stroke();
    currentY += 10;

    // Ringkasan Statistik Singkat
    const totalCount = incidents.length;
    const selesaiCount = incidents.filter(i => (i.status || '').toLowerCase() === 'selesai').length;
    const prosesCount = incidents.filter(i => (i.status || '').toLowerCase() === 'dalam_proses').length;
    const tindakLanjutCount = incidents.filter(i => (i.status || '').toLowerCase() === 'menunggu_tindak_lanjut').length;

    doc.rect(startX, currentY, 772, 22).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(
      `RINGKASAN PERIODE:  Total Kejadian: ${totalCount}  |  Selesai: ${selesaiCount}  |  Dalam Proses: ${prosesCount}  |  Menunggu Tindak Lanjut: ${tindakLanjutCount}`,
      startX + 10,
      currentY + 6
    );
    currentY += 28;

    // Kolom Tabel Rekap
    const columns = [
      { header: 'NO', width: 28, align: 'center' },
      { header: 'NO. LAPORAN', width: 74, align: 'center' },
      { header: 'TANGGAL & JAM', width: 85, align: 'left' },
      { header: 'REGU / SHIFT', width: 75, align: 'center' },
      { header: 'KLASIFIKASI / JUDUL', width: 140, align: 'left' },
      { header: 'LOKASI KEJADIAN', width: 95, align: 'left' },
      { header: 'PESAWAT / ARMADA', width: 95, align: 'left' },
      { header: 'STATUS', width: 75, align: 'center' },
      { header: 'KONDISI AKHIR TKP', width: 105, align: 'left' },
    ];

    // Header Tabel
    doc.rect(startX, currentY, 772, 18).fillAndStroke('#1e293b', '#1e293b');
    let curX = startX;
    columns.forEach(col => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff').text(
        col.header,
        curX + 2,
        currentY + 5,
        { width: col.width - 4, align: col.align }
      );
      curX += col.width;
    });
    currentY += 18;

    if (incidents.length === 0) {
      doc.rect(startX, currentY, 772, 30).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text(
        'Nihil. Tidak terdapat catatan insiden operasional pada periode yang dipilih.',
        startX,
        currentY + 10,
        { width: 772, align: 'center' }
      );
      currentY += 30;
    } else {
      incidents.forEach((inc, idx) => {
        // Cek page break
        if (currentY > 520) {
          doc.addPage();
          currentY = 35;
          // Gambar ulang header tabel di halaman baru
          doc.rect(startX, currentY, 772, 18).fillAndStroke('#1e293b', '#1e293b');
          let subX = startX;
          columns.forEach(col => {
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff').text(
              col.header,
              subX + 2,
              currentY + 5,
              { width: col.width - 4, align: col.align }
            );
            subX += col.width;
          });
          currentY += 18;
        }

        const rowHeight = 24;
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(startX, currentY, 772, rowHeight).fillAndStroke(bgColor, '#e2e8f0');

        const statusLabel = inc.status === 'selesai' ? 'SELESAI' : (inc.status === 'dalam_proses' ? 'PROSES' : 'TINDAK LANJUT');
        const statusColor = inc.status === 'selesai' ? '#15803d' : (inc.status === 'dalam_proses' ? '#b45309' : '#b91c1c');

        const rowData = [
          { text: String(idx + 1), align: 'center', color: '#64748b', font: 'Helvetica' },
          { text: inc.report_number || `INC-${inc.id}`, align: 'center', color: '#b91c1c', font: 'Helvetica-Bold' },
          { text: `${inc.incident_date}\n${(inc.incident_time || '').slice(0, 5)} WIB`, align: 'left', color: '#0f172a', font: 'Helvetica' },
          { text: `${inc.team_group || 'Alpha'}\nShift #${inc.shift_number || 1}`, align: 'center', color: '#0f172a', font: 'Helvetica' },
          { text: inc.title || '-', align: 'left', color: '#0f172a', font: 'Helvetica-Bold' },
          { text: inc.location || '-', align: 'left', color: '#334155', font: 'Helvetica' },
          { text: inc.aircraft_info || 'Non-Pesawat', align: 'left', color: '#475569', font: 'Helvetica' },
          { text: statusLabel, align: 'center', color: statusColor, font: 'Helvetica-Bold' },
          { text: inc.last_condition || inc.action_taken || 'Aman Terkendali', align: 'left', color: '#475569', font: 'Helvetica' },
        ];

        let cellX = startX;
        columns.forEach((col, cIdx) => {
          const c = rowData[cIdx];
          doc.fontSize(7).font(c.font).fillColor(c.color).text(
            c.text,
            cellX + 3,
            currentY + 4,
            { width: col.width - 6, align: c.align, lineBreak: true, height: rowHeight - 6, ellipsis: true }
          );
          cellX += col.width;
        });

        currentY += rowHeight;
      });
    }

    // Watermark dan penomoran halaman
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      // Watermark samar
      doc.save();
      doc.fontSize(38).font('Helvetica-Bold').fillColor('#000000', 0.03);
      doc.rotate(-15, { origin: [421, 297] });
      doc.text('ARFF YIA - OFFICIAL OPS REPORT', 180, 280, { align: 'center' });
      doc.restore();

      // Footer
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
        `Halaman ${i + 1} dari ${pages.count} • Dicetak otomatis oleh Sistem Operasional ARFF YIA pada ${new Date().toLocaleString('id-ID')}`,
        startX,
        565,
        { width: 772, align: 'center' }
      );
    }

    doc.end();
  } catch (error) {
    console.error('Error getIncidentSummaryReportPdf:', error);
    if (!res.headersSent) {
      return errorResponse(res, 'Gagal mencetak dokumen PDF rekap insiden', 500);
    }
  }
};

export const updateIncident = updateIncidentStatus;
export const resolveIncident = updateIncidentStatus;
