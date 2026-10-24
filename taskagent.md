# MASTER ROADMAP: FASE EKSEKUSI FITUR BARU, REKAP LAPORAN KHUSUS & AUDIT TOTAL TAHAP 2 (5 AGENT)

Dokumen ini adalah **mandat orkestrasi pengawas** bagi **5 Agent Spesialis** untuk mengeksekusi fitur baru dan penyempurnaan sistem yang dipilih pengguna serta tambahan instruksi spesifik pengguna tanpa tabrakan berkas (*zero file collision*).

> 🚀 **MANDAT BARU PENGGUNA (HASIL KONFIRMASI PENGGUNA):**
> 1. **5 SARAN TERPILIH DARI PENGGUNA**:
>    - **Saran 1**: Konsolidasi Watchroom ke dalam Tabel Fasilitas Khusus.
>    - **Saran 2**: Penyelarasan Warna Visual Kesiapan Slot Kru.
>    - **Saran 3**: Dukungan Edit Kegiatan Operasional di Mobile.
>    - **Saran 4**: Abstraksi Generator Dokumen A4 ke Komponen Presentasional Bersama.
>    - **Saran 5**: Cache & Watermark PDF Generator.
> 2. **4 INSTRUKSI TAMBAHAN PENGGUNA PRIBADI**:
>    - **Instruksi 1 (Halaman Report)**: Watchroom Posko ARFF jangan ditulis ganda (hapus redundansi Watch Room Posko yang terpisah di atas tabel jika di dalam tabel sudah ada).
>    - **Instruksi 2 (Halaman Report)**: Pelacakan kendala armada HANYA untuk unit yang statusnya masih *unserviceable* ATAU yang mengalami perpindahan status (serviceable <-> unserviceable) pada shift tersebut.
>    - **Instruksi 3 (Kesiapan Armada)**:
>      - Tombol Report di Kesiapan Armada mengarahkan ke **Halaman Rute Baru Penuh** (`/armada/laporan` - `HalamanLaporanArmada.jsx`) dengan tombol kembali (*Back*).
>      - Menampilkan daftar semua armada beserta frekuensi pergantian status kelaikan (*serviceable* $\leftrightarrow$ *unserviceable*).
>      - **Filter Periode**: Menyediakan pilihan preset default: **1 Bulan (Default)**, **3 Bulan**, **1 Tahun**, serta **Opsi Memilih Rentang Tanggal Kustom** (Tanggal Awal s.d. Tanggal Akhir).
>      - Dilengkapi fitur ekspor Report PDF khusus riwayat kelaikan armada.
>    - **Instruksi 4 (Insiden Operasional)**:
>      - Tombol Report di Halaman Insiden mengarahkan ke **Halaman Rute Baru Penuh** (`/insiden/laporan` - `HalamanLaporanInsiden.jsx`) dengan tombol kembali (*Back*).
>      - **Struktur 2 Layer**: Layer 1 berupa ringkasan list kejadian (Tanggal/Waktu, Kategori, Lokasi, Status), diklik untuk membuka Layer 2 (Detail kronologi, penanganan, koordinasi ATC/Avsec, kondisi akhir TKP).
>      - **Filter Periode**: Menyediakan pilihan preset default: **1 Bulan (Default)**, **3 Bulan**, **1 Tahun**, serta **Opsi Memilih Rentang Tanggal Kustom**.
>      - Dilengkapi fitur ekspor Report PDF khusus rekap insiden.
> 3. **TUGAS AUDIT & SARAN LANJUTAN**:
>    Setiap agen wajib terus menyisir domain berkas masing-masing untuk menemukan potensi bug/kesalahan baru dan menuliskan ide/saran perbaikan di laporan masing-masing (`masak/temp/hasil_agent*.md`).

---

## Pembagian Kerja Eksklusif 5 Agent

### **Agent 1: Autentikasi, Shell/Layout, Profil & Pejabat**
- **Berkas Eksklusif**:
  - `backend/src/controllers/authController.js`
  - `backend/src/controllers/personnelController.js`
  - `frontend/src/pages/HalamanKelolaPejabat.jsx`
  - `frontend/src/components/mobile/MobileLayout.jsx`
  - `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`
  - `frontend/src/App.jsx`
