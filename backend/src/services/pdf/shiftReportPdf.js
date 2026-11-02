import PDFDocument from 'pdfkit';
import {
  resolveSignatureBuffer,
  applyWatermarkAndPageNumbers,
  drawOfficialHeader,
  checkPageBreak,
} from './pdfHelpers.js';

/**
 * Format tanggal Indonesia ramah cetak dokumen kedinasan
 */
const formatIndoDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const [y, m, d] = String(dateStr).split('T')[0].split('-').map(Number);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dayName = days[dt.getUTCDay()];
    return `${dayName}, ${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
  } catch {
    return dateStr;
  }
};

/**
 * Membuat stream PDF Dokumen Resmi Laporan Harian Operasional ARFF (Daily Report 24 Jam - Format A4)
 * Merangkum pelaksanaan 3 shift dinas, kesiapan armada, watchroom, logbook giat, insiden, dan lembar pengesahan 4 pejabat.
 * @param {Object} reportData Data komprehensif harian 24 jam hasil agregasi backend
 * @returns {Promise<PDFDocument>} Stream dokumen PDFKit
 */
export const generateShiftReportPdf = async (reportData) => {
  const {
    shift_date = new Date().toISOString().split('T')[0],
    roster = {},
    status = 'open',
    is_closed = false,
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = null,
    dept_head_signature_url = null,
    shifts = [],
    chiefs = {},
    vehicle_matrix = [],
    vehicles = [],
    all_activities = [],
    activities = [],
    incidents = []
  } = reportData;

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: `Laporan Resmi Pelaksanaan Dinas Harian Operasional ARFF YIA - ${shift_date}`,
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Daily Operational Report 24 Jam (Shift 1, 2, 3)'
    },
    bufferPages: true,
  });

  const startX = 40;
  const contentWidth = 515;

  const isDailyReportClosed = is_closed || String(status).toLowerCase() === 'closed';

  // 1. Header Dokumen Resmi Terpusat (Kop PT Angkasa Pura Indonesia & Garis Ganda)
  drawOfficialHeader(
    doc,
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    'LAPORAN RESMI PELAKSANAAN DINAS HARIAN OPERASIONAL (DAILY REPORT 24 JAM)',
    contentWidth,
    startX
  );

  // 2. Box Informasi Harian 24 Jam
  doc.rect(startX, doc.y, contentWidth, 50).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Tanggal Dinas: ', startX + 10, infoY);
  doc.font('Helvetica').text(`${formatIndoDate(shift_date)} (${shift_date})`, startX + 80, infoY);

  doc.font('Helvetica-Bold').text('Status Dokumen: ', startX + 325, infoY);
  if (isDailyReportClosed) {
    doc.font('Helvetica-Bold').fillColor('#15803d').text('REKAPITULASI RESMI (FINAL)', startX + 400, infoY);
  } else {
    doc.font('Helvetica-Bold').fillColor('#dc2626').text('DRAFT • BELUM DISAHKAN', startX + 400, infoY);
  }

  const rS1 = roster.shift_1 || shifts[0]?.team_group || 'Alpha';
  const rS2 = roster.shift_2 || shifts[1]?.team_group || 'Bravo';
  const rS3 = roster.shift_3 || shifts[2]?.team_group || 'Charlie';
  const rOff = roster.off_team || 'Delta';

  const infoY2 = infoY + 16;
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Susunan Shift 24 Jam: ', startX + 10, infoY2);
  doc.font('Helvetica').fillColor('#334155').text(
    `Shift 1 (Pagi): Regu ${rS1}   |   Shift 2 (Siang): Regu ${rS2}   |   Shift 3 (Malam): Regu ${rS3}`,
    startX + 110,
    infoY2
  );

  const infoY3 = infoY2 + 13;
  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Regu Libur / Off Duty: ', startX + 10, infoY3);
  doc.font('Helvetica-Bold').fillColor('#64748b').text(`Regu ${rOff} (Lepas Piket Rutin)`, startX + 110, infoY3);

  doc.y = infoY + 50 + 8;

  let secNum = 1;

  // =========================================================================
  // SEKSI I: DISTRIBUSI & FORMASI PERSONEL 3 SHIFT OPERASIONAL
  // =========================================================================
  checkPageBreak(doc, 60);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. DISTRIBUSI & FORMASI PERSONEL 3 SHIFT OPERASIONAL`
  );
  doc.moveDown(0.4);

  const shiftList = shifts.length === 3 ? shifts : [
    { shift_number: 1, shift_name: 'Pagi', shift_hours: '07:00 - 13:00 WIB', team_group: rS1, present_count: 0, absent_count: 0, absents: [], supervisor_name: `Ketua Regu ${rS1}` },
    { shift_number: 2, shift_name: 'Siang', shift_hours: '13:00 - 20:00 WIB', team_group: rS2, present_count: 0, absent_count: 0, absents: [], supervisor_name: `Ketua Regu ${rS2}` },
    { shift_number: 3, shift_name: 'Malam', shift_hours: '20:00 - 07:00 WIB', team_group: rS3, present_count: 0, absent_count: 0, absents: [], supervisor_name: `Ketua Regu ${rS3}` },
  ];

  shiftList.forEach((s) => {
    checkPageBreak(doc, 44);
    const boxY = doc.y;
    const sTeam = s.team_group || 'Alpha';
    const sChief = s.supervisor?.name || s.supervisor_name || `Ketua Regu ${sTeam}`;
    const sNip = s.supervisor?.nip || s.supervisor_nip ? ` (NIP. ${s.supervisor?.nip || s.supervisor_nip})` : '';
    const presentCnt = s.present_count || (s.deployments ? s.deployments.filter(d => d.deployment_type !== 'absent').length : 0);
    const sAbsents = s.absents || [];

    // Hitung tinggi dinamis box jika ada daftar cuti
    let absentLinesH = 0;
    let absentStr = '';
    if (sAbsents.length > 0) {
      absentStr = sAbsents.map(a => `${a.full_name || a.name || 'Personel'} (${(a.absent_reason || 'Izin/Cuti').toUpperCase()}${a.notes ? ` - ${a.notes}` : ''})`).join(', ');
      doc.fontSize(7.5).font('Helvetica-Oblique');
      absentLinesH = doc.heightOfString(`Daftar Berhalangan: ${absentStr}`, { width: contentWidth - 20 });
    }

    const itemBoxH = Math.max(34, 24 + absentLinesH + 8);
    checkPageBreak(doc, itemBoxH + 4);

    doc.rect(startX, doc.y, contentWidth, itemBoxH).fillAndStroke('#f8fafc', '#e2e8f0');
    const innerY = doc.y + 5;

    // Baris 1: Shift & Supervisor
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text(`Shift ${s.shift_number} (${s.shift_name}, ${s.shift_hours}) • Regu ${sTeam}`, startX + 8, innerY);
    doc.font('Helvetica').fillColor('#475569').text(`Supervisor: `, startX + 270, innerY);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(`${sChief}${sNip}`, startX + 325, innerY, { width: 180, ellipsis: true });

    // Baris 2: Kehadiran
    const innerY2 = innerY + 12;
    doc.fontSize(7.5).font('Helvetica').fillColor('#334155');
    doc.text(`Kekuatan Personel Bertugas: `, startX + 8, innerY2);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(`${presentCnt} Orang Hadir`, startX + 115, innerY2);
    doc.font('Helvetica').fillColor('#64748b').text(`  |  Tidak Hadir / Cuti / Sakit: `, startX + 180, innerY2);
    doc.font('Helvetica-Bold').fillColor(sAbsents.length > 0 ? '#b91c1c' : '#15803d').text(
      `${sAbsents.length} Orang`,
      startX + 300,
      innerY2
    );

    // Baris 3: Keterangan Cuti jika ada
    if (sAbsents.length > 0) {
      const innerY3 = innerY2 + 11;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#b91c1c').text('Daftar Izin/Cuti: ', startX + 8, innerY3);
      doc.font('Helvetica-Oblique').fillColor('#b91c1c').text(absentStr, startX + 80, innerY3, { width: contentWidth - 90 });
    }

    doc.y = boxY + itemBoxH + 4;
  });

  // Catatan Regu Libur
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569');
  doc.text(`• Catatan Roster: Regu ${rOff} bertindak sebagai Regu Off Duty (Lepas Piket / Libur Rutin 24 Jam).`, startX + 4, doc.y + 2);
  doc.moveDown(0.7);

  // =========================================================================
  // SEKSI II: MATRIKS KESIAPAN ARMADA & POSKO OPERASIONAL 24 JAM
  // =========================================================================
  checkPageBreak(doc, 50);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. MATRIKS KESIAPAN ARMADA & POSKO OPERASIONAL 24 JAM`
  );
  doc.moveDown(0.3);

  // Table Armada Matrix (Lebar Total = 515)
  // Col: No(22), Unit(145), Kategori(60), S1(65), S2(65), S3(65), Catatan(93)
  const drawMatrixHeader = (headY) => {
    doc.rect(startX, headY, contentWidth, 18).fill('#1e293b');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('No', startX + 2, headY + 5, { width: 20, align: 'center' });
    doc.text('Nama Unit / Fasilitas', startX + 24, headY + 5, { width: 142 });
    doc.text('Kategori', startX + 168, headY + 5, { width: 58 });
    doc.text(`S1 (${rS1})`, startX + 228, headY + 5, { width: 63, align: 'center' });
    doc.text(`S2 (${rS2})`, startX + 293, headY + 5, { width: 63, align: 'center' });
    doc.text(`S3 (${rS3})`, startX + 358, headY + 5, { width: 63, align: 'center' });
    doc.text('Catatan / Justifikasi', startX + 423, headY + 5, { width: 90 });
  };

  let curY = doc.y;
  drawMatrixHeader(curY);
  curY += 18;

  const matrixUnits = vehicle_matrix.length > 0 ? vehicle_matrix : vehicles;

  if (matrixUnits.length === 0) {
    doc.rect(startX, curY, contentWidth, 18).fillAndStroke('#ffffff', '#e2e8f0');
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
      'Belum ada armada/posko yang tercatat dalam sistem.',
      startX + 10,
      curY + 5
    );
    curY += 18;
  } else {
    matrixUnits.forEach((v, idx) => {
      if (curY + 18 > 740) {
        doc.addPage();
        drawMatrixHeader(35);
        curY = 35 + 18;
      }

      const rawCat = (v.category || '').toLowerCase();
      const catLabel = rawCat === 'posko' || v.code_name === 'WATCHROOM'
        ? 'Posko'
        : rawCat === 'utama'
        ? 'Utama'
        : rawCat === 'pendukung'
        ? 'Pendukung'
        : (v.category || 'Armada');

      const s1 = v.shift_1 || {};
      const s2 = v.shift_2 || {};
      const s3 = v.shift_3 || {};

      const renderStatusLabel = (sObj) => {
        const stat = (sObj?.status || 'belum_dilaporkan').toLowerCase();
        if (stat === 'serviceable') return { text: 'SIAP', color: '#15803d' };
        if (stat === 'unserviceable') return { text: 'RUSAK', color: '#b91c1c' };
        return { text: 'BELUM CEK', color: '#64748b' };
      };

      const s1Res = renderStatusLabel(s1);
      const s2Res = renderStatusLabel(s2);
      const s3Res = renderStatusLabel(s3);

      const noteText = v.daily_notes && v.daily_notes !== '-'
        ? v.daily_notes
        : (s1.justification && s1.justification !== '-' ? s1.justification
        : (s2.justification && s2.justification !== '-' ? s2.justification
        : (s3.justification && s3.justification !== '-' ? s3.justification : '-')));

      doc.rect(startX, curY, contentWidth, 18).fillAndStroke(idx % 2 === 1 ? '#f8fafc' : '#ffffff', '#e2e8f0');

      doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(String(idx + 1), startX + 2, curY + 5, { width: 20, align: 'center' });
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(v.vehicle_name || v.code_name || 'Unit', startX + 24, curY + 5, { width: 142, ellipsis: true });
      doc.font('Helvetica').fillColor('#475569').text(catLabel, startX + 168, curY + 5, { width: 58 });

      // Shift 1
      doc.font('Helvetica-Bold').fillColor(s1Res.color).text(s1Res.text, startX + 228, curY + 5, { width: 63, align: 'center' });
      // Shift 2
      doc.font('Helvetica-Bold').fillColor(s2Res.color).text(s2Res.text, startX + 293, curY + 5, { width: 63, align: 'center' });
      // Shift 3
      doc.font('Helvetica-Bold').fillColor(s3Res.color).text(s3Res.text, startX + 358, curY + 5, { width: 63, align: 'center' });

      // Catatan
      doc.font('Helvetica').fillColor('#475569').text(noteText, startX + 423, curY + 5, { width: 90, ellipsis: true });

      curY += 18;
    });
  }

  doc.y = curY + 10;

  // =========================================================================
  // SEKSI III: JURNAL KEGIATAN RUTIN OPERASIONAL 24 JAM
  // =========================================================================
  checkPageBreak(doc, 45);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. JURNAL KEGIATAN RUTIN OPERASIONAL 24 JAM`
  );
  doc.moveDown(0.3);

  const activityList = (all_activities && all_activities.length > 0) ? all_activities : activities;

  if (activityList.length === 0) {
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Belum ada agenda kegiatan khusus tercatat pada tanggal dinas ini.');
    doc.moveDown(0.6);
  } else {
    activityList.forEach((act, idx) => {
      const shiftTag = act.shift_number ? `[Shift ${act.shift_number} - Regu ${act.team_group || '-'}] ` : '';
      const prefix = `${idx + 1}. [${act.activity_time || '-'}] ${shiftTag}${act.title}: `;
      const fullText = `${prefix}${act.description || '-'}`;

      doc.fontSize(7.5).font('Helvetica');
      const actHeight = doc.heightOfString(fullText, { width: contentWidth }) + 4;
      checkPageBreak(doc, actHeight);

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(
        prefix,
        { continued: true }
      ).font('Helvetica').fillColor('#475569').text(act.description || '-');
      doc.moveDown(0.25);
    });
    doc.moveDown(0.5);
  }

  // =========================================================================
  // SEKSI IV: LAPORAN KEJADIAN & INSIDEN OPERASIONAL 24 JAM
  // =========================================================================
  checkPageBreak(doc, 40);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL 24 JAM`
  );
  doc.moveDown(0.3);

  if (incidents.length === 0) {
    checkPageBreak(doc, 25);
    doc.rect(startX, doc.y, contentWidth, 18).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#15803d').text(
      'NIHIL — Seluruh operasional penerbangan dan fasilitas bandara selama 24 jam berlangsung aman dan terkendali.',
      startX + 10,
      doc.y + 5
    );
    doc.y += 24;
  } else {
    incidents.forEach((inc, idx) => {
      const shiftTag = inc.shift_number ? ` | Shift ${inc.shift_number} - Regu ${inc.team_group || '-'}` : '';
      const titleText = `${idx + 1}. [${inc.report_number || 'INSIDEN'}] ${inc.title} (Waktu: ${inc.incident_time || '-'}${shiftTag})`;
      const detailText = `Lokasi: ${inc.location || '-'} | Tindakan: ${inc.action_taken || '-'}${inc.reporter_name ? ` | Pelapor: ${inc.reporter_name}` : ''}`;

      doc.fontSize(8).font('Helvetica-Bold');
      const titleH = doc.heightOfString(titleText, { width: contentWidth - 20 });

      doc.fontSize(7.5).font('Helvetica');
      const detailH = doc.heightOfString(detailText, { width: contentWidth - 20 });

      const totalBoxH = Math.max(26, titleH + detailH + 10);
      checkPageBreak(doc, totalBoxH + 4);

      const incBoxY = doc.y;
      doc.rect(startX, incBoxY, contentWidth, totalBoxH).fillAndStroke('#fef2f2', '#fecaca');

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#991b1b').text(
        titleText,
        startX + 10,
        incBoxY + 5,
        { width: contentWidth - 20 }
      );
      doc.fontSize(7.5).font('Helvetica').fillColor('#7f1d1d').text(
        detailText,
        startX + 10,
        incBoxY + 5 + titleH + 2,
        { width: contentWidth - 20 }
      );
      doc.y = incBoxY + totalBoxH + 4;
    });
  }

  // =========================================================================
  // SEKSI V: LEMBAR PENGESAHAN 4 PEJABAT OPERASIONAL (OPSI A: 4 KOLOM BERJAJAR)
  // =========================================================================
  checkPageBreak(doc, 120);
  doc.moveDown(0.6);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. LEMBAR PENGESAHAN PEJABAT OPERASIONAL`
  );
  doc.moveDown(0.4);

  const signY = doc.y;
  const colW = 125;
  const colGap = 5;

  const chief1 = chiefs.shift_1 || shifts[0]?.supervisor || { name: `Ketua Regu ${rS1}`, nip: null, signature_url: null };
  const chief2 = chiefs.shift_2 || shifts[1]?.supervisor || { name: `Ketua Regu ${rS2}`, nip: null, signature_url: null };
  const chief3 = chiefs.shift_3 || shifts[2]?.supervisor || { name: `Ketua Regu ${rS3}`, nip: null, signature_url: null };

  // Resolve signatures buffer secara paralel
  const [sig1Buf, sig2Buf, sig3Buf, deptHeadSigBuf] = await Promise.all([
    resolveSignatureBuffer(chief1?.signature_url),
    resolveSignatureBuffer(chief2?.signature_url),
    resolveSignatureBuffer(chief3?.signature_url),
    isDailyReportClosed ? resolveSignatureBuffer(dept_head_signature_url) : Promise.resolve(null),
  ]);

  const signatoryColumns = [
    {
      title: 'Pejabat Penanggung Jawab,',
      role: 'CHIEF SHIFT 1 (PAGI)',
      sub: `Regu ${rS1}`,
      name: chief1?.name || `Ketua Regu ${rS1}`,
      nip: chief1?.nip,
      sigBuf: sig1Buf,
      isDraft: false,
    },
    {
      title: 'Pejabat Penanggung Jawab,',
      role: 'CHIEF SHIFT 2 (SIANG)',
      sub: `Regu ${rS2}`,
      name: chief2?.name || `Ketua Regu ${rS2}`,
      nip: chief2?.nip,
      sigBuf: sig2Buf,
      isDraft: false,
    },
    {
      title: 'Pejabat Penanggung Jawab,',
      role: 'CHIEF SHIFT 3 (MALAM)',
      sub: `Regu ${rS3}`,
      name: chief3?.name || `Ketua Regu ${rS3}`,
      nip: chief3?.nip,
      sigBuf: sig3Buf,
      isDraft: false,
    },
    {
      title: 'Mengetahui / Mengesahkan,',
      role: 'SECTION HEAD ARFF',
      sub: 'KC Bandara YIA',
      name: dept_head_name || 'Section Head ARFF',
      nip: dept_head_nip,
      sigBuf: deptHeadSigBuf,
      isDraft: !isDailyReportClosed,
    },
  ];

  signatoryColumns.forEach((col, idx) => {
    const colX = startX + idx * (colW + colGap);

    doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a').text(col.title, colX, signY, { width: colW, align: 'center' });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(col.role, colX, signY + 11, { width: colW, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(col.sub, colX, signY + 22, { width: colW, align: 'center' });

    if (col.isDraft) {
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#94a3b8').text(
        '( Menunggu Pengesahan Dinas )',
        colX,
        signY + 45,
        { width: colW, align: 'center' }
      );
    } else if (col.sigBuf) {
      try {
        doc.image(col.sigBuf, colX + (colW - 80) / 2, signY + 32, { fit: [80, 32], align: 'center' });
      } catch (e) {
        console.warn(`[PDFKit] Gagal menempelkan tanda tangan ${col.role}:`, e.message);
      }
    }

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(`( ${col.name} )`, colX, signY + 68, { width: colW, align: 'center' });
    if (col.nip && col.nip !== '-') {
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(`NIP. ${col.nip}`, colX, signY + 80, { width: colW, align: 'center' });
    }
  });

  doc.y = signY + 95;

  // Watermark Resmi & Penomoran Halaman Otomatis
  const watermarkText = isDailyReportClosed
    ? 'ARFF YIA • OFFICIAL OPS REPORT'
    : 'DRAFT • BELUM DISAHKAN';
  applyWatermarkAndPageNumbers(doc, contentWidth, startX, watermarkText);

  return doc;
};
