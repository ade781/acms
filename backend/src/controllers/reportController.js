import pool from '../config/db.js';
import { generateShiftReportPdf } from '../services/pdfService.js';
import { errorResponse } from '../utils/responseHelper.js';

export const getShiftReportPdf = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const rawTeam = team_group || 'Alpha';
    const teamGroup = rawTeam.replace(/^(Regu\s+|Team\s+)/i, '').trim();

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
      supervisor_name: null,
      supervisor_nip: null,
      supervisor_signature_url: null,
      status: 'open'
    };

    // Ambil identitas Ketua Regu / Supervisor dinas secara dinamis dari database
    let supervisorName = shiftData?.supervisor_name || null;
    let supervisorNip = shiftData?.supervisor_nip || null;
    let supervisorSignatureUrl = shiftData?.pers_sig || shiftData?.user_sig || null;

    if (!supervisorName) {
      const [teamChiefs] = await pool.query(
        `SELECT p.full_name, p.nip, COALESCE(u.signature_url, p.signature_url) as signature_url
         FROM personnel p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
           AND p.rank_position NOT LIKE '%Assistant%'
           AND p.rank_position NOT LIKE '%Asisten%'
           AND p.rank_position NOT LIKE '%Wakil%'
           AND (u.role IS NULL OR u.role != 'chief_assistant')
           AND p.team_group = ?
         ORDER BY p.id ASC
         LIMIT 1`,
        [teamGroup]
      );
      if (teamChiefs.length > 0) {
        supervisorName = teamChiefs[0].full_name;
        supervisorNip = teamChiefs[0].nip;
        supervisorSignatureUrl = teamChiefs[0].signature_url;
      } else {
        // Fallback dinamis: Cari personil paling senior di regu tersebut dari database (bukan hardcoded)
        const [seniorMembers] = await pool.query(
          `SELECT p.full_name, p.nip, COALESCE(u.signature_url, p.signature_url) as signature_url
           FROM personnel p
           LEFT JOIN users u ON u.id = p.user_id
           WHERE p.team_group = ? AND p.is_active = 1
           ORDER BY FIELD(p.cert_level, 'Senior', 'Junior', 'Basic'), p.id ASC
           LIMIT 1`,
          [teamGroup]
        );
        if (seniorMembers.length > 0) {
          supervisorName = seniorMembers[0].full_name;
          supervisorNip = seniorMembers[0].nip;
          supervisorSignatureUrl = seniorMembers[0].signature_url;
        } else {
          supervisorName = `Ketua Regu ${teamGroup}`;
        }
      }
    }

    // Ambil data pejabat Dept Head / Section Head secara dinamis dari database
    const [deptHeads] = await pool.query(
      `SELECT COALESCE(p.full_name, u.name) as name, p.nip, p.rank_position,
              COALESCE(u.signature_url, p.signature_url) as signature_url
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

    // Ambil ploting personel & absensi
    let deployments = [];
    let absents = [];

    if (shifts.length > 0) {
      const [deps] = await pool.query(
        `SELECT pd.*, p.full_name, p.nip, p.rank_position
         FROM personnel_deployments pd
         JOIN personnel p ON p.id = pd.personnel_id
         WHERE pd.shift_id = ?
         ORDER BY pd.deployment_type ASC, pd.is_pic DESC, p.full_name ASC`,
        [shifts[0].id]
      );
      deployments = deps;
      absents = deps.filter((d) => d.deployment_type === 'absent');
    }

    // Ambil juga personel dari regu ini yang tercatat cuti/izin pada tanggal ini
    // Query langsung ke seluruh record absent pada shift_date ini untuk regu terkait
    // bahkan jika shift posko spesifik belum dibuka
    const [teamAbsents] = await pool.query(
      `SELECT pd.*, p.full_name, p.nip, p.rank_position, pd.absent_reason, pd.notes
       FROM personnel_deployments pd
       JOIN personnel p ON p.id = pd.personnel_id
       JOIN personnel_shifts ps ON ps.id = pd.shift_id
       WHERE ps.shift_date = ? AND (p.team_group = ? OR ps.team_group = ?) AND pd.deployment_type = 'absent'`,
      [shiftDate, teamGroup, teamGroup]
    );

    const absentMap = new Map();
    absents.forEach((a) => absentMap.set(a.personnel_id, a));
    teamAbsents.forEach((a) => {
      if (!absentMap.has(a.personnel_id)) {
        absentMap.set(a.personnel_id, a);
      }
    });
    absents = Array.from(absentMap.values());

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
      supervisor_name: supervisorName,
      supervisor_nip: supervisorNip,
      supervisor_signature_url: supervisorSignatureUrl,
      dept_head_name: deptHeadData?.name || 'Section Head ARFF',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
      status: shiftData.status,
      vehicles,
      watchroom: watchrooms.length > 0 ? watchrooms[0] : {},
      deployments,
      absents,
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

export const getVehicleIssuesAudit = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;
    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const currentTeam = team_group || 'Alpha';

    // 1. Kendala unserviceable pada shift saat ini
    const [currentIssues] = await pool.query(
      `SELECT vrl.id, vrl.vehicle_id, v.code_name, v.vehicle_name, v.category,
              vrl.shift_date, vrl.shift_number, vrl.team_group, vrl.status,
              vrl.justification, vrl.follow_up_status, vrl.resolved_at, vrl.notes,
              p.full_name as reported_by_name, p.nip as reported_by_nip
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
         AND vrl.status = 'unserviceable'`,
      [shiftDate, shiftNumber, currentTeam]
    );

    // 2. Backlog kendala yang masih unserviceable dari shift-shift sebelumnya
    const [backlogIssues] = await pool.query(
      `SELECT vrl.id, vrl.vehicle_id, v.code_name, v.vehicle_name, v.category,
              vrl.shift_date, vrl.shift_number, vrl.team_group, vrl.status,
              vrl.justification, vrl.follow_up_status, vrl.resolved_at, vrl.notes,
              p.full_name as reported_by_name, p.nip as reported_by_nip
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE vrl.status = 'unserviceable'
         AND vrl.follow_up_status != 'resolved'
         AND (vrl.shift_date < ? OR (vrl.shift_date = ? AND vrl.shift_number < ?))
       ORDER BY vrl.shift_date DESC, vrl.shift_number DESC`,
      [shiftDate, shiftDate, shiftNumber]
    );

    // 3. Kendaraan yang berhasil dipulihkan (resolved) pada shift ini
    const [resolvedThisShift] = await pool.query(
      `SELECT vrl.id, vrl.vehicle_id, v.code_name, v.vehicle_name, v.category,
              vrl.shift_date, vrl.shift_number, vrl.team_group, vrl.status,
              vrl.justification, vrl.follow_up_status, vrl.resolved_at, vrl.notes,
              p.full_name as resolved_by_name, p.nip as resolved_by_nip
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
         AND vrl.status = 'serviceable' AND vrl.resolved_at IS NOT NULL`,
      [shiftDate, shiftNumber, currentTeam]
    );

    return res.json({
      success: true,
      message: 'Data pelacakan kendala armada berhasil diambil',
      data: {
        shift_date: shiftDate,
        shift_number: shiftNumber,
        team_group: currentTeam,
        current_issues: currentIssues,
        backlog_issues: backlogIssues,
        resolved_this_shift: resolvedThisShift
      }
    });
  } catch (error) {
    console.error('Error getVehicleIssuesAudit:', error);
    return errorResponse(res, 'Gagal mengambil data pelacakan kendala armada: ' + error.message, 500);
  }
};
