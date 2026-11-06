import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * PDF Base Helper - Modul Sentral Generator Dokumen PDF ARFF YIA
 * Memusatkan Kop Resmi Kedinasan, format tanggal Indonesia, blok tanda tangan pejabat,
 * watermark dinamis, cache in-memory, deteksi status sah shift otomatis, dan socket leak guard.
 */

// 1. Direktori Uploads Aman
const getSafeUploadsDirs = () => {
  const dirs = [
    path.resolve(process.cwd(), 'backend', 'uploads'),
    path.resolve(process.cwd(), 'uploads')
  ];
  return dirs.filter((d) => fs.existsSync(d));
};

// 2. In-Memory Signature Buffer Cache
const signatureBufferCache = new Map();

export const clearSignatureBufferCache = () => {
  signatureBufferCache.clear();
};

/**
 * Mengambil Buffer gambar tanda tangan secara aman, mentranscode WebP ke PNG jika perlu.
 * Menggunakan sanitasi path.basename untuk mencegah path traversal vulnerability.
 */
export const resolveSignatureBuffer = async (fileUrl) => {
  if (!fileUrl) return null;
  // Bersihkan query string parameter (seperti ?token=... atau ?v=...) sebelum path.basename
  const cleanUrl = fileUrl.split('?')[0].split('#')[0];
  const filename = path.basename(cleanUrl);
  if (!filename || filename === '.' || filename === '/' || filename.includes('..')) return null;

  if (signatureBufferCache.has(filename)) {
    return signatureBufferCache.get(filename);
  }

  const uploadDirs = getSafeUploadsDirs();
  for (const dir of uploadDirs) {
    const candidate = path.resolve(dir, filename);
    if (!candidate.startsWith(dir)) continue;

    if (fs.existsSync(candidate)) {
      const ext = path.extname(candidate).toLowerCase();
      try {
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          const buf = fs.readFileSync(candidate);
          signatureBufferCache.set(filename, buf);
          return buf;
        }
        if (ext === '.webp') {
          const pngBuffer = await sharp(candidate).png().toBuffer();
          signatureBufferCache.set(filename, pngBuffer);
          return pngBuffer;
        }
      } catch (err) {
        console.warn(`[PDFKit] Gagal mentranscode tanda tangan ${filename}:`, err.message);
        return null;
      }
    }
  }
  return null;
};

// 3. In-Memory Cache untuk Dokumen PDF dengan batas LRU
const pdfMemoryCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 detik
const MAX_DOCS = 10;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB
let currentTotalBytes = 0;

export const getPdfCache = (key) => {
  const item = pdfMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    currentTotalBytes -= (item.buffer?.length || 0);
    pdfMemoryCache.delete(key);
    return null;
  }
  // LRU: geser entri ke posisi terbaru
  pdfMemoryCache.delete(key);
  pdfMemoryCache.set(key, item);
  return item.buffer;
};

export const setPdfCache = (key, buffer) => {
  if (!buffer) return;
  const bufferSize = buffer.length || 0;

  if (pdfMemoryCache.has(key)) {
    const existing = pdfMemoryCache.get(key);
    currentTotalBytes -= (existing.buffer?.length || 0);
    pdfMemoryCache.delete(key);
  }

  while (pdfMemoryCache.size >= MAX_DOCS || (currentTotalBytes + bufferSize > MAX_TOTAL_BYTES && pdfMemoryCache.size > 0)) {
    const oldestKey = pdfMemoryCache.keys().next().value;
    const oldestItem = pdfMemoryCache.get(oldestKey);
    currentTotalBytes -= (oldestItem?.buffer?.length || 0);
    pdfMemoryCache.delete(oldestKey);
  }

  currentTotalBytes = Math.max(0, currentTotalBytes + bufferSize);
  pdfMemoryCache.set(key, { buffer, timestamp: Date.now() });
};

export const clearPdfCache = () => {
  pdfMemoryCache.clear();
  currentTotalBytes = 0;
  signatureBufferCache.clear();
};

