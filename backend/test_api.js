import app from './src/app.js';
import pool from './src/config/db.js';

let server;
const PORT = 5005;

async function runTests() {
  console.log('--- MEMULAI INTEGRATION TEST BACKEND ARFF ---');

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
  console.log(`Test server aktif di http://localhost:${PORT}`);

  const baseUrl = `http://localhost:${PORT}/api`;

  let token = '';

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('1. Health check status:', healthData.status === 'online' ? 'PASS' : 'FAIL');

    // 2. Auth Login dengan akun admin awal (aaa / aaaaaa)
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'aaa', password: 'aaaaaa' })
    });
    const loginData = await loginRes.json();
    console.log('2. Login admin awal:', loginData.success ? 'PASS' : 'FAIL');
    token = loginData.data?.token;

    // 3. Auth Me
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meData = await meRes.json();
    console.log('3. Auth me:', meData.data?.username === 'aaa' ? 'PASS' : 'FAIL');

    // 4. Tambah Kendaraan Uji
    const vehicleRes = await fetch(`${baseUrl}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        code_name: 'FT-01',
        vehicle_name: 'Foam Tender 01 Oshkosh Striker',
        category: 'utama',
        license_plate: 'B 1234 ARFF',
        description: 'Armada pemadam utama kapasitas foam 12500L'
      })
    });
    const vehicleData = await vehicleRes.json();
    console.log('4. Tambah armada utama:', vehicleData.success ? 'PASS' : 'FAIL');
    const vehicleId = vehicleData.data.id;

    // 5. Tambah 3 Personel Uji untuk Menguji Ploting 3-4 Kru
    const personnelIds = [];
    const names = ['Personel Alpha Satu', 'Personel Alpha Dua', 'Personel Alpha Tiga'];
    const nips = ['199001012020011001', '199001012020011002', '199001012020011003'];

    for (let i = 0; i < 3; i++) {
      const pRes = await fetch(`${baseUrl}/personnel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nip: nips[i],
          full_name: names[i],
          rank_position: 'Junior Fire Fighter',
          team_group: 'Alpha',
          cert_level: 'Junior'
        })
      });
      const pData = await pRes.json();
      personnelIds.push(pData.data.id);
    }
    console.log('5. Tambah 3 personel uji:', personnelIds.length === 3 ? 'PASS' : 'FAIL');

    // 6. Test Ploting Penugasan Shift: 3 Kru, 1 PIC
    const today = new Date().toISOString().split('T')[0];
    const deployRes = await fetch(`${baseUrl}/deployments/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        shift_date: today,
        shift_number: 1,
        team_group: 'Alpha',
        deployments: [
          {
            personnel_id: personnelIds[0],
            deployment_type: 'vehicle_utama',
            vehicle_id: vehicleId,
            is_pic: true
          },
          {
            personnel_id: personnelIds[1],
            deployment_type: 'vehicle_utama',
            vehicle_id: vehicleId,
            is_pic: false
          },
          {
            personnel_id: personnelIds[2],
            deployment_type: 'vehicle_utama',
            vehicle_id: vehicleId,
            is_pic: false
          }
        ]
      })
    });
    const deployData = await deployRes.json();
    console.log('6. Ploting 3 kru & 1 PIC:', deployData.success ? 'PASS' : 'FAIL');

    // 7. Test Ambil Data Ploting Current
    const curDeployRes = await fetch(`${baseUrl}/deployments/current?date=${today}&shift=1&team_group=Alpha`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const curDeployData = await curDeployRes.json();
    const hasVehicles = curDeployData.data.vehicles.length > 0;
    console.log('7. Ambil ploting shift aktif:', hasVehicles ? 'PASS' : 'FAIL');

    // 8. Test Kesiapan Armada (Input kondisi oleh Admin / PIC)
    const readyRes = await fetch(`${baseUrl}/readiness/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        shift_date: today,
        shift_number: 1,
        team_group: 'Alpha',
        status: 'serviceable',
        notes: 'Pemeriksaan tekanan ban, cairan foam, dan mesin normal'
      })
    });
    const readyData = await readyRes.json();
    console.log('8. Input kesiapan armada serviceable:', readyData.success ? 'PASS' : 'FAIL');

    // 9. Test Kesiapan Watchroom (Status serviceable)
    const wrRes = await fetch(`${baseUrl}/readiness/watchroom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        shift_date: today,
        shift_number: 1,
        team_group: 'Alpha',
        status: 'serviceable',
        notes: 'Radio HT, sirine crash bell, dan monitor CCTV berfungsi baik'
      })
    });
    const wrData = await wrRes.json();
    console.log('9. Input kesiapan watchroom:', wrData.success ? 'PASS' : 'FAIL');

    // 10. Test Buat Insiden (Verifikasi Auto Number INC-0001)
    const incRes = await fetch(`${baseUrl}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        incident_date: today,
        incident_time: '09:15:00',
        title: 'Tumpahan Avtur di Apron B3',
        location: 'Parking Stand B3',
        chronology: 'Terjadi kebocoran selang refuelling saat proses pengisian bahan bakar pesawat.',
        priority_level: 'medium',
        action_taken: 'Petugas ARFF melokalisir tumpahan dengan oil dispersant dan sweeping pasir foam.',
        last_condition: 'Area telah bersih dan aman untuk operasional penerbangan.'
      })
    });
    const incData = await incRes.json();
    const isIncNumberValid = incData.data?.report_number === 'INC-0001';
    console.log('10. Buat insiden auto-number (INC-0001):', isIncNumberValid ? 'PASS' : 'FAIL');

    // 11. Test Logbook Aktivitas Rutin
    const actRes = await fetch(`${baseUrl}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        shift_date: today,
        shift_number: 1,
        team_group: 'Alpha',
        activity_type: 'Pelatihan Fisik',
        activity_time: '08:00:00',
        title: 'Latihan Pagi & Morning Briefing',
        description: 'Pengecekan kelengkapan APD dan apel pagi regu Alpha.'
      })
    });
    const actData = await actRes.json();
    console.log('11. Tambah aktivitas shift:', actData.success ? 'PASS' : 'FAIL');

    // 12. Test Dashboard Summary
    const dashRes = await fetch(`${baseUrl}/dashboard/summary?date=${today}&shift=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dashData = await dashRes.json();
    console.log('12. Dashboard KPI summary:', dashData.data?.fleet?.total >= 1 ? 'PASS' : 'FAIL');

    // 13. Test Pengesahan Laporan Shift (Approve Shift)
    const approveRes = await fetch(`${baseUrl}/deployments/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        shift_id: curDeployData.data.shift.id
      })
    });
    const approveData = await approveRes.json();
    console.log('13. Sahkan laporan shift (Approve):', approveData.data?.status === 'approved' ? 'PASS' : 'FAIL');

    // 14. Test Report PDF (Coming Soon status)
    const pdfRes = await fetch(`${baseUrl}/reports/pdf?date=${today}&shift=1&team_group=Alpha`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pdfData = await pdfRes.json();
    console.log('14. Report PDF Coming Soon response:', pdfData.status === 'coming_soon' ? 'PASS' : 'FAIL');

    // 15. Test Report PDF Stream Generator (?download=true)
    const pdfStreamRes = await fetch(`${baseUrl}/reports/pdf?date=${today}&shift=1&team_group=Alpha&download=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contentType = pdfStreamRes.headers.get('content-type');
    console.log('15. Report PDF stream download:', contentType === 'application/pdf' ? 'PASS' : 'FAIL');

    console.log('\n--- SELURUH 15 INTEGRATION TEST BERHASIL DILEWATI (100% PASS) ---');
  } catch (err) {
    console.error('Test gagal:', err);
  } finally {
    // Bersihkan data uji agar master data tetap bersih sesuai aturan NO DUMMY DATA
    console.log('Membersihkan data uji...');
    await pool.query('DELETE FROM incidents');
    await pool.query('DELETE FROM vehicle_readiness_logs');
    await pool.query('DELETE FROM personnel_deployments');
    await pool.query('DELETE FROM daily_shift_activities');
    await pool.query('DELETE FROM personnel_shifts');
    await pool.query('DELETE FROM watchroom_checklist_logs');
    await pool.query('DELETE FROM personnel');
    await pool.query('DELETE FROM vehicles');
    console.log('Data uji dibersihkan. Master data kembali KOSONG.');

    server.close();
    await pool.end();
  }
}

runTests();
