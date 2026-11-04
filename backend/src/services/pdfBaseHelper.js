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
  const filename = path.basename(fileUrl);
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
 * - Jika status di DB sudah 'closed' -> true
 * - Jika tanggal shift < hari ini -> true (memperhitungkan shift 3 malam yang berakhir jam 07:00 WIB)
 * - Jika tanggal shift == hari ini dan jam shift telah berakhir -> true:
 *     * Shift 1 (07:00 - 13:00 WIB) sah setelah >= 13:00 WIB
 *     * Shift 2 (13:00 - 20:00 WIB) sah setelah >= 20:00 WIB
 *     * Shift 3 (20:00 - 07:00 WIB) baru sah besok pagi setelah >= 07:00 WIB
 * - Jika shift masih berlangsung atau di masa depan -> false (Draft)
 */
export const isShiftOfficial = (shiftDateStr, shiftNumber, status = '', customNow = null) => {
  if ((status || '').toLowerCase() === 'closed') {
    return true;
  }

  if (!shiftDateStr) return false;

  const now = customNow || new Date();
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
      if (Number(shiftNumber) === 3) {
        // Shift 3 kemarin berakhir hari ini pukul 07:00 WIB (menit 420)
        return currentMinutes >= 420;
      }
      return true;
    }

    return true;
  }

  if (normalizedShiftDate === todayWibStr) {
    const shiftNum = Number(shiftNumber) || 1;
    if (shiftNum === 1) {
      // 07:00 - 13:00 WIB (selesai jam 13:00 = 780 menit)
      return currentMinutes >= 780;
    } else if (shiftNum === 2) {
      // 13:00 - 20:00 WIB (selesai jam 20:00 = 1200 menit)
      return currentMinutes >= 1200;
    } else if (shiftNum === 3) {
      // Shift 3 dimulai jam 20:00 hari ini dan berakhir besok jam 07:00 WIB
      return false;
    }
  }

  return false;
};

