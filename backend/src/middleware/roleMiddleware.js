import { errorResponse } from '../utils/responseHelper.js';

// Pemetaan wewenang berbasis kelompok peran operasional ARFF YIA
// Pimpinan / Manajemen: admin, dept_head, chief, chief_assistant, supervisor
// Pelaksana / Kru: senior_firefighter, junior_firefighter, operator
const ROLE_EQUIVALENTS = {
  // Manajemen / Pimpinan
  admin: ['admin'],
  dept_head: ['dept_head', 'admin'],
  chief: ['chief', 'chief_assistant', 'operation_chief', 'dept_head', 'admin'],
  chief_assistant: ['chief_assistant', 'chief', 'operation_chief', 'dept_head', 'admin'],
  supervisor: ['supervisor', 'chief', 'chief_assistant', 'operation_chief', 'dept_head', 'admin'],
  operation_chief: ['operation_chief', 'chief', 'chief_assistant', 'dept_head', 'admin'],

  // Pelaksana / Kru Lapangan
  senior_firefighter: ['senior_firefighter', 'operator'],
  junior_firefighter: ['junior_firefighter', 'operator'],
  operator: ['operator', 'junior_firefighter', 'senior_firefighter'],
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Autentikasi diperlukan: Silakan login terlebih dahulu', 401);
    }

    const userRole = req.user.role;
    if (!userRole) {
      return errorResponse(res, 'Akses ditolak: Pengguna tidak memiliki peran yang valid', 403);
    }

    if (allowedRoles.length > 0) {
      const hasPermission = allowedRoles.some((role) => {
        if (role === userRole) return true;
        const equivalents = ROLE_EQUIVALENTS[role];
        return Boolean(equivalents && equivalents.includes(userRole));
      });

      if (!hasPermission) {
        return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini', 403);
      }
    }

    next();
  };
};