// 4. Format Tanggal & Waktu Bahasa Indonesia Baku
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDO_DAYS = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export const formatIndonesianDate = (dateInput, { includeDay = false } = {}) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const dayName = INDO_DAYS[d.getDay()];
  const dateNum = d.getDate();
  const monthName = INDO_MONTHS[d.getMonth()];
  const year = d.getFullYear();

  return includeDay
    ? `${dayName}, ${dateNum} ${monthName} ${year}`
    : `${dateNum} ${monthName} ${year}`;
};

export const formatIndonesianTime = (timeInput) => {
  if (!timeInput) return '-';
  const str = String(timeInput).trim();
  const clean = str.substring(0, 5);
  return `${clean} WIB`;
};

export const formatIndonesianDateTime = (dateInput, timeInput) => {
  const dateStr = formatIndonesianDate(dateInput);
  const timeStr = timeInput ? formatIndonesianTime(timeInput) : '';
  return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
};

// 5. Deteksi Status Sah Dokumen Shift Otomatis (Perbaikan Permanently Draft Bug)
/**
 * Menentukan apakah shift telah selesai dan dianggap sah secara resmi:
 * - Jika status di DB sudah 'closed' atau 'approved' -> true
 * - Jika tanggal shift < hari ini -> true (memperhitungkan shift 3 malam yang berakhir jam 07:00 WIB)
 * - Jika tanggal shift == hari ini dan jam shift telah berakhir -> true:
 *     * Shift 1 (07:00 - 13:00 WIB) sah setelah >= 13:00 WIB
 *     * Shift 2 (13:00 - 20:00 WIB) sah setelah >= 20:00 WIB
 *     * Shift 3 (20:00 - 07:00 WIB) baru sah besok pagi setelah >= 07:00 WIB
 * - Jika shift masih berlangsung atau di masa depan -> false (Draft)
 */
export const isShiftOfficial = (shiftDateOrObj, shiftNumber = null, status = '', customNow = null) => {
  let shiftDateStr = shiftDateOrObj;
  let sNum = shiftNumber;
  let sStatus = status;
  let cNow = customNow;

  if (typeof shiftDateOrObj === 'object' && shiftDateOrObj !== null) {
    shiftDateStr = shiftDateOrObj.shift_date || shiftDateOrObj.date;
    sNum = shiftDateOrObj.shift_number ?? shiftNumber;
    sStatus = shiftDateOrObj.status ?? status ?? '';
    cNow = shiftDateOrObj.now ?? customNow;
  }

  const normStatus = (sStatus || '').toLowerCase();
  if (normStatus === 'closed' || normStatus === 'approved') {
    return true;
  }

  if (!shiftDateStr) return false;

  const now = cNow || new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibDate = new Date(utcMs + (7 * 3600000));

  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  const todayWibStr = `${year}-${month}-${day}`;

  const currentMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();
  const normalizedShiftDate = String(shiftDateStr).substring(0, 10);

  if (normalizedShiftDate < todayWibStr) {
    const shiftDateObj = new Date(normalizedShiftDate + 'T00:00:00+07:00');
    const todayDateObj = new Date(todayWibStr + 'T00:00:00+07:00');
    const diffDays = Math.round((todayDateObj - shiftDateObj) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      return true;
    }

    if (diffDays === 1) {
      if (Number(sNum) === 3 || sNum === null || sNum === undefined) {
        // Shift 3 kemarin (atau laporan harian penuh 24 jam) berakhir hari ini pukul 07:00 WIB (menit 420)
        return currentMinutes >= 420;
      }
      return true;
    }

    return true;
  }

  if (normalizedShiftDate === todayWibStr) {
    const num = Number(sNum) || 0;
    if (num === 1) {
      // 07:00 - 13:00 WIB (selesai jam 13:00 = 780 menit)
      return currentMinutes >= 780;
    } else if (num === 2) {
      // 13:00 - 20:00 WIB (selesai jam 20:00 = 1200 menit)
      return currentMinutes >= 1200;
    } else if (num === 3) {
      // Shift 3 dimulai jam 20:00 hari ini dan berakhir besok jam 07:00 WIB
      return false;
    } else {
      // Laporan harian penuh 24 jam baru sah setelah shift 3 berakhir besok jam 07:00 WIB
      return false;
    }
  }

  return false;
};

