# PANDUAN TUGAS: AGENT 5 - MOBILE LAPORAN DINAS, AUDIT TRAIL KESIAPAN ARMADA & DUAL-ACTION PDF A4

## Peran & Batasan Tanggung Jawab
Agent 5 bertindak sebagai **Spesialis Rekapitulasi Laporan Dinas, Audit Trail Kesiapan & Pratinjau Dokumen PDF Mobile**. Bertanggung jawab penuh membangun Tab Laporan Shift Komprehensif (`MobileLaporan.jsx`), modal pelacakan riwayat estafet kendala armada antar-regu (*Audit Trail Modal*), komponen tanda tangan pejabat dinamis, serta lembar pratinjau dokumen PDF resmi ramah mobile (*Dual-Action Mobile PDF Modal*).
- **DILARANG** menyentuh komponen shell luar (`MobileLayout`, `MobileHeader`, `MobileBottomNav`) agar tidak tabrakan dengan Agent 1.
- **DILARANG** mengutak-atik halaman dashboard atau form kesiapan tugas PIC (Tugas Agent 2).
- **DILARANG** mengutak-atik halaman ploting 8 unit armada / crew picker (Tugas Agent 3).
- **DILARANG** mengutak-atik modul input kegiatan rutin & insiden (Tugas Agent 4).
- **WAJIB** mematuhi aturan baku di [`GEMINI.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/GEMINI.md) Butir 2 (Sistem Tanpa Pengesahan Manual) & Butir 4 (Dilarang Hardcode Pejabat), serta [`plan.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/plan.md).

---

## Berkas yang Dikelola oleh Agent 5 (Eksklusif)
1. `frontend/src/pages/mobile/MobileLaporan.jsx`
2. `frontend/src/components/mobile/reports/MobileReportSummaryCard.jsx`
3. `frontend/src/components/mobile/reports/MobileUnitAuditModal.jsx`
4. `frontend/src/components/mobile/reports/MobilePdfViewerModal.jsx`
5. `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`

---

## Standar Desain & Aturan Kritis (`GEMINI.md` & `plan.md`)

### 1. Tab Laporan Dinas Komprehensif (`MobileLaporan.jsx`)
- **Akses Transparan Bersama (Kru & Chief)**:
  - Dapat diakses baik oleh Kru (mode *Read-Only*) maupun Chief. Seluruh anggota berhak memantau kondisi rekapitulasi shift yang berjalan.
- **PENGHAPUSAN FITUR SAHKAN SHIFT (STRICT GEMINI.md BUTIR 2)**:
  - **DILARANG KERAS** menampilkan tombol *"Sahkan Shift"* atau badge *"Menunggu Pengesahan"*.
  - Laporan bersifat transparan dan otomatis terekapitulasi dari data operasional shift dinas berjalan (*Real-Time*).
- **Struktur Dokumen Laporan Dinas Lengkap (Sesuai Modul 2, 3, & 4 DOCX)**:
  1. *Kop Dokumen Resmi*: PT ANGKASA PURA INDONESIA - KC BANDARA INTERNASIONAL YOGYAKARTA (YIA), ARFF Section, Kode WAHI, Kategori 8.
  2. *Rekapitulasi 8 Unit Operasional*: 7 Kendaraan + 1 Watchroom (Status Serviceable/Unserviceable, PIC, Kru, Justifikasi kendala). Mengklik status memicu pembukaan `MobileUnitAuditModal`.
  3. *Presensi & Distribusi Personel*: Rincian personel yang hadir berdinas vs personel yang izin/cuti.
  4. *Logbook Kegiatan Shift*: Linimasa kegiatan dinas shift dengan uraian dan thumbnail foto dokumentasi.
  5. *Rekapitulasi Kejadian/Insiden*: Laporan kejadian airside dengan prioritas siaga dan foto bukti kejadian.
  6. *Pejabat Penandatangan Dinamis*: Berdasarkan database dan wewenang shift (misal: Dept. Head & Ketua Regu yang memimpin shift tersebut). Tanda tangan digital asli terpasang nyata pada preview dokumen.
  7. *Tombol Aksi Utama*: Tombol **"Unduh PDF Resmi (A4)"** (`px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm`) dan tombol **"Pratinjau Lembar Surat"** yang membuka modal dokumen.

