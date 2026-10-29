import pool from '../../config/db.js';
import {
  generateIncidentSummaryReportPdf,
} from '../../services/pdfService.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';

/**
 * Controller Laporan Rekap Insiden dalam Format PDF
 * Filter Periode: 1month (default), 3months, 1year, custom
 */
export const getIncidentsReportPdf = async (req, res) => {
  try {
    const { period = '1month', start_date, end_date, status, category } = req.query;

    const today = new Date();
    let calculatedStartDate = '';
    let calculatedEndDate = today.toISOString().split('T')[0];

    if (period === '1month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      calculatedStartDate = d.toISOString().split('T')[0];
    } else if (period === '3months') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      calculatedStartDate = d.toISOString().split('T')[0];
    } else if (period === '1year') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      calculatedStartDate = d.toISOString().split('T')[0];
    } else if (period === 'custom' && start_date && end_date) {
      calculatedStartDate = start_date;
      calculatedEndDate = end_date;
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      calculatedStartDate = d.toISOString().split('T')[0];
    }

    // Ambil insiden pada rentang periode dengan filter dinamis status & category
    let querySql = `
      SELECT i.*, u.name as reporter_name
      FROM incidents i
      LEFT JOIN users u ON u.id = i.reporter_id
      WHERE i.incident_date BETWEEN ? AND ?
    `;
    const queryParams = [calculatedStartDate, calculatedEndDate];

    if (status && status !== 'all' && status !== 'ALL') {
      querySql += ` AND i.status = ?`;
      queryParams.push(status);
    }

    if (category && category !== 'all' && category !== 'ALL') {
      querySql += ` AND i.category = ?`;
      queryParams.push(category);
    }

    querySql += ` ORDER BY i.incident_date DESC, i.incident_time DESC`;

    const [incidentsList] = await pool.query(querySql, queryParams);
    const deptHeadData = await getOfficialSignatory(pool);

    const resolvedCount = incidentsList.filter(
      (i) => i.status === 'resolved' || i.status === 'closed' || i.status === 'selesai'
    ).length;
    const ongoingCount = incidentsList.length - resolvedCount;

    // Hitung kategori dominan
    const categoryCounts = {};
    incidentsList.forEach((i) => {
      if (i.category) {
        categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
      }
    });
    let topCategory = '-';
    let maxCatCount = 0;
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategory = cat.replace(/_/g, ' ').toUpperCase();
      }
    });

    const periodLabelMap = {
      '1month': '1 Bulan Terakhir',
      '3months': '3 Bulan Terakhir',
      '1year': '1 Tahun Terakhir',
      'custom': 'Periode Kustom'
    };

    const payload = {
      period,
      periodLabel: periodLabelMap[period] || 'Periode Operasional',
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
      start_date: calculatedStartDate,
      end_date: calculatedEndDate,
      incidents: incidentsList,
      summary: {
        totalIncidents: incidentsList.length,
        resolvedCount,
        inProgressCount: ongoingCount,
        ongoingCount,
        topCategory
      },
      dept_head_name: deptHeadData?.name || 'Section Head ARFF',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
    };

    const doc = await generateIncidentSummaryReportPdf(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-rekap-insiden-${calculatedStartDate}-sd-${calculatedEndDate}.pdf"`
    );

    doc.on('error', (err) => {
      console.error('PDFKit stream error (IncidentReportPdf):', err);
      if (!res.headersSent) {
        return errorResponse(res, 'Gagal menerbitkan laporan PDF rekap insiden: ' + err.message, 500);
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
    console.error('Error getIncidentsReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF rekap insiden: ' + error.message, 500);
  }
};

