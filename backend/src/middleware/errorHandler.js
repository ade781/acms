/**
 * BUTIR TUGAS 6: Sanitasi Respons Error HTTP 500 Global (Temuan #39)
 * Lokasi Berkas: backend/src/middleware/errorHandler.js
 * 
 * Middleware terpusat untuk penanganan error.
 * Pada lingkungan produksi (NODE_ENV === 'production'):
 * - Mencegah kebocoran arsitektur sistem (Information Disclosure)
 * - Error 500 hanya mengembalikan pesan generik aman tanpa menyertakan err.stack, err.sql, atau detail query internal.
 * - Detail stack trace dan query SQL dicatat secara aman hanya ke log terminal server.
 */

export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.status || err.statusCode || 500;

  // Catat detail lengkap error ke log internal server (terminal)
  console.error('[UNHANDLED SERVER ERROR]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    name: err.name,
    message: err.message,
    stack: err.stack,
    sql: err.sql || undefined
  });

  // Tangani MulterError secara eksplisit
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: 'Kesalahan unggah berkas: ' + err.message
    });
  }

  // Sanitasi respon klien untuk error server (HTTP 500 atau lebih tinggi)
  if (statusCode >= 500) {
    const safeMessage = isProduction
      ? 'Terjadi kesalahan internal pada server operasional.'
      : (err.message || 'Terjadi kesalahan internal pada server operasional.');

    return res.status(statusCode).json({
      success: false,
      message: safeMessage
    });
  }

  // Untuk error klien (4xx), kirimkan pesan error terkait
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada permintaan'
  });
};

export default errorHandler;
