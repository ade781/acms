import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Helper untuk menemukan berkas gambar di server
 * Memastikan kompatibilitas penuh dengan PDFKit (hanya PNG dan JPEG yang didukung secara native)
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
    if (fs.existsSync(c)) {
      const ext = path.extname(c).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        return c;
      }
      if (ext === '.webp') {
        const pngAlt = c.replace(/\.webp$/i, '.png');
        if (fs.existsSync(pngAlt)) return pngAlt;
        const jpgAlt = c.replace(/\.webp$/i, '.jpg');
        if (fs.existsSync(jpgAlt)) return jpgAlt;
        const jpegAlt = c.replace(/\.webp$/i, '.jpeg');
        if (fs.existsSync(jpegAlt)) return jpegAlt;

        console.warn(`[PDFKit] File tanda tangan ${path.basename(c)} berformat WebP (tidak didukung PDFKit). Melewati gambar.`);
        return null;
      }
      return null;
    }
  }
  return null;
};

// In-Memory Caching untuk Dokumen PDF
const pdfMemoryCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 detik

export const getPdfCache = (key) => {
  const item = pdfMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    pdfMemoryCache.delete(key);
    return null;
  }
  return item.buffer;
};

export const setPdfCache = (key, buffer) => {
  if (pdfMemoryCache.size > 50) {
    const oldestKey = pdfMemoryCache.keys().next().value;
    pdfMemoryCache.delete(oldestKey);
  }
  pdfMemoryCache.set(key, { buffer, timestamp: Date.now() });
};

export const clearPdfCache = () => {
  pdfMemoryCache.clear();
};

/**
 * Menerapkan watermark dinamis dan penomoran halaman otomatis
 */
