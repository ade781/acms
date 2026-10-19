import { errorResponse } from '../utils/responseHelper.js';

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Autentikasi diperlukan', 401);
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini', 403);
    }

    next();
  };
};
