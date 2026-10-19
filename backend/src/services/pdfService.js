import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Helper untuk menemukan berkas gambar di server
 */
const resolveSignatureFile = (fileUrl) => {
  if (!fileUrl) return null;
  const cleanPath = fileUrl.replace(/^\//, '');
  const candidates = [
    path.resolve(process.cwd(), cleanPath),
    path.resolve(process.cwd(), 'backend', cleanPath),
    path.resolve(process.cwd(), '..', cleanPath),
    path.resolve(process.cwd(), 'uploads', path.basename(cleanPath))
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
};

/**
 * Membuat stream PDF Dokumen Resmi Laporan Shift ARFF (Format A4)
 * @param {Object} reportData Data lengkap shift, personel, kesiapan kendaraan, watchroom, aktivitas
 * @returns {PDFDocument} Stream dokumen PDF
 */
export const generateShiftReportPdf = (reportData) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: `Laporan Dinas ARFF Shift ${reportData.shift_number || 1} - Regu ${reportData.team_group || 'Alpha'}`,
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Laporan Dinas Shift Operasional Harian ARFF'
    },
    bufferPages: true,
  });

  const {
    shift_date = new Date().toISOString().split('T')[0],
    shift_number = 1,
    team_group = 'Alpha',
    supervisor_name = 'Ketua Regu',
    supervisor_nip = null,
    supervisor_signature_url = null,
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = null,
    dept_head_signature_url = null,
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

  const startX = 40;
  const contentWidth = 515;

  // Header Dokumen Resmi
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text(
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    startX,
    35,
    { align: 'center', width: contentWidth }
  );
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#b91c1c').text(
    'BANDARA INTERNASIONAL YOGYAKARTA (YIA)',
    startX,
    52,
    { align: 'center', width: contentWidth }
  );
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(
    'LAPORAN RESMI PELAKSANAAN DINAS SHIFT OPERASIONAL',
    startX,
    67,
    { align: 'center', width: contentWidth }
  );

  doc.moveTo(startX, 82).lineTo(startX + contentWidth, 82).lineWidth(1.5).strokeColor('#1e293b').stroke();
  doc.moveTo(startX, 84).lineTo(startX + contentWidth, 84).lineWidth(0.5).strokeColor('#94a3b8').stroke();

  doc.y = 92;

  // Box Informasi Shift
  doc.rect(startX, doc.y, contentWidth, 42).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(`Tanggal Dinas: `, startX + 10, infoY);
  doc.font('Helvetica').text(shift_date, startX + 75, infoY);

  doc.font('Helvetica-Bold').text(`Shift: `, startX + 160, infoY);
  doc.font('Helvetica').text(`${shift_number} (${shiftTimes[shift_number] || '-'})`, startX + 190, infoY);

  doc.font('Helvetica-Bold').text(`Regu Dinas: `, startX + 370, infoY);
  doc.font('Helvetica-Bold').fillColor('#b91c1c').text(`Regu ${team_group}`, startX + 430, infoY);

  const infoY2 = infoY + 16;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(`Supervisor / Ketua Regu: `, startX + 10, infoY2);
  doc.font('Helvetica').text(supervisor_name || 'Ketua Regu', startX + 125, infoY2);

  doc.font('Helvetica-Bold').text(`Status Pengesahan: `, startX + 320, infoY2);
  const isApp = status === 'approved';
  doc.font('Helvetica-Bold').fillColor(isApp ? '#15803d' : '#b91c1c').text(
    isApp ? 'TELAH DISAHKAN (APPROVED)' : 'DRAF OPERASIONAL (OPEN)',
    startX + 415,
    infoY2
  );

  doc.y = 145;

  // 1. Kesiapan Fasilitas Posko Watch Room
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. KESIAPAN FASILITAS WATCH ROOM & KOMUNIKASI');
  doc.moveDown(0.3);

  const wrStatus = (watchroom.status || 'BELUM DILAPORKAN').toUpperCase();
  const wrColor = wrStatus === 'SERVICEABLE' ? '#15803d' : wrStatus === 'UNSERVICEABLE' ? '#b91c1c' : '#64748b';

  doc.rect(startX, doc.y, contentWidth, 22).fillAndStroke('#f1f5f9', '#e2e8f0');
  const wrBoxY = doc.y + 6;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Kondisi Operasional:', startX + 10, wrBoxY);
  doc.font('Helvetica-Bold').fillColor(wrColor).text(wrStatus, startX + 110, wrBoxY);
  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Pemeriksa:', startX + 220, wrBoxY);
  doc.font('Helvetica').text(watchroom.inspector_name || 'Operator Watchroom', startX + 270, wrBoxY);
  doc.font('Helvetica-Bold').text('Catatan:', startX + 390, wrBoxY);
  doc.font('Helvetica').text(watchroom.notes || 'Nihil', startX + 430, wrBoxY, { width: 115, ellipsis: true });

  doc.y += 28;

  // 2. Kesiapan Armada Utama & Pendukung
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. KESIAPAN ARMADA PEMADAM & KENDARAAN OPERASIONAL');
  doc.moveDown(0.3);

  // Table Armada
  const vHeadY = doc.y;
  doc.rect(startX, vHeadY, contentWidth, 18).fill('#1e293b');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('No', startX + 4, vHeadY + 5, { width: 25, align: 'center' });
  doc.text('Nama Unit Armada', startX + 32, vHeadY + 5, { width: 140 });
  doc.text('Kategori', startX + 175, vHeadY + 5, { width: 70 });
  doc.text('Penanggung Jawab (PIC)', startX + 250, vHeadY + 5, { width: 125 });
  doc.text('Kondisi Fisik', startX + 380, vHeadY + 5, { width: 65, align: 'center' });
  doc.text('Justifikasi / Catatan', startX + 450, vHeadY + 5, { width: 100 });

  let curY = vHeadY + 18;
  if (vehicles.length === 0) {
    doc.rect(startX, curY, contentWidth, 18).fillAndStroke('#ffffff', '#e2e8f0');
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Belum ada kendaraan yang diperiksa shift ini.', startX + 10, curY + 5);
    curY += 18;
  } else {
    vehicles.forEach((v, idx) => {
      const vStat = (v.status || 'belum_dilaporkan').toUpperCase();
      const isServ = vStat === 'SERVICEABLE';
      const isUnserv = vStat === 'UNSERVICEABLE';

      doc.rect(startX, curY, contentWidth, 18).fillAndStroke(idx % 2 === 1 ? '#f8fafc' : '#ffffff', '#e2e8f0');
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text(String(idx + 1), startX + 4, curY + 5, { width: 25, align: 'center' });
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(v.vehicle_name || v.code_name || 'Unit', startX + 32, curY + 5, { width: 140, ellipsis: true });
      doc.font('Helvetica').fillColor('#475569').text(v.category || 'Armada', startX + 175, curY + 5, { width: 70 });
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(v.pic_name || '-', startX + 250, curY + 5, { width: 125, ellipsis: true });
      doc.font('Helvetica-Bold').fillColor(isServ ? '#15803d' : isUnserv ? '#b91c1c' : '#64748b').text(
        isServ ? 'SIAP' : isUnserv ? 'RUSAK' : 'BELUM CEK',
        startX + 380,
        curY + 5,
        { width: 65, align: 'center' }
      );
      doc.font('Helvetica').fillColor(isUnserv ? '#b91c1c' : '#475569').text(
        v.justification || v.notes || '-',
        startX + 450,
        curY + 5,
        { width: 100, ellipsis: true }
      );

      curY += 18;
    });
  }

  doc.y = curY + 10;

  // 3. Ploting Kekuatan Personel
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('3. KEKUATAN & DISTRIBUSI PERSONEL DINAS');
  doc.moveDown(0.3);

  const present = deployments.filter(d => d.deployment_type !== 'absent');
  const absent = deployments.filter(d => d.deployment_type === 'absent');

  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a');
  doc.text(`Total Personel Hadir Dinas: ${present.length} Orang   |   Personel Tidak Hadir / Cuti / Sakit: ${absent.length} Orang`);
  if (absent.length > 0) {
    const absText = absent.map(a => `${a.full_name} (${a.absent_reason || 'Izin'})`).join(', ');
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#b91c1c').text(`Keterangan Berhalangan: ${absText}`);
  }
  doc.moveDown(0.8);

  // 4. Rekapitulasi Insiden & Kejadian
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('4. REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL');
  doc.moveDown(0.3);

  if (incidents.length === 0) {
    doc.rect(startX, doc.y, contentWidth, 18).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#15803d').text(
      'NIHIL — Seluruh operasional penerbangan dan fasilitas bandara berlangsung dalam kondisi aman terkendali.',
      startX + 10,
      doc.y + 5
    );
    doc.y += 24;
  } else {
    incidents.forEach((inc, idx) => {
      doc.rect(startX, doc.y, contentWidth, 24).fillAndStroke('#fef2f2', '#fecaca');
      const incBoxY = doc.y + 5;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#991b1b').text(
        `${idx + 1}. [${inc.report_number}] ${inc.title} (Waktu: ${inc.incident_time || '-'})`,
        startX + 10,
        incBoxY
      );
      doc.fontSize(7.5).font('Helvetica').fillColor('#7f1d1d').text(
        `Lokasi: ${inc.location} | Tindakan: ${inc.action_taken || '-'}`,
        startX + 10,
        incBoxY + 11
      );
      doc.y += 28;
    });
  }

  // 5. Logbook Kegiatan Shift
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('5. JURNAL KEGIATAN RUTIN SHIFT OPERASIONAL');
  doc.moveDown(0.3);

  if (activities.length === 0) {
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Belum ada agenda shift tercatat.');
    doc.moveDown(0.6);
  } else {
    activities.forEach((act, idx) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(
        `${idx + 1}. [${act.activity_time}] ${act.title}: `,
        { continued: true }
      ).font('Helvetica').fillColor('#475569').text(act.description || '-');
    });
    doc.moveDown(0.8);
  }

  // Tanda Tangan Pengesahan (Pindah halaman jika ruang di bawah tidak cukup)
  if (doc.y > 660) {
    doc.addPage();
  } else {
    doc.moveDown(1.5);
  }

  const signY = Math.max(doc.y, 665);
  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a');
  doc.text('Mengetahui / Menyetujui,', startX + 20, signY, { width: 200, align: 'center' });
  doc.text('Disahkan Oleh,', startX + 295, signY, { width: 200, align: 'center' });

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD', startX + 20, signY + 12, { width: 200, align: 'center' });
  doc.text('KETUA REGU / SUPERVISOR DINAS', startX + 295, signY + 12, { width: 200, align: 'center' });

  // Sematkan tanda tangan digital Dept Head jika tersedia
  const deptSigFile = resolveSignatureFile(dept_head_signature_url);
  if (deptSigFile) {
    try {
      doc.image(deptSigFile, startX + 70, signY + 25, { fit: [100, 38], align: 'center' });
    } catch (e) {
      console.warn('Gagal memuat tanda tangan Dept Head:', e.message);
    }
  }

  // Sematkan tanda tangan digital Supervisor jika shift telah disahkan / tersedia
  const supSigFile = (status === 'approved' || supervisor_signature_url) ? resolveSignatureFile(supervisor_signature_url) : null;
  if (supSigFile) {
    try {
      doc.image(supSigFile, startX + 345, signY + 25, { fit: [100, 38], align: 'center' });
    } catch (e) {
      console.warn('Gagal memuat tanda tangan Supervisor:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(`( ${dept_head_name} )`, startX + 20, signY + 68, { width: 200, align: 'center' });
  doc.text(`( ${supervisor_name || 'Ketua Regu'} )`, startX + 295, signY + 68, { width: 200, align: 'center' });

  doc.fontSize(7.5).font('Helvetica').fillColor('#475569');
  if (dept_head_nip && dept_head_nip !== '-') {
    doc.text(`NIP. ${dept_head_nip}`, startX + 20, signY + 79, { width: 200, align: 'center' });
  }
  if (supervisor_nip && supervisor_nip !== '-') {
    doc.text(`NIP. ${supervisor_nip}`, startX + 295, signY + 79, { width: 200, align: 'center' });
  }

  if (status === 'approved') {
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#15803d');
    doc.text('Telah Disahkan Secara Digital', startX + 295, signY + (supervisor_nip && supervisor_nip !== '-' ? 89 : 80), { width: 200, align: 'center' });
  }

  // Penomoran Halaman Otomatis
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
      `Halaman ${i + 1} dari ${range.count} • Dokumen Resmi ARFF YIA • Dicetak otomatis oleh Sistem Monitoring Operasional`,
      startX,
      805,
      { width: contentWidth, align: 'center' }
    );
  }

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
