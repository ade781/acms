import pool from '../../config/db.js';
import {
  generateActivitiesReportPdf,
} from '../../services/pdfService.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';

export const getActivitiesReportPdf = async (req, res) => {
  try {
    const { period = '1month', start_date, end_date, category, team_group } = req.query;

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

    if (team_group && team_group !== 'ALL' && team_group !== 'all') {
      query += ` AND ps.team_group = ?`;
      params.push(team_group);
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
        categoryLabel: category && category !== 'ALL' ? category.replace(/_/g, ' ').toUpperCase() : 'Semua Kategori',
        teamLabel: team_group && team_group !== 'ALL' ? `Regu ${team_group}` : 'Seluruh Regu (A-D)',
      },
      dept_head_name: deptHeadData?.name || 'Airport Rescue & Fire Fighting Section Head',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
    };

    const doc = await generateActivitiesReportPdf(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-logbook-kegiatan-${calculatedStartDate}-sd-${calculatedEndDate}.pdf"`
    );

    doc.on('error', (err) => {
      console.error('PDFKit stream error (ActivitiesReportPdf):', err);
      if (!res.headersSent) {
        return errorResponse(res, 'Gagal menerbitkan laporan PDF logbook kegiatan: ' + err.message, 500);
      }
      res.destroy(err);
    });

    req.on('close', () => {
      if (!doc.destroyed && typeof doc.destroy === 'function') {
        doc.destroy();
      }
    });

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error getActivitiesReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF logbook kegiatan: ' + error.message, 500);
  }
};

