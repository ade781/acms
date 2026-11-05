import pool from '../../config/db.js';
import {
  generateActivitiesReportPdf,
  streamPdfToResponse,
} from '../../services/pdfService.js';
import { formatActivityCategory } from '../../services/pdf/activitiesReportPdf.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';

export const getActivitiesReportPdf = async (req, res) => {
  try {
    const { period = '1month', start_date, end_date, category, team_group, team } = req.query;

    let calculatedStartDate = start_date;
    let calculatedEndDate = end_date;
    let periodLabel = 'Periode Kustom';

    const now = new Date();
    if (period === '1week') {
      periodLabel = '1 Minggu Terakhir';
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      calculatedStartDate = past.toISOString().split('T')[0];
      calculatedEndDate = now.toISOString().split('T')[0];
    } else if (period === '3months') {
      periodLabel = '3 Bulan Terakhir';
      const past = new Date(now);
      past.setMonth(past.getMonth() - 3);
      calculatedStartDate = past.toISOString().split('T')[0];
      calculatedEndDate = now.toISOString().split('T')[0];
    } else if (period === '1year') {
      periodLabel = '1 Tahun Terakhir';
      const past = new Date(now);
      past.setFullYear(past.getFullYear() - 1);
      calculatedStartDate = past.toISOString().split('T')[0];
      calculatedEndDate = now.toISOString().split('T')[0];
    } else if (period === '1month' || (!calculatedStartDate && !calculatedEndDate)) {
      periodLabel = '1 Bulan Terakhir';
      const past = new Date(now);
      past.setMonth(past.getMonth() - 1);
      calculatedStartDate = past.toISOString().split('T')[0];
      calculatedEndDate = now.toISOString().split('T')[0];
    }

    if (!calculatedStartDate) {
      const past = new Date(now);
      past.setMonth(past.getMonth() - 1);
      calculatedStartDate = past.toISOString().split('T')[0];
    }
    if (!calculatedEndDate) {
      calculatedEndDate = now.toISOString().split('T')[0];
    }

    let query = `
      SELECT a.*, ps.shift_date, ps.shift_number, ps.team_group
      FROM daily_shift_activities a
      JOIN personnel_shifts ps ON ps.id = a.shift_id
      WHERE ps.shift_date BETWEEN ? AND ?
    `;
    const params = [calculatedStartDate, calculatedEndDate];

    if (category && category !== 'ALL' && category !== 'all') {
      query += ` AND a.activity_type = ?`;
      params.push(category);
    }

    const targetTeam = team_group || team;
    if (targetTeam && targetTeam !== 'ALL' && targetTeam !== 'all') {
      query += ` AND ps.team_group = ?`;
      params.push(targetTeam);
    }

    query += ` ORDER BY ps.shift_date DESC, a.activity_time ASC, a.id DESC`;

    const [activitiesList] = await pool.query(query, params);
    const deptHeadData = await getOfficialSignatory(pool);

    const payload = {
      periodLabel,
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
      activities: activitiesList,
      summary: {
        total: activitiesList.length,
        categoryLabel: category && category !== 'ALL' && category !== 'all' ? formatActivityCategory(category) : 'Semua Kategori',
        teamLabel: targetTeam && targetTeam !== 'ALL' && targetTeam !== 'all' ? `Regu ${targetTeam}` : 'Seluruh Regu (A-D)',
      },
      dept_head_name: deptHeadData?.name || 'Airport Rescue & Fire Fighting Section Head',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
    };

    const doc = await generateActivitiesReportPdf(payload);

    streamPdfToResponse(doc, res, req, {
      filename: `laporan-logbook-kegiatan-${calculatedStartDate}-sd-${calculatedEndDate}.pdf`
    });
  } catch (error) {
    console.error('Error getActivitiesReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF logbook kegiatan: ' + error.message, 500);
  }
};
