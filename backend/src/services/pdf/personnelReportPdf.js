import PDFDocument from 'pdfkit';
import {
  formatIndonesianDate,
  drawOfficialHeader,
  drawSectionHeadSignature,
  applyWatermarkAndPageNumbers,
  checkPageBreak,
  drawTableHeaderRow,
} from './pdfHelpers.js';

/**
 * Membuat dokumen PDF Buku Induk & Kredensial Personel ARFF YIA (Format A4 Portrait)
 * Laporan 5: Buku Induk Personel Regu & Akun Sistem Operasional
 * 
 * @param {Object|Array} dataOrList Payload data laporan personel atau array daftar personel
 * @param {Object} [signatoryOrOptions] Data pejabat penandatangan atau opsi filter
 * @returns {Promise<PDFDocument>} Stream dokumen PDFKit
 */
export const generatePersonnelAccountsPdf = async (dataOrList = [], signatoryOrOptions = null) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 },
    info: {
      Title: 'Buku Induk Personel Regu & Akun Sistem - ARFF YIA',
      Author: 'Unit Airport Rescue & Fire Fighting (PKP-PK) YIA',
      Subject: 'Buku Induk Personel, Pemetaan Kualifikasi Jabatan, dan Hak Akses Akun Sistem',
    },
    bufferPages: true,
  });

  const startX = 40;
  const contentWidth = 515;
  const rowHeight = 18;
  const maxPageY = 735; // Threshold aman di atas batas margin bawah (807 pt) & footer watermark (814 pt)

  // Normalisasi input (mendukung format objek terpadu dan format array warisan)
  let personnelList = [];
  let signatory = {};
  let filterTeam = 'ALL';
  let filterStatus = 'all';

  if (Array.isArray(dataOrList)) {
    personnelList = dataOrList;
    if (signatoryOrOptions && typeof signatoryOrOptions === 'object') {
      signatory = signatoryOrOptions;
      filterTeam = signatoryOrOptions.filterTeam || signatoryOrOptions.team_group || 'ALL';
      filterStatus = signatoryOrOptions.filterStatus || signatoryOrOptions.status || 'all';
    }
  } else if (dataOrList && typeof dataOrList === 'object') {
    personnelList = dataOrList.personnel || dataOrList.personnelList || [];
    signatory = dataOrList.signatory || signatoryOrOptions || {};
    filterTeam = dataOrList.filterTeam || dataOrList.team_group || dataOrList.team || 'ALL';
    filterStatus = dataOrList.filterStatus || dataOrList.status || 'all';
  }

  // 1. Kop Resmi Kedinasan Sentral (Standar seragam dengan 4 laporan lainnya)
  drawOfficialHeader(
    doc,
    'AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION',
    'BUKU INDUK PERSONEL REGU & AKUN SISTEM OPERASIONAL',
    contentWidth,
    startX
  );

  // 2. Kotak Parameter / Info Strip Standar (Tinggi 38pt, 2 Baris Kuadran Proporsional)
  const boxY = doc.y;
  const boxHeight = 38;
  doc.rect(startX, boxY, contentWidth, boxHeight).fillAndStroke('#f8fafc', '#cbd5e1');
  const infoY1 = boxY + 6;
  const infoY2 = infoY1 + 14;

  const filterTeamLabel = (filterTeam && filterTeam !== 'ALL' && filterTeam !== 'all')
    ? (filterTeam.toLowerCase().startsWith('regu') ? filterTeam : `Regu ${filterTeam}`)
    : 'Seluruh Regu (A-D & Non-Shift)';

  const activeCount = personnelList.filter((p) => p.is_active !== 0).length;
  const inactiveCount = personnelList.filter((p) => p.is_active === 0).length;
  const totalCount = personnelList.length;

  let statusLabel = `${activeCount} Aktif Dinas`;
  if (inactiveCount > 0) {
    statusLabel += ` • ${inactiveCount} Non-Aktif`;
  }

  const printDateStr = formatIndonesianDate(new Date().toISOString().split('T')[0], { includeDay: true });

  // Kolom Kiri: Regu Dinas & Status Dinas (startX eksplisit & anti-leak cursor)
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Regu Dinas: ', startX + 10, infoY1);
  doc.font('Helvetica').fillColor('#334155').text(filterTeamLabel, startX + 75, infoY1, { width: 220, lineBreak: false, ellipsis: true });

  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Status Dinas: ', startX + 10, infoY2);
  doc.font('Helvetica-Bold').fillColor('#15803d').text(statusLabel, startX + 75, infoY2, { width: 220, lineBreak: false, ellipsis: true });

  // Kolom Kanan: Total Personel & Tanggal Cetak (startX eksplisit & anti-leak cursor)
  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Total Personel: ', startX + 310, infoY1);
  doc.font('Helvetica-Bold').fillColor('#0284c7').text(`${totalCount} Personel Terdata`, startX + 395, infoY1, { width: 110, lineBreak: false, ellipsis: true });

  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Tanggal Cetak: ', startX + 310, infoY2);
  doc.font('Helvetica').fillColor('#475569').text(printDateStr, startX + 395, infoY2, { width: 110, lineBreak: false, ellipsis: true });

  // Reset posisi kursor setelah Info Strip secara tegas
  doc.y = boxY + boxHeight + 10;
  doc.x = startX;

  // 3. Konfigurasi Kolom Tabel Portrait (Total Lebar = 515 pt)
  const columns = [
    { header: 'No', width: 25, align: 'center', padX: 2 },
    { header: 'Nama Lengkap', width: 140, align: 'left', padX: 4 },
    { header: 'NIP', width: 75, align: 'left', padX: 4 },
    { header: 'Jabatan', width: 135, align: 'left', padX: 4 },
    { header: 'Role', width: 75, align: 'center', padX: 2 },
    { header: 'Status', width: 65, align: 'center', padX: 2 },
  ];

  // Helper Menggambar Banner Sub-Bagian (Aksen Biru Dingin Profesional & Border Halus)
  const drawSectionBanner = (title, countText, y) => {
    doc.rect(startX, y, contentWidth, 16).fill('#f8fafc');
    doc.rect(startX, y, 3, 16).fill('#0284c7');
    doc.rect(startX, y, contentWidth, 16).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(
      title,
      startX + 8,
      y + 4.5,
      { align: 'left', width: 330, lineBreak: false, ellipsis: true }
    );
    if (countText) {
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569').text(
        countText,
        startX + 340,
        y + 4.5,
        { align: 'right', width: contentWidth - 348 }
      );
    }
    doc.x = startX;
    return y + 16;
  };

  // Helper Format Peran Pengguna
  const getRoleDisplay = (p) => {
    const r = (p.user_role || '').toLowerCase();
    if (r === 'admin') return 'Administrasi';
    if (r === 'dept_head') return 'Dept. Head';
    if (r === 'chief' || r === 'supervisor') return 'Ketua Regu';
    if (r === 'chief_assistant') return 'Asisten Chief';
    if (p.team_group === 'Non-Shift' || !p.team_group) return 'Administrasi';
    return 'Fire Fighter';
  };

  // Struktur Pengelompokan Bab Dokumen Personel
  const groups = [
    {
      key: 'dept_head',
      title: 'BAGIAN I : PIMPINAN UNIT (DEPARTMENT HEAD)',
      items: personnelList.filter(
        (p) => (p.user_role === 'dept_head' || (p.rank_position && p.rank_position.toLowerCase().includes('dept')))
      ),
    },
    {
      key: 'administrasi',
      title: 'BAGIAN II : STAF ADMINISTRASI & PEMELIHARAAN (NON-SHIFT)',
      items: personnelList.filter(
        (p) => (p.team_group === 'Non-Shift' || !p.team_group) &&
               !(p.user_role === 'dept_head' || (p.rank_position && p.rank_position.toLowerCase().includes('dept')))
      ),
    },
    {
      key: 'alpha',
      title: 'BAGIAN III : REGU DINAS OPERASIONAL - ALPHA',
      items: personnelList.filter((p) => (p.team_group || '').toLowerCase() === 'alpha'),
    },
    {
      key: 'bravo',
      title: 'BAGIAN IV : REGU DINAS OPERASIONAL - BRAVO',
      items: personnelList.filter((p) => (p.team_group || '').toLowerCase() === 'bravo'),
    },
    {
      key: 'charlie',
      title: 'BAGIAN V : REGU DINAS OPERASIONAL - CHARLIE',
      items: personnelList.filter((p) => (p.team_group || '').toLowerCase() === 'charlie'),
    },
    {
      key: 'delta',
      title: 'BAGIAN VI : REGU DINAS OPERASIONAL - DELTA',
      items: personnelList.filter((p) => (p.team_group || '').toLowerCase() === 'delta'),
    },
  ];

  // Pastikan personel dengan regu kustom/lainnya tetap terangkut jika ada
  const knownIds = new Set(groups.flatMap((g) => g.items.map((p) => p.id)));
  const remainingItems = personnelList.filter((p) => !knownIds.has(p.id));
  if (remainingItems.length > 0) {
    groups.push({
      key: 'other',
      title: 'BAGIAN VII : PERSONEL LAINNYA',
      items: remainingItems,
    });
  }

  // Iterasi Bagian & Roster Personel
  let currentY = doc.y;

  groups.forEach((grp) => {
    if (grp.items.length === 0) return;

    // Pastikan ada ruang cukup untuk Banner (16pt) + Header Tabel (18pt) + minimal 1 Baris (18pt) = 52pt
    if (currentY + 52 > maxPageY) {
      doc.addPage();
      currentY = 40;
      doc.x = startX;
    }

    currentY = drawSectionBanner(grp.title, `${grp.items.length} Personel Terdaftar`, currentY);
    // Header Tabel Profesional menggunakan drawTableHeaderRow (Latar #f1f5f9, stroke #cbd5e1, teks #0f172a bold)
    currentY = drawTableHeaderRow(doc, currentY, columns, startX, contentWidth, 18);
    doc.x = startX;

    grp.items.forEach((p, idx) => {
      // Multi-page Repeating Table Headers jika baris berikutnya melampaui batas aman
      if (currentY + rowHeight > maxPageY) {
        doc.addPage();
        currentY = 40;
        doc.x = startX;
        // Gambar banner lanjutan dan header tabel ulang
        doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#64748b').text(
          `${grp.title} (Lanjutan)`,
          startX,
          currentY,
          { width: contentWidth, align: 'left' }
        );
        doc.x = startX;
        currentY = drawTableHeaderRow(doc, currentY + 12, columns, startX, contentWidth, 18);
        doc.x = startX;
      }

      if (idx % 2 === 1) {
        doc.rect(startX, currentY, contentWidth, rowHeight).fill('#f8fafc');
      }

      const roleDisplay = getRoleDisplay(p);
      const isNonActive = p.is_active === 0;

      const cellData = [
        { text: String(idx + 1), align: 'center', color: '#64748b', font: 'Helvetica' },
        { text: p.full_name || '-', align: 'left', color: '#0f172a', font: 'Helvetica-Bold' },
        { text: p.nip || '-', align: 'left', color: '#334155', font: 'Helvetica' },
        { text: p.rank_position || '-', align: 'left', color: '#1e293b', font: 'Helvetica' },
        { text: roleDisplay, align: 'center', color: '#334155', font: 'Helvetica' },
        {
          text: isNonActive ? 'Non-Aktif' : 'Aktif Dinas',
          align: 'center',
          color: isNonActive ? '#b91c1c' : '#15803d',
          font: 'Helvetica-Bold',
        },
      ];

      let colX = startX;
      columns.forEach((col, colIdx) => {
        const cell = cellData[colIdx];
        const pad = col.padX || 3;
        doc.fontSize(7).font(cell.font).fillColor(cell.color).text(
          cell.text,
          colX + pad,
          currentY + 5,
          { width: col.width - (pad * 2), align: col.align, lineBreak: false, ellipsis: true }
        );
        colX += col.width;
      });
      doc.x = startX;

      doc.moveTo(startX, currentY + rowHeight)
        .lineTo(startX + contentWidth, currentY + rowHeight)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      currentY += rowHeight;
      doc.x = startX;
    });

    currentY += 8;
  });

  doc.y = currentY;
  doc.x = startX;

  // 6. Tanda Tangan Section Head Sentral (Proteksi ruang tanda tangan ~115pt)
  await drawSectionHeadSignature(
    doc,
    {
      name: signatory?.dept_head_name || signatory?.name || 'Airport Rescue & Fire Fighting Section Head',
      nip: signatory?.dept_head_nip || signatory?.nip,
      signature_url: signatory?.dept_head_signature_url || signatory?.signature_url || signatory?.signatureUrl,
      signatureBuffer: signatory?.signatureBuffer,
      isDraft: false,
      role: 'AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD',
      title: 'Mengetahui / Mengesahkan,',
    },
    startX,
    contentWidth
  );

  // 7. Watermark Transparan & Penomoran Halaman Otomatis (Bebas Phantom Blank Pages)
  applyWatermarkAndPageNumbers(
    doc,
    contentWidth,
    startX,
    'ARFF YIA • BUKU INDUK PERSONEL'
  );

  return doc;
};
