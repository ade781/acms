import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;

    // 1. Data shift aktif
    let shiftQuery = `
      SELECT ps.*, u.name as supervisor_name
      FROM personnel_shifts ps
      LEFT JOIN users u ON u.id = ps.supervisor_id
      WHERE ps.shift_date = ? AND ps.shift_number = ?
    `;
    const shiftParams = [shiftDate, shiftNumber];
    if (team_group) {
      shiftQuery += ' AND ps.team_group = ?';
      shiftParams.push(team_group);
    }

    const [shifts] = await pool.query(shiftQuery, shiftParams);
    const activeShift = shifts.length > 0 ? shifts[0] : null;

    // 2. Ringkasan kesiapan armada
    const [vehicles] = await pool.query(
      `SELECT v.id, v.code_name, v.vehicle_name, v.category,
              COALESCE(vrl.status, 'belum_dilaporkan') as status,
              vrl.justification, vrl.photo_webp_url, vrl.follow_up_status,
              p.full_name as pic_name
       FROM vehicles v
       LEFT JOIN vehicle_readiness_logs vrl
         ON vrl.vehicle_id = v.id AND vrl.shift_date = ? AND vrl.shift_number = ?
       LEFT JOIN personnel p
         ON p.id = vrl.pic_personnel_id
       WHERE v.is_active = 1`,
      [shiftDate, shiftNumber]
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

    // 4. Kekuatan Personel Dinas
    let personnelSummary = {
      total_roster: 0,
      present_count: 0,
      absent_count: 0,
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
        total_roster: deployments.length,
        present_count: present.length,
        absent_count: absent.length,
        absent_details: absent.map(a => ({
          personnel_id: a.personnel_id,
          full_name: a.full_name,
          reason: a.absent_reason,
          notes: a.notes
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
      team_group: activeShift ? activeShift.team_group : (team_group || 'Alpha'),
      shift: activeShift,
      fleet: fleetSummary,
      watchroom: watchroomSummary,
      personnel: personnelSummary,
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
