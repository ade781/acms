/**
 * 11 Kompetensi Baku Personel ARFF YIA
 * Sesuai Standar Operasional & Buku Induk Kepegawaian ARFF
 */
const VALID_ADDITIONAL_COMPETENCIES = [
  'SAR',
  'TOT',
  'Human Faktor',
  'K3 Kebakaran',
  'K3 Umum',
  'Uji Mutu Foam',
  'General Instructur Course',
  'First Aid',
  'Investigator',
  'Safety Manajement System',
  'Auditor'
];

/**
 * Sanitasi & Validasi Whitelist Kompetensi Tambahan
 * Mencegah SQL error (Invalid JSON) dan menangkal injeksi teks bebas/XSS
 */
export function sanitizeAndValidateCompetencies(input, fallbackJson = '[]') {
  if (input === undefined) return fallbackJson;
  let items = [];

  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) items = parsed;
      else items = input.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      items = input.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const validSet = new Set(VALID_ADDITIONAL_COMPETENCIES);
  const filtered = items
    .map(c => String(c || '').trim())
    .filter(c => validSet.has(c));

  // Pastikan selalu tersimpan dalam format JSON valid dan tanpa duplikasi
  return JSON.stringify([...new Set(filtered)]);
}

/**
 * Parser Aman untuk Kolom additional_competencies dari Database
 * Menjamin frontend selalu menerima Array murni
 */
export function parseCompetenciesArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
