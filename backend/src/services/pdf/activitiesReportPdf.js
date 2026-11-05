import PDFDocument from 'pdfkit';
import {
  applyWatermarkAndPageNumbers,
  drawOfficialHeader,
  drawSectionHeadSignature,
  checkPageBreak,
  formatIndonesianDate,
} from '../pdfBaseHelper.js';

/**
 * Format string kategori aktivitas menjadi teks rapi tanpa underscore (Title Case)
 * Contoh: 'latihan_gabungan' -> 'Latihan Gabungan'
 */
export const formatActivityCategory = (categoryStr) => {
  if (!categoryStr || categoryStr === 'ALL' || categoryStr === 'all') return 'Semua Kategori';
  const str = String(categoryStr).trim();
  const lower = str.toLowerCase();

  const map = {
    serah_terima: 'Serah Terima Shift',
    apel_briefing: 'Apel & Briefing',
    periksa_armada: 'Pemeriksaan Armada',
    periksa_peralatan: 'Pemeriksaan Peralatan',
    latihan_drill: 'Latihan & Fire Drill',
    pemeliharaan: 'Pemeliharaan Fasilitas',
    sosialisasi_keselamatan: 'Inspeksi & Keselamatan',
    catatan_kendala: 'Catatan & Kendala',
  };

  if (map[lower]) return map[lower];

  return lower
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Membuat stream PDF Laporan Rekapitulasi Logbook Kegiatan Rutin Operasional ARFF (A4 Portrait)
 */
export const generateActivitiesReportPdf = async (reportData = {}) => {
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

  const todayWib = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const {
    periodLabel = '1 Bulan Terakhir',
    startDate = todayWib,
    endDate = todayWib,
    activities = [],
    summary = {},
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = '-',
    dept_head_signature_url = null,
  } = reportData;

  const contentWidth = 515;
  const startX = 40;

  // 1. Header Dokumen Resmi Terpusat (Kop PT Angkasa Pura Indonesia & Garis Ganda)
  drawOfficialHeader(
    doc,
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    'LAPORAN RESMI REKAPITULASI LOGBOOK KEGIATAN OPERASIONAL DINAS',
    contentWidth,
    startX
  );

  // 2. Kotak Parameter & Ringkasan Laporan (Width terkontrol agar tidak tumpang tindih)
  const metaBoxY = doc.y + 4;
  const metaBoxH = 38;
  doc.rect(startX, metaBoxY, contentWidth, metaBoxH).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = metaBoxY + 6;
  const infoY2 = metaBoxY + 20;

  const formattedStart = formatIndonesianDate(startDate);
  const formattedEnd = formatIndonesianDate(endDate);

  let periodSummaryText = '';
  if (formattedStart === formattedEnd) {
    periodSummaryText = formattedStart;
  } else {
    periodSummaryText = `${formattedStart} s.d. ${formattedEnd}`;
  }
  if (periodLabel && !periodLabel.toLowerCase().includes('kustom') && !periodLabel.toLowerCase().includes('custom')) {
    periodSummaryText = `${periodLabel} (${periodSummaryText})`;
  }

  // Baris 1: Periode & Total Kegiatan
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(
    'Periode Laporan:',
    startX + 10,
    infoY,
    { width: 85, lineBreak: false }
  );
  doc.font('Helvetica').fillColor('#334155').text(
    periodSummaryText,
    startX + 95,
    infoY,
    { width: 235, lineBreak: false, ellipsis: true }
  );

  doc.font('Helvetica-Bold').fillColor('#0f172a').text(
    'Total Kegiatan:',
    startX + 335,
    infoY,
    { width: 75, lineBreak: false }
  );
  doc.font('Helvetica-Bold').fillColor('#0284c7').text(
    `${activities.length} Kegiatan Terdata`,
    startX + 412,
    infoY,
    { width: 95, lineBreak: false }
  );

  // Baris 2: Filter Kategori & Regu Terdata
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(
    'Filter Kategori:',
    startX + 10,
    infoY2,
    { width: 85, lineBreak: false }
  );

  const categoryDisplay = formatActivityCategory(summary.categoryLabel || summary.category || 'Semua Kategori');
  doc.font('Helvetica').fillColor('#334155').text(
    categoryDisplay,
    startX + 95,
    infoY2,
    { width: 235, lineBreak: false, ellipsis: true }
  );

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(
    'Regu Terdata:',
    startX + 335,
    infoY2,
    { width: 75, lineBreak: false }
  );
  doc.font('Helvetica').fillColor('#334155').text(
    summary.teamLabel || 'Seluruh Regu (A-D)',
    startX + 412,
    infoY2,
    { width: 95, lineBreak: false, ellipsis: true }
  );

  // 3. Judul Bagian Tabel (Explicit startX & Y untuk mencegah cursor leak)
  const sectionTitleY = metaBoxY + metaBoxH + 10;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text(
    'DAFTAR LOGBOOK AKTIVITAS & KEGIATAN DINAS OPERASIONAL',
    startX,
    sectionTitleY,
    { width: contentWidth, align: 'left' }
  );
  doc.y = sectionTitleY + 14;

  // Fungsi penggambar header tabel berulang (Anti-slop: Abu-abu halus #f1f5f9, stroke #cbd5e1, teks #0f172a bold)
  const drawTableHeader = (y) => {
    doc.rect(startX, y, contentWidth, 18).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('No', startX + 4, y + 5, { width: 20, align: 'center', lineBreak: false });
    doc.text('Tanggal & Shift', startX + 26, y + 5, { width: 85, align: 'left', lineBreak: false });
    doc.text('Jam (WIB)', startX + 113, y + 5, { width: 45, align: 'center', lineBreak: false });
    doc.text('Kategori', startX + 160, y + 5, { width: 85, align: 'left', lineBreak: false });
    doc.text('Judul Aktivitas & Uraian Pelaksanaan', startX + 248, y + 5, { width: 260, align: 'left', lineBreak: false });
    doc.y = y + 18;
  };

  if (activities.length === 0) {
    const emptyY = doc.y;
    doc.rect(startX, emptyY, contentWidth, 24).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
      'Tidak ada catatan aktivitas operasional yang terdata pada periode ini.',
      startX + 12,
      emptyY + 7,
      { width: contentWidth - 24, align: 'left', lineBreak: false }
    );
    doc.y = emptyY + 34;
  } else {
    // Gambar header tabel pertama
    drawTableHeader(doc.y);

    activities.forEach((act, idx) => {
      // Gabungkan Judul, Uraian Kegiatan, dan Catatan Hasil Inspeksi / Tindak Lanjut jika ada
      const titleText = act.title || '-';
      let fullUraian = (act.description || '').trim();
      if (act.result_notes && act.result_notes.trim()) {
        const cleanResult = act.result_notes.trim();
        if (fullUraian) {
          fullUraian += ` • Catatan/Hasil: ${cleanResult}`;
        } else {
          fullUraian = `Catatan/Hasil: ${cleanResult}`;
        }
      }
      if (!fullUraian) fullUraian = '-';

      // Hitung tinggi teks untuk penentuan tinggi baris yang proporsional
      doc.fontSize(7).font('Helvetica-Bold');
      const titleH = Math.min(doc.heightOfString(titleText, { width: 260 }), 18);
      doc.fontSize(6.5).font('Helvetica');
      const descH = doc.heightOfString(fullUraian, { width: 260 });
      const cappedDescH = Math.min(descH, 45); // Batas aman tampilan paragraf uraian
      const rowH = Math.max(26, titleH + 2 + cappedDescH + 10);

      // Cek apakah baris membutuhkan halaman baru (Threshold 720pt untuk memastikan tidak terpotong di tepi bawah)
      const isNewPage = checkPageBreak(doc, rowH, 720, 35);
      if (isNewPage) {
        drawTableHeader(doc.y);
      }

      const rowY = doc.y;

      // Background selang-seling (zebra stripe)
      if (idx % 2 === 1) {
        doc.rect(startX, rowY, contentWidth, rowH).fill('#f8fafc');
      }

      // Kolom 1: No
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        String(idx + 1),
        startX + 4,
        rowY + 5,
        { width: 20, align: 'center', lineBreak: false }
      );

      // Kolom 2: Tanggal & Shift (Tanggal Indonesia + Shift Info)
      const shiftDateFormatted = act.shift_date ? formatIndonesianDate(act.shift_date) : '-';
      const shiftLabel = act.shift_number
        ? `Shift ${act.shift_number} (${act.team_group || '-'})`
        : (act.team_group ? `Regu ${act.team_group}` : '-');

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(
        shiftDateFormatted,
        startX + 26,
        rowY + 5,
        { width: 85, lineBreak: false, ellipsis: true }
      );
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b').text(
        shiftLabel,
        startX + 26,
        rowY + 15,
        { width: 85, lineBreak: false, ellipsis: true }
      );

      // Kolom 3: Jam (WIB)
      const timeStr = act.activity_time ? act.activity_time.substring(0, 5) : '-';
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0284c7').text(
        timeStr,
        startX + 113,
        rowY + 5,
        { width: 45, align: 'center', lineBreak: false }
      );

      // Kolom 4: Kategori (Rapi tanpa underscore, Title Case)
      const catLabel = formatActivityCategory(act.activity_type);
      doc.fontSize(7).font('Helvetica').fillColor('#334155').text(
        catLabel,
        startX + 160,
        rowY + 5,
        { width: 85 }
      );

      // Kolom 5: Judul Aktivitas & Uraian Pelaksanaan (termasuk result_notes)
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(
        titleText,
        startX + 248,
        rowY + 5,
        { width: 260, height: titleH + 1, ellipsis: true }
      );
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b').text(
        fullUraian,
        startX + 248,
        rowY + 5 + titleH + 2,
        { width: 260, height: cappedDescH, ellipsis: true }
      );

      // Garis batas antar baris
      doc.moveTo(startX, rowY + rowH).lineTo(startX + contentWidth, rowY + rowH).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + rowH;
    });
  }

  // 4. Tanda Tangan Section Head Terpusat (Otomatis titimangsa Kulon Progo)
  await drawSectionHeadSignature(
    doc,
    {
      dept_head_name,
      dept_head_nip,
      dept_head_signature_url,
      isDraft: false,
    },
    startX,
    contentWidth
  );

  // 5. Watermark Transparan & Penomoran Halaman Otomatis
  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • ACTIVITIES LOGBOOK REPORT');

  return doc;
};
