import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const cleanTeamGroup = (team_group || 'Alpha').replace(/^regu\s+/i, '').trim();

    // 1. Data shift aktif
    let shiftQuery = `
      SELECT ps.*, u.name as supervisor_name
      FROM personnel_shifts ps
      LEFT JOIN users u ON u.id = ps.supervisor_id
      WHERE ps.shift_date = ? AND ps.shift_number = ?
    `;
    const shiftParams = [shiftDate, shiftNumber];
    if (cleanTeamGroup) {
      shiftQuery += ' AND ps.team_group = ?';
      shiftParams.push(cleanTeamGroup);
    }

    const [shifts] = await pool.query(shiftQuery, shiftParams);
    const activeShift = shifts.length > 0 ? shifts[0] : null;

    // 2. Ringkasan kesiapan armada (terikat ketat pada shift_date, shift_number, dan cleanTeamGroup)
    const [vehicles] = await pool.query(
      `SELECT v.id, v.code_name, v.vehicle_name, v.category,
              COALESCE(vrl.status, 'belum_dilaporkan') as status,
              vrl.justification, vrl.photo_webp_url, vrl.follow_up_status,
              COALESCE(deploy_pic.full_name, p_log.full_name) as pic_name
       FROM vehicles v
       LEFT JOIN vehicle_readiness_logs vrl
         ON vrl.vehicle_id = v.id
        AND vrl.shift_date = ?
        AND vrl.shift_number = ?
        AND vrl.team_group = ?
       LEFT JOIN (
         SELECT pd.vehicle_id, p.full_name
         FROM personnel_deployments pd
         JOIN personnel_shifts ps ON ps.id = pd.shift_id
         JOIN personnel p ON p.id = pd.personnel_id
         WHERE ps.shift_date = ?
           AND ps.shift_number = ?
           AND ps.team_group = ?
           AND pd.is_pic = 1
       ) deploy_pic ON deploy_pic.vehicle_id = v.id
       LEFT JOIN personnel p_log
         ON p_log.id = vrl.pic_personnel_id
       WHERE v.is_active = 1`,
      [shiftDate, shiftNumber, cleanTeamGroup, shiftDate, shiftNumber, cleanTeamGroup]
    );

    let serviceableCount = 0;
    let unserviceableCount = 0;
    let pendingCount = 0;
    const criticalIssues = [];

    vehicles.forEach(v => {
      if (v.status === 'serviceable') {
        serviceableCount++;
      } else if (v.status === 'unserviceable') {
        unserviceableCount++;
        criticalIssues.push(v);
      } else {
        pendingCount++;
      }
    });

    const fleetSummary = {
      total: vehicles.length,
      serviceable: serviceableCount,
      unserviceable: unserviceableCount,
      pending: pendingCount,
      serviceable_percentage: vehicles.length > 0 ? Math.round((serviceableCount / vehicles.length) * 100) : 0,
      critical_issues: criticalIssues
    };

    // 3. Kesiapan watchroom
    const [watchrooms] = await pool.query(
      `SELECT wcl.*, u.name as inspector_name
       FROM watchroom_checklist_logs wcl
       LEFT JOIN users u ON u.id = wcl.inspector_id
       WHERE wcl.shift_date = ? AND wcl.shift_number = ?`,
      [shiftDate, shiftNumber]
    );

    const watchroomSummary = watchrooms.length > 0 ? watchrooms[0] : {
      status: 'belum_dilaporkan',
      notes: 'Belum ada laporan checklist watchroom',
      inspector_name: null
    };

    // 4. Kekuatan Personel Dinas (Berdasarkan Regu yang Sedang Bertugas)
    const [teamRosterRows] = await pool.query(
      `SELECT COUNT(*) as total_members FROM personnel WHERE team_group = ? AND is_active = 1`,
      [cleanTeamGroup]
    );
    const totalTeamMembers = Number(teamRosterRows[0]?.total_members) || 17;

    let personnelSummary = {
      total_roster: totalTeamMembers,
      present_count: 0,
      duty_count: 0,
      absent_count: 0,
      is_plotted: false,
      absent_details: []
    };

    if (activeShift) {
      const [deployments] = await pool.query(
        `SELECT pd.*, p.full_name, p.rank_position
         FROM personnel_deployments pd
         JOIN personnel p ON p.id = pd.personnel_id
         WHERE pd.shift_id = ?`,
        [activeShift.id]
      );

      const present = deployments.filter(d => d.deployment_type !== 'absent');
      const absent = deployments.filter(d => d.deployment_type === 'absent');

      personnelSummary = {
        total_roster: totalTeamMembers,
        present_count: present.length,
        duty_count: present.length,
        absent_count: absent.length,
        is_plotted: deployments.length > 0,
        absent_details: absent.map(a => ({
          personnel_id: a.personnel_id,
          full_name: a.full_name,
          reason: a.absent_reason || 'cuti',
          notes: a.notes || ''
        }))
      };
    }

    // 5. Insiden Terbuka & Total Hari Ini
    const [incidents] = await pool.query(
      `SELECT id, report_number, title, location, priority_level, status, incident_time
       FROM incidents
       WHERE incident_date = ? OR status IN ('dalam_proses', 'menunggu_tindak_lanjut')
       ORDER BY id DESC LIMIT 5`,
      [shiftDate]
    );

    const openIncidents = incidents.filter(i => i.status !== 'selesai');

    // 6. Aktivitas Terkini
    let recentActivities = [];
    if (activeShift) {
      const [acts] = await pool.query(
        `SELECT id, activity_type, activity_time, title, description
         FROM daily_shift_activities
         WHERE shift_id = ?
         ORDER BY activity_time DESC, id DESC LIMIT 5`,
        [activeShift.id]
      );
      recentActivities = acts;
    }

    return successResponse(res, 'Ringkasan KPI dashboard berhasil diambil', {
      shift_date: shiftDate,
      shift_number: shiftNumber,
      team_group: activeShift ? activeShift.team_group : cleanTeamGroup,
      shift: activeShift,
      fleet: fleetSummary,
      watchroom: watchroomSummary,
      personnel: personnelSummary,
      duty_count: personnelSummary.duty_count,
      absent_count: personnelSummary.absent_count,
      total_team_members: totalTeamMembers,
      incidents: {
        total_open: openIncidents.length,
        recent: incidents
      },
      recent_activities: recentActivities
    });
  } catch (error) {
    console.error('Error getDashboardSummary:', error);
    return errorResponse(res, 'Gagal mengambil ringkasan dashboard', 500);
  }
};
