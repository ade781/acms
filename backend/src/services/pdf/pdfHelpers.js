import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Helper untuk menemukan berkas gambar di server
 * Memastikan kompatibilitas penuh dengan PDFKit (hanya PNG dan JPEG yang didukung secara native)
 * Keamanan: Terkunci di folder uploads dan disanitasi dengan path.basename untuk mencegah path traversal.
 */
const getSafeUploadsDirs = () => {
  const dirs = [
    path.resolve(process.cwd(), 'backend', 'uploads'),
    path.resolve(process.cwd(), 'uploads')
  ];
  return dirs.filter((d) => fs.existsSync(d));
};

// In-Memory Signature Buffer Cache untuk mencegah transcoding ulang WebP via Sharp
const signatureBufferCache = new Map();

export const clearSignatureBufferCache = () => {
  signatureBufferCache.clear();
};

/**
 * Mengambil Buffer gambar tanda tangan, otomatis mentranscode WebP ke PNG buffer jika diperlukan
 * Menggunakan in-memory cache agar Sharp tidak mentranscode ulang berkas WebP yang sama di setiap request.
 * Keamanan: Terkunci di folder uploads dan disanitasi dengan path.basename untuk mencegah path traversal.
 */
export const resolveSignatureBuffer = async (fileUrl) => {
  if (!fileUrl) return null;
  const filename = path.basename(fileUrl);
  if (!filename || filename === '.' || filename === '/' || filename.includes('..')) return null;

  // Cek cache in-memory terlebih dahulu untuk menghemat CPU & RAM
  if (signatureBufferCache.has(filename)) {
    return signatureBufferCache.get(filename);
  }

  const uploadDirs = getSafeUploadsDirs();
  for (const dir of uploadDirs) {
    const candidate = path.resolve(dir, filename);
    // Verifikasi keamanan path traversal
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
          // Transcode WebP ke PNG Buffer secara otomatis menggunakan sharp
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

// In-Memory Caching untuk Dokumen PDF dengan batas LRU (maksimal 10 dokumen atau 50 MB RAM)
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

  // Jika kunci sudah ada, kurangi ukuran memori lama
  if (pdfMemoryCache.has(key)) {
    const existing = pdfMemoryCache.get(key);
    currentTotalBytes -= (existing.buffer?.length || 0);
    pdfMemoryCache.delete(key);
  }

  // Eviction jika jumlah melebihi MAX_DOCS atau ukuran memori melebihi MAX_TOTAL_BYTES
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

/**
 * Menerapkan watermark dinamis dan penomoran halaman otomatis
 */
export const applyWatermarkAndPageNumbers = (doc, contentWidth, startX = 40, watermarkText = 'ARFF YIA • OFFICIAL OPS REPORT') => {
  const range = doc.bufferedPageRange();
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const footerY = pageHeight - 35;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Watermark dinamis transparan di latar belakang
    doc.save();
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#94a3b8', 0.10);
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    doc.rotate(-32, { origin: [centerX, centerY] });
    doc.text(watermarkText, centerX - 260, centerY - 15, { width: 520, align: 'center' });
    doc.restore();

    // Footer penomoran halaman otomatis
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
      `Halaman ${i + 1} dari ${range.count} • Dokumen Resmi ARFF YIA • Dicetak otomatis oleh Sistem Monitoring Operasional`,
      startX,
      footerY,
      { width: contentWidth, align: 'center' }
    );
  }
};

/**
 * Menggambar Kop Dokumen Resmi PT Angkasa Pura Indonesia - ARFF YIA dan garis ganda pembatas
 * @param {PDFDocument} doc Instance PDFKit
 * @param {string} title Judul utama atau subjudul laporan
 * @param {string} subtitle Subjudul laporan jika title dipakai sebagai nama instansi
 * @param {number} contentWidth Lebar konten halaman (default: 515)
 * @param {number} startX Posisi X margin kiri (default: 40)
 */
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

  // Support overload jika parameter ke-3 adalah number: drawOfficialHeader(doc, 'LAPORAN...', contentWidth, startX)
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

  // Garis ganda pemisah kop kedinasan (Y=82 dan Y=84)
  doc.moveTo(sX, 82).lineTo(sX + cWidth, 82).lineWidth(1.5).strokeColor('#1e293b').stroke();
  doc.moveTo(sX, 84).lineTo(sX + cWidth, 84).lineWidth(0.5).strokeColor('#94a3b8').stroke();

  doc.y = 92;
};

/**
 * Helper untuk memeriksa sisa ruang vertikal halaman dan berpindah halaman jika tidak cukup
 * @param {PDFDocument} doc Instance PDFKit
 * @param {number} neededHeight Tinggi vertikal yang dibutuhkan untuk elemen
 * @param {number} maxHeight Batas bawah halaman sebelum trigger page break (default: 740)
 * @param {number} newPageY Posisi Y awal setelah page break dibuat (default: 35)
 * @returns {boolean} True jika berpindah halaman, false sebaliknya
 */
export const checkPageBreak = (doc, neededHeight, maxHeight = 740, newPageY = 35) => {
  if (doc.y + neededHeight > maxHeight) {
    doc.addPage();
    doc.y = newPageY;
    return true;
  }
  return false;
};

/**
 * Menggambar blok tanda tangan pengesahan Section Head
 * @param {PDFDocument} doc Instance PDFKit
 * @param {Object} signatory Objek informasi pejabat (name, nip, signature_url, isDraft, role, title, dll.)
 * @param {number} startX Posisi X margin kiri (default: 40)
 * @param {number} contentWidth Lebar konten halaman (default: 515)
 * @param {number|null} signY Posisi Y awal tanda tangan (jika null, otomatis hitung dan cek page break)
 */
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
