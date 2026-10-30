import PDFDocument from 'pdfkit';
import {
  resolveSignatureBuffer,
  applyWatermarkAndPageNumbers,
  drawOfficialHeader,
  drawSectionHeadSignature,
  checkPageBreak,
} from './pdfHelpers.js';

/**
 * Membuat dokumen PDF Laporan Rekapitulasi Insiden Operasional ARFF YIA (Format A4 Portrait)
 * Mendukung Halaman Laporan Insiden dengan filter 1 Bulan, 3 Bulan, 1 Tahun, atau Rentang Kustom
 */
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
    startDate = new Date().toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0],
    incidents = [],
    summary = {},
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = null,
    dept_head_signature_url = null,
  } = data;

  const startX = 40;
  const contentWidth = 515;

  // Header Dokumen Resmi Terpusat (Kop PT Angkasa Pura Indonesia & Garis Ganda)
  drawOfficialHeader(
    doc,
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    'LAPORAN RESMI REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL AIRSIDE',
    contentWidth,
    startX
  );

  // Box Informasi Periode & Statistik
  doc.rect(startX, doc.y, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(`Periode Laporan: `, startX + 10, infoY);
  doc.font('Helvetica').text(`${periodLabel} (${startDate} s.d. ${endDate})`, startX + 105, infoY);

  doc.font('Helvetica-Bold').text(`Total Insiden Tercatat: `, startX + 330, infoY);
  doc.font('Helvetica-Bold').fillColor(incidents.length > 0 ? '#b91c1c' : '#15803d').text(`${incidents.length} Kejadian`, startX + 445, infoY);

  const infoY2 = infoY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(`Status Penanganan: `, startX + 10, infoY2);
  doc.font('Helvetica').text(
    `${summary.resolvedCount || 0} Selesai • ${summary.inProgressCount || 0} Dalam Proses`,
    startX + 110, infoY2
  );

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(`Kategori Dominan: `, startX + 330, infoY2);
  doc.font('Helvetica').text(summary.topCategory || '-', startX + 425, infoY2);

  doc.y = 140;

  // Ringkasan Daftar Insiden
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. DAFTAR LOGBOOK INSIDEN OPERASIONAL (LAYER 1)');
  doc.moveDown(0.3);

  if (incidents.length === 0) {
    doc.rect(startX, doc.y, contentWidth, 22).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#15803d').text(
      'NIHIL — Tidak ada kejadian darurat atau insiden operasional pada periode ini.',
      startX + 10, doc.y + 7
    );
    doc.y += 28;
  } else {
    const incHeaderY = doc.y;
    doc.rect(startX, incHeaderY, contentWidth, 18).fill('#1e293b');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('No', startX + 4, incHeaderY + 5, { width: 22, align: 'center' });
    doc.text('Tanggal & Jam', startX + 28, incHeaderY + 5, { width: 82, align: 'left' });
    doc.text('No. Laporan', startX + 112, incHeaderY + 5, { width: 85, align: 'left' });
    doc.text('Kategori', startX + 199, incHeaderY + 5, { width: 80, align: 'left' });
    doc.text('Lokasi Grid', startX + 281, incHeaderY + 5, { width: 75, align: 'left' });
    doc.text('Prioritas', startX + 358, incHeaderY + 5, { width: 65, align: 'center' });
    doc.text('Status', startX + 425, incHeaderY + 5, { width: 85, align: 'center' });

    doc.y = incHeaderY + 18;

    incidents.forEach((inc, idx) => {
      checkPageBreak(doc, 22);
      const rowY = doc.y;
      if (idx % 2 === 1) doc.rect(startX, rowY, contentWidth, 18).fill('#f8fafc');

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(String(idx + 1), startX + 4, rowY + 5, { width: 22, align: 'center' });
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(
        `${inc.incident_date} ${inc.incident_time ? inc.incident_time.substring(0, 5) : ''}`,
        startX + 28, rowY + 5, { width: 82 }
      );
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#b91c1c').text(inc.report_number || '-', startX + 112, rowY + 5, { width: 85 });
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(inc.category || '-', startX + 199, rowY + 5, { width: 80 });
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(inc.location || 'Airside', startX + 281, rowY + 5, { width: 75, lineBreak: false, ellipsis: true });

      const prioColor = inc.priority_level === 'critical' || inc.priority_level === 'high' ? '#b91c1c' : '#0f172a';
      doc.fontSize(7).font('Helvetica-Bold').fillColor(prioColor).text(
        (inc.priority_level || 'medium').toUpperCase(),
        startX + 358, rowY + 5, { width: 65, align: 'center' }
      );

      const statusColor = inc.status === 'selesai' ? '#15803d' : '#b45309';
      doc.fontSize(7).font('Helvetica-Bold').fillColor(statusColor).text(
        (inc.status || 'dalam_proses').replace('_', ' ').toUpperCase(),
        startX + 425, rowY + 5, { width: 85, align: 'center' }
      );

      doc.moveTo(startX, rowY + 18).lineTo(startX + contentWidth, rowY + 18).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + 18;
    });

    doc.moveDown(0.8);

    // Detail Kronologi & Tindakan (Layer 2)
    checkPageBreak(doc, 50);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. DETAIL KRONOLOGI & TINDAKAN PENANGANAN INSIDEN (LAYER 2)');
    doc.moveDown(0.3);

    incidents.slice(0, 20).forEach((inc, idx) => {
      checkPageBreak(doc, 65);
      doc.rect(startX, doc.y, contentWidth, 58).fillAndStroke('#f8fafc', '#e2e8f0');
      const boxY = doc.y + 5;

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#991b1b').text(
        `${idx + 1}. [${inc.report_number}] ${inc.title} - ${inc.incident_date} ${inc.incident_time || ''}`,
        startX + 8, boxY
      );

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text('Kronologi:', startX + 8, boxY + 12);
      doc.font('Helvetica').fillColor('#475569').text(inc.chronology || '-', startX + 60, boxY + 12, { width: contentWidth - 75, lineBreak: false, ellipsis: true });

      doc.font('Helvetica-Bold').fillColor('#0f172a').text('Tindakan:', startX + 8, boxY + 24);
      doc.font('Helvetica').fillColor('#475569').text(inc.action_taken || '-', startX + 60, boxY + 24, { width: contentWidth - 75, lineBreak: false, ellipsis: true });

      doc.font('Helvetica-Bold').fillColor('#0f172a').text('Koordinasi:', startX + 8, boxY + 36);
      doc.font('Helvetica').fillColor('#475569').text(
        `Pihak Terkoordinasi: ${inc.coordinated_parties || 'ATC & Avsec'} | Kondisi Akhir: ${inc.last_condition || 'Aman terkendali'}`,
        startX + 60, boxY + 36, { width: contentWidth - 75, lineBreak: false, ellipsis: true }
      );

      doc.y += 63;
    });
  }

  // Tanda Tangan Section Head Terpusat
  await drawSectionHeadSignature(doc, {
    dept_head_name,
    dept_head_nip,
    dept_head_signature_url
  }, startX, contentWidth);

  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • INCIDENT SUMMARY REPORT');

  return doc;
};