- **Tugas Utama**:
  1. Daftarkan rute baru penuh di `frontend/src/App.jsx` dengan proteksi role guard:
     - `/armada/laporan` -> `HalamanLaporanArmada.jsx`
     - `/insiden/laporan` -> `HalamanLaporanInsiden.jsx`
  2. Sisir potensi bug/kesalahan baru di modul auth & pejabat, serta berikan ide/saran pengembangan lanjutan.
- **Lembar Tugas**: [`task_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent1.md)
- **Output Laporan**: [`masak/temp/hasil_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent1.md)

---

### **Agent 2: Kesiapan Armada, Watchroom & Halaman Laporan Armada**
- **Berkas Eksklusif**:
  - `backend/src/controllers/readinessController.js`
  - `backend/src/routes/readinessRoutes.js`
  - `backend/src/controllers/vehicleController.js`
  - `frontend/src/pages/HalamanKesiapanArmada.jsx`
  - `frontend/src/pages/HalamanLaporanArmada.jsx` (halaman baru laporan armada)
  - `frontend/src/components/forms/VehicleReadinessModal.jsx`
- **Tugas Utama**:
  1. **Saran 1 (Konsolidasi Watchroom)**: Satukan data Posko Watch Room ke dalam struktur data fasilitas khusus agar terintegrasi mulus.
  2. **Instruksi 3 (Halaman Laporan Armada Penuh `/armada/laporan`)**:
     - Di `HalamanKesiapanArmada.jsx`, pasang tombol "Laporan Kesiapan Armada" / "Report" menuju `/armada/laporan`.
     - Bangun `HalamanLaporanArmada.jsx`:
       - Tampilkan header dengan tombol kembali (*Back ke Kesiapan Armada*).
       - Komponen Filter Periode: **1 Bulan (Default)**, **3 Bulan**, **1 Tahun**, dan **Pilih Rentang Tanggal (Start Date - End Date)**.
       - Tabel/Daftar Armada: Menampilkan list kendaraan operasional, status kelaikan terkini, dan total frekuensi/jumlah berapa kali kendaraan berganti status (*serviceable* $\leftrightarrow$ *unserviceable*) pada periode terpilih (dihitung per shift/per hari).
       - Tombol cetak PDF Laporan Kelaikan Armada (terhubung dengan service PDF Agent 5).
     - Di `readinessController.js`, buat endpoint API penghitung transisi status per kendaraan berdasarkan filter rentang tanggal.
  3. Sisir potensi bug/kesalahan baru di modul armada, serta berikan ide/saran pengembangan lanjutan.
- **Lembar Tugas**: [`task_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent2.md)
- **Output Laporan**: [`masak/temp/hasil_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent2.md)

---

### **Agent 3: Ploting Penugasan Shift & Visual Kesiapan Kru**
- **Berkas Eksklusif**:
  - `backend/src/controllers/deploymentController.js`
  - `frontend/src/pages/HalamanPenugasan.jsx`
  - `frontend/src/pages/HalamanCuti.jsx`
- **Tugas Utama**:
  1. **Saran 2 (Penyelarasan Warna Visual Kesiapan Slot Kru)**:
     - Di `HalamanPenugasan.jsx`, selaraskan indikator warna visual:
       - Slot kru terisi penuh & armada serviceable -> emerald lembut / solid indicator.
       - Slot kru belum lengkap atau armada unserviceable -> amber / red warning border yang jelas dan mudah dipindai mata Chief.
  2. Sisir potensi bug/kesalahan baru di modul ploting & cuti, serta berikan ide/saran pengembangan lanjutan.
- **Lembar Tugas**: [`task_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent3.md)
- **Output Laporan**: [`masak/temp/hasil_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent3.md)

---

### **Agent 4: Log Kegiatan Rutin & Manajemen Laporan Insiden**
- **Berkas Eksklusif**:
  - `backend/src/controllers/activityController.js`
  - `backend/src/controllers/incidentController.js`
  - `frontend/src/pages/HalamanKegiatan.jsx`
  - `frontend/src/pages/HalamanInsiden.jsx`
  - `frontend/src/pages/HalamanDetailInsiden.jsx`
  - `frontend/src/pages/HalamanLaporanInsiden.jsx` (halaman baru laporan insiden)
  - `frontend/src/pages/mobile/MobileKegiatan.jsx`
  - `frontend/src/pages/mobile/MobileInsiden.jsx`