// 6. Header Kop Resmi Kedinasan PT Angkasa Pura Indonesia & Bandara Internasional Yogyakarta
export const drawOfficialHeader = (
  doc,
  title = 'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
  subtitle = null,
  contentWidth = 515,
  startX = 40
) => {
  let cWidth = contentWidth;
  let sX = startX;
  let mainTitle = 'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION';
  let subTitle = title;

  if (typeof subtitle === 'number') {
    sX = typeof contentWidth === 'number' ? contentWidth : 40;
    cWidth = subtitle;
    subTitle = title;
  } else if (subtitle) {
    mainTitle = title || mainTitle;
    subTitle = subtitle;
  }

  doc.fontSize(12.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    mainTitle,
    sX,
    35,
    { align: 'center', width: cWidth }
  );
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#b91c1c').text(
    'BANDARA INTERNASIONAL YOGYAKARTA (YIA)',
    sX,
    52,
    { align: 'center', width: cWidth }
  );
  if (subTitle) {
    doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(
      subTitle,
      sX,
      67,
      { align: 'center', width: cWidth }
    );
  }

  // Garis ganda pemisah kop kedinasan tebal (1.5pt) dan tipis (0.5pt)
  doc.moveTo(sX, 82).lineTo(sX + cWidth, 82).lineWidth(1.5).strokeColor('#1e293b').stroke();
  doc.moveTo(sX, 84).lineTo(sX + cWidth, 84).lineWidth(0.5).strokeColor('#94a3b8').stroke();

  doc.y = 92;
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
    checkPageBreak(doc, 100, 740, 45);
    doc.moveDown(1.5);
    y = doc.y;
  }

  const name = signatory.dept_head_name || signatory.name || 'Airport Rescue & Fire Fighting Section Head';
  const nip = signatory.dept_head_nip || signatory.nip;
  const signatureUrl = signatory.dept_head_signature_url || signatory.signature_url || signatory.signatureUrl;
  const signatureBuffer = signatory.signatureBuffer;
  const title = signatory.title || 'Mengetahui / Mengesahkan,';
  const role = signatory.role || 'AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD';
  const isDraft = signatory.isDraft ?? (signatory.isClosed === false);
  const blockWidth = signatory.width || 220;
  const blockX = signatory.x !== undefined ? signatory.x : (startX + contentWidth - blockWidth);
  const imgFit = signatory.imgFit || [110, 40];
  const imgX = signatory.imgX !== undefined ? signatory.imgX : (blockX + (blockWidth - imgFit[0]) / 2);

  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text(title, blockX, y, { width: blockWidth, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(role, blockX, y + 12, { width: blockWidth, align: 'center' });

  if (isDraft) {
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94a3b8').text(
      '( Menunggu Pengesahan Dinas )',
      blockX,
      y + 40,
      { width: blockWidth, align: 'center' }
    );
  } else {
    const sigBuf = signatureBuffer || (signatureUrl ? await resolveSignatureBuffer(signatureUrl) : null);
    if (sigBuf) {
      try {
        doc.image(sigBuf, imgX, y + 25, { fit: imgFit, align: 'center' });
      } catch (e) {
        console.warn('[PDFKit] Gagal memuat tanda tangan Section Head:', e.message);
      }
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(`( ${name} )`, blockX, y + 68, { width: blockWidth, align: 'center' });
  if (nip && nip !== '-') {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`NIP. ${nip}`, blockX, y + 80, { width: blockWidth, align: 'center' });
  }

  return y;
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
    checkPageBreak(doc, 100, 740, 45);
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

  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text(title, blockX, y, { width: blockWidth, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(role, blockX, y + 12, { width: blockWidth, align: 'center' });

  const sigBuf = signatureUrl ? await resolveSignatureBuffer(signatureUrl) : null;
  if (sigBuf) {
    try {
      doc.image(sigBuf, imgX, y + 25, { fit: imgFit, align: 'center' });
    } catch (e) {
      console.warn('[PDFKit] Gagal memuat tanda tangan Supervisor:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(`( ${name} )`, blockX, y + 68, { width: blockWidth, align: 'center' });
  if (nip && nip !== '-') {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`NIP. ${nip}`, blockX, y + 80, { width: blockWidth, align: 'center' });
  }

  return y;
};

// 10. Tanda Tangan Ganda: Section Head (Kiri) dan Chief (Kanan)
export const drawDualSignatures = async (
  doc,
  { sectionHead = {}, chief = {} } = {},
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

  // 1. Section Head di sisi kiri
  await drawSectionHeadSignature(doc, {
    ...sectionHead,
    x: startX + 20,
    width: 200,
    imgFit: [100, 38]
  }, startX, contentWidth, y);

  // 2. Chief di sisi kanan
  await drawChiefSignature(doc, {
    ...chief,
    x: startX + 295,
    width: 200,
    imgFit: [100, 38]
  }, startX, contentWidth, y);

  return y;
};

// 11. Watermark Transparan & Penomoran Halaman Otomatis
export const applyWatermarkAndPageNumbers = (
  doc,
  contentWidth,
  startX = 40,
  watermarkText = 'ARFF YIA • OFFICIAL OPS REPORT'
) => {
  const range = doc.bufferedPageRange();
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const footerY = pageHeight - 35;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Watermark dinamis transparan di latar belakang tengah halaman
    doc.save();
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#94a3b8', 0.10);
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    doc.rotate(-32, { origin: [centerX, centerY] });
    doc.text(watermarkText, centerX - 260, centerY - 15, { width: 520, align: 'center' });
    doc.restore();

    // Footer penomoran halaman kedinasan resmi
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
      `Halaman ${i + 1} dari ${range.count} • Dokumen Resmi ARFF YIA • Dicetak otomatis oleh Sistem Monitoring Operasional`,
      startX,
      footerY,
      { width: contentWidth, align: 'center' }
    );
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

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);

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