const applyWatermarkAndPageNumbers = (doc, contentWidth, startX = 40, watermarkText = 'ARFF YIA • OFFICIAL OPS REPORT') => {
  const range = doc.bufferedPageRange();
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const footerY = pageHeight - 35;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Watermark dinamis transparan di latar belakang
    doc.save();
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#94a3b8', 0.10);
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    doc.rotate(-32, { origin: [centerX, centerY] });
    doc.text(watermarkText, centerX - 260, centerY - 15, { width: 520, align: 'center' });
    doc.restore();

    // Footer penomoran halaman otomatis
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8').text(
      `Halaman ${i + 1} dari ${range.count} • Dokumen Resmi ARFF YIA • Dicetak otomatis oleh Sistem Monitoring Operasional`,
      startX,
      footerY,
      { width: contentWidth, align: 'center' }
    );
  }
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
    absents = [],
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
  doc.font('Helvetica').text(supervisor_name || `Ketua Regu ${team_group}`, startX + 125, infoY2);

  doc.font('Helvetica-Bold').text(`Status Dokumen: `, startX + 320, infoY2);
  doc.font('Helvetica-Bold').fillColor('#15803d').text(
    'REKAPITULASI RESMI OPERASIONAL',
    startX + 400,
    infoY2
  );

  doc.y = 145;

  const checkPageBreak = (neededHeight) => {
    if (doc.y + neededHeight > 740) {
      doc.addPage();
      doc.y = 35;
      return true;
    }
    return false;
  };

  // 1. Kesiapan Fasilitas Posko Watch Room
  checkPageBreak(40);
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
  checkPageBreak(50);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. KESIAPAN ARMADA PEMADAM & KENDARAAN OPERASIONAL');
  doc.moveDown(0.3);

  // Table Armada
  const drawArmadaHeader = (headY) => {
    doc.rect(startX, headY, contentWidth, 18).fill('#1e293b');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('No', startX + 4, headY + 5, { width: 25, align: 'center' });
    doc.text('Nama Unit Armada', startX + 32, headY + 5, { width: 140 });
    doc.text('Kategori', startX + 175, headY + 5, { width: 70 });
    doc.text('Penanggung Jawab (PIC)', startX + 250, headY + 5, { width: 125 });
    doc.text('Kondisi Fisik', startX + 380, headY + 5, { width: 65, align: 'center' });
    doc.text('Justifikasi / Catatan', startX + 450, headY + 5, { width: 100 });
  };

  const vHeadY = doc.y;
  drawArmadaHeader(vHeadY);

  let curY = vHeadY + 18;
  const pureVehicles = (vehicles || []).filter(
    (v) => v.category !== 'posko' && v.code_name !== 'WATCHROOM'
  );
  if (pureVehicles.length === 0) {
    doc.rect(startX, curY, contentWidth, 18).fillAndStroke('#ffffff', '#e2e8f0');
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Belum ada kendaraan yang diperiksa shift ini.', startX + 10, curY + 5);
    curY += 18;
  } else {
    pureVehicles.forEach((v, idx) => {
      if (curY + 18 > 740) {
        doc.addPage();
        drawArmadaHeader(35);
        curY = 35 + 18;
      }

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
  checkPageBreak(45);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('3. KEKUATAN & DISTRIBUSI PERSONEL DINAS');
  doc.moveDown(0.3);

  const present = deployments.filter(d => d.deployment_type !== 'absent');
  const absentList = (absents && absents.length > 0) ? absents : deployments.filter(d => d.deployment_type === 'absent');

  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a');
  doc.text(`Total Personel Hadir Dinas: ${present.length} Orang   |   Personel Tidak Hadir / Cuti / Sakit: ${absentList.length} Orang`);
  if (absentList.length > 0) {
    const absText = absentList.map(a => `${a.full_name || a.name || 'Personel'} (${(a.absent_reason || 'Izin/Cuti').toUpperCase()}${a.notes ? ` - ${a.notes}` : ''})`).join(', ');
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#b91c1c').text(`Keterangan Berhalangan: ${absText}`);
  } else {
    doc.fontSize(8).font('Helvetica').fillColor('#15803d').text('✓ Seluruh personel terdata hadir dinas lengkap tanpa keterangan izin/cuti.');
  }
  doc.moveDown(0.8);

  // 4. Rekapitulasi Insiden & Kejadian
  checkPageBreak(40);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('4. REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL');
  doc.moveDown(0.3);

  if (incidents.length === 0) {
    checkPageBreak(25);
    doc.rect(startX, doc.y, contentWidth, 18).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#15803d').text(
      'NIHIL — Seluruh operasional penerbangan dan fasilitas bandara berlangsung dalam kondisi aman terkendali.',
      startX + 10,
      doc.y + 5
    );
    doc.y += 24;
  } else {
    incidents.forEach((inc, idx) => {
      checkPageBreak(30);
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
  checkPageBreak(40);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('5. JURNAL KEGIATAN RUTIN SHIFT OPERASIONAL');
  doc.moveDown(0.3);

  if (activities.length === 0) {
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Belum ada agenda shift tercatat.');
    doc.moveDown(0.6);
  } else {
    activities.forEach((act, idx) => {
      checkPageBreak(20);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(
        `${idx + 1}. [${act.activity_time}] ${act.title}: `,
        { continued: true }
      ).font('Helvetica').fillColor('#475569').text(act.description || '-');
    });
    doc.moveDown(0.8);
  }

  // Tanda Tangan Pengesahan Pejabat (Pindah halaman jika ruang di bawah tidak cukup)
  if (doc.y + 105 > 740) {
    doc.addPage();
    doc.y = 45;
  } else {
    doc.moveDown(1.5);
  }

  const signY = doc.y;
  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a');
  doc.text('Mengetahui / Menyetujui,', startX + 20, signY, { width: 200, align: 'center' });
  doc.text('Pejabat Penanggung Jawab Shift,', startX + 295, signY, { width: 200, align: 'center' });

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

  // Sematkan tanda tangan digital Supervisor dinas jika tersedia
  const supSigFile = resolveSignatureFile(supervisor_signature_url);
  if (supSigFile) {
    try {
      doc.image(supSigFile, startX + 345, signY + 25, { fit: [100, 38], align: 'center' });
    } catch (e) {
      console.warn('Gagal memuat tanda tangan Supervisor:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(`( ${dept_head_name} )`, startX + 20, signY + 68, { width: 200, align: 'center' });
  doc.text(`( ${supervisor_name || `Ketua Regu ${team_group}`} )`, startX + 295, signY + 68, { width: 200, align: 'center' });

  doc.fontSize(7.5).font('Helvetica').fillColor('#475569');
  if (dept_head_nip && dept_head_nip !== '-') {
    doc.text(`NIP. ${dept_head_nip}`, startX + 20, signY + 79, { width: 200, align: 'center' });
  }
  if (supervisor_nip && supervisor_nip !== '-') {
    doc.text(`NIP. ${supervisor_nip}`, startX + 295, signY + 79, { width: 200, align: 'center' });
  }

  // Watermark Resmi & Penomoran Halaman Otomatis
  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • OFFICIAL OPS REPORT');

  return doc;
};

/**
 * Membuat dokumen PDF Daftar Akun & Kredensial Personel ARFF YIA (Format A4 Landscape)
 * @param {Array} personnelList Daftar personel beserta akun dan status sandi
 * @returns {PDFDocument} Stream dokumen PDF
 */
export const generatePersonnelAccountsPdf = (personnelList = [], signatory = null) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 30, bottom: 20, left: 35, right: 35 },
    info: {
      Title: 'Buku Induk & Kredensial Personel ARFF YIA',
      Author: 'Unit Pertolongan Kecelakaan Penerbangan dan Pemadam Kebakaran (PKP-PK)',
      Subject: 'Buku Induk Personel Berdasarkan Struktur Regu & Administrasi',
    },
    bufferPages: true,
  });

  const startX = 35;
  const contentWidth = 771;
  const rowHeight = 20;
  const pageBottom = 530;

  // Kolom tabel terstandar: Kolom STKP dihapus, lebar didistribusikan proporsional ke Nama dan Jabatan
  const columns = [
    { header: 'No', width: 28, align: 'center' },
    { header: 'Nama Lengkap', width: 195, align: 'left' },
    { header: 'NIP', width: 90, align: 'left' },
    { header: 'Jabatan Operasional', width: 185, align: 'left' },
    { header: 'Username', width: 95, align: 'left' },
    { header: 'Role Sistem', width: 98, align: 'center' },
    { header: 'Status Dinas', width: 80, align: 'center' },
  ];

  const drawDocumentHeader = () => {
    // Header Instansi Kedinasan Resmi
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(
      'PT ANGKASA PURA INDONESIA • KANTOR CABANG BANDARA INTERNASIONAL YOGYAKARTA',
      startX,
      27,
      { align: 'left' }
    );
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text(
      'AIRPORT TECHNOLOGY & ARFF DEPARTMENT • UNIT OPERASIONAL PKP-PK',
      startX,
      39,
      { align: 'left' }
    );
    doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text(
      'Buku Induk Personel, Pemetaan Kualifikasi Jabatan, dan Hak Akses Akun Sistem Monitoring Operasional',
      startX,
      49,
      { align: 'left' }
    );

    const printDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b').text(
      'DOKUMEN OPERASIONAL RESMI',
      startX,
      31,
      { align: 'right', width: contentWidth }
    );
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(
      `Tanggal Dokumen: ${printDate}`,
      startX,
      42,
      { align: 'right', width: contentWidth }
    );

    // Garis Ganda Kop Resmi Kedinasan
    doc.moveTo(startX, 62).lineTo(startX + contentWidth, 62).lineWidth(1.2).strokeColor('#0f172a').stroke();
    doc.moveTo(startX, 64.5).lineTo(startX + contentWidth, 64.5).lineWidth(0.5).strokeColor('#94a3b8').stroke();
  };

  const drawTableHeader = (y) => {
    doc.rect(startX, y, contentWidth, 18).fill('#1e293b');
    let curX = startX;
    columns.forEach((col) => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff').text(
        col.header,
        curX + 3,
        y + 5,
        { width: col.width - 6, align: col.align }
      );
      curX += col.width;
    });
    return y + 18;
  };

  // Section Banner Bersih & Monokrom Formal (Anti Pelangi Slop)
  const drawSectionBanner = (title, subtitle, y) => {
    doc.rect(startX, y, contentWidth, 18).fill('#f8fafc');
    doc.rect(startX, y, 3, 18).fill('#1e293b');
    doc.rect(startX, y, contentWidth, 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(
      title,
      startX + 10,
      y + 4.5,
      { align: 'left' }
    );
    if (subtitle) {
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text(
        subtitle,
        startX + 300,
        y + 5,
        { align: 'right', width: contentWidth - 310 }
      );
    }
    return y + 18;
  };

  drawDocumentHeader();
  let currentY = 74;

  // Struktur Pengelompokan Bab Dokumen Personel
  const groups = [
    {
      key: 'dept_head',
      title: 'BAGIAN I : PIMPINAN UNIT (DEPARTMENT HEAD)',
      subtitle: 'Pimpinan Struktural Airport Technology & ARFF',
      items: personnelList.filter(
        (p) => (p.user_role === 'dept_head' || (p.rank_position && p.rank_position.toLowerCase().includes('dept')) || (p.full_name && p.full_name.includes('TAMSUL')))
      ),
    },
    {
      key: 'administrasi',
      title: 'BAGIAN II : STAF ADMINISTRASI & PEMELIHARAAN (NON-SHIFT)',
      subtitle: 'Staf Administrasi, Keselamatan & Teknisi Pemeliharaan Fasilitas',
      items: personnelList.filter(
        (p) => (p.team_group === 'Non-Shift' || !p.team_group) &&
               !(p.user_role === 'dept_head' || (p.rank_position && p.rank_position.toLowerCase().includes('dept')) || (p.full_name && p.full_name.includes('TAMSUL')))
      ),
    },
    {
      key: 'alpha',
      title: 'BAGIAN III : REGU DINAS OPERASIONAL - ALPHA',
      subtitle: 'Formasi Siaga Shift Regu Alpha',
      items: personnelList.filter((p) => (p.team_group || '').toLowerCase() === 'alpha'),
    },
    {
      key: 'bravo',
      title: 'BAGIAN IV : REGU DINAS OPERASIONAL - BRAVO',
      subtitle: 'Formasi Siaga Shift Regu Bravo',
      items: personnelList.filter((p) => (p.team_group || '').toLowerCase() === 'bravo'),
    },
    {
      key: 'charlie',
      title: 'BAGIAN V : REGU DINAS OPERASIONAL - CHARLIE',
      subtitle: 'Formasi Siaga Shift Regu Charlie',
      items: personnelList.filter((p) => (p.team_group || '').toLowerCase() === 'charlie'),
    },
    {
      key: 'delta',
      title: 'BAGIAN VI : REGU DINAS OPERASIONAL - DELTA',
      subtitle: 'Formasi Siaga Shift Regu Delta',
      items: personnelList.filter((p) => (p.team_group || '').toLowerCase() === 'delta'),
    },
  ];

  groups.forEach((grp) => {
    if (grp.items.length === 0) return;

    if (currentY + 65 > pageBottom) {
      doc.addPage();
      drawDocumentHeader();
      currentY = 74;
    }

    currentY = drawSectionBanner(grp.title, `${grp.items.length} Personel Terdaftar`, currentY);
    currentY = drawTableHeader(currentY);

    grp.items.forEach((p, idx) => {
      if (currentY + rowHeight > pageBottom) {
        doc.addPage();
        drawDocumentHeader();
        currentY = 74;
        currentY = drawTableHeader(currentY);
      }

      if (idx % 2 === 1) {
        doc.rect(startX, currentY, contentWidth, rowHeight).fill('#f8fafc');
      }

      const roleDisplay = p.user_role === 'admin'
        ? 'Administrasi'
        : p.user_role === 'dept_head'
        ? 'Dept. Head'
        : p.user_role === 'chief' || p.user_role === 'supervisor'
        ? 'Ketua Regu'
        : p.user_role === 'chief_assistant'
        ? 'Asisten Chief'
        : p.team_group === 'Non-Shift'
        ? 'Administrasi'
        : 'Fire Fighter';

      const cellData = [
        { text: String(idx + 1), align: 'center', color: '#64748b', font: 'Helvetica' },
        { text: p.full_name || '-', align: 'left', color: '#0f172a', font: 'Helvetica-Bold' },
        { text: p.nip || '-', align: 'left', color: '#334155', font: 'Helvetica' },
        { text: p.rank_position || '-', align: 'left', color: '#1e293b', font: 'Helvetica' },
        { text: p.username || '-', align: 'left', color: '#0f172a', font: 'Helvetica-Bold' },
        { text: roleDisplay, align: 'center', color: '#334155', font: 'Helvetica' },
        {
          text: p.is_active === 0 ? 'Non-Aktif' : 'Aktif Dinas',
          align: 'center',
          color: p.is_active === 0 ? '#b91c1c' : '#166534',
          font: 'Helvetica-Bold',
        },
      ];

      let colX = startX;
      columns.forEach((col, colIdx) => {
        const cell = cellData[colIdx];
        doc.fontSize(7).font(cell.font).fillColor(cell.color).text(
          cell.text,
          colX + 3,
          currentY + 6,
          { width: col.width - 6, align: col.align, lineBreak: false, ellipsis: true }
        );
        colX += col.width;
      });

      doc.moveTo(startX, currentY + rowHeight).lineTo(startX + contentWidth, currentY + rowHeight).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      currentY += rowHeight;
    });

    currentY += 8;
  });

  // Tanda Tangan Pengesahan Resmi Dept Head
  if (currentY + 95 > pageBottom) {
    doc.addPage();
    drawDocumentHeader();
    currentY = 74;
  } else {
    currentY += 10;
  }

  const signWidth = 230;
  const signX = startX + contentWidth - signWidth - 20;

  const deptHeadName = signatory?.name || 'TAMSUL SADIKIN';
  const deptHeadNip = signatory?.nip && signatory.nip !== '-' ? signatory.nip : '20246200';
  const deptHeadRank = signatory?.rank_position || 'Pgs Airport Rescue & Fire Fighting Operation Dept Head';
  const deptHeadSig = signatory?.signature_url;

  doc.fontSize(8).font('Helvetica').fillColor('#0f172a').text(
    'Kulon Progo, Mengetahui / Mengesahkan:',
    signX,
    currentY,
    { width: signWidth, align: 'center' }
  );
  doc.fontSize(8).font('Helvetica-Bold').text(
    deptHeadRank.toUpperCase(),
    signX,
    currentY + 11,
    { width: signWidth, align: 'center' }
  );

  const sigFile = resolveSignatureFile(deptHeadSig);
  if (sigFile) {
    try {
      doc.image(sigFile, signX + (signWidth - 110) / 2, currentY + 23, { fit: [110, 36], align: 'center' });
    } catch (e) {
      console.warn('Gagal memuat tanda tangan:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(
    `( ${deptHeadName} )`,
    signX,
    currentY + 62,
    { width: signWidth, align: 'center' }
  );
  doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(
    `NIP. ${deptHeadNip}`,
    signX,
    currentY + 73,
    { width: signWidth, align: 'center' }
  );

  // Footer penomoran halaman kedinasan resmi
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.moveTo(startX, 550).lineTo(startX + contentWidth, 550).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(
      'Dokumen Resmi PT Angkasa Pura Indonesia • Unit PKP-PK Bandara Internasional Yogyakarta (YIA)',
      startX,
      555,
      { align: 'left', width: contentWidth / 2, lineBreak: false }
    );
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569').text(
      `Halaman ${i + 1} dari ${range.count}`,
      startX + contentWidth / 2,
      555,
      { align: 'right', width: contentWidth / 2, lineBreak: false }
    );
  }

  return doc;
};

/**
 * Membuat dokumen PDF Laporan Rekapitulasi Kesiapan & Kelaikan Armada ARFF YIA (Format A4 Portrait)
 * Mendukung Halaman Laporan Armada (Agent 2) dengan filter 1 Bulan, 3 Bulan, 1 Tahun, atau Rentang Kustom
 */
export const generateVehicleReadinessReportPdf = (data = {}) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: `Laporan Kesiapan Armada ARFF YIA - ${data.periodLabel || 'Periode Operasional'}`,
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Rekapitulasi Kelaikan Armada & Pergantian Status'
    },
    bufferPages: true,
  });

  const {
    periodLabel = '1 Bulan Terakhir',
    startDate = new Date().toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0],
    vehicles = [],
    summary = {},
    transitionLogs = [],
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = null,
    dept_head_signature_url = null,
  } = data;

  const startX = 40;
  const contentWidth = 515;

  // Header Dokumen Resmi
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text(
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    startX, 35, { align: 'center', width: contentWidth }
  );
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#b91c1c').text(
    'BANDARA INTERNASIONAL YOGYAKARTA (YIA)',
    startX, 52, { align: 'center', width: contentWidth }
  );
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(
    'LAPORAN RESMI REKAPITULASI KESIAPAN ARMADA & AUDIT STATUS KELAIKAN',
    startX, 67, { align: 'center', width: contentWidth }
  );

  doc.moveTo(startX, 82).lineTo(startX + contentWidth, 82).lineWidth(1.5).strokeColor('#1e293b').stroke();
  doc.moveTo(startX, 84).lineTo(startX + contentWidth, 84).lineWidth(0.5).strokeColor('#94a3b8').stroke();

  doc.y = 92;

  // Box Informasi Periode (KPI Ringkasan)
  doc.rect(startX, doc.y, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Periode Laporan: ', startX + 10, infoY);
  doc.font('Helvetica').text(`${periodLabel} (${startDate} s.d. ${endDate})`, startX + 90, infoY);

  doc.font('Helvetica-Bold').text('Total Armada Terdaftar: ', startX + 330, infoY);
  doc.font('Helvetica-Bold').fillColor('#b91c1c').text(`${summary.total_vehicles || vehicles.length} Unit`, startX + 445, infoY);

  const infoY2 = infoY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Kondisi Fisik Saat Ini: ', startX + 10, infoY2);
  let statusSummaryText = `${summary.currently_serviceable || 0} Siap (Serviceable)`;
  if ((summary.currently_unserviceable || 0) > 0) {
    statusSummaryText += ` • ${summary.currently_unserviceable} Rusak`;
  }
  if ((summary.currently_unreported || 0) > 0) {
    statusSummaryText += ` • ${summary.currently_unreported} Belum Dicek`;
  }
  doc.font('Helvetica-Bold').fillColor('#15803d').text(
    statusSummaryText,
    startX + 115, infoY2
  );

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Total Siklus Kendala: ', startX + 330, infoY2);
  doc.font('Helvetica-Bold').fillColor('#b91c1c').text(`${summary.total_transitions || 0} Siklus`, startX + 445, infoY2);

  doc.y = 140;

  const checkPageBreak = (neededHeight) => {
    if (doc.y + neededHeight > 740) {
      doc.addPage();
      doc.y = 35;
      return true;
    }
    return false;
  };

  // Tabel 1: Rekapitulasi Kelaikan & Siklus Kendala Per Unit
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. REKAPITULASI KELAIKAN & FREKUENSI KENDALA PER UNIT ARMADA');
  doc.moveDown(0.3);

  const tableHeaderY = doc.y;
  doc.rect(startX, tableHeaderY, contentWidth, 18).fill('#1e293b');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('No', startX + 4, tableHeaderY + 5, { width: 22, align: 'center' });
  doc.text('Kode & Nama Armada', startX + 28, tableHeaderY + 5, { width: 145, align: 'left' });
  doc.text('Kategori', startX + 175, tableHeaderY + 5, { width: 55, align: 'center' });
  doc.text('Status Saat Ini', startX + 232, tableHeaderY + 5, { width: 85, align: 'center' });
  doc.text('Siklus Kendala', startX + 320, tableHeaderY + 5, { width: 70, align: 'center' });
  doc.text('Riwayat Kelaikan & Catatan', startX + 392, tableHeaderY + 5, { width: 120, align: 'left' });

  doc.y = tableHeaderY + 18;

  vehicles.forEach((v, idx) => {
    checkPageBreak(20);
    const rowY = doc.y;
    if (idx % 2 === 1) {
      doc.rect(startX, rowY, contentWidth, 18).fill('#f8fafc');
    }

    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(String(idx + 1), startX + 4, rowY + 5, { width: 22, align: 'center' });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(
      `${v.code_name} - ${v.vehicle_name}`,
      startX + 28, rowY + 5,
      { width: 145, align: 'left', lineBreak: false, ellipsis: true }
    );
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(v.category || 'utama', startX + 175, rowY + 5, { width: 55, align: 'center' });

    const currentStatus = v.current_status || v.status || 'belum_dilaporkan';
    const isServ = currentStatus === 'serviceable';
    const isUnserv = currentStatus === 'unserviceable';
    const statusLabel = isServ ? 'SERVICEABLE' : isUnserv ? 'UNSERVICEABLE' : 'BELUM DICEK';
    const statusColor = isServ ? '#15803d' : isUnserv ? '#b91c1c' : '#64748b';

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(statusColor).text(
      statusLabel,
      startX + 232, rowY + 5, { width: 85, align: 'center' }
    );

    const periodCount = Number(v.period_count ?? v.transition_count ?? 0);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(periodCount > 0 ? '#b91c1c' : '#475569').text(
      periodCount > 0 ? `${periodCount} Siklus` : '0 (Nihil)',
      startX + 320, rowY + 5, { width: 70, align: 'center' }
    );

    let statusDesc = 'Siap Operasi Penuh (Nihil)';
    let statusDescColor = '#15803d';
    if (isUnserv) {
      statusDesc = 'Dalam Perbaikan Kendala';
      statusDescColor = '#b91c1c';
    } else if (!isServ) {
      statusDesc = 'Menunggu Laporan Inspeksi PIC';
      statusDescColor = '#64748b';
    } else if (periodCount > 0) {
      statusDesc = `${periodCount}x Kendala (Telah Pulih)`;
      statusDescColor = '#475569';
    }

    doc.fontSize(7.5).font('Helvetica').fillColor(statusDescColor).text(
      statusDesc,
      startX + 392, rowY + 5,
      { width: 120, align: 'left', lineBreak: false, ellipsis: true }
    );

    doc.moveTo(startX, rowY + 18).lineTo(startX + contentWidth, rowY + 18).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    doc.y = rowY + 18;
  });

  doc.moveDown(0.8);

  // Tabel 2: Riwayat Periode Kendala & Pergantian Status Kelaikan (Log Transisi)
  checkPageBreak(50);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. RIWAYAT KENDALA FISIK & LOG PERGANTIAN STATUS KELAIKAN');
  doc.moveDown(0.3);

  if (transitionLogs.length > 0) {
    const logHeaderY = doc.y;
    doc.rect(startX, logHeaderY, contentWidth, 18).fill('#334155');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Mulai Kendala', startX + 4, logHeaderY + 5, { width: 75, align: 'left' });
    doc.text('Armada', startX + 82, logHeaderY + 5, { width: 65, align: 'left' });
    doc.text('Status Pemulihan', startX + 150, logHeaderY + 5, { width: 95, align: 'center' });
    doc.text('Pelapor / PIC', startX + 248, logHeaderY + 5, { width: 80, align: 'left' });
    doc.text('Deskripsi Kendala & Catatan Penanganan', startX + 332, logHeaderY + 5, { width: 178, align: 'left' });

    doc.y = logHeaderY + 18;

    transitionLogs.slice(0, 35).forEach((t, idx) => {
      checkPageBreak(22);
      const rowY = doc.y;
      if (idx % 2 === 1) doc.rect(startX, rowY, contentWidth, 20).fill('#f8fafc');

      const shiftInfo = t.start_shift_number ? ` (S${t.start_shift_number})` : '';
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(`${t.start_date}${shiftInfo}`, startX + 4, rowY + 5, { width: 75 });
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(t.code_name || '-', startX + 82, rowY + 5, { width: 65 });

      const isResolved = t.is_resolved;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(isResolved ? '#15803d' : '#b91c1c').text(
        isResolved ? `Pulih (${t.resolved_date || 'Selesai'})` : 'Dalam Perbaikan',
        startX + 150, rowY + 5, { width: 95, align: 'center', lineBreak: false, ellipsis: true }
      );

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(t.reported_by || '-', startX + 248, rowY + 5, { width: 80, lineBreak: false, ellipsis: true });

      const issueText = t.justification && t.notes
        ? `${t.justification} • ${t.notes}`
        : (t.justification || t.notes || '-');

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(issueText, startX + 332, rowY + 5, { width: 178, lineBreak: false, ellipsis: true });

      doc.moveTo(startX, rowY + 20).lineTo(startX + contentWidth, rowY + 20).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + 20;
    });
  } else {
    const emptyY = doc.y;
    doc.rect(startX, emptyY, contentWidth, 24).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#64748b').text(
      'Nihil. Tidak ada catatan kendala fisik atau pergantian status armada operasional pada periode laporan ini.',
      startX + 10, emptyY + 8, { width: contentWidth - 20, align: 'center' }
    );
    doc.y = emptyY + 28;
  }


  // Tanda Tangan Dept Head
  if (doc.y + 100 > 740) {
    doc.addPage();
    doc.y = 45;
  } else {
    doc.moveDown(1.5);
  }

  const signY = doc.y;
  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text('Mengetahui / Mengesahkan,', startX + contentWidth - 220, signY, { width: 220, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').text('AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD', startX + contentWidth - 220, signY + 12, { width: 220, align: 'center' });

  const deptSigFile = resolveSignatureFile(dept_head_signature_url);
  if (deptSigFile) {
    try {
      doc.image(deptSigFile, startX + contentWidth - 165, signY + 25, { fit: [110, 40], align: 'center' });
    } catch (e) {
      console.warn('Gagal memuat tanda tangan Dept Head:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').text(`( ${dept_head_name} )`, startX + contentWidth - 220, signY + 68, { width: 220, align: 'center' });
  if (dept_head_nip && dept_head_nip !== '-') {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`NIP. ${dept_head_nip}`, startX + contentWidth - 220, signY + 80, { width: 220, align: 'center' });
  }

  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • FLEET READINESS REPORT');

  return doc;
};

/**
 * Membuat dokumen PDF Laporan Rekapitulasi Insiden Operasional ARFF YIA (Format A4 Portrait)
 * Mendukung Halaman Laporan Insiden (Agent 4) dengan filter 1 Bulan, 3 Bulan, 1 Tahun, atau Rentang Kustom
 */
export const generateIncidentSummaryReportPdf = (data = {}) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: `Laporan Rekapitulasi Insiden ARFF YIA - ${data.periodLabel || 'Periode Operasional'}`,
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Rekapitulasi Kejadian & Insiden Airside'
    },
    bufferPages: true,
  });

  const {
    periodLabel = '1 Bulan Terakhir',
    startDate = new Date().toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0],
    incidents = [],
    summary = {},
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = null,
    dept_head_signature_url = null,
  } = data;

  const startX = 40;
  const contentWidth = 515;

  // Header Dokumen Resmi
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text(
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    startX, 35, { align: 'center', width: contentWidth }
  );
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#b91c1c').text(
    'BANDARA INTERNASIONAL YOGYAKARTA (YIA)',
    startX, 52, { align: 'center', width: contentWidth }
  );
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(
    'LAPORAN RESMI REKAPITULASI KEJADIAN & INSIDEN OPERASIONAL AIRSIDE',
    startX, 67, { align: 'center', width: contentWidth }
  );

  doc.moveTo(startX, 82).lineTo(startX + contentWidth, 82).lineWidth(1.5).strokeColor('#1e293b').stroke();
  doc.moveTo(startX, 84).lineTo(startX + contentWidth, 84).lineWidth(0.5).strokeColor('#94a3b8').stroke();

  doc.y = 92;

  // Box Informasi Periode & Statistik
  doc.rect(startX, doc.y, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(`Periode Laporan: `, startX + 10, infoY);
  doc.font('Helvetica').text(`${periodLabel} (${startDate} s.d. ${endDate})`, startX + 105, infoY);

  doc.font('Helvetica-Bold').text(`Total Insiden Tercatat: `, startX + 330, infoY);
  doc.font('Helvetica-Bold').fillColor(incidents.length > 0 ? '#b91c1c' : '#15803d').text(`${incidents.length} Kejadian`, startX + 445, infoY);

  const infoY2 = infoY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text(`Status Penanganan: `, startX + 10, infoY2);
  doc.font('Helvetica').text(
    `${summary.resolvedCount || 0} Selesai • ${summary.inProgressCount || 0} Dalam Proses`,
    startX + 110, infoY2
  );

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(`Kategori Dominan: `, startX + 330, infoY2);
  doc.font('Helvetica').text(summary.topCategory || '-', startX + 425, infoY2);

  doc.y = 140;

  const checkPageBreak = (neededHeight) => {
    if (doc.y + neededHeight > 740) {
      doc.addPage();
      doc.y = 35;
      return true;
    }
    return false;
  };

  // Ringkasan Daftar Insiden
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('1. DAFTAR LOGBOOK INSIDEN OPERASIONAL (LAYER 1)');
  doc.moveDown(0.3);

  if (incidents.length === 0) {
    doc.rect(startX, doc.y, contentWidth, 22).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#15803d').text(
      'NIHIL — Tidak ada kejadian darurat atau insiden operasional pada periode ini.',
      startX + 10, doc.y + 7
    );
    doc.y += 28;
  } else {
    const incHeaderY = doc.y;
    doc.rect(startX, incHeaderY, contentWidth, 18).fill('#1e293b');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('No', startX + 4, incHeaderY + 5, { width: 22, align: 'center' });
    doc.text('Tanggal & Jam', startX + 28, incHeaderY + 5, { width: 82, align: 'left' });
    doc.text('No. Laporan', startX + 112, incHeaderY + 5, { width: 85, align: 'left' });
    doc.text('Kategori', startX + 199, incHeaderY + 5, { width: 80, align: 'left' });
    doc.text('Lokasi Grid', startX + 281, incHeaderY + 5, { width: 75, align: 'left' });
    doc.text('Prioritas', startX + 358, incHeaderY + 5, { width: 65, align: 'center' });
    doc.text('Status', startX + 425, incHeaderY + 5, { width: 85, align: 'center' });

    doc.y = incHeaderY + 18;

    incidents.forEach((inc, idx) => {
      checkPageBreak(22);
      const rowY = doc.y;
      if (idx % 2 === 1) doc.rect(startX, rowY, contentWidth, 18).fill('#f8fafc');

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(String(idx + 1), startX + 4, rowY + 5, { width: 22, align: 'center' });
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(
        `${inc.incident_date} ${inc.incident_time ? inc.incident_time.substring(0, 5) : ''}`,
        startX + 28, rowY + 5, { width: 82 }
      );
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#b91c1c').text(inc.report_number || '-', startX + 112, rowY + 5, { width: 85 });
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(inc.category || '-', startX + 199, rowY + 5, { width: 80 });
      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(inc.location || 'Airside', startX + 281, rowY + 5, { width: 75, lineBreak: false, ellipsis: true });

      const prioColor = inc.priority_level === 'critical' || inc.priority_level === 'high' ? '#b91c1c' : '#0f172a';
      doc.fontSize(7).font('Helvetica-Bold').fillColor(prioColor).text(
        (inc.priority_level || 'medium').toUpperCase(),
        startX + 358, rowY + 5, { width: 65, align: 'center' }
      );

      const statusColor = inc.status === 'selesai' ? '#15803d' : '#b45309';
      doc.fontSize(7).font('Helvetica-Bold').fillColor(statusColor).text(
        (inc.status || 'dalam_proses').replace('_', ' ').toUpperCase(),
        startX + 425, rowY + 5, { width: 85, align: 'center' }
      );

      doc.moveTo(startX, rowY + 18).lineTo(startX + contentWidth, rowY + 18).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + 18;
    });

    doc.moveDown(0.8);

    // Detail Kronologi & Tindakan (Layer 2)
    checkPageBreak(50);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('2. DETAIL KRONOLOGI & TINDAKAN PENANGANAN INSIDEN (LAYER 2)');
    doc.moveDown(0.3);

    incidents.slice(0, 20).forEach((inc, idx) => {
      checkPageBreak(65);
      doc.rect(startX, doc.y, contentWidth, 58).fillAndStroke('#f8fafc', '#e2e8f0');
      const boxY = doc.y + 5;

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#991b1b').text(
        `${idx + 1}. [${inc.report_number}] ${inc.title} - ${inc.incident_date} ${inc.incident_time || ''}`,
        startX + 8, boxY
      );

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text('Kronologi:', startX + 8, boxY + 12);
      doc.font('Helvetica').fillColor('#475569').text(inc.chronology || '-', startX + 60, boxY + 12, { width: contentWidth - 75, lineBreak: false, ellipsis: true });

      doc.font('Helvetica-Bold').fillColor('#0f172a').text('Tindakan:', startX + 8, boxY + 24);
      doc.font('Helvetica').fillColor('#475569').text(inc.action_taken || '-', startX + 60, boxY + 24, { width: contentWidth - 75, lineBreak: false, ellipsis: true });

      doc.font('Helvetica-Bold').fillColor('#0f172a').text('Koordinasi:', startX + 8, boxY + 36);
      doc.font('Helvetica').fillColor('#475569').text(
        `Pihak Terkoordinasi: ${inc.coordinated_parties || 'ATC & Avsec'} | Kondisi Akhir: ${inc.last_condition || 'Aman terkendali'}`,
        startX + 60, boxY + 36, { width: contentWidth - 75, lineBreak: false, ellipsis: true }
      );

      doc.y += 63;
    });
  }

  // Tanda Tangan Dept Head
  if (doc.y + 100 > 740) {
    doc.addPage();
    doc.y = 45;
  } else {
    doc.moveDown(1.5);
  }

  const signY = doc.y;
  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text('Mengetahui / Mengesahkan,', startX + contentWidth - 220, signY, { width: 220, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').text('AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD', startX + contentWidth - 220, signY + 12, { width: 220, align: 'center' });

  const deptSigFile = resolveSignatureFile(dept_head_signature_url);
  if (deptSigFile) {
    try {
      doc.image(deptSigFile, startX + contentWidth - 165, signY + 25, { fit: [110, 40], align: 'center' });
    } catch (e) {
      console.warn('Gagal memuat tanda tangan Dept Head:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').text(`( ${dept_head_name} )`, startX + contentWidth - 220, signY + 68, { width: 220, align: 'center' });
  if (dept_head_nip && dept_head_nip !== '-') {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`NIP. ${dept_head_nip}`, startX + contentWidth - 220, signY + 80, { width: 220, align: 'center' });
  }

  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • INCIDENT SUMMARY REPORT');

  return doc;
};

/**
 * Membuat stream PDF Laporan Rekapitulasi Logbook Kegiatan Rutin Operasional ARFF (A4 Portrait)
 */
export const generateActivitiesReportPdf = (reportData) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: 'Laporan Rekapitulasi Kegiatan Operasional ARFF YIA',
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Logbook Rangkaian Kegiatan Dinas Operasional',
    },
    bufferPages: true,
  });

  const {
    periodLabel = '1 Bulan Terakhir',
    startDate = '',
    endDate = '',
    activities = [],
    summary = {},
    dept_head_name = 'Airport Rescue & Fire Fighting Section Head',
    dept_head_nip = '-',
    dept_head_signature_url = null,
  } = reportData;

  const contentWidth = 515;
  const startX = 40;

  // Header Kop Instansi
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(
    'PT ANGKASA PURA INDONESIA - BANDARA INTERNASIONAL YOGYAKARTA',
    startX, 35, { align: 'center', width: contentWidth }
  );
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(
    'UNIT AIRPORT RESCUE & FIRE FIGHTING (PKP-PK)',
    startX, 50, { align: 'center', width: contentWidth }
  );
  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(
    'LAPORAN RESMI REKAPITULASI LOGBOOK KEGIATAN OPERASIONAL DINAS',
    startX, 67, { align: 'center', width: contentWidth }
  );

  doc.moveTo(startX, 82).lineTo(startX + contentWidth, 82).lineWidth(1.5).strokeColor('#1e293b').stroke();
  doc.moveTo(startX, 84).lineTo(startX + contentWidth, 84).lineWidth(0.5).strokeColor('#94a3b8').stroke();

  doc.y = 92;

  // Box Informasi Periode & Statistik
  doc.rect(startX, doc.y, contentWidth, 38).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY = doc.y + 6;

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Periode Laporan: ', startX + 10, infoY);
  doc.font('Helvetica').text(`${periodLabel} (${startDate} s.d. ${endDate})`, startX + 105, infoY);

  doc.font('Helvetica-Bold').text('Total Kegiatan: ', startX + 330, infoY);
  doc.font('Helvetica-Bold').fillColor('#0284c7').text(`${activities.length} Kegiatan Terdata`, startX + 415, infoY);

  const infoY2 = infoY + 14;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('Filter Kategori: ', startX + 10, infoY2);
  doc.font('Helvetica').text(summary.categoryLabel || 'Semua Kategori', startX + 105, infoY2);

  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Regu Terdata: ', startX + 330, infoY2);
  doc.font('Helvetica').text(summary.teamLabel || 'Seluruh Regu (A-D)', startX + 415, infoY2);

  doc.y = 140;

  const checkPageBreak = (neededHeight) => {
    if (doc.y + neededHeight > 740) {
      doc.addPage();
      doc.y = 35;
      return true;
    }
    return false;
  };

  // Tabel Logbook Kegiatan
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('DAFTAR LOGBOOK AKTIVITAS & KEGIATAN DINAS OPERASIONAL');
  doc.moveDown(0.3);

  if (activities.length === 0) {
    doc.rect(startX, doc.y, contentWidth, 22).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(
      'Tidak ada catatan aktivitas operasional yang terdata pada periode ini.',
      startX + 10, doc.y + 7
    );
    doc.y += 28;
  } else {
    const actHeaderY = doc.y;
    doc.rect(startX, actHeaderY, contentWidth, 18).fill('#1e293b');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('No', startX + 4, actHeaderY + 5, { width: 20, align: 'center' });
    doc.text('Tanggal & Shift', startX + 26, actHeaderY + 5, { width: 85, align: 'left' });
    doc.text('Jam (WIB)', startX + 113, actHeaderY + 5, { width: 45, align: 'center' });
    doc.text('Kategori', startX + 160, actHeaderY + 5, { width: 85, align: 'left' });
    doc.text('Judul Aktivitas & Uraian Pelaksanaan', startX + 248, actHeaderY + 5, { width: 260, align: 'left' });

    doc.y = actHeaderY + 18;

    activities.forEach((act, idx) => {
      checkPageBreak(28);
      const rowY = doc.y;
      if (idx % 2 === 1) doc.rect(startX, rowY, contentWidth, 24).fill('#f8fafc');

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(String(idx + 1), startX + 4, rowY + 5, { width: 20, align: 'center' });

      const shiftInfo = act.shift_date ? `${act.shift_date} (Sh.${act.shift_number || 1} ${act.team_group || ''})` : '-';
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(shiftInfo, startX + 26, rowY + 5, { width: 85 });

      const timeStr = act.activity_time ? act.activity_time.substring(0, 5) : '-';
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0284c7').text(timeStr, startX + 113, rowY + 5, { width: 45, align: 'center' });

      doc.fontSize(7).font('Helvetica').fillColor('#475569').text(
        (act.activity_type || '-').replace(/_/g, ' ').toUpperCase(),
        startX + 160, rowY + 5, { width: 85 }
      );

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(act.title || '-', startX + 248, rowY + 4, { width: 260, lineBreak: false, ellipsis: true });
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b').text(
        act.description || act.result_notes || '-',
        startX + 248, rowY + 13, { width: 260, lineBreak: false, ellipsis: true }
      );

      doc.moveTo(startX, rowY + 24).lineTo(startX + contentWidth, rowY + 24).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.y = rowY + 24;
    });
  }

  // Tanda Tangan Section Head
  if (doc.y + 100 > 740) {
    doc.addPage();
    doc.y = 45;
  } else {
    doc.moveDown(1.5);
  }

  const signY = doc.y;
  doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text('Mengetahui / Mengesahkan,', startX + contentWidth - 220, signY, { width: 220, align: 'center' });
  doc.fontSize(8).font('Helvetica-Bold').text('AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD', startX + contentWidth - 220, signY + 12, { width: 220, align: 'center' });

  const deptSigFile = resolveSignatureFile(dept_head_signature_url);
  if (deptSigFile) {
    try {
      doc.image(deptSigFile, startX + contentWidth - 165, signY + 25, { fit: [110, 40], align: 'center' });
    } catch (e) {
      console.warn('Gagal memuat tanda tangan Dept Head:', e.message);
    }
  }

  doc.fontSize(8.5).font('Helvetica-Bold').text(`( ${dept_head_name} )`, startX + contentWidth - 220, signY + 68, { width: 220, align: 'center' });
  if (dept_head_nip && dept_head_nip !== '-') {
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569').text(`NIP. ${dept_head_nip}`, startX + contentWidth - 220, signY + 80, { width: 220, align: 'center' });
  }

  applyWatermarkAndPageNumbers(doc, contentWidth, startX, 'ARFF YIA • ACTIVITIES LOGBOOK REPORT');

  return doc;
};



