import PDFDocument from 'pdfkit';
import { resolveSignatureFile, applyWatermarkAndPageNumbers } from './pdfHelpers.js';

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
