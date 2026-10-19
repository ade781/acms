import pool from '../config/db.js';
import { generateShiftReportPdf } from '../services/pdfService.js';
import { errorResponse } from '../utils/responseHelper.js';

export const getShiftReportPdf = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const teamGroup = team_group || 'Alpha';

    // Eksekusi generator PDF resmi laporan dinas A4
    const [shifts] = await pool.query(
      `SELECT ps.*, u.name as supervisor_name, u.signature_url as user_sig, p.signature_url as pers_sig, p.nip as supervisor_nip
       FROM personnel_shifts ps
       LEFT JOIN users u ON u.id = ps.supervisor_id
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ?`,
      [shiftDate, shiftNumber, teamGroup]
    );

    const shiftData = shifts.length > 0 ? shifts[0] : {
      shift_date: shiftDate,
      shift_number: shiftNumber,
      team_group: teamGroup,
      supervisor_name: req.user.name,
      supervisor_nip: null,
      supervisor_signature_url: null,
      status: 'open'
    };

    // Ambil data pejabat Dept Head / Section Head secara dinamis dari database
    const [deptHeads] = await pool.query(
      `SELECT u.name, p.nip, p.rank_position, COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.role IN ('dept_head', 'admin')
       ORDER BY FIELD(u.role, 'dept_head', 'admin')
       LIMIT 1`
    );
    const deptHeadData = deptHeads.length > 0 ? deptHeads[0] : null;

    // Ambil data kesiapan kendaraan & PIC ploting resmi shift
    const [vehicles] = await pool.query(
      `SELECT v.code_name, v.vehicle_name, v.category, vrl.status, vrl.justification,
              COALESCE(deploy_pic.full_name, p.full_name) as pic_name
       FROM vehicles v
       LEFT JOIN vehicle_readiness_logs vrl
         ON vrl.vehicle_id = v.id AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
       LEFT JOIN (
         SELECT pd.vehicle_id, p.full_name
         FROM personnel_deployments pd
         JOIN personnel_shifts ps ON ps.id = pd.shift_id
         JOIN personnel p ON p.id = pd.personnel_id
         WHERE ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ? AND pd.is_pic = 1
       ) deploy_pic ON deploy_pic.vehicle_id = v.id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE v.is_active = 1`,
      [shiftDate, shiftNumber, teamGroup, shiftDate, shiftNumber, teamGroup]
    );

    // Ambil kesiapan watchroom dari vehicle_readiness_logs
    const [watchrooms] = await pool.query(
      `SELECT vrl.status, vrl.notes, p.full_name as inspector_name
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE (v.category = 'posko' OR v.code_name = 'WATCHROOM')
         AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
       LIMIT 1`,
      [shiftDate, shiftNumber, teamGroup]
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

    // Ambil insiden (dikunci berdasarkan tanggal, shift_number, dan team_group)
    const [incidents] = await pool.query(
      `SELECT report_number, title, location, incident_time, action_taken
       FROM incidents
       WHERE incident_date = ? AND shift_number = ? AND team_group = ?`,
      [shiftDate, shiftNumber, teamGroup]
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
      supervisor_nip: shiftData.supervisor_nip || null,
      supervisor_signature_url: shiftData.pers_sig || shiftData.user_sig || null,
      dept_head_name: deptHeadData?.name || 'Section Head ARFF',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
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