// 6. Header Kop Resmi Kedinasan PT Angkasa Pura Indonesia & Bandara Internasional Yogyakarta
export const drawOfficialHeader = (
  doc,
  title = null,
  subtitle = null,
  contentWidth = 515,
  startX = 40
) => {
  let cWidth = contentWidth;
  let sX = startX;
  let docTitle = title;
  let docSubTitle = subtitle;

  // Normalisasi pemanggilan parameter fleksibel / backward compatibility
  if (typeof subtitle === 'number') {
    sX = typeof contentWidth === 'number' ? contentWidth : 40;
    cWidth = subtitle;
    docTitle = title;
    docSubTitle = null;
  } else if (title && (title.includes('ARFF') || title.includes('SECTION')) && subtitle) {
    docTitle = subtitle;
    docSubTitle = null;
  }

  // 1. Kop Instansi Baku 4 Baris (Standarisasi Kedinasan PT Angkasa Pura Indonesia YIA)
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    'PT ANGKASA PURA INDONESIA',
    sX,
    25,
    { align: 'center', width: cWidth }
  );
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155').text(
    'KANTOR CABANG BANDARA INTERNASIONAL YOGYAKARTA (YIA)',
    sX,
    38,
    { align: 'center', width: cWidth }
  );
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    sX,
    50,
    { align: 'center', width: cWidth }
  );
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#b91c1c').text(
    'KODE WAHI • KATEGORI 8',
    sX,
    62,
    { align: 'center', width: cWidth }
  );

  // 2. Garis ganda pemisah kop kedinasan tebal (1.5pt) dan tipis (0.5pt)
  doc.moveTo(sX, 73).lineTo(sX + cWidth, 73).lineWidth(1.5).strokeColor('#1e293b').stroke();
  doc.moveTo(sX, 75.5).lineTo(sX + cWidth, 75.5).lineWidth(0.5).strokeColor('#94a3b8').stroke();

  // 3. Judul Dokumen & Subjudul di BAWAH garis kop resmi
  let currentY = 82;
  if (docTitle) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(
      docTitle,
      sX,
      currentY,
      { align: 'center', width: cWidth }
    );
    currentY += 14;
  }
  if (docSubTitle) {
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
      docSubTitle,
      sX,
      currentY,
      { align: 'center', width: cWidth }
    );
    currentY += 12;
  }

  doc.y = currentY + 4;
};

// 7. Pemeriksa Sisa Ruang Halaman
export const checkPageBreak = (doc, neededHeight, maxHeight = 740, newPageY = 35) => {
  if (doc.y + neededHeight > maxHeight) {
    doc.addPage();
    doc.y = newPageY;
    return true;
  }
  return false;
};

// 7b. Helper Render Header Tabel Profesional (Anti-Slop: Latar Abu-abu Halus, Border Tegas, Teks Gelap)
export const drawTableHeaderRow = (
  doc,
  y,
  columns,
  startX = 40,
  contentWidth = 515,
  height = 18
) => {
  doc.rect(startX, y, contentWidth, height).fillAndStroke('#f1f5f9', '#cbd5e1');
  let curX = startX;
  columns.forEach((col) => {
    const colX = col.x !== undefined ? col.x : curX;
    const colW = col.width || 50;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(
      col.header || col.title || '',
      colX + (col.padX || 2),
      y + 5,
      { width: colW - ((col.padX || 2) * 2), align: col.align || 'left', lineBreak: false, ellipsis: true }
    );
    curX += colW;
  });
  return y + height;
};

