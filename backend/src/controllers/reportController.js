import pool from '../config/db.js';
import { generateShiftReportPdf } from '../services/pdfService.js';
import { errorResponse } from '../utils/responseHelper.js';

export const getShiftReportPdf = async (req, res) => {
  try {
    const { date, shift, team_group, download } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const teamGroup = team_group || 'Alpha';

    // Status resmi: Coming Soon
    // Jika klien tidak meminta unduh file langsung (?download=true), kembalikan respons Coming Soon
    if (!download || download === 'false') {
      return res.status(200).json({
        success: true,
        message: 'Fitur Cetak Laporan PDF resmi berstatus Coming Soon',
        status: 'coming_soon',
        data: {
          shift_date: shiftDate,
          shift_number: shiftNumber,
          team_group: teamGroup,
          note: 'Layout dan kop resmi bandara akan disematkan pada pembaruan rilis berikutnya.'
        }
      });
    }

    // Eksekusi generator PDF jika parameter download=true
    const [shifts] = await pool.query(
      `SELECT ps.*, u.name as supervisor_name
       FROM personnel_shifts ps
       LEFT JOIN users u ON u.id = ps.supervisor_id
       WHERE ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ?`,
      [shiftDate, shiftNumber, teamGroup]
    );

    const shiftData = shifts.length > 0 ? shifts[0] : {
      shift_date: shiftDate,
      shift_number: shiftNumber,
      team_group: teamGroup,
      supervisor_name: req.user.name,
      status: 'open'
    };

    // Ambil data kesiapan kendaraan
    const [vehicles] = await pool.query(
      `SELECT v.code_name, v.vehicle_name, v.category, vrl.status, vrl.justification,
              p.full_name as pic_name
       FROM vehicles v
       LEFT JOIN vehicle_readiness_logs vrl
         ON vrl.vehicle_id = v.id AND vrl.shift_date = ? AND vrl.shift_number = ?
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE v.is_active = 1`,
      [shiftDate, shiftNumber]
    );

    // Ambil kesiapan watchroom
    const [watchrooms] = await pool.query(
      `SELECT wcl.status, wcl.notes, u.name as inspector_name
       FROM watchroom_checklist_logs wcl
       LEFT JOIN users u ON u.id = wcl.inspector_id
       WHERE wcl.shift_date = ? AND wcl.shift_number = ?`,
      [shiftDate, shiftNumber]
    );

    // Ambil ploting personel
    let deployments = [];
    if (shifts.length > 0) {
      const [deps] = await pool.query(
        `SELECT pd.*, p.full_name, p.nip, p.rank_position
         FROM personnel_deployments pd
         JOIN personnel p ON p.id = pd.personnel_id
         WHERE pd.shift_id = ?`,
        [shifts[0].id]
      );
      deployments = deps;
    }

    // Ambil insiden
    const [incidents] = await pool.query(
      `SELECT report_number, title, location, incident_time, action_taken
       FROM incidents
       WHERE incident_date = ? AND shift_number = ?`,
      [shiftDate, shiftNumber]
    );

    // Ambil aktivitas
    let activities = [];
    if (shifts.length > 0) {
      const [acts] = await pool.query(
        `SELECT activity_time, title, description
         FROM daily_shift_activities
         WHERE shift_id = ? ORDER BY activity_time ASC`,
        [shifts[0].id]
      );
      activities = acts;
    }

    const reportPayload = {
      shift_date: shiftData.shift_date,
      shift_number: shiftData.shift_number,
      team_group: shiftData.team_group,
      supervisor_name: shiftData.supervisor_name || req.user.name,
      status: shiftData.status,
      vehicles,
      watchroom: watchrooms.length > 0 ? watchrooms[0] : {},
      deployments,
      incidents,
      activities
    };

    const doc = generateShiftReportPdf(reportPayload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-shift-${shiftNumber}-${teamGroup}-${shiftDate}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error getShiftReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF: ' + error.message, 500);
  }
};
