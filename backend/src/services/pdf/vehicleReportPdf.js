import PDFDocument from 'pdfkit';
import {
  resolveSignatureBuffer,
  applyWatermarkAndPageNumbers,
  drawOfficialHeader,
  drawSectionHeadSignature,
  checkPageBreak,
} from './pdfHelpers.js';

/**
 * Membuat dokumen PDF Laporan Rekapitulasi Kesiapan & Kelaikan Armada ARFF YIA (Format A4 Portrait)
 * Mendukung Halaman Laporan Armada dengan filter 1 Bulan, 3 Bulan, 1 Tahun, atau Rentang Kustom
 */
export const generateVehicleReadinessReportPdf = async (data = {}) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: `Laporan Kesiapan Armada ARFF YIA - ${data.periodLabel || 'Periode Operasional'}`,
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Rekapitulasi Kelaikan Armada & Pergantian Status'
    },
    bufferPages: true,
  });

  const {
    periodLabel = '1 Bulan Terakhir',
    startDate = new Date().toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0],
    vehicles = [],
    summary = {},
    transitionLogs = [],
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
    'LAPORAN RESMI REKAPITULASI KESIAPAN ARMADA & AUDIT STATUS KELAIKAN',
    contentWidth,
    startX
  );

  // Box Informasi Periode (KPI Ringkasan)
  doc.rect(startX, doc.y, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Periode Laporan: ', startX + 10, infoY);
  doc.font('Helvetica').text(`${periodLabel} (${startDate} s.d. ${endDate})`, startX + 90, infoY);

  doc.font('Helvetica-Bold').text('Total Armada Terdaftar: ', startX + 330, infoY);
  doc.font('Helvetica-Bold').fillColor('#b91c1c').text(`${summary.total_vehicles || vehicles.length} Unit`, startX + 445, infoY);

  const infoY2 = infoY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Kondisi Fisik Saat Ini: ', startX + 10, infoY2);
  let statusSummaryText = `${summary.currently_serviceable || 0} Siap (Serviceable)`;
  if ((summary.currently_unserviceable || 0) > 0) {
    statusSummaryText += ` • ${summary.currently_unserviceable} Rusak`;
  }
  if ((summary.currently_unreported || 0) > 0) {
    statusSummaryText += ` • ${summary.currently_unreported} Belum Dicek`;
  }
  doc.font('Helvetica-Bold').fillColor('#15803d').text(
    statusSummaryText,
    startX + 115, infoY2
  );

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Total Siklus Kendala: ', startX + 330, infoY2);
  doc.font('Helvetica-Bold').fillColor('#b91c1c').text(`${summary.total_transitions || 0} Siklus`, startX + 445, infoY2);

  doc.y = 140;

  // Tabel 1: Rekapitulasi Kelaikan & Siklus Kendala Per Unit
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. REKAPITULASI KELAIKAN & FREKUENSI KENDALA PER UNIT ARMADA');
  doc.moveDown(0.3);

  const tableHeaderY = doc.y;
  doc.rect(startX, tableHeaderY, contentWidth, 18).fill('#1e293b');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('No', startX + 4, tableHeaderY + 5, { width: 22, align: 'center' });
  doc.text('Kode & Nama Armada', startX + 28, tableHeaderY + 5, { width: 145, align: 'left' });
  doc.text('Kategori', startX + 175, tableHeaderY + 5, { width: 55, align: 'center' });
  doc.text('Status Saat Ini', startX + 232, tableHeaderY + 5, { width: 85, align: 'center' });
  doc.text('Siklus Kendala', startX + 320, tableHeaderY + 5, { width: 70, align: 'center' });
  doc.text('Riwayat Kelaikan & Catatan', startX + 392, tableHeaderY + 5, { width: 120, align: 'left' });

  doc.y = tableHeaderY + 18;

  vehicles.forEach((v, idx) => {
    checkPageBreak(doc, 20);
    const rowY = doc.y;
    if (idx % 2 === 1) {
      doc.rect(startX, rowY, contentWidth, 18).fill('#f8fafc');
    }

    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(String(idx + 1), startX + 4, rowY + 5, { width: 22, align: 'center' });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(
      `${v.code_name} - ${v.vehicle_name}`,
      startX + 28, rowY + 5,
      { width: 145, align: 'left', lineBreak: false, ellipsis: true }
    );
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(v.category || 'utama', startX + 175, rowY + 5, { width: 55, align: 'center' });

    const currentStatus = v.current_status || v.status || 'belum_dilaporkan';
    const isServ = currentStatus === 'serviceable';
    const isUnserv = currentStatus === 'unserviceable';
    const statusLabel = isServ ? 'SERVICEABLE' : isUnserv ? 'UNSERVICEABLE' : 'BELUM DICEK';
    const statusColor = isServ ? '#15803d' : isUnserv ? '#b91c1c' : '#64748b';

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(statusColor).text(
      statusLabel,
      startX + 232, rowY + 5, { width: 85, align: 'center' }
    );

    const periodCount = Number(v.period_count ?? v.transition_count ?? 0);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(periodCount > 0 ? '#b91c1c' : '#475569').text(
      periodCount > 0 ? `${periodCount} Siklus` : '0 (Nihil)',
      startX + 320, rowY + 5, { width: 70, align: 'center' }
    );

    let statusDesc = 'Siap Operasi Penuh (Nihil)';
    let statusDescColor = '#15803d';
    if (isUnserv) {
      statusDesc = 'Dalam Perbaikan Kendala';
      statusDescColor = '#b91c1c';
    } else if (!isServ) {
      statusDesc = 'Menunggu Laporan Inspeksi PIC';
      statusDescColor = '#64748b';
    } else if (v.notes) {
      statusDesc = v.notes;
      statusDescColor = '#475569';
    }

    doc.fontSize(7).font('Helvetica').fillColor(statusDescColor).text(
      statusDesc,
      startX + 392, rowY + 5, { width: 120, align: 'left', lineBreak: false, ellipsis: true }
    );

    doc.moveTo(startX, rowY + 18).lineTo(startX + contentWidth, rowY + 18).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    doc.y = rowY + 18;
  });

  doc.moveDown(0.8);

  // Tabel 2: Riwayat Log Transisi Gangguan & Pemulihan
  checkPageBreak(doc, 40);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. AUDIT LOG PERGANTIAN STATUS & KRONOLOGI GANGGUAN FISIK');
  doc.moveDown(0.3);

  if (transitionLogs && transitionLogs.length > 0) {
    const logHeaderY = doc.y;
    doc.rect(startX, logHeaderY, contentWidth, 18).fill('#1e293b');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Tanggal/Shift', startX + 4, logHeaderY + 5, { width: 75 });
    doc.text('Unit Armada', startX + 82, logHeaderY + 5, { width: 65 });
    doc.text('Status Transisi', startX + 150, logHeaderY + 5, { width: 95, align: 'center' });
    doc.text('Pelapor (PIC)', startX + 248, logHeaderY + 5, { width: 80 });
    doc.text('Justifikasi & Kronologi Kerusakan', startX + 332, logHeaderY + 5, { width: 180 });

    doc.y = logHeaderY + 18;

    transitionLogs.forEach((t, idx) => {
      checkPageBreak(doc, 24);
      const rowY = doc.y;
      if (idx % 2 === 1) {
        doc.rect(startX, rowY, contentWidth, 20).fill('#f8fafc');
      }

      const shiftInfo = t.start_shift_number ? ` (S${t.start_shift_number})` : '';
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(`${t.start_date}${shiftInfo}`, startX + 4, rowY + 5, { width: 75 });
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(t.code_name || '-', startX + 82, rowY + 5, { width: 65 });

      const isResolved = t.is_resolved;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(isResolved ? '#15803d' : '#b91c1c').text(
        isResolved ? `Pulih (${t.resolved_date || 'Selesai'})` : 'Dalam Perbaikan',
        startX + 150, rowY + 5, { width: 95, align: 'center', lineBreak: false, ellipsis: true }
      );

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(t.reported_by || '-', startX + 248, rowY + 5, { width: 80, lineBreak: false, ellipsis: true });

      const issueText = t.justification && t.notes
        ? `${t.justification} • ${t.notes}`
        : (t.justification || t.notes || '-');

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(issueText, startX + 332, rowY + 5, { width: 178, lineBreak: false, ellipsis: true });

      doc.moveTo(startX, rowY + 20).lineTo(startX + contentWidth, rowY + 20).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + 20;
    });
  } else {
    const emptyY = doc.y;
    doc.rect(startX, emptyY, contentWidth, 24).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#64748b').text(
      'Nihil. Tidak ada catatan kendala fisik atau pergantian status armada operasional pada periode laporan ini.',
      startX + 10, emptyY + 8, { width: contentWidth - 20, align: 'center' }
    );
    doc.y = emptyY + 28;
  }

  // Tanda Tangan Section Head Terpusat
  await drawSectionHeadSignature(doc, {
    dept_head_name,
    dept_head_nip,
    dept_head_signature_url
  }, startX, contentWidth);

  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • FLEET READINESS REPORT');

  return doc;
};
