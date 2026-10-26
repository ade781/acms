import fs from 'fs';
import path from 'path';

/**
 * Helper untuk menemukan berkas gambar di server
 * Memastikan kompatibilitas penuh dengan PDFKit (hanya PNG dan JPEG yang didukung secara native)
 */
const resolveSignatureFile = (fileUrl) => {
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

        console.warn(`[PDFKit] File tanda tangan ${path.basename(c)} berformat WebP (tidak didukung PDFKit). Melewati gambar.`);
        return null;
      }
      return null;
    }
  }
  return null;
};

// In-Memory Caching untuk Dokumen PDF
const pdfMemoryCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 detik

export const getPdfCache = (key) => {
  const item = pdfMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    pdfMemoryCache.delete(key);
    return null;
  }
  return item.buffer;
};

export const setPdfCache = (key, buffer) => {
  if (pdfMemoryCache.size > 50) {
    const oldestKey = pdfMemoryCache.keys().next().value;
    pdfMemoryCache.delete(oldestKey);
  }
  pdfMemoryCache.set(key, { buffer, timestamp: Date.now() });
};

export const clearPdfCache = () => {
  pdfMemoryCache.clear();
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

export { resolveSignatureFile, applyWatermarkAndPageNumbers };
