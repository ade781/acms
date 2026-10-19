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

/**
 * Membuat dokumen PDF Daftar Akun & Kredensial Personel ARFF YIA (Format A4 Landscape)
 * @param {Array} personnelList Daftar personel beserta akun dan status sandi
 * @returns {PDFDocument} Stream dokumen PDF
 */
export const generatePersonnelAccountsPdf = (personnelList = []) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 35, bottom: 35, left: 35, right: 35 },
    info: {
      Title: 'Daftar Akun & Kredensial Personel ARFF YIA',
      Author: 'Unit Pertolongan Kecelakaan Penerbangan dan Pemadam Kebakaran (PKP-PK)',
      Subject: 'Distribusi Kredensial Akses Operasional',
    },
    bufferPages: true,
  });

  const columns = [
    { header: 'No', width: 30, align: 'center' },
    { header: 'Status Sandi', width: 130, align: 'left' },
    { header: 'Nama Lengkap', width: 165, align: 'left' },
    { header: 'NIP', width: 95, align: 'left' },
    { header: 'Regu', width: 60, align: 'center' },
    { header: 'Jabatan', width: 120, align: 'left' },
    { header: 'Username', width: 75, align: 'left' },
    { header: 'Kata Sandi', width: 95, align: 'left' },
  ];

  const startX = 35;
  const startY = 75;
  const rowHeight = 21;
  const pageBottom = 540;

  const drawHeader = () => {
    // Judul Kop Dokumen
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(
      'DAFTAR AKUN & KREDENSIAL PERSONEL OPERASIONAL ARFF',
      startX,
      35,
      { align: 'left' }
    );
    doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(
      'Bandara Internasional Yogyakarta (YIA) • Dokumen Distribusi Akun Mandiri (Default Password: 123456)',
      startX,
      50,
      { align: 'left' }
    );

    const printDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
      `Tanggal Cetak: ${printDate}`,
      startX,
      42,
      { align: 'right', width: 770 }
    );

    // Garis pemisah kop
    doc.moveTo(startX, 65).lineTo(startX + 770, 65).lineWidth(1).strokeColor('#cbd5e1').stroke();

    // Table Header Background Bar
    doc.rect(startX, startY, 770, rowHeight).fill('#1e293b');

    let curX = startX;
    columns.forEach((col) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff').text(
        col.header,
        curX + 4,
        startY + 6,
        { width: col.width - 8, align: col.align }
      );
      curX += col.width;
    });
  };

  drawHeader();

  let currentY = startY + rowHeight;

  personnelList.forEach((p, idx) => {
    if (currentY + rowHeight > pageBottom) {
      doc.addPage();
      drawHeader();
      currentY = startY + rowHeight;
    }

    // Zebra background
    if (idx % 2 === 1) {
      doc.rect(startX, currentY, 770, rowHeight).fill('#f8fafc');
    }

    const isDefault = p.must_change_password === 1 || p.must_change_password === true;
    const hasAccount = Boolean(p.username);

    const statusSandi = !hasAccount
      ? 'Belum Ada Akun'
      : isDefault
      ? 'Belum Diganti (Default)'
      : 'Sudah Diganti';

    const passwordDisplay = !hasAccount
      ? '-'
      : isDefault
      ? '123456'
      : '[Diubah Mandiri]';

    const cellData = [
      { text: String(idx + 1), align: 'center', color: '#64748b', font: 'Helvetica' },
      {
        text: statusSandi,
        align: 'left',
        color: !hasAccount ? '#64748b' : isDefault ? '#b91c1c' : '#15803d',
        font: isDefault ? 'Helvetica-Bold' : 'Helvetica',
      },
      { text: p.full_name || '-', align: 'left', color: '#0f172a', font: 'Helvetica-Bold' },
      { text: p.nip || '-', align: 'left', color: '#475569', font: 'Helvetica' },
      { text: p.team_group || '-', align: 'center', color: '#0f172a', font: 'Helvetica' },
      { text: p.rank_position || '-', align: 'left', color: '#475569', font: 'Helvetica' },
      { text: p.username || '-', align: 'left', color: '#0f172a', font: 'Helvetica-Bold' },
      {
        text: passwordDisplay,
        align: 'left',
        color: isDefault ? '#b91c1c' : '#64748b',
        font: isDefault ? 'Helvetica-Bold' : 'Helvetica',
      },
    ];

    let colX = startX;
    columns.forEach((col, colIdx) => {
      const cell = cellData[colIdx];
      doc.fontSize(7.5).font(cell.font).fillColor(cell.color).text(
        cell.text,
        colX + 4,
        currentY + 6,
        { width: col.width - 8, align: col.align, lineBreak: false, ellipsis: true }
      );
      colX += col.width;
    });

    // Garis tipis pembatas baris
    doc.moveTo(startX, currentY + rowHeight).lineTo(startX + 770, currentY + rowHeight).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

    currentY += rowHeight;
  });

  // Footer penomoran halaman otomatis
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
      `Halaman ${i + 1} dari ${range.count} • Dokumen Rahasia Distribusi Internal ARFF YIA`,
      startX,
      565,
      { width: 770, align: 'center' }
    );
  }

  return doc;
};
