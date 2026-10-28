import PDFDocument from 'pdfkit';
import { resolveSignatureBuffer, applyWatermarkAndPageNumbers } from './pdfHelpers.js';

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

  // Header Kop Instansi
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(
    'PT ANGKASA PURA INDONESIA - BANDARA INTERNASIONAL YOGYAKARTA',
    startX, 35, { align: 'center', width: contentWidth }
  );
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(
    'UNIT AIRPORT RESCUE & FIRE FIGHTING (PKP-PK)',
    startX, 50, { align: 'center', width: contentWidth }
  );
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(
    'LAPORAN RESMI REKAPITULASI LOGBOOK KEGIATAN OPERASIONAL DINAS',
    startX, 67, { align: 'center', width: contentWidth }
  );

  doc.moveTo(startX, 82).lineTo(startX + contentWidth, 82).lineWidth(1.5).strokeColor('#1e293b').stroke();
  doc.moveTo(startX, 84).lineTo(startX + contentWidth, 84).lineWidth(0.5).strokeColor('#94a3b8').stroke();

  doc.y = 92;

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

  const checkPageBreak = (neededHeight) => {
    if (doc.y + neededHeight > 740) {
      doc.addPage();
      doc.y = 35;
      return true;
    }
    return false;
  };

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
      checkPageBreak(28);
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

  // Tanda Tangan Section Head
  if (doc.y + 100 > 740) {
    doc.addPage();
    doc.y = 45;
  } else {
    doc.moveDown(1.5);
  }

  const signY = doc.y;
  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text('Mengetahui / Mengesahkan,', startX + contentWidth - 220, signY, { width: 220, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').text('AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD', startX + contentWidth - 220, signY + 12, { width: 220, align: 'center' });

  const deptSigBuffer = await resolveSignatureBuffer(dept_head_signature_url);
  if (deptSigBuffer) {
    try {
      doc.image(deptSigBuffer, startX + contentWidth - 165, signY + 25, { fit: [110, 40], align: 'center' });
    } catch (e) {
      console.warn('Gagal memuat tanda tangan Dept Head:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').text(`( ${dept_head_name} )`, startX + contentWidth - 220, signY + 68, { width: 220, align: 'center' });
  if (dept_head_nip && dept_head_nip !== '-') {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`NIP. ${dept_head_nip}`, startX + contentWidth - 220, signY + 80, { width: 220, align: 'center' });
  }

  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • ACTIVITIES LOGBOOK REPORT');

  return doc;
};
