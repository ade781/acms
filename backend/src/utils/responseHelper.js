export const successResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Mengirimkan respons error terstandarisasi.
 * Untuk statusCode >= 500, secara otomatis memotong detail teknis database/SQL mentah
 * (seperti ER_..., Unknown column, Cannot add or update, dll.) agar tidak bocor ke klien (CWE-209).
 */
export const errorResponse = (res, message, statusCode = 500, errors = null) => {
  let safeMessage = message || 'Terjadi kesalahan internal pada server operasional.';

  if (statusCode >= 500 && typeof safeMessage === 'string') {
    const colonIdx = safeMessage.indexOf(': ');
    if (colonIdx !== -1) {
      const prefix = safeMessage.substring(0, colonIdx).trim();
      if (prefix.length > 0) {
        safeMessage = `${prefix}. Silakan coba lagi atau hubungi administrator.`;
      }
    } else if (/(ER_|Unknown column|SQL syntax|Cannot add or update|ECONNREFUSED)/i.test(safeMessage)) {
      safeMessage = 'Terjadi kesalahan internal pada server operasional.';
    }
  }

  return res.status(statusCode).json({
    success: false,
    message: safeMessage,
    errors
  });
};

export const createdResponse = (res, message, data = null) => {
  return successResponse(res, message, data, 201);
};
