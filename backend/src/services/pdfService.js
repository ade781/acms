import PDFDocument from 'pdfkit';

/**
 * Membuat stream PDF Dokumen Resmi Laporan Shift ARFF (Format A4)
 * @param {Object} reportData Data lengkap shift, personel, kesiapan kendaraan, watchroom, aktivitas
 * @returns {PDFDocument} Stream dokumen PDF
 */
export const generateShiftReportPdf = (reportData) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 45, right: 45 },
    info: {
      Title: `Laporan Dinas ARFF Shift ${reportData.shift_number || 1} - Regu ${reportData.team_group || 'Alpha'}`,
      Author: 'Sistem Monitoring Operasional ARFF',
      Subject: 'Laporan Dinas Shift Harian ARFF'
    }
  });

  const {
    shift_date = new Date().toISOString().split('T')[0],
    shift_number = 1,
    team_group = 'Alpha',
    supervisor_name = 'Ketua Regu',
    status = 'open',
    vehicles = [],
    watchroom = {},
    deployments = [],
    activities = [],
    incidents = []
  } = reportData;

  const shiftTimes = {
    1: '07:00 - 13:00 WIB (Pagi)',
    2: '13:00 - 20:00 WIB (Siang)',
    3: '20:00 - 07:00 WIB (Malam)'
  };

  // Header Dokumen
  doc.fontSize(14).font('Helvetica-Bold').text('UNIT AIRPORT RESCUE & FIRE FIGHTING (ARFF)', { align: 'center' });
  doc.fontSize(11).font('Helvetica').text('LAPORAN RESMI PELAKSANAAN DINAS SHIFT OPERASIONAL', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(45, doc.y).lineTo(550, doc.y).stroke('#333333');
  doc.moveDown(0.8);

  // Informasi Shift
  doc.fontSize(9).font('Helvetica-Bold').text('INFORMASI DINAS SHIFT');
  doc.font('Helvetica').fontSize(9);
  doc.text(`Tanggal: ${shift_date}  |  Shift: ${shift_number} (${shiftTimes[shift_number] || '-'})  |  Regu: ${team_group}`);
  doc.text(`Ketua Regu / Supervisor: ${supervisor_name}  |  Status Pengesahan: ${status === 'approved' ? 'DISETUJUI (APPROVED)' : 'DRAFT (OPEN)'}`);
  doc.moveDown(0.8);

  // Bagian Kesiapan Watchroom
  doc.fontSize(9).font('Helvetica-Bold').text('1. KESIAPAN FASILITAS WATCHROOM');
  doc.font('Helvetica').fontSize(8.5);
  const wrStatus = watchroom.status ? watchroom.status.toUpperCase() : 'BELUM DILAPORKAN';
  doc.text(`Status: ${wrStatus} | Petugas: ${watchroom.inspector_name || '-'} | Catatan: ${watchroom.notes || 'Nihil'}`);
  doc.moveDown(0.8);

  // Bagian Kesiapan Kendaraan
  doc.fontSize(9).font('Helvetica-Bold').text('2. KESIAPAN ARMADA UTAMA & PENDUKUNG');
  doc.font('Helvetica').fontSize(8.5);
  if (vehicles.length === 0) {
    doc.text('Belum ada data kesiapan kendaraan yang dilaporkan.');
  } else {
    vehicles.forEach((v, idx) => {
      const vStatus = v.status ? v.status.toUpperCase() : 'BELUM DILAPORKAN';
      const picText = v.pic_name ? `PIC: ${v.pic_name}` : 'PIC: -';
      doc.text(`${idx + 1}. [${v.code_name || 'Unit'}] ${v.vehicle_name} (${v.category || 'utama'}) | Status: ${vStatus} | ${picText}`);
      if (v.status === 'unserviceable' && v.justification) {
        doc.fillColor('#b91c1c').text(`   Kendala / Justifikasi: ${v.justification}`, { indent: 15 }).fillColor('#000000');
      }
    });
  }
  doc.moveDown(0.8);

  // Bagian Ploting Penempatan Personel
  doc.fontSize(9).font('Helvetica-Bold').text('3. PLOTING KEKUATAN PERSONEL DINAS');
  doc.font('Helvetica').fontSize(8.5);
  if (deployments.length === 0) {
    doc.text('Belum ada ploting penempatan personel pada shift ini.');
  } else {
    const present = deployments.filter(d => d.deployment_type !== 'absent');
    const absent = deployments.filter(d => d.deployment_type === 'absent');

    doc.text(`Total Personel Hadir: ${present.length} orang | Tidak Hadir (Cuti/Sakit/Dinas): ${absent.length} orang`);
    
    if (absent.length > 0) {
      const absentList = absent.map(a => `${a.full_name} (${a.absent_reason || 'Izin'})`).join(', ');
      doc.text(`Personel Tidak Hadir: ${absentList}`);
    }
  }
  doc.moveDown(0.8);

  // Bagian Kejadian / Insiden
  doc.fontSize(9).font('Helvetica-Bold').text('4. REKAPITULASI INSIDEN & KEJADIAN KHUSUS');
  doc.font('Helvetica').fontSize(8.5);
  if (incidents.length === 0) {
    doc.text('Nihil kejadian insiden darurat selama shift operasional berlangsung.');
  } else {
    incidents.forEach((inc, idx) => {
      doc.text(`${idx + 1}. [${inc.report_number}] ${inc.title} (Waktu: ${inc.incident_time})`);
      doc.text(`   Lokasi: ${inc.location} | Tindakan: ${inc.action_taken || '-'}`);
    });
  }
  doc.moveDown(0.8);

  // Bagian Log Aktivitas Rutin
  doc.fontSize(9).font('Helvetica-Bold').text('5. LOGBOOK AKTIVITAS SHIFT');
  doc.font('Helvetica').fontSize(8.5);
  if (activities.length === 0) {
    doc.text('Belum ada catatan aktivitas rutin yang dimasukkan.');
  } else {
    activities.forEach((act, idx) => {
      doc.text(`${idx + 1}. [${act.activity_time}] ${act.title}: ${act.description || '-'}`);
    });
  }
  doc.moveDown(1.5);

  // Tanda Tangan
  const currentY = doc.y;
  if (currentY > 680) {
    doc.addPage();
  }

  doc.fontSize(8.5).font('Helvetica');
  doc.text('Disahkan oleh,', 45, doc.y, { width: 220, align: 'center' });
  doc.text('Ketua Regu Pengganti (Serah Terima),', 320, doc.y - 12, { width: 220, align: 'center' });
  doc.moveDown(3);
  doc.font('Helvetica-Bold');
  doc.text(`( ${supervisor_name} )`, 45, doc.y, { width: 220, align: 'center' });
  doc.text('( ........................................ )', 320, doc.y - 12, { width: 220, align: 'center' });

  return doc;
};