- **Tugas Utama**:
  1. **Saran 3 (Edit Kegiatan di Mobile)**:
     - Berikan dukungan edit catatan kegiatan operasional di `MobileKegiatan.jsx` (termasuk kelola foto lampiran kegiatan).
  2. **Instruksi 4 (Halaman Laporan Insiden Penuh `/insiden/laporan`)**:
     - Di `HalamanInsiden.jsx` (dan mobile), pasang tombol "Laporan Rekap Insiden" / "Report" menuju `/insiden/laporan`.
     - Bangun `HalamanLaporanInsiden.jsx`:
       - Tampilkan header dengan tombol kembali (*Back ke Insiden*).
       - Komponen Filter Periode: **1 Bulan (Default)**, **3 Bulan**, **1 Tahun**, dan **Pilih Rentang Tanggal (Start Date - End Date)**.
       - **Layer 1 (Ringkasan Kejadian)**: Tabel kejadian insiden ringkas (Tanggal/Waktu, Kategori Insiden, Lokasi Grid/Area, Status Penanganan).
       - **Layer 2 (Detail Insiden)**: Modal / slide-over saat salah satu baris kejadian diklik untuk melihat kronologi lengkap, tindakan penanganan, pihak terkoordinasi ATC/Avsec, kondisi akhir TKP.
       - Tombol cetak PDF Laporan Rekap Insiden (terhubung dengan service PDF Agent 5).
     - Di `incidentController.js`, buat endpoint API rekap insiden berdasarkan filter rentang tanggal.
  3. Sisir potensi bug/kesalahan baru di modul kegiatan & insiden, serta berikan ide/saran pengembangan lanjutan.
- **Lembar Tugas**: [`task_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent4.md)
- **Output Laporan**: [`masak/temp/hasil_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent4.md)

---

### **Agent 5: Rekap Laporan Shift, Layanan Terpadu & PDF Generator**
- **Berkas Eksklusif**:
  - `backend/src/controllers/reportController.js`
  - `backend/src/services/pdfService.js`
  - `frontend/src/services/reportService.js`
  - `frontend/src/pages/HalamanLaporan.jsx`
  - `frontend/src/pages/mobile/MobileLaporan.jsx`
  - `frontend/src/components/reports/A4DocumentLayout.jsx` (komponen bersama baru)
- **Tugas Utama**:
  1. **Instruksi 1 (Hapus Watchroom Ganda di Laporan)**:
     - Di `HalamanLaporan.jsx` dan `MobileLaporan.jsx`, hapus box terpisah Watchroom yang duplikat jika tabel sudah mencakup fasilitas/posko. Satukan informasi secara elegan.
  2. **Instruksi 2 (Pelacakan Kendala Hanya Saat Ada Perpindahan Status / Unserviceable)**:
     - Di `HalamanLaporan.jsx` dan backend `reportController.js`, sesuaikan filter tabel pelacakan kendala armada: HANYA tampilkan unit yang masih berstatus `unserviceable` ATAU yang mengalami perpindahan status (transisi serviceable <-> unserviceable) pada shift bersangkutan.
  3. **Saran 4 (Abstraksi Generator Dokumen A4)**:
     - Buat komponen presentasional bersama `frontend/src/components/reports/A4DocumentLayout.jsx` untuk digunakan di desktop dan mobile preview.
  4. **Saran 5 (Cache & Watermark PDF Generator)**:
     - Di `backend/src/services/pdfService.js`:
       - Tambahkan watermark dinamis resmi ("ARFF YIA - OFFICIAL OPS REPORT") pada background dokumen PDF.
       - Terapkan in-memory caching untuk render PDF yang sudah di-generate jika data shift belum berubah.
       - Sediakan method generator PDF khusus:
         a) `generateVehicleReadinessReportPdf(data)` (mendukung Laporan Kesiapan Armada Agent 2).
         b) `generateIncidentSummaryReportPdf(data)` (mendukung Laporan Rekap Insiden Agent 4).
  5. Sisir potensi bug/kesalahan baru di modul laporan & PDF, serta berikan ide/saran pengembangan lanjutan.
- **Lembar Tugas**: [`task_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent5.md)
- **Output Laporan**: [`masak/temp/hasil_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent5.md)
