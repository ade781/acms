import PDFDocument from 'pdfkit';
import {
  applyWatermarkAndPageNumbers,
  drawOfficialHeader,
  drawSectionHeadSignature,
  drawTableHeaderRow,
  checkPageBreak,
  formatIndonesianDate,
  formatIndonesianTime
} from './pdfBaseHelper.js';

/**
 * Incident PDF Service - Generator Dokumen Resmi Rekapitulasi Insiden Operasional ARFF YIA
 * Format: A4 Portrait terstandarisasi dengan Header Kop Resmi Angkasa Pura Indonesia,
 * Garis ganda pembatas kedinasan, multi-page repeating table headers, logbook triase darurat,
 * dan tanda tangan Section Head terpusat.
 */
export { streamPdfToResponse } from './pdfBaseHelper.js';

const formatWIBDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
};

/**
 * Format status triase insiden menjadi teks bersih tanpa underscore
 */
export const formatTriageStatus = (status = '') => {
  if (!status) return 'Dalam Proses';
  const s = String(status).trim().toLowerCase();
  switch (s) {
    case 'selesai':
    case 'resolved':
      return 'Selesai';
    case 'menunggu_tindak_lanjut':
    case 'menunggu tindak lanjut':
    case 'pending':
      return 'Menunggu Tindak Lanjut';
    case 'dalam_proses':
    case 'dalam proses':
    case 'in_progress':
      return 'Dalam Proses';
    default:
      return s
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
};

export const generateIncidentSummaryReportPdf = async (data = {}) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: `Laporan Rekapitulasi Insiden ARFF YIA - ${data.periodLabel || 'Periode Operasional'}`,
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Rekapitulasi Kejadian & Insiden Airside'
    },
    bufferPages: true,
  });

  const {
    periodLabel = '1 Bulan Terakhir',
    startDate = formatWIBDate(),
    endDate = formatWIBDate(),
    incidents = [],
    summary = {},
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = null,
    dept_head_signature_url = null,
  } = data;

  const startX = 40;
  const contentWidth = 515;

  // 1. Header Kop Resmi Kedinasan ARFF YIA & Garis Ganda Pembatas
  drawOfficialHeader(
    doc,
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    'LAPORAN RESMI REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL AIRSIDE',
    contentWidth,
    startX
  );

  // 2. Box Ringkasan Periode & Statistik
  const boxTopY = doc.y + 2;
  doc.rect(startX, boxTopY, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = boxTopY + 6;

  const formattedStart = formatIndonesianDate(startDate);
  const formattedEnd = formatIndonesianDate(endDate);

  // Jika startDate === endDate (laporan satu hari), tampilkan satu tanggal saja tanpa repetisi '(X s.d. X)'
  const isSingleDay = Boolean(startDate && endDate && startDate === endDate);
  const dateRangeStr = isSingleDay
    ? formattedStart
    : (startDate && endDate ? `${formattedStart} s.d. ${formattedEnd}` : (formattedStart || formattedEnd || '-'));

  const periodDisplayText = periodLabel
    ? `${periodLabel} (${dateRangeStr})`
    : dateRangeStr;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Periode Laporan: ', startX + 10, infoY);
  doc.font('Helvetica').text(periodDisplayText, startX + 90, infoY, { width: 250, lineBreak: false, ellipsis: true });

  doc.font('Helvetica-Bold').text('Total Insiden: ', startX + 350, infoY);
  doc.font('Helvetica-Bold').fillColor(incidents.length > 0 ? '#b91c1c' : '#15803d').text(`${incidents.length} Kejadian`, startX + 420, infoY);

  const infoY2 = infoY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Status Triase: ', startX + 10, infoY2);

  const statusParts = [];
  statusParts.push(`${summary.resolvedCount || 0} Selesai`);
  statusParts.push(`${summary.inProgressCount || 0} Dalam Proses`);
  if (summary.pendingCount) {
    statusParts.push(`${summary.pendingCount} Menunggu Tindak Lanjut`);
  }
  const statusSummaryText = statusParts.join(' • ');

  doc.font('Helvetica').text(statusSummaryText, startX + 80, infoY2, { width: 265, lineBreak: false, ellipsis: true });

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Kategori Dominan: ', startX + 350, infoY2);
  doc.font('Helvetica').text(summary.topCategory || '-', startX + 440, infoY2, { width: 70, lineBreak: false, ellipsis: true });

  doc.y = boxTopY + 38 + 12;

  // 3. Tabel Daftar Insiden Operasional (Layer 1)
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    '1. DAFTAR LOGBOOK INSIDEN OPERASIONAL (LAYER 1)',
    startX,
    doc.y
  );
  doc.moveDown(0.4);

  // Kolom terstandarisasi untuk header tabel profesional (abu-abu halus #f1f5f9, stroke #cbd5e1, teks #0f172a)
  const incidentTableColumns = [
    { header: 'No', width: 24, align: 'center', padX: 1 },
    { header: 'Tanggal & Jam', width: 90, align: 'left', padX: 4 },
    { header: 'No. Laporan', width: 80, align: 'left', padX: 4 },
    { header: 'Kategori', width: 80, align: 'left', padX: 4 },
    { header: 'Lokasi Grid', width: 75, align: 'left', padX: 4 },
    { header: 'Prioritas', width: 60, align: 'center', padX: 2 },
    { header: 'Status Triase', width: 106, align: 'center', padX: 2 }
  ];

  // Helper untuk menggambar header tabel insiden secara profesional (menggunakan drawTableHeaderRow dari pdfBaseHelper)
  const drawIncidentTableHeader = (yPos) => {
    drawTableHeaderRow(doc, yPos, incidentTableColumns, startX, contentWidth, 18);
    doc.y = yPos + 18;
  };

  if (incidents.length === 0) {
    const nihilY = doc.y;
    doc.rect(startX, nihilY, contentWidth, 22).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#15803d').text(
      'NIHIL — Tidak ada kejadian darurat atau insiden operasional pada periode ini.',
      startX + 10, nihilY + 7
    );
    doc.y = nihilY + 28;
  } else {
    drawIncidentTableHeader(doc.y);

    incidents.forEach((inc, idx) => {
      const rowHeight = 22;
      // Periksa sisa ruang halaman: jika pindah halaman, gambar ulang header tabel secara konsisten
      const isNewPage = checkPageBreak(doc, rowHeight, 740, 40);
      if (isNewPage) {
        drawIncidentTableHeader(doc.y);
      }

      const rowY = doc.y;
      if (idx % 2 === 1) doc.rect(startX, rowY, contentWidth, rowHeight).fill('#f8fafc');

      // Nomor Urut
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        String(idx + 1),
        startX,
        rowY + 7,
        { width: 24, align: 'center' }
      );

      // Format Tanggal Kejadian (Bulan Indonesia) & Jam (Label WIB)
      const dateFormatted = formatIndonesianDate(inc.incident_date);
      const timeFormatted = formatIndonesianTime(inc.incident_time);

      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0f172a').text(
        dateFormatted,
        startX + 28, rowY + 3, { width: 82, lineBreak: false, ellipsis: true }
      );
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b').text(
        timeFormatted,
        startX + 28, rowY + 12, { width: 82, lineBreak: false, ellipsis: true }
      );

      // Nomor Laporan
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#b91c1c').text(
        inc.report_number || '-',
        startX + 118, rowY + 7, { width: 72, lineBreak: false, ellipsis: true }
      );

      // Kategori & Lokasi
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        inc.category || '-',
        startX + 198, rowY + 7, { width: 72, lineBreak: false, ellipsis: true }
      );
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        inc.location || 'Airside',
        startX + 278, rowY + 7, { width: 67, lineBreak: false, ellipsis: true }
      );

      // Prioritas
      const prioColor = (inc.priority_level === 'critical' || inc.priority_level === 'kritis' || inc.priority_level === 'high' || inc.priority_level === 'tinggi')
        ? '#b91c1c'
        : '#0f172a';
      doc.fontSize(7).font('Helvetica-Bold').fillColor(prioColor).text(
        (inc.priority_level || 'medium').toUpperCase(),
        startX + 349, rowY + 7, { width: 60, align: 'center' }
      );

      // Status Triase Bersih (Tanpa Underscore)
      const triageText = formatTriageStatus(inc.status);
      const statusKey = String(inc.status || '').toLowerCase();
      const statusColor = statusKey === 'selesai'
        ? '#15803d'
        : (statusKey === 'menunggu_tindak_lanjut' ? '#b91c1c' : '#b45309');

      doc.fontSize(7).font('Helvetica-Bold').fillColor(statusColor).text(
        triageText,
        startX + 409, rowY + 7, { width: 106, align: 'center' }
      );

      // Garis divider per baris
      doc.moveTo(startX, rowY + rowHeight).lineTo(startX + contentWidth, rowY + rowHeight).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + rowHeight;
    });

    doc.moveDown(0.8);

    // 4. Detail Kronologi & Tindakan (Layer 2)
    checkPageBreak(doc, 85, 740, 40);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
      '2. DETAIL KRONOLOGI & TINDAKAN PENANGANAN INSIDEN (LAYER 2)',
      startX,
      doc.y
    );
    doc.moveDown(0.4);

    incidents.forEach((inc, idx) => {
      // Pastikan sisa halaman cukup untuk 1 blok rincian insiden (tinggi card 58 + gap 6 = 64pt)
      checkPageBreak(doc, 68, 740, 40);
      const cardY = doc.y;
      doc.rect(startX, cardY, contentWidth, 58).fillAndStroke('#f8fafc', '#e2e8f0');
      const boxY = cardY + 5;

      const dateFormatted = formatIndonesianDate(inc.incident_date);
      const timeFormatted = formatIndonesianTime(inc.incident_time);
      const triageClean = formatTriageStatus(inc.status);
      const statusKey = String(inc.status || '').toLowerCase();
      const statusColor = statusKey === 'selesai'
        ? '#15803d'
        : (statusKey === 'menunggu_tindak_lanjut' ? '#b91c1c' : '#b45309');

      // Judul Kartu Insiden & Waktu
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#991b1b').text(
        `${idx + 1}. [${inc.report_number || 'INC'}] ${inc.title || 'Insiden'} — ${dateFormatted}, ${timeFormatted}`,
        startX + 8, boxY, { width: contentWidth - 110, lineBreak: false, ellipsis: true }
      );

      // Status Badge di pojok kanan atas kartu
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(statusColor).text(
        triageClean,
        startX + contentWidth - 100, boxY, { width: 92, align: 'right' }
      );

      // Rincian Kronologi, Tindakan, dan Koordinasi
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text('Kronologi:', startX + 8, boxY + 13);
      doc.font('Helvetica').fillColor('#475569').text(
        inc.chronology || '-',
        startX + 68, boxY + 13, { width: contentWidth - 78, lineBreak: false, ellipsis: true }
      );

      doc.font('Helvetica-Bold').fillColor('#0f172a').text('Tindakan:', startX + 8, boxY + 26);
      doc.font('Helvetica').fillColor('#475569').text(
        inc.action_taken || '-',
        startX + 68, boxY + 26, { width: contentWidth - 78, lineBreak: false, ellipsis: true }
      );

      doc.font('Helvetica-Bold').fillColor('#0f172a').text('Koordinasi:', startX + 8, boxY + 39);
      doc.font('Helvetica').fillColor('#475569').text(
        `Pihak Terkoordinasi: ${inc.coordinated_parties || 'ATC & Avsec'} | Kondisi Akhir: ${inc.last_condition || 'Aman terkendali'}`,
        startX + 68, boxY + 39, { width: contentWidth - 78, lineBreak: false, ellipsis: true }
      );

      doc.y = cardY + 64;
    });
  }

  // 5. Tanda Tangan Section Head Terpusat (pdfBaseHelper.js)
  await drawSectionHeadSignature(doc, {
    name: dept_head_name,
    nip: dept_head_nip,
    signature_url: dept_head_signature_url,
    dept_head_name,
    dept_head_nip,
    dept_head_signature_url,
    role: 'AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD',
    isDraft: false
  }, startX, contentWidth);

  // 6. Watermark Resmi & Penomoran Halaman Otomatis
  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • INCIDENT SUMMARY REPORT');

  return doc;
};
