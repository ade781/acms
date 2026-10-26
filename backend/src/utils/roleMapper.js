/**
 * Utilitas Terpadu Pemetaan Jabatan, Role Otorisasi, & Sanitasi Regu ARFF YIA
 * Single Source of Truth untuk backend API (Anti-Duplikasi / DRY)
 */

/**
 * Membersihkan prefix 'Regu ' dari string nama regu agar konsisten dengan nilai di database ('Alpha', 'Bravo', dsb.)
 * @param {string} team
 * @returns {string}
 */
export function cleanTeam(team) {
  if (!team) return '';
  return String(team).replace(/^regu\s+/i, '').trim();
}

/**
 * Memetakan teks deskripsi jabatan struktural/operasional ke kode role sistem users
 * @param {string} rank
 * @returns {string}
 */
export function mapRankPositionToRole(rank) {
  if (!rank) return 'junior_firefighter';
  const r = String(rank).trim().toLowerCase();
  if (r.includes('dept. head') || r.includes('dept head') || r.includes('department head') || r.includes('section head')) {
    return 'dept_head';
  }
  if (r.includes('chief assistant') || r.includes('asisten chief') || r.includes('wakil')) {
    return 'chief_assistant';
  }
  if (r.includes('chief') || r.includes('ketua regu')) {
    return 'chief';
  }
  if (r.includes('senior')) {
    return 'senior_firefighter';
  }
  if (r.includes('admin')) {
    return 'admin';
  }
  return 'junior_firefighter';
}

/**
 * Memeriksa apakah role pengguna termasuk jajaran pimpinan/struktural (Admin, Dept Head, Section Head, Chief, Chief Assistant)
 * @param {string} role
 * @returns {boolean}
 */
export function isLeadershipRole(role) {
  if (!role) return false;
  return ['admin', 'dept_head', 'section_head', 'chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(role);
}

/**
 * Memeriksa apakah pengguna memiliki hak akses istimewa untuk mengelola penugasan, cuti, atau checklist kelaikan armada
 * @param {string} role
 * @returns {boolean}
 */
export function isPrivilegedRole(role) {
  if (!role) return false;
  return ['admin', 'dept_head', 'section_head', 'chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(role);
}
