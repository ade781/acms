/**
 * Helper utilitas pengunduhan berkas blob di browser
 * Single Source of Truth untuk download PDF/dokumen di frontend (Anti-Duplikasi / DRY)
 *
 * @param {Blob} blob Objek data berkas
 * @param {string} filename Nama berkas unduhan
 */
export function downloadBlob(blob, filename) {
  if (!blob) return;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 250);
}

/**
 * Membentuk URL berkas terautentikasi dengan menyisipkan query parameter ?token=...
 * Menangani leading slash, protokol http/https penuh, serta query string yang sudah ada.
 *
 * @param {string} rawPath Path berkas atau endpoint relatif/absolut
 * @returns {string} URL siap pakai dengan token autentikasi
 */
export function buildAuthenticatedFileUrl(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';
  const isAbsoluteUrl = /^https?:\/\//i.test(trimmed);
  const normalizedPath = isAbsoluteUrl || trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const token = localStorage.getItem('arff_token') || '';
  if (!token) return normalizedPath;
  const separator = normalizedPath.includes('?') ? '&' : '?';
  return `${normalizedPath}${separator}token=${encodeURIComponent(token)}`;
}
