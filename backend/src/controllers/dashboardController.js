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

    // Carry-over status unserviceable dari shift sebelumnya jika belum dilaporkan di shift ini
    const unreportedVehicleIds = vehicles.filter(v => v.status === 'belum_dilaporkan').map(v => v.id);

    if (unreportedVehicleIds.length > 0) {
      const [prevLogs] = await pool.query(
        `SELECT vrl.vehicle_id, vrl.status, vrl.justification, vrl.photo_webp_url, vrl.follow_up_status,
                vrl.shift_date, vrl.shift_number, vrl.team_group, p.full_name as prev_pic_name
         FROM vehicle_readiness_logs vrl
         JOIN (
           SELECT vehicle_id, MAX(CONCAT(shift_date, '_', LPAD(shift_number, 2, '0'))) as max_shift
           FROM vehicle_readiness_logs
           WHERE vehicle_id IN (?)
             AND (shift_date < ? OR (shift_date = ? AND shift_number < ?))
             AND status = 'unserviceable'
             AND follow_up_status != 'resolved'
           GROUP BY vehicle_id
         ) latest ON latest.vehicle_id = vrl.vehicle_id
                 AND CONCAT(vrl.shift_date, '_', LPAD(vrl.shift_number, 2, '0')) = latest.max_shift
         LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
         WHERE vrl.status = 'unserviceable'
           AND vrl.follow_up_status != 'resolved'`,
        [unreportedVehicleIds, shiftDate, shiftDate, shiftNumber]
      );

      const carryOverMap = new Map();
      for (const prev of prevLogs) {
        if (!carryOverMap.has(prev.vehicle_id)) {
          carryOverMap.set(prev.vehicle_id, prev);
        }
      }

      for (let i = 0; i < vehicles.length; i++) {
        if (vehicles[i].status === 'belum_dilaporkan' && carryOverMap.has(vehicles[i].id)) {
          const prev = carryOverMap.get(vehicles[i].id);
          vehicles[i].status = 'unserviceable';
          vehicles[i].justification = prev.justification;
          vehicles[i].photo_webp_url = prev.photo_webp_url;
          vehicles[i].follow_up_status = prev.follow_up_status;
          vehicles[i].is_carried_over = true;
          vehicles[i].carried_from = {
            shift_date: prev.shift_date,
            shift_number: prev.shift_number,
            team_group: prev.team_group,
            reported_by: prev.prev_pic_name
          };
        }
      }
    }

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
      `SELECT vrl.*, p.full_name as inspector_name
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE (v.category = 'posko' OR v.code_name = 'WATCHROOM')
         AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
       LIMIT 1`,
      [shiftDate, shiftNumber, cleanTeamGroup]
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
    const totalTeamMembers = Number(teamRosterRows[0]?.total_members) || 0;

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