// 8. Tanda Tangan Section Head
export const drawSectionHeadSignature = async (
  doc,
  signatory = {},
  startX = 40,
  contentWidth = 515,
  signY = null
) => {
  let y = signY;
  if (y === null || y === undefined) {
    checkPageBreak(doc, 115, 740, 45);
    doc.moveDown(1.5);
    y = doc.y;
  }

  const name = signatory.dept_head_name || signatory.name || 'Airport Rescue & Fire Fighting Section Head';
  const nip = signatory.dept_head_nip || signatory.nip;
  const signatureUrl = signatory.dept_head_signature_url || signatory.signature_url || signatory.signatureUrl;
  const signatureBuffer = signatory.signatureBuffer;
  const title = signatory.title || 'Mengetahui / Mengesahkan,';
  const role = signatory.role || signatory.rank_position || 'AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD';
  const isDraft = signatory.isDraft ?? (signatory.isClosed === false);
  const blockWidth = signatory.width || 220;
  const blockX = signatory.x !== undefined ? signatory.x : (startX + contentWidth - blockWidth);
  const imgFit = signatory.imgFit || [110, 40];
  const imgX = signatory.imgX !== undefined ? signatory.imgX : (blockX + (blockWidth - imgFit[0]) / 2);

  // Titimangsa resmi di atas jabatan
  const todayIndo = formatIndonesianDate(new Date().toISOString().split('T')[0]);
  const placeDate = signatory.place_date !== undefined ? signatory.place_date : `Kulon Progo, ${todayIndo}`;

  let curY = y;
  if (placeDate) {
    doc.fontSize(8).font('Helvetica').fillColor('#475569').text(placeDate, blockX, curY, { width: blockWidth, align: 'center' });
    curY += 12;
  }

  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text(title, blockX, curY, { width: blockWidth, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(role, blockX, curY + 12, { width: blockWidth, align: 'center' });

  if (isDraft) {
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94a3b8').text(
      '( Menunggu Pengesahan Dinas )',
      blockX,
      curY + 40,
      { width: blockWidth, align: 'center' }
    );
  } else {
    const sigBuf = signatureBuffer || (signatureUrl ? await resolveSignatureBuffer(signatureUrl) : null);
    if (sigBuf) {
      try {
        doc.image(sigBuf, imgX, curY + 25, { fit: imgFit, align: 'center' });
      } catch (e) {
        console.warn('[PDFKit] Gagal memuat tanda tangan Section Head:', e.message);
      }
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(`( ${name} )`, blockX, curY + 68, { width: blockWidth, align: 'center' });
  if (nip && nip !== '-') {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`NIP. ${nip}`, blockX, curY + 80, { width: blockWidth, align: 'center' });
  }

  return curY + 92;
};

// 9. Tanda Tangan Supervisor Dinas / Ketua Regu
export const drawChiefSignature = async (
  doc,
  chief = {},
  startX = 40,
  contentWidth = 515,
  signY = null
) => {
  let y = signY;
  if (y === null || y === undefined) {
    checkPageBreak(doc, 115, 740, 45);
    doc.moveDown(1.5);
    y = doc.y;
  }

  const name = chief.supervisor_name || chief.name || 'Ketua Regu Operasional';
  const nip = chief.supervisor_nip || chief.nip;
  const signatureUrl = chief.supervisor_signature_url || chief.signature_url;
  const title = chief.title || 'Pejabat Penanggung Jawab Shift,';
  const role = chief.role || 'KETUA REGU / SUPERVISOR DINAS';
  const blockWidth = chief.width || 200;
  const blockX = chief.x !== undefined ? chief.x : (startX + contentWidth - blockWidth);
  const imgFit = chief.imgFit || [100, 38];
  const imgX = chief.imgX !== undefined ? chief.imgX : (blockX + (blockWidth - imgFit[0]) / 2);

  let curY = y;
  if (chief.place_date) {
    doc.fontSize(8).font('Helvetica').fillColor('#475569').text(chief.place_date, blockX, curY, { width: blockWidth, align: 'center' });
    curY += 12;
  } else if (chief.include_space_for_date) {
    curY += 12; // Sejajarkan vertikal dengan Section Head
  }

  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text(title, blockX, curY, { width: blockWidth, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(role, blockX, curY + 12, { width: blockWidth, align: 'center' });

  const sigBuf = signatureUrl ? await resolveSignatureBuffer(signatureUrl) : null;
  if (sigBuf) {
    try {
      doc.image(sigBuf, imgX, curY + 25, { fit: imgFit, align: 'center' });
    } catch (e) {
      console.warn('[PDFKit] Gagal memuat tanda tangan Supervisor:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(`( ${name} )`, blockX, curY + 68, { width: blockWidth, align: 'center' });
  if (nip && nip !== '-') {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`NIP. ${nip}`, blockX, curY + 80, { width: blockWidth, align: 'center' });
  }

  return curY + 92;
};

// 10. Tanda Tangan Ganda: Ketua Regu di KIRI dan Section Head di KANAN
export const drawDualSignatures = async (
  doc,
  { sectionHead = {}, chief = {} } = {},
  startX = 40,
  contentWidth = 515,
  signY = null
) => {
  let y = signY;
  if (y === null || y === undefined) {
    checkPageBreak(doc, 125, 740, 45);
    doc.moveDown(1.5);
    y = doc.y;
  }

  // 1. Ketua Regu / Supervisor Dinas di sisi KIRI
  await drawChiefSignature(doc, {
    ...chief,
    x: startX + 20,
    width: 200,
    imgFit: [100, 38],
    include_space_for_date: true
  }, startX, contentWidth, y);

  // 2. Section Head di sisi KANAN (dengan Titimangsa Kulon Progo)
  await drawSectionHeadSignature(doc, {
    ...sectionHead,
    x: startX + contentWidth - 220,
    width: 200,
    imgFit: [100, 38]
  }, startX, contentWidth, y);

  return y;
};

// 10b. Tanda Tangan Laporan Harian 3 Shift: 3 Ketua Regu di KIRI, Section Head di KANAN
export const drawDailySignatures = async (
  doc,
  { chiefs = [], sectionHead = {}, shiftDate = null } = {},
  startX = 40,
  contentWidth = 515,
  signY = null
) => {
  let y = signY;
  if (y === null || y === undefined) {
    checkPageBreak(doc, 120, 740, 45);
    doc.moveDown(1.5);
    y = doc.y;
  }

  const colWidth = 118;
  const colGap = 8;
  // 3 Ketua Regu di sisi Kiri
  for (let i = 0; i < 3; i++) {
    const c = chiefs[i] || {};
    const bx = startX + i * (colWidth + colGap);
    const shiftLabel = i === 0 ? 'Shift 1 (Pagi)' : i === 1 ? 'Shift 2 (Siang)' : 'Shift 3 (Malam)';
    const teamName = c.team ? `REGU ${c.team.toUpperCase()}` : `REGU ${i + 1}`;
    const name = c.name || `Ketua Regu ${c.team || ''}`;
    const nip = c.nip;
    const sigUrl = c.signature_url;

    let curY = y + 12; // Penyeimbang vertikal sejajar titimangsa Section Head
    doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a').text(`Pejabat ${shiftLabel},`, bx, curY, { width: colWidth, align: 'center' });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(`KETUA ${teamName}`, bx, curY + 11, { width: colWidth, align: 'center' });

    if (sigUrl) {
      const sigBuf = await resolveSignatureBuffer(sigUrl);
      if (sigBuf) {
        try {
          doc.image(sigBuf, bx + (colWidth - 80) / 2, curY + 24, { fit: [80, 32], align: 'center' });
        } catch (e) {
          console.warn('[PDFKit] Gagal muat TTD Chief:', e.message);
        }
      }
    }

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(`( ${name} )`, bx, curY + 62, { width: colWidth, align: 'center', lineBreak: false, ellipsis: true });
    if (nip && nip !== '-') {
      doc.fontSize(6.5).font('Helvetica').fillColor('#475569').text(`NIP. ${nip}`, bx, curY + 74, { width: colWidth, align: 'center', lineBreak: false, ellipsis: true });
    }
  }

  // 1 Pejabat Section Head di sisi Kanan
  const shX = startX + 3 * (colWidth + colGap) + 5;
  const shWidth = contentWidth - (shX - startX);
  const headName = sectionHead.name || 'Airport Rescue & Fire Fighting Section Head';
  const headNip = sectionHead.nip;
  const headSigUrl = sectionHead.signature_url;
  const dateStr = shiftDate ? formatIndonesianDate(shiftDate) : formatIndonesianDate(new Date().toISOString().split('T')[0]);

  let shY = y;
  doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`Kulon Progo, ${dateStr}`, shX, shY, { width: shWidth, align: 'center' });
  shY += 12;
  doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a').text('Mengetahui / Mengesahkan,', shX, shY, { width: shWidth, align: 'center' });
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text('ARFF SECTION HEAD', shX, shY + 11, { width: shWidth, align: 'center' });

  if (sectionHead.isDraft) {
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#94a3b8').text(
      '( Menunggu Pengesahan Dinas )',
      shX,
      shY + 34,
      { width: shWidth, align: 'center' }
    );
  } else if (headSigUrl) {
    const headSigBuf = await resolveSignatureBuffer(headSigUrl);
    if (headSigBuf) {
      try {
        doc.image(headSigBuf, shX + (shWidth - 85) / 2, shY + 24, { fit: [85, 32], align: 'center' });
      } catch (e) {
        console.warn('[PDFKit] Gagal muat TTD Section Head:', e.message);
      }
    }
  }

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(`( ${headName} )`, shX, shY + 62, { width: shWidth, align: 'center', lineBreak: false, ellipsis: true });
  if (headNip && headNip !== '-') {
    doc.fontSize(6.5).font('Helvetica').fillColor('#475569').text(`NIP. ${headNip}`, shX, shY + 74, { width: shWidth, align: 'center', lineBreak: false, ellipsis: true });
  }

  return y + 88;
};

// 11. Watermark Transparan & Penomoran Halaman Otomatis (Bebas Phantom Blank Pages)
export const applyWatermarkAndPageNumbers = (
  doc,
  contentWidth,
  startX = 40,
  watermarkText = 'ARFF YIA • OFFICIAL OPS REPORT'
) => {
  const range = doc.bufferedPageRange();
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const footerY = pageHeight - 28; // Jarak aman di atas batas margin bawah

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Matikan proteksi margin bawah sementara untuk menghindari trigger continueOnNewPage internal PDFKit
    const origBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Watermark dinamis transparan di latar belakang tengah halaman
    doc.save();
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#94a3b8', 0.10);
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    doc.rotate(-32, { origin: [centerX, centerY] });
    doc.text(watermarkText, centerX - 260, centerY - 15, { width: 520, align: 'center', lineBreak: false });
    doc.restore();

    // Footer penomoran halaman kedinasan resmi
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
      `Halaman ${i + 1} dari ${range.count} • Dokumen Resmi ARFF YIA • Dicetak otomatis oleh Sistem Monitoring Operasional`,
      startX,
      footerY,
      { width: contentWidth, align: 'center', lineBreak: false }
    );

    // Kembalikan margin bawah asli
    doc.page.margins.bottom = origBottomMargin;
  }
};

// 12. Socket / Memory Leak Guard Streamer
/**
 * Mengalirkan stream PDF ke response Express dengan penanganan error dan pencegahan leak memori.
 * Menutup stream PDF jika koneksi dibatalkan oleh browser/klien (req.on('close')).
 */
export const streamPdfToResponse = (doc, res, req, options = {}) => {
  const {
    filename = 'dokumen.pdf',
    contentType = 'application/pdf',
    disposition = 'inline',
    onEnd = null
  } = options;

  const isDownload =
    req?.query?.download === '1' ||
    req?.query?.download === 'true' ||
    req?.query?.disposition === 'attachment';
  const effectiveDisposition = isDownload ? 'attachment' : disposition;

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${effectiveDisposition}; filename="${filename}"`);

  let isCleanedUp = false;
  const cleanup = () => {
    if (!isCleanedUp) {
      isCleanedUp = true;
      if (doc && !doc.destroyed && typeof doc.destroy === 'function') {
        try {
          doc.destroy();
        } catch (e) {
          // ignore stream close errors
        }
      }
    }
  };

  doc.on('error', (err) => {
    console.error(`[PDFStream] Stream error (${filename}):`, err);
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Gagal menerbitkan dokumen PDF: ' + err.message });
    } else {
      res.destroy(err);
    }
  });

  req.on('close', () => {
    cleanup();
  });

  if (typeof onEnd === 'function') {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        onEnd(buffer);
      } catch (e) {
        console.warn('[PDFStream] Error pada callback onEnd:', e.message);
      }
    });
  }

  doc.pipe(res);
  doc.end();
};
