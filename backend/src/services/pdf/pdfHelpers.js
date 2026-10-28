import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Helper untuk menemukan berkas gambar di server
 * Memastikan kompatibilitas penuh dengan PDFKit (hanya PNG dan JPEG yang didukung secara native)
 */
export const resolveSignatureFile = (fileUrl) => {
  if (!fileUrl) return null;
  const cleanPath = fileUrl.replace(/^\//, '');
  const candidates = [
    path.resolve(process.cwd(), cleanPath),
    path.resolve(process.cwd(), 'backend', cleanPath),
    path.resolve(process.cwd(), '..', cleanPath),
    path.resolve(process.cwd(), 'uploads', path.basename(cleanPath))
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const ext = path.extname(c).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        return c;
      }
      if (ext === '.webp') {
        const pngAlt = c.replace(/\.webp$/i, '.png');
        if (fs.existsSync(pngAlt)) return pngAlt;
        const jpgAlt = c.replace(/\.webp$/i, '.jpg');
        if (fs.existsSync(jpgAlt)) return jpgAlt;
        const jpegAlt = c.replace(/\.webp$/i, '.jpeg');
        if (fs.existsSync(jpegAlt)) return jpegAlt;

        return null;
      }
      return null;
    }
  }
  return null;
};

/**
 * Mengambil Buffer gambar tanda tangan, otomatis mentranscode WebP ke PNG buffer jika diperlukan
 */
export const resolveSignatureBuffer = async (fileUrl) => {
  if (!fileUrl) return null;
  const cleanPath = fileUrl.replace(/^\//, '');
  const candidates = [
    path.resolve(process.cwd(), cleanPath),
    path.resolve(process.cwd(), 'backend', cleanPath),
    path.resolve(process.cwd(), '..', cleanPath),
    path.resolve(process.cwd(), 'uploads', path.basename(cleanPath))
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const ext = path.extname(c).toLowerCase();
      try {
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          return fs.readFileSync(c);
        }
        if (ext === '.webp') {
          // Transcode WebP ke PNG Buffer secara otomatis menggunakan sharp
          const pngBuffer = await sharp(c).png().toBuffer();
          return pngBuffer;
        }
      } catch (err) {
        console.warn(`[PDFKit] Gagal mentranscode tanda tangan ${path.basename(c)}:`, err.message);
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
};

/**
 * Menerapkan watermark dinamis dan penomoran halaman otomatis
 */
const applyWatermarkAndPageNumbers = (doc, contentWidth, startX = 40, watermarkText = 'ARFF YIA • OFFICIAL OPS REPORT') => {
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
 * Membuat stream PDF Dokumen Resmi Laporan Shift ARFF (Format A4)
 * @param {Object} reportData Data lengkap shift, personel, kesiapan kendaraan, watchroom, aktivitas
 * @returns {PDFDocument} Stream dokumen PDF
 */

export { applyWatermarkAndPageNumbers };
