import PDFDocument from 'pdfkit';
import {
  applyWatermarkAndPageNumbers,
  drawOfficialHeader,
  drawDailySignatures,
  drawTableHeaderRow,
  checkPageBreak,
  formatIndonesianDate,
} from './pdfHelpers.js';

/**
 * Membuat stream PDF Dokumen Resmi Laporan Harian Kesiapan Armada & Operasional ARFF (3 Shift)
 * @param {Object} reportData Data lengkap harian, matriks kesiapan armada 3 shift, personel, aktivitas 24 jam, insiden
 * @returns {Promise<PDFDocument>} Stream dokumen PDF
 */
export const generateShiftReportPdf = async (reportData) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: `Laporan Harian ARFF YIA - ${reportData.shift_date || ''}`,
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Laporan Harian Kesiapan Armada & Operasional Airside'
    },
    bufferPages: true,
  });

  const {
    shift_date = new Date().toISOString().split('T')[0],
    roster = { shift_1: 'Alpha', shift_2: 'Bravo', shift_3: 'Charlie', off_team: 'Delta' },
    matrixVehicles = [],
    vehicles = [],
    personnelSummary = {},
    activities = [],
    incidents = [],
    chiefs = {},
    chiefsList = [],
    deptHeadData = {},
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = null,
    dept_head_signature_url = null,
  } = reportData;

  const startX = 40;
  const contentWidth = 515;

  // Header Dokumen Resmi Terpusat (Kop PT Angkasa Pura Indonesia & Garis Ganda tanpa teks judul panjang ganda)
  drawOfficialHeader(
    doc,
    null,
    null,
    contentWidth,
    startX
  );

  // Strip Informasi Tanggal Kedinasan Ringkas (CUKUP TANGGAL SAJA)
  const boxY = 82;
  doc.rect(startX, boxY, contentWidth, 20).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = boxY + 5;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Hari / Tanggal: ', startX + 10, infoY, { continued: true });
  doc.font('Helvetica').text(formatIndonesianDate(shift_date, { includeDay: true }));

  doc.y = boxY + 28;
  let secNum = 1;

  // =========================================================================
  // SEKSI 1: MATRIKS KESIAPAN ARMADA OPERASIONAL & POSKO KOMUNIKASI
  // Format Kolom Ringkas: No | Armada | [Regu 1] | [Regu 2] | [Regu 3] (Tanpa Kolom Catatan / Kendala)
  // =========================================================================
  checkPageBreak(doc, 45, 740, 35);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. MATRIKS KESIAPAN ARMADA OPERASIONAL & POSKO KOMUNIKASI`,
    startX,
    doc.y,
    { width: contentWidth }
  );
  doc.moveDown(0.3);

  const team1 = roster?.shift_1 || 'Shift 1';
  const team2 = roster?.shift_2 || 'Shift 2';
  const team3 = roster?.shift_3 || 'Shift 3';

  // Total width: 30 + 245 + 80 + 80 + 80 = 515 pt (Exact A4 Portrait fit)
  const matrixColumns = [
    { x: startX + 4, width: 26, header: 'No', align: 'center', padX: 1 },
    { x: startX + 32, width: 241, header: 'Armada', padX: 2 },
    { x: startX + 275, width: 78, header: team1, align: 'center', padX: 1 },
    { x: startX + 355, width: 78, header: team2, align: 'center', padX: 1 },
    { x: startX + 435, width: 78, header: team3, align: 'center', padX: 1 },
  ];

  const drawMatrixHeader = (headY) => {
    drawTableHeaderRow(doc, headY, matrixColumns, startX, contentWidth, 18);
  };

  const vHeadY = doc.y;
  drawMatrixHeader(vHeadY);

  let curY = vHeadY + 18;
  const unitList = matrixVehicles.length > 0 ? matrixVehicles : vehicles;

  if (unitList.length === 0) {
    doc.rect(startX, curY, contentWidth, 18).fillAndStroke('#ffffff', '#cbd5e1');
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Belum ada data armada untuk tanggal ini.', startX + 10, curY + 5, { width: contentWidth - 20 });
    curY += 18;
  } else {
    unitList.forEach((v, idx) => {
      if (curY + 18 > 740) {
        doc.addPage();
        drawMatrixHeader(35);
        curY = 35 + 18;
      }

      // Shift 1 status
      const s1Raw = v.shift_1?.status || (v.shift_number === 1 ? v.status : 'belum_dilaporkan');
      const s1Serv = s1Raw === 'serviceable';
      const s1Unserv = s1Raw === 'unserviceable';
      const s1Label = s1Serv ? 'Serviceable' : s1Unserv ? 'Unserviceable' : 'Belum Dicek';
      const s1Color = s1Serv ? '#15803d' : s1Unserv ? '#b91c1c' : '#64748b';

      // Shift 2 status
      const s2Raw = v.shift_2?.status || (v.shift_number === 2 ? v.status : 'belum_dilaporkan');
      const s2Serv = s2Raw === 'serviceable';
      const s2Unserv = s2Raw === 'unserviceable';
      const s2Label = s2Serv ? 'Serviceable' : s2Unserv ? 'Unserviceable' : 'Belum Dicek';
      const s2Color = s2Serv ? '#15803d' : s2Unserv ? '#b91c1c' : '#64748b';

      // Shift 3 status
      const s3Raw = v.shift_3?.status || (v.shift_number === 3 ? v.status : 'belum_dilaporkan');
      const s3Serv = s3Raw === 'serviceable';
      const s3Unserv = s3Raw === 'unserviceable';
      const s3Label = s3Serv ? 'Serviceable' : s3Unserv ? 'Unserviceable' : 'Belum Dicek';
      const s3Color = s3Serv ? '#15803d' : s3Unserv ? '#b91c1c' : '#64748b';

      const unitName = v.vehicle_name || v.code_name || 'Unit';

      doc.rect(startX, curY, contentWidth, 18).fillAndStroke(idx % 2 === 1 ? '#f8fafc' : '#ffffff', '#e2e8f0');
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text(String(idx + 1), startX + 4, curY + 5, { width: 26, align: 'center', lineBreak: false });
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(unitName, startX + 32, curY + 5, { width: 241, lineBreak: false, ellipsis: true });

      // Shift 1
      doc.font('Helvetica-Bold').fillColor(s1Color).text(s1Label, startX + 275, curY + 5, { width: 78, align: 'center', lineBreak: false, ellipsis: true });
      // Shift 2
      doc.font('Helvetica-Bold').fillColor(s2Color).text(s2Label, startX + 355, curY + 5, { width: 78, align: 'center', lineBreak: false, ellipsis: true });
      // Shift 3
      doc.font('Helvetica-Bold').fillColor(s3Color).text(s3Label, startX + 435, curY + 5, { width: 78, align: 'center', lineBreak: false, ellipsis: true });

      curY += 18;
    });
  }

  doc.y = curY + 8;

  // =========================================================================
  // SEKSI 2: KEKUATAN & DISTRIBUSI PERSONEL DINAS (3 REGU OPERASIONAL)
  // =========================================================================
  checkPageBreak(doc, 50, 740, 35);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. KEKUATAN & DISTRIBUSI PERSONEL DINAS (3 REGU OPERASIONAL)`,
    startX,
    doc.y,
    { width: contentWidth }
  );
  doc.moveDown(0.3);

  const shiftsConfig = [
    { num: 1, team: team1, label: 'Shift 1 (Pagi 07:00 – 13:00 WIB)', data: personnelSummary?.shift_1 },
    { num: 2, team: team2, label: 'Shift 2 (Siang 13:00 – 20:00 WIB)', data: personnelSummary?.shift_2 },
    { num: 3, team: team3, label: 'Shift 3 (Malam 20:00 – 07:00 WIB)', data: personnelSummary?.shift_3 },
  ];

  const colBoxW = 166;
  const colGap = 8;
  const boxH = 46;

  checkPageBreak(doc, boxH + 6, 740, 35);
  const pBoxY = doc.y;

  shiftsConfig.forEach((sc, i) => {
    const bx = startX + i * (colBoxW + colGap);
    const pData = sc.data || {};
    const presentCount = pData.present_count || (Array.isArray(pData.present) ? pData.present.length : 0);
    const absentList = Array.isArray(pData.absents) ? pData.absents : [];
    const absentCount = absentList.length;

    doc.rect(bx, pBoxY, colBoxW, boxH).fillAndStroke('#f8fafc', '#cbd5e1');

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
      .text(sc.label, bx + 6, pBoxY + 5, { width: colBoxW - 12, lineBreak: false, ellipsis: true });

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#15803d')
      .text(`Regu ${sc.team}: `, bx + 6, pBoxY + 18, { continued: true })
      .font('Helvetica').fillColor('#0f172a')
      .text(`${presentCount} Hadir Bertugas`, { continued: false });

    if (absentCount > 0) {
      const absNotes = absentList.map(a => `${a.full_name || 'Personel'} (${(a.absent_reason || 'Cuti').toUpperCase()})`).join(', ');
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#b91c1c')
        .text(`Cuti/Izin (${absentCount}): ${absNotes}`, bx + 6, pBoxY + 30, { width: colBoxW - 12, lineBreak: false, ellipsis: true });
    } else {
      doc.fontSize(7).font('Helvetica').fillColor('#64748b')
        .text('Nihil personel izin / cuti dinas.', bx + 6, pBoxY + 30, { width: colBoxW - 12, lineBreak: false, ellipsis: true });
    }
  });

  doc.y = pBoxY + boxH + 8;

  // =========================================================================
  // SEKSI 3: JURNAL KEGIATAN RUTIN OPERASIONAL (24 JAM)
  // =========================================================================
  checkPageBreak(doc, 45, 740, 35);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. JURNAL KEGIATAN RUTIN OPERASIONAL (24 JAM)`,
    startX,
    doc.y,
    { width: contentWidth }
  );
  doc.moveDown(0.3);

  if (activities.length === 0) {
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
      'Belum ada agenda operasional harian yang tercatat.',
      startX,
      doc.y,
      { width: contentWidth }
    );
    doc.moveDown(0.6);
  } else {
    activities.forEach((act, idx) => {
      const timeStr = act.activity_time ? act.activity_time.substring(0, 5) : '-';
      const shiftTag = act.shift_number ? ` [Shift ${act.shift_number}]` : '';
      const prefix = `${idx + 1}. [${timeStr} WIB]${shiftTag} ${act.title || 'Kegiatan'}: `;
      const desc = act.description || '-';
      const fullText = `${prefix}${desc}`;

      doc.fontSize(8).font('Helvetica');
      const actHeight = doc.heightOfString(fullText, { width: contentWidth }) + 6;

      checkPageBreak(doc, actHeight, 740, 35);

      const itemY = doc.y;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(
        prefix,
        startX,
        itemY,
        { continued: true, width: contentWidth }
      ).font('Helvetica').fillColor('#475569').text(desc, { width: contentWidth });
      doc.moveDown(0.3);
    });
    doc.moveDown(0.5);
  }

  // =========================================================================
  // SEKSI 4: REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL (24 JAM)
  // =========================================================================
  checkPageBreak(doc, 45, 740, 35);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `${secNum++}. REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL (24 JAM)`,
    startX,
    doc.y,
    { width: contentWidth }
  );
  doc.moveDown(0.3);

  if (incidents.length === 0) {
    checkPageBreak(doc, 25, 740, 35);
    const nihilBoxY = doc.y;
    doc.rect(startX, nihilBoxY, contentWidth, 18).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#15803d').text(
      'NIHIL — Seluruh operasional penerbangan dan fasilitas bandara berlangsung dalam kondisi aman terkendali.',
      startX + 10,
      nihilBoxY + 5,
      { width: contentWidth - 20, lineBreak: false, ellipsis: true }
    );
    doc.y = nihilBoxY + 24;
  } else {
    incidents.forEach((inc, idx) => {
      const shiftTag = inc.shift_number ? ` (Shift ${inc.shift_number} - Regu ${inc.team_group || '-'})` : '';
      const titleText = `${idx + 1}. [${inc.report_number || 'INSIDEN'}] ${inc.title || 'Laporan Kejadian'}${shiftTag} (Waktu: ${inc.incident_time || '-'})`;
      const detailText = `Lokasi: ${inc.location || '-'} | Tindakan: ${inc.action_taken || '-'}`;

      doc.fontSize(8).font('Helvetica-Bold');
      const titleH = doc.heightOfString(titleText, { width: contentWidth - 20 });

      doc.fontSize(7.5).font('Helvetica');
      const detailH = doc.heightOfString(detailText, { width: contentWidth - 20 });

      const totalBoxH = Math.max(26, titleH + detailH + 10);
      checkPageBreak(doc, totalBoxH + 6, 740, 35);

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
      doc.y = incBoxY + totalBoxH + 6;
    });
  }

  // =========================================================================
  // BLOK TANDA TANGAN PEJABAT RESMI
  // 3 Ketua Regu di KIRI (Kolom 1, 2, 3), Section Head di KANAN (Kolom 4 dengan Titimangsa Kulon Progo)
  // =========================================================================
  checkPageBreak(doc, 115, 740, 35);
  doc.moveDown(1.2);

  const chiefsArr = chiefsList.length >= 3
    ? chiefsList
    : [
        chiefs.shift_1 || { team: team1 },
        chiefs.shift_2 || { team: team2 },
        chiefs.shift_3 || { team: team3 },
      ];

  const sectionHeadObj = {
    name: deptHeadData?.name || dept_head_name || 'Airport Rescue & Fire Fighting Section Head',
    nip: deptHeadData?.nip || dept_head_nip,
    signature_url: deptHeadData?.signature_url || dept_head_signature_url,
  };

  await drawDailySignatures(
    doc,
    {
      chiefs: chiefsArr,
      sectionHead: sectionHeadObj,
      shiftDate: shift_date,
    },
    startX,
    contentWidth
  );

  // Watermark Resmi & Penomoran Halaman Otomatis (Watermark Bersih: 'ARFF YIA • DAILY OPS REPORT')
  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • DAILY OPS REPORT');

  return doc;
};
