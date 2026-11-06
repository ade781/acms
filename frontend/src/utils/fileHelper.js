/**
 * Mengonversi objek Blob atau File menjadi Data URL (base64) menggunakan FileReader.
 * Aman digunakan pada jaringan lokal HTTP (non-secure context) tanpa memicu blokir blob:http:// di Chrome.
 *
 * @param {Blob|File} blob Objek berkas
 * @returns {Promise<string>} Data URL (data:<mime>;base64,...)
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) {
      reject(new Error('Berkas kosong atau tidak ditemukan.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca berkas menjadi Data URL.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper utilitas pengunduhan berkas blob di browser
 * Single Source of Truth untuk download PDF/dokumen di frontend (Anti-Duplikasi / DRY).
 * Menggunakan FileReader.readAsDataURL agar href berupa data:application/pdf;base64,...
 * sehingga bebas dari blokir "blob:http://... was loaded over an insecure connection" pada jaringan LAN HTTP.
 *
 * @param {Blob} blob Objek data berkas
 * @param {string} filename Nama berkas unduhan
 */
export function downloadBlob(blob, filename = 'dokumen.pdf') {
  if (!blob) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    if (typeof dataUrl !== 'string') return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  reader.readAsDataURL(blob);
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

/**
 * Membentuk URL endpoint laporan API (/api/...) lengkap dengan query parameter, token autentikasi,
 * dan opsi download=1 untuk pratinjau iframe atau unduhan langsung via HTTP.
 *
 * @param {string} endpointPath Path endpoint (misal '/reports/activities/pdf' atau '/api/reports/activities/pdf')
 * @param {Record<string, any>} queryParams Parameter kueri opsional
 * @param {boolean} isDownload Set true untuk menyertakan download=1 (Content-Disposition: attachment)
 * @returns {string} URL siap pakai
 */
export function buildAuthenticatedReportUrl(endpointPath, queryParams = {}, isDownload = false) {
  if (!endpointPath || typeof endpointPath !== 'string') return '';
  const trimmed = endpointPath.trim();
  if (!trimmed) return '';
  const basePath = trimmed.startsWith('/api/')
    ? trimmed
    : trimmed.startsWith('/')
      ? `/api${trimmed}`
      : `/api/${trimmed}`;

  const searchParams = new URLSearchParams();
  Object.entries(queryParams || {}).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '' && key !== 'token') {
      searchParams.append(key, String(val));
    }
  });
  if (isDownload) {
    searchParams.set('download', '1');
  }
  const token = queryParams?.token || localStorage.getItem('arff_token') || '';
  if (token) {
    searchParams.set('token', token);
  }
  const qs = searchParams.toString();
  const separator = basePath.includes('?') ? '&' : '?';
  return qs ? `${basePath}${separator}${qs}` : basePath;
}

/**
 * Mengunduh berkas langsung dari endpoint HTTP terautentikasi (?download=1) tanpa membuat blob: URL.
 *
 * @param {string} endpointPath Path endpoint atau berkas
 * @param {string} filename Nama berkas unduhan
 * @param {Record<string, any>} queryParams Parameter kueri tambahan
 */
export function downloadFromEndpoint(endpointPath, filename = 'dokumen.pdf', queryParams = {}) {
  const url = buildAuthenticatedReportUrl(endpointPath, queryParams, true);
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.setAttribute('download', filename);
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}
