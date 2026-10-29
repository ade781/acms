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
