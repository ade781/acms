import { errorResponse } from '../utils/responseHelper.js';

// Pemetaan alias peran agar hak akses chief dan chief_assistant sama
const ROLE_EQUIVALENTS = {
  supervisor: ['supervisor', 'chief', 'chief_assistant', 'operation_chief', 'dept_head', 'admin'],
  chief: ['chief', 'chief_assistant', 'operation_chief', 'supervisor', 'dept_head', 'admin'],
  chief_assistant: ['chief_assistant', 'chief', 'operation_chief', 'supervisor', 'dept_head', 'admin'],
  dept_head: ['dept_head', 'admin'],
  admin: ['admin'],
  operator: [
    'operator',
    'junior_firefighter',
    'senior_firefighter',
    'chief_assistant',
    'chief',
    'supervisor',
    'dept_head',
    'admin'
  ],
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Autentikasi diperlukan', 401);
    }

    const userRole = req.user.role;

    if (allowedRoles.length > 0) {
      const hasPermission = allowedRoles.some((role) => {
        if (role === userRole) return true;
        const equivalents = ROLE_EQUIVALENTS[role];
        return equivalents && equivalents.includes(userRole);
      });

      if (!hasPermission) {
        return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini', 403);
      }
    }

    next();
  };
};
