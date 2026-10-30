import PDFDocument from 'pdfkit';
import {
  resolveSignatureBuffer,
  applyWatermarkAndPageNumbers,
  drawOfficialHeader,
  drawSectionHeadSignature,
  checkPageBreak,
} from './pdfHelpers.js';

/**
 * Membuat stream PDF Laporan Rekapitulasi Logbook Kegiatan Rutin Operasional ARFF (A4 Portrait)
 */
export const generateActivitiesReportPdf = async (reportData) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: 'Laporan Rekapitulasi Kegiatan Operasional ARFF YIA',
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Logbook Rangkaian Kegiatan Dinas Operasional',
    },
    bufferPages: true,
  });

  const {
    periodLabel = '1 Bulan Terakhir',
    startDate = '',
    endDate = '',
    activities = [],
    summary = {},
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = '-',
    dept_head_signature_url = null,
  } = reportData;

  const contentWidth = 515;
  const startX = 40;

  // Header Dokumen Resmi Terpusat (Kop PT Angkasa Pura Indonesia & Garis Ganda)
  drawOfficialHeader(
    doc,
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    'LAPORAN RESMI REKAPITULASI LOGBOOK KEGIATAN OPERASIONAL DINAS',
    contentWidth,
    startX
  );

  // Box Informasi Periode & Statistik
  doc.rect(startX, doc.y, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Periode Laporan: ', startX + 10, infoY);
  doc.font('Helvetica').text(`${periodLabel} (${startDate} s.d. ${endDate})`, startX + 105, infoY);

  doc.font('Helvetica-Bold').text('Total Kegiatan: ', startX + 330, infoY);
  doc.font('Helvetica-Bold').fillColor('#0284c7').text(`${activities.length} Kegiatan Terdata`, startX + 415, infoY);

  const infoY2 = infoY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Filter Kategori: ', startX + 10, infoY2);
  doc.font('Helvetica').text(summary.categoryLabel || 'Semua Kategori', startX + 105, infoY2);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Regu Terdata: ', startX + 330, infoY2);
  doc.font('Helvetica').text(summary.teamLabel || 'Seluruh Regu (A-D)', startX + 415, infoY2);

  doc.y = 140;

  // Tabel Logbook Kegiatan
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('DAFTAR LOGBOOK AKTIVITAS & KEGIATAN DINAS OPERASIONAL');
  doc.moveDown(0.3);

  if (activities.length === 0) {
    doc.rect(startX, doc.y, contentWidth, 22).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
      'Tidak ada catatan aktivitas operasional yang terdata pada periode ini.',
      startX + 10, doc.y + 7
    );
    doc.y += 28;
  } else {
    const actHeaderY = doc.y;
    doc.rect(startX, actHeaderY, contentWidth, 18).fill('#1e293b');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('No', startX + 4, actHeaderY + 5, { width: 20, align: 'center' });
    doc.text('Tanggal & Shift', startX + 26, actHeaderY + 5, { width: 85, align: 'left' });
    doc.text('Jam (WIB)', startX + 113, actHeaderY + 5, { width: 45, align: 'center' });
    doc.text('Kategori', startX + 160, actHeaderY + 5, { width: 85, align: 'left' });
    doc.text('Judul Aktivitas & Uraian Pelaksanaan', startX + 248, actHeaderY + 5, { width: 260, align: 'left' });

    doc.y = actHeaderY + 18;

    activities.forEach((act, idx) => {
      checkPageBreak(doc, 28);
      const rowY = doc.y;
      if (idx % 2 === 1) doc.rect(startX, rowY, contentWidth, 24).fill('#f8fafc');

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(String(idx + 1), startX + 4, rowY + 5, { width: 20, align: 'center' });

      const shiftInfo = act.shift_date ? `${act.shift_date} (Sh.${act.shift_number || 1} ${act.team_group || ''})` : '-';
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(shiftInfo, startX + 26, rowY + 5, { width: 85 });

      const timeStr = act.activity_time ? act.activity_time.substring(0, 5) : '-';
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0284c7').text(timeStr, startX + 113, rowY + 5, { width: 45, align: 'center' });

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        (act.activity_type || '-').replace(/_/g, ' ').toUpperCase(),
        startX + 160, rowY + 5, { width: 85 }
      );

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(act.title || '-', startX + 248, rowY + 4, { width: 260, lineBreak: false, ellipsis: true });
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b').text(
        act.description || act.result_notes || '-',
        startX + 248, rowY + 13, { width: 260, lineBreak: false, ellipsis: true }
      );

      doc.moveTo(startX, rowY + 24).lineTo(startX + contentWidth, rowY + 24).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + 24;
    });
  }

  // Tanda Tangan Section Head Terpusat
  await drawSectionHeadSignature(doc, {
    dept_head_name,
    dept_head_nip,
    dept_head_signature_url
  }, startX, contentWidth);

  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • ACTIVITIES LOGBOOK REPORT');

  return doc;
};
