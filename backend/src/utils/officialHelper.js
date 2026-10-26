import pool from '../config/db.js';

/**
 * Utilitas Terpadu Pengambilan Pejabat Struktural & Penandatangan Dokumen Resmi ARFF YIA
 * Single Source of Truth untuk Backend (DRY)
 *
 * Prioritas pencarian:
 * 1. Personel dengan jabatan Section Head (Airport Technology & ARFF Section Head) atau users.role = 'section_head'
 * 2. Personel dengan jabatan Dept Head atau users.role = 'dept_head'
 * 3. Fallback ke akun administrator sistem
 *
 * @param {Object} [customPool] Opsional koneksi db / connection transaksi
 * @returns {Promise<Object|null>}
 */
export const getOfficialSignatory = async (customPool = null) => {
  const db = customPool || pool;

  // 1. Cari dari personnel yang menjabat Section Head atau Dept Head
  const [officials] = await db.query(
    `SELECT COALESCE(p.full_name, u.name) as name,
            COALESCE(p.nip, '-') as nip,
            COALESCE(p.rank_position, 'Airport Rescue & Fire Fighting Section Head') as rank_position,
            COALESCE(p.signature_url, u.signature_url) as signature_url
     FROM personnel p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.rank_position LIKE '%Section%Head%'
        OR p.rank_position LIKE '%Seksi%'
        OR u.role = 'section_head'
        OR p.rank_position LIKE '%Dept%Head%'
        OR u.role = 'dept_head'
     ORDER BY
       CASE
         WHEN p.rank_position LIKE '%Section%Head%' OR p.rank_position LIKE '%Seksi%' OR u.role = 'section_head' THEN 1
         WHEN p.rank_position LIKE '%Dept%Head%' OR u.role = 'dept_head' THEN 2
         ELSE 3
       END ASC,
       p.id ASC
     LIMIT 1`
  );

  if (officials.length > 0) {
    return officials[0];
  }

  // 2. Fallback: Cari dari users dengan role section_head, dept_head, atau admin
  const [userOfficials] = await db.query(
    `SELECT COALESCE(p.full_name, u.name) as name,
            COALESCE(p.nip, '-') as nip,
            'Airport Rescue & Fire Fighting Section Head' as rank_position,
            COALESCE(u.signature_url, p.signature_url) as signature_url
     FROM users u
     LEFT JOIN personnel p ON p.user_id = u.id
     WHERE u.role IN ('section_head', 'dept_head', 'admin')
     ORDER BY FIELD(u.role, 'section_head', 'dept_head', 'admin'), u.id ASC
     LIMIT 1`
  );

  return userOfficials.length > 0 ? userOfficials[0] : null;
};