### 2. Modal Audit Trail Pelacakan Status Kendala Antar-Regu (`MobileUnitAuditModal.jsx`)
- Menjawab kebutuhan operasional saat armada berstatus *Unserviceable* pada shift/regu sebelumnya (misal tgl 19 Okt oleh Regu Bravo) dan pulih menjadi *Serviceable* pada shift dinas berikutnya (tgl 25 Okt oleh Regu Charlie).
- **Fitur Modal Audit Trail**:
  - Kronologi siklus hidup status unit armada: Waktu, Shift, Regu pelapor, Nama & NIP PIC pemeriksa, Status From -> To (*Unserviceable* -> *Serviceable*), Catatan hasil perbaikan/tindak lanjut, dan foto fisik verifikasi.
  - Memberikan transparansi mutlak bagi pimpinan maupun kru tanpa kehilangan jejak histori kendala.

### 3. Dual-Action Mobile PDF UX (`MobilePdfViewerModal.jsx` - Anti-Iframe Bug)
- Mengatasi masalah umum browser mobile (iOS Safari & Chrome Android) yang bermasalah saat menampilkan tag `<iframe>` PDF:
  1. **In-App Official Sheet Preview**: Merender lembar dokumen standar A4 yang dapat di-scroll mulus di dalam sheet modal tanpa lag dan tanpa glitch iframe.
  2. **Buka Layar Penuh (Native Viewer)**: Tombol untuk membuka berkas PDF asli pada penampil PDF bawaan smartphone (`window.open(url, '_blank')`).
  3. **Unduh Berkas**: Tombol untuk mengunduh berkas fisik PDF langsung ke penyimpanan perangkat.

---

## Rincian Tugas yang Wajib Dikerjakan

### 1. Bangun Halaman `MobileLaporan.jsx`
- Agregasikan data dinas shift berjalan dari berbagai endpoint API:
  - `/api/reports/shift-summary?date=...&shift=...`
  - `/api/readiness/vehicles` (8 unit)
  - `/api/deployments/current` (ploting & presensi)
  - `/api/activities` (logbook kegiatan)
  - `/api/incidents` (kejadian)
- Sediakan tombol pintas cetak / unduh PDF resmi.

### 2. Kembangkan `MobileReportSummaryCard.jsx`
- Desain kartu rekapitulasi ringkas dan rapi untuk 8 unit armada dan presensi personel.
- Status kesiapan dapat diklik untuk memeriksa histori pada `MobileUnitAuditModal`.

### 3. Kembangkan `MobileUnitAuditModal.jsx`
- Tampilkan linimasa estafet kendala per unit armada.
- Menampilkan detail verifikasi saat unit pulih dari Unserviceable menjadi Serviceable.

### 4. Kembangkan `MobilePdfViewerModal.jsx` & `MobileSignaturesSection.jsx`
- Sheet modal pratinjau A4 dengan tipografi resmi, garis tepi kop dinas, dan spesimen tanda tangan pejabat.
- Hubungkan tombol unduh PDF resmi ke endpoint backend `/api/reports/export/pdf?date=...&shift=...`.

---

## Kriteria Selesai Agent 5
- Halaman Laporan menyajikan data rekapitulasi dinas utuh secara real-time dan bebas tombol "Sahkan Shift" manual.
- Data pejabat penandatangan ditarik dinamis dari API sesuai pimpinan shift yang berlaku.
- Modal Audit Trail Kesiapan Armada berfungsi menelusuri siklus hidup pergantian status kendala antar-regu.
- Fitur pratinjau lembar surat A4 dan unduh berkas PDF berjalan lancar tanpa bug iframe di layar smartphone.
- Kompilasi `npm run build` sukses 0 error.
