import pool from './db.js';

export const STANDARD_VEHICLES = [
  {
    code_name: 'FT-01',
    vehicle_name: 'Foam Tender 01 Oshkosh Striker',
    category: 'utama',
    license_plate: 'AB 8001 YA',
    description: 'Armada pemadam utama kapasitas foam 12.500 liter & water cannon'
  },
  {
    code_name: 'FT-02',
    vehicle_name: 'Foam Tender 02 Oshkosh Striker',
    category: 'utama',
    license_plate: 'AB 8002 YA',
    description: 'Armada pemadam utama kapasitas foam 12.500 liter'
  },
  {
    code_name: 'FT-03',
    vehicle_name: 'Foam Tender 03 Oshkosh Striker',
    category: 'utama',
    license_plate: 'AB 8003 YA',
    description: 'Armada pemadam utama kapasitas foam 12.500 liter'
  },
  {
    code_name: 'RIV-01',
    vehicle_name: 'Rapid Intervention Vehicle 01',
    category: 'utama',
    license_plate: 'AB 8004 YA',
    description: 'Armada respon cepat tanggap darurat kecelakaan pesawat'
  },
  {
    code_name: 'NT-01',
    vehicle_name: 'Nurse Tender 01',
    category: 'pendukung',
    license_plate: 'AB 8005 YA',
    description: 'Truk tangki suplai air kapasitas 15.000 liter untuk Foam Tender'
  },
  {
    code_name: 'CC-01',
    vehicle_name: 'Commando Car 01',
    category: 'pendukung',
    license_plate: 'AB 8006 YA',
    description: 'Kendaraan komando dan koordinasi lapangan incident commander'
  },
  {
    code_name: 'AMB-01',
    vehicle_name: 'Ambulance ARFF 01',
    category: 'pendukung',
    license_plate: 'AB 8007 YA',
    description: 'Ambulans evakuasi medis darurat dan pertolongan pertama'
  },
  {
    code_name: 'WATCHROOM',
    vehicle_name: 'Watch Room',
    category: 'posko',
    license_plate: '-',
    description: 'Posko Komunikasi & Pengamatan Darurat ARFF YIA'
  }
];

export async function seedVehicles() {
  console.log('Menyinkronkan data master armada baku ARFF YIA...');

  for (const v of STANDARD_VEHICLES) {
    const [existing] = await pool.query(
      'SELECT id FROM vehicles WHERE code_name = ?',
      [v.code_name]
    );

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO vehicles (code_name, vehicle_name, category, license_plate, description, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [v.code_name, v.vehicle_name, v.category, v.license_plate, v.description]
      );
      console.log(`+ Armada ditambahkan: ${v.code_name} - ${v.vehicle_name}`);
    } else {
      await pool.query(
        `UPDATE vehicles SET vehicle_name = ?, category = ?, license_plate = ?, description = ?, is_active = 1
         WHERE id = ?`,
        [v.vehicle_name, v.category, v.license_plate, v.description, existing[0].id]
      );
    }
  }

  console.log(`Penyinkronan armada selesai: ${STANDARD_VEHICLES.length} unit aktif.`);
}
