# MASTER ROADMAP: EKSEKUSI PERBAIKAN BUG, INKONSISTENSI & PENYEMPURNAAN MODUL (5 AGENT)

**Peran Sesi:** Pengawas / Orkestrator  
**Fase Saat Ini:** **FASE 3 (Eksekusi Perbaikan Terisolasi & Verifikasi CLI)**  
**Prinsip Kerja:**  
1. Pembagian kerja terisolasi mutlak (*Zero File Collision*).
2. Setiap agen mengeksekusi perbaikan kode produksi di domainnya masing-masing.
3. Seluruh perbaikan wajib divalidasi via CLI terminal (`node -c <file>`, `npm run build`). Dilarang keras menggunakan browser automation (`browser_subagent`).
4. Hasil eksekusi dan bukti validasi ditulis mandiri di `masak/temp/hasil_agent*.md`.

---

## 🎯 MANDAT PERBAIKAN TERPILIH DARI PENGGUNA & HASIL AUDIT

1. **Watch Room Ganda di Halaman Laporan (Agent 5):**
   - Hapus duplikasi rendering Watch Room di `HalamanLaporan.jsx`, `MobileReportSummaryCard.jsx`, dan `pdfService.js`. Pisahkan armada murni vs posko.
2. **Tombol Merah Unread Pengumuman Selalu Muncul (Agent 1):**
   - Buat tabel `announcement_reads` di MySQL.
   - Implementasikan fungsi simpan `markAsRead` riil per user dan `LEFT JOIN` pada `getAnnouncements`.
   - Perbaiki dot merah lonceng di `MobileHeader.jsx` dan badge di `HalamanPengumuman.jsx`.
3. **Missing Carry-Over Transisi Armada Periode Kustom (Agent 2):**
   - Ambil status terakhir sebelum `start_date` sebagai status awal armada pada laporan transisi kelaikan.
4. **Inkonsistensi Default Status Kelaikan (Agent 2):**
   - Selaraskan default status kelaikan kendaraan pada shift aktif menjadi `serviceable` sesuai aturan GEMINI.md No. 17.
5. **Validasi File Foto Fisik Armada (Agent 2):**
   - Validasi MIME type gambar dan batas ukuran maksimal 15MB pada `VehicleReadinessModal.jsx`.
6. **Optimasi Kueri Laporan 1 Tahun (Agent 2):**
   - Buat composite index pada tabel `vehicle_readiness_logs (shift_date, shift_number, vehicle_id)`.
7. **(KRITIS) Race Condition Penghapusan Cuti saat Simpan Ploting (Agent 3):**
   - Ubah `DELETE FROM personnel_deployments` di `saveDeploymentBatch` agar hanya menghapus tipe `'vehicle_utama', 'vehicle_pendukung', 'watchroom'`. Entri cuti (`'absent'`) tidak boleh terhapus.
8. **Kebocoran Fetch Request Regu Libur (Agent 3):**
   - Jika bukan shift bertugas (`!isScheduledTeam && !isAdmin`), cegah request fetch berat dan tampilkan layar *"Bukan Shift Dinas Anda"*.
9. **Ambigu Shift Pembatalan Cuti (Agent 3):**
   - Sertakan `team_group` personel pemohon saat mencari shift target pembatalan cuti.
10. **Pengajuan Cuti Murni Diri Sendiri / Self-Service (Agent 3):**
    - Kunci formulir pengajuan cuti agar Kru, Chief, maupun Asisten Chief **hanya bisa mengajukan cuti untuk diri mereka sendiri** (`user.personnel_id`). Tidak boleh memilih orang lain.
11. **Ubah Tampilan List Cuti Menjadi TABEL (Agent 3):**
    - Di `HalamanCuti.jsx`, ganti kartu bertumpuk/dobel menjadi **Tabel Kompak** (No, Nama Personel, NIP, Kategori Cuti, Tanggal/Rentang, Keterangan/Alasan, Status, Aksi Batalkan).
12. **Perbaikan Mobile Bounce Tombol Rekap Insiden & Modularitas Laporan (Agent 4):**
    - Perbaiki tombol Rekap di `MobileInsiden.jsx`.
    - Sediakan `HalamanLaporanInsiden.jsx` 2 layer dengan filter periode.
    - Cegah deskripsi kegiatan menjadi `NULL` pada update parsial di `activityController.js`.
13. **Sinkronisasi Pejabat Section Head & Tanda Tangan WebP PDF (Agent 5):**
    - Selaraskan query penandatangan laporan di `reportController.js` agar mendukung Section Head / Dept Head secara dinamis.
    - Tangani kompatibilitas tanda tangan gambar pada generator PDF.

---

## 📋 PEMBAGIAN KERJA 5 AGENT (ZERO FILE COLLISION)

### **Agent 1: Notifikasi Pengumuman & Persistensi Status Baca**
- **Berkas Eksklusif**:
  - `backend/src/controllers/announcementController.js`
  - `backend/src/routes/announcementRoutes.js`
  - `frontend/src/pages/HalamanPengumuman.jsx`
  - `frontend/src/components/mobile/MobileHeader.jsx`
  - `frontend/src/components/layout/Navbar.jsx`
- **Lembar Tugas**: [`task_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent1.md)
- **Output Laporan**: [`masak/temp/hasil_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent1.md)

---

### **Agent 2: Kesiapan Armada, Validasi Form & Optimasi Kueri**
- **Berkas Eksklusif**:
  - `backend/src/controllers/readinessController.js`
  - `backend/src/routes/readinessRoutes.js`
  - `frontend/src/pages/HalamanKesiapanKendaraan.jsx`
  - `frontend/src/components/forms/VehicleReadinessModal.jsx`
  - `frontend/src/components/dashboard/VehicleMetricCard.jsx`
- **Lembar Tugas**: [`task_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent2.md)
- **Output Laporan**: [`masak/temp/hasil_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent2.md)

---

### **Agent 3: Modul Cuti (Self-Service & Tampilan Tabel), Ploting & Proteksi Data**
- **Berkas Eksklusif**:
  - `backend/src/controllers/deploymentController.js`
  - `frontend/src/pages/HalamanCuti.jsx`
  - `frontend/src/pages/HalamanPenugasan.jsx`
  - `frontend/src/components/forms/CutiModal.jsx`
- **Lembar Tugas**: [`task_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent3.md)
- **Output Laporan**: [`masak/temp/hasil_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent3.md)

---

### **Agent 4: Log Kegiatan Operasional, Modul Insiden & Halaman Laporan Insiden**
- **Berkas Eksklusif**:
  - `backend/src/controllers/activityController.js`
  - `backend/src/controllers/incidentController.js`
  - `frontend/src/pages/HalamanKegiatan.jsx`
  - `frontend/src/pages/HalamanInsiden.jsx`
  - `frontend/src/pages/HalamanLaporanInsiden.jsx`
  - `frontend/src/pages/mobile/MobileInsiden.jsx`
- **Lembar Tugas**: [`task_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent4.md)
- **Output Laporan**: [`masak/temp/hasil_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent4.md)

---

### **Agent 5: Laporan Dinas Shift, Eliminasi Duplikasi Watchroom & Dokumen Resmi**
- **Berkas Eksklusif**:
  - `backend/src/controllers/reportController.js`
  - `backend/src/services/pdfService.js`
  - `frontend/src/services/reportService.js`
  - `frontend/src/pages/HalamanLaporan.jsx`
  - `frontend/src/components/mobile/reports/MobileReportSummaryCard.jsx`
- **Lembar Tugas**: [`task_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent5.md)
- **Output Laporan**: [`masak/temp/hasil_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent5.md)
