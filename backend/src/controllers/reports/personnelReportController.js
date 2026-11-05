import pool from '../../config/db.js';
import {
  generatePersonnelAccountsPdf,
  streamPdfToResponse,
} from '../../services/pdfService.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';

/**
 * Controller Laporan 5: Buku Induk Personel Regu & Akun Sistem Operasional
 * Menghasilkan dokumen PDF A4 Portrait standar operasional ARFF YIA
 */
export const getPersonnelReportPdf = async (req, res) => {
  try {
    const { team_group, team, status, search, q } = req.query;
    const effectiveTeam = team_group || team;
    const effectiveStatus = status;
    const effectiveSearch = search || q;

    let query = `
      SELECT p.*, u.username, u.email as user_email, u.role as user_role, u.must_change_password
      FROM personnel p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveTeam && effectiveTeam !== 'ALL' && effectiveTeam !== 'all') {
      query += ` AND p.team_group = ?`;
      params.push(effectiveTeam);
    }

    if (effectiveStatus && effectiveStatus !== 'ALL' && effectiveStatus !== 'all') {
      if (effectiveStatus === 'active' || effectiveStatus === '1') {
        query += ` AND p.is_active = 1`;
      } else if (effectiveStatus === 'inactive' || effectiveStatus === '0') {
        query += ` AND p.is_active = 0`;
      }
    }

    if (effectiveSearch && effectiveSearch.trim()) {
      query += ` AND (p.full_name LIKE ? OR p.nip LIKE ? OR u.username LIKE ?)`;
      const term = `%${effectiveSearch.trim()}%`;
      params.push(term, term, term);
    }

    // Urutan hierarki: Dept Head -> Non-Shift / Staf -> Regu Alpha s.d. Delta -> ID
    query += ` ORDER BY 
      CASE 
        WHEN u.role = 'dept_head' OR p.rank_position LIKE '%Dept%' THEN 1
        WHEN p.team_group = 'Non-Shift' OR p.team_group IS NULL THEN 2
        WHEN p.team_group = 'Alpha' THEN 3
        WHEN p.team_group = 'Bravo' THEN 4
        WHEN p.team_group = 'Charlie' THEN 5
        WHEN p.team_group = 'Delta' THEN 6
        ELSE 7
      END,
      p.id ASC`;

    const [rows] = await pool.query(query, params);
    const signatory = await getOfficialSignatory(pool);

    const todayDate = new Date().toISOString().split('T')[0];

    const payload = {
      personnel: rows,
      signatory,
      filterTeam: effectiveTeam || 'ALL',
      filterStatus: effectiveStatus || 'all',
      summary: {
        total: rows.length,
        activeCount: rows.filter((p) => p.is_active !== 0).length,
        inactiveCount: rows.filter((p) => p.is_active === 0).length,
      },
    };

    const doc = await generatePersonnelAccountsPdf(payload);

    streamPdfToResponse(doc, res, req, {
      filename: `Buku_Induk_Personel_ARFF_YIA_${todayDate}.pdf`,
      disposition: 'attachment',
    });
  } catch (error) {
    console.error('Error getPersonnelReportPdf:', error);
    return errorResponse(res, 'Gagal mencetak Buku Induk Personel PDF: ' + error.message, 500);
  }
};

export const exportPersonnelPdf = getPersonnelReportPdf;
