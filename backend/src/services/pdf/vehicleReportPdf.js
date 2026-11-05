import PDFDocument from 'pdfkit';
import {
  resolveSignatureBuffer,
  applyWatermarkAndPageNumbers,
  drawOfficialHeader,
  drawSectionHeadSignature,
  checkPageBreak,
  formatIndonesianDate,
} from './pdfHelpers.js';

/**
 * Membuat dokumen PDF Laporan Rekapitulasi Kesiapan Armada ARFF YIA (Format A4 Portrait)
 * Mendukung Halaman Laporan Armada dengan filter 1 Bulan, 3 Bulan, 1 Tahun, atau Rentang Kustom
 */
export const generateVehicleReadinessReportPdf = async (data = {}) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: `Laporan Kesiapan Armada ARFF YIA - ${data.periodLabel || 'Periode Operasional'}`,
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Rekapitulasi Kesiapan Armada & Pergantian Status'
    },
    bufferPages: true,
  });

  const todayWib = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const {
    periodLabel = '1 Bulan Terakhir',
    startDate = todayWib,
    endDate = todayWib,
    vehicles = [],
    summary = {},
    transitionLogs = [],
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = null,
    dept_head_signature_url = null,
    dept_head_rank_position = null,
    rank_position = null,
  } = data;

  const startX = 40;
  const contentWidth = 515;

  // Header Dokumen Resmi Terpusat (Kop PT Angkasa Pura Indonesia & Garis Ganda)
  drawOfficialHeader(
    doc,
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    'LAPORAN RESMI REKAPITULASI KESIAPAN ARMADA & AUDIT STATUS OPERASIONAL',
    contentWidth,
    startX
  );

  // Box Informasi Periode (KPI Ringkasan)
  doc.rect(startX, doc.y, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  const formattedStart = formatIndonesianDate(startDate);
  const formattedEnd = formatIndonesianDate(endDate);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Periode Laporan: ', startX + 10, infoY);
  doc.font('Helvetica').fillColor('#334155').text(
    `${periodLabel} (${formattedStart} s.d. ${formattedEnd})`,
    startX + 90,
    infoY,
    { width: 235, lineBreak: false, ellipsis: true }
  );

  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Total Armada Terdaftar: ', startX + 330, infoY);
  doc.font('Helvetica-Bold').fillColor('#0f172a').text(
    `${summary.total_vehicles || vehicles.length} Unit`,
    startX + 445,
    infoY
  );

  const infoY2 = infoY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Kondisi Fisik Saat Ini: ', startX + 10, infoY2);

  const servCount = summary.currently_serviceable || 0;
  const unservCount = summary.currently_unserviceable || 0;
  const unrepCount = summary.currently_unreported || 0;

  let currentStatusX = startX + 110;
  doc.font('Helvetica-Bold').fontSize(8.5);

  doc.fillColor('#15803d').text(`${servCount} Serviceable`, currentStatusX, infoY2);
  currentStatusX += doc.widthOfString(`${servCount} Serviceable`);

  if (unservCount > 0) {
    doc.fillColor('#94a3b8').text(' • ', currentStatusX, infoY2);
    currentStatusX += doc.widthOfString(' • ');
    doc.fillColor('#b91c1c').text(`${unservCount} Unserviceable`, currentStatusX, infoY2);
    currentStatusX += doc.widthOfString(`${unservCount} Unserviceable`);
  }

  if (unrepCount > 0) {
    doc.fillColor('#94a3b8').text(' • ', currentStatusX, infoY2);
    currentStatusX += doc.widthOfString(' • ');
    doc.fillColor('#64748b').text(`${unrepCount} Belum Dicek`, currentStatusX, infoY2);
    currentStatusX += doc.widthOfString(`${unrepCount} Belum Dicek`);
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Total Siklus Kendala: ', startX + 330, infoY2);
  doc.font('Helvetica-Bold').fillColor((summary.total_transitions || 0) > 0 ? '#b91c1c' : '#0f172a').text(
    `${summary.total_transitions || 0} Siklus`,
    startX + 445,
    infoY2
  );

  const section1Y = 140;

  // Tabel 1: Rekapitulasi Kesiapan & Siklus Kendala Per Unit
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    '1. REKAPITULASI KESIAPAN & FREKUENSI KENDALA PER UNIT ARMADA',
    startX,
    section1Y,
    { width: contentWidth, align: 'left' }
  );

  const renderTable1Header = (headerY) => {
    doc.rect(startX, headerY, contentWidth, 18).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('No', startX + 4, headerY + 5, { width: 22, align: 'center' });
    doc.text('Nama Armada', startX + 28, headerY + 5, { width: 200, align: 'left' });
    doc.text('Status Saat Ini', startX + 232, headerY + 5, { width: 85, align: 'center' });
    doc.text('Siklus Kendala', startX + 320, headerY + 5, { width: 70, align: 'center' });
    doc.text('Riwayat Status & Catatan', startX + 392, headerY + 5, { width: 120, align: 'left' });
  };

  const tableHeaderY = section1Y + 16;
  renderTable1Header(tableHeaderY);
  doc.y = tableHeaderY + 18;

  vehicles.forEach((v, idx) => {
    const isNewPage = checkPageBreak(doc, 24, 735, 45);
    if (isNewPage) {
      renderTable1Header(doc.y);
      doc.y += 18;
    }
    const rowY = doc.y;
    if (idx % 2 === 1) {
      doc.rect(startX, rowY, contentWidth, 18).fill('#f8fafc');
    }

    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(String(idx + 1), startX + 4, rowY + 5, { width: 22, align: 'center' });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(
      v.vehicle_name,
      startX + 28, rowY + 5,
      { width: 200, align: 'left', lineBreak: false, ellipsis: true }
    );

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

    let statusDesc = 'Serviceable Penuh (Nihil Kendala)';
    let statusDescColor = '#15803d';

    const periods = v.issue_periods || v.transitions || [];

    if (isUnserv) {
      const activeIssue = periods.find((p) => p.status === 'ongoing' || !p.is_resolved) || periods[periods.length - 1];
      const issueText = activeIssue?.issue_description || activeIssue?.justification || v.justification || 'Dalam Perbaikan Kendala';
      statusDesc = `Dalam Perbaikan: ${issueText}`;
      statusDescColor = '#b91c1c';
    } else if (!isServ) {
      statusDesc = 'Menunggu Laporan Inspeksi PIC';
      statusDescColor = '#64748b';
    } else if (periodCount > 0 && periods.length > 0) {
      const latestPeriod = periods[periods.length - 1];
      const resInfo = latestPeriod.resolution_notes || latestPeriod.issue_description || latestPeriod.justification;
      if (resInfo) {
        statusDesc = `Pulih: ${resInfo}`;
      } else if (latestPeriod.resolved_date) {
        statusDesc = `Telah Pulih (${latestPeriod.resolved_date})`;
      } else {
        statusDesc = 'Telah Pulih (Serviceable)';
      }
      statusDescColor = '#475569';
    } else if (v.notes) {
      statusDesc = v.notes;
      statusDescColor = '#475569';
    } else {
      statusDesc = 'Serviceable Penuh (Nihil Kendala)';
      statusDescColor = '#15803d';
    }

    while (/^\[[^\]]+\]\s*/.test(statusDesc)) {
      statusDesc = statusDesc.replace(/^\[[^\]]+\]\s*/, '').trim();
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
  checkPageBreak(doc, 45, 735, 45);
  const section2Y = doc.y;
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    '2. AUDIT LOG PERGANTIAN STATUS & KRONOLOGI GANGGUAN FISIK',
    startX,
    section2Y,
    { width: contentWidth, align: 'left' }
  );

  const renderTable2Header = (headerY) => {
    doc.rect(startX, headerY, contentWidth, 18).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Tanggal/Shift', startX + 4, headerY + 5, { width: 75, align: 'left' });
    doc.text('Unit Armada', startX + 82, headerY + 5, { width: 65, align: 'left' });
    doc.text('Status Transisi', startX + 150, headerY + 5, { width: 95, align: 'center' });
    doc.text('Pelapor (PIC)', startX + 248, headerY + 5, { width: 80, align: 'left' });
    doc.text('Justifikasi & Tindakan Perbaikan', startX + 332, headerY + 5, { width: 180, align: 'left' });
  };

  const table2HeaderY = section2Y + 16;
  if (transitionLogs && transitionLogs.length > 0) {
    renderTable2Header(table2HeaderY);
    doc.y = table2HeaderY + 18;

    transitionLogs.forEach((t, idx) => {
      const isNewPage = checkPageBreak(doc, 26, 735, 45);
      if (isNewPage) {
        renderTable2Header(doc.y);
        doc.y += 18;
      }
      const rowY = doc.y;
      if (idx % 2 === 1) {
        doc.rect(startX, rowY, contentWidth, 20).fill('#f8fafc');
      }

      const shiftInfo = t.start_shift_number ? ` (S${t.start_shift_number})` : '';
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        `${t.start_date}${shiftInfo}`,
        startX + 4,
        rowY + 5,
        { width: 75, lineBreak: false, ellipsis: true }
      );
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(
        t.code_name || '-',
        startX + 82,
        rowY + 5,
        { width: 65, lineBreak: false, ellipsis: true }
      );

      const isResolved = t.is_resolved;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(isResolved ? '#15803d' : '#b91c1c').text(
        isResolved ? `Pulih (${t.resolved_date || 'Selesai'})` : 'Dalam Perbaikan',
        startX + 150, rowY + 5, { width: 95, align: 'center', lineBreak: false, ellipsis: true }
      );

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        t.reported_by || '-',
        startX + 248,
        rowY + 5,
        { width: 80, lineBreak: false, ellipsis: true }
      );

      let issueDesc = t.issue_description || t.justification || t.notes || '-';
      while (/^\[[^\]]+\]\s*/.test(issueDesc)) {
        issueDesc = issueDesc.replace(/^\[[^\]]+\]\s*/, '').trim();
      }

      let issueDetails = issueDesc;
      if (t.resolution_notes && t.resolution_notes !== issueDesc) {
        let resNotes = t.resolution_notes;
        while (/^\[[^\]]+\]\s*/.test(resNotes)) {
          resNotes = resNotes.replace(/^\[[^\]]+\]\s*/, '').trim();
        }
        issueDetails += ` • Tindakan: ${resNotes}`;
      }
      if (t.technician_vendor) {
        issueDetails += ` [Teknisi: ${t.technician_vendor}]`;
      }

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        issueDetails,
        startX + 332,
        rowY + 5,
        { width: 178, lineBreak: false, ellipsis: true }
      );

      doc.moveTo(startX, rowY + 20).lineTo(startX + contentWidth, rowY + 20).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + 20;
    });
  } else {
    doc.y = table2HeaderY;
    const emptyY = doc.y;
    doc.rect(startX, emptyY, contentWidth, 24).fillAndStroke('#f8fafc', '#cbd5e1');
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
    dept_head_signature_url,
    rank_position: dept_head_rank_position || rank_position || 'AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD',
    role: dept_head_rank_position || rank_position || 'AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD',
  }, startX, contentWidth);

  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • FLEET READINESS REPORT');

  return doc;
};
