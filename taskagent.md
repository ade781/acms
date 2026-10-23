# MASTER ROADMAP: PEMBAGIAN TUGAS 5 AGENT — IMPLEMENTASI MOBILE WEB APP ACMS (ARFF YIA)

Dokumen ini adalah **panduan koordinasi utama** pembagian implementasi antarmuka Mobile Web App ACMS ARFF Bandara Internasional Yogyakarta (YIA) ke dalam **5 Agent Spesialis**. Setiap agent memiliki batasan tanggung jawab, daftar berkas eksklusif, audit endpoint & fungsi, serta mandat **Zero Dummy Data**.

> **Catatan Status Dokumen Acuan**: Berkas `plan.md` telah **resmi dihapus** karena seluruh rencana implementasi, batasan antarmuka, dan pembagian fitur telah selesai dieksekusi 100% ke dalam kode produksi dan dipusatkan pada `GEMINI.md` serta dokumen roadmap ini.

---

## 1. Landasan & Prinsip Desain Wajib (`GEMINI.md`)

Seluruh agent **WAJIB** tunduk pada aturan baku operasional berikut:
1. **Penghapusan Total Fitur Sahkan Shift**:
   - Laporan dinas bersifat transparan, otomatis terekapitulasi, dan tidak memerlukan pengesahan manual. Dilarang keras membuat tombol atau badge "Sahkan Shift".
2. **Keamanan Berkas Privat & Fail-Fast JWT Secret**:
   - Berkas privat (dokumen personel dan tanda tangan) diisolasi dari akses publik langsung (`/uploads`).
   - Pada mode produksi (`NODE_ENV === 'production'`), aplikasi wajib gagal berjalan (`process.exit(1)`) jika `JWT_SECRET` lemah atau < 32 karakter.
3. **Integritas Data Operasional & Validasi Backend (Atomic Transactions)**:
   - Pelepasan penugasan kru saat cuti wajib dieksekusi secara atomik (`beginTransaction`, `commit`, `rollback`).
   - Backend memvalidasi pencegahan dua orang mengisi slot armada yang sama (anti-race condition) dan menolak kru berstatus cuti aktif ditugaskan tanpa pembatalan resmi.
4. **Mandat Zero Dummy Data (Kebijakan Nol Data Tiruan Tanpa Kompromi)**:
   - Dilarang membuat data dummy, angka magic, array mock, atau nama pejabat tiruan.
   - Seluruh data personel, armada, tanda tangan digital, dan logbook ditarik 100% dari database `logbuk` (13 tabel aktif).
5. **Proteksi Hak Akses Shift & Efisiensi Request Server**:
   - Menu Ploting hanya dapat diakses untuk mengubah susunan kru jika user berdinas aktif pada shift tersebut. Jika bukan shift dinas regunya, sistem menampilkan layar santun *"Bukan Shift Dinas Anda"* dan **melewati (skip) pemanggilan API berat** ke server.
   - Perubahan ploting hanya disimpan ke backend saat user menekan tombol **"Simpan Ploting"** (dilarang auto-save per klik slot).
6. **Performa Anti-Lag (Strict INP & LCP)**:
   - Dilarang memakai `transition-all` pada input form. Gunakan `transition-colors duration-100`.
   - Dilarang memakai `backdrop-filter: blur(...)` pada overlay modal saat input form aktif.
   - Tanpa browser otomatis (`browser_subagent`). Seluruh pengujian via CLI terminal (`npm run build`, `node -c`).

---

## 2. Matriks Pembagian Tugas & Berkas 5 Agent

| Agent | Spesialisasi & Modul | Berkas Eksklusif yang Dikelola | Tautan Detail Panduan |
| :---: | :--- | :--- | :--- :---: |
| **Agent 1** | **Pondasi Shell, Header, Profil, RBAC Dokumen & Fail-Fast Security** | • `frontend/src/components/mobile/MobileLayout.jsx`<br>• `frontend/src/components/mobile/MobileHeader.jsx`<br>• `frontend/src/components/mobile/MobileBottomNav.jsx`<br>• `frontend/src/components/mobile/profile/MobileProfileView.jsx`<br>• `frontend/src/components/mobile/profile/MobileEditProfileModal.jsx`<br>• `frontend/src/components/mobile/profile/MobileChangePasswordModal.jsx`<br>• `frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx`<br>• `frontend/src/App.jsx`<br>• `backend/src/server.js`<br>• `backend/src/app.js` | [task_agent1.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent1.md) |
| **Agent 2** | **Dashboard, Tugas Saya, Form Kesiapan PIC, Integritas Transaksi Cuti** | • `frontend/src/pages/mobile/MobileDashboard.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileDutyCard.jsx`<br>• `frontend/src/components/mobile/dashboard/MobilePicReadinessForm.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileOpsSummaryCards.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileUnserviceableWidget.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileRecentAnnouncements.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileLeaveModal.jsx` | [task_agent2.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent2.md) |
| **Agent 3** | **Ploting 8 Unit Armada, Crew Picker, Anti-Race Condition & Validasi Backend** | • `frontend/src/pages/mobile/MobilePloting.jsx`<br>• `frontend/src/components/mobile/ploting/MobilePlotCard.jsx`<br>• `frontend/src/components/mobile/ploting/MobileCrewPickerSheet.jsx`<br>• `frontend/src/components/mobile/ploting/MobileAbsentCrewSection.jsx`<br>• `frontend/src/components/mobile/ploting/MobileCancelLeaveConfirmModal.jsx`<br>• `backend/src/controllers/deploymentController.js` | [task_agent3.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent3.md) |
| **Agent 4** | **Logbook Kegiatan Rutin, Pelaporan Insiden & Validasi File Upload** | • `frontend/src/pages/mobile/MobileKegiatan.jsx`<br>• `frontend/src/pages/mobile/MobileInsiden.jsx`<br>• `frontend/src/components/mobile/activities/MobileActivityModal.jsx`<br>• `frontend/src/components/mobile/activities/MobileActivityTimelineItem.jsx`<br>• `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`<br>• `frontend/src/components/mobile/incidents/MobileIncidentTimelineItem.jsx`<br>• `frontend/src/components/mobile/incidents/MobileIncidentDetailModal.jsx`<br>• `backend/src/middleware/uploadMiddleware.js` | [task_agent4.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent4.md) |
| **Agent 5** | **Rekap Laporan Dinas Shift, Pejabat Dinamis PDF A4 & Automated Testing** | • `frontend/src/pages/mobile/MobileLaporan.jsx`<br>• `frontend/src/components/mobile/reports/MobileReportSummaryCard.jsx`<br>• `frontend/src/components/mobile/reports/MobileUnitAuditModal.jsx`<br>• `frontend/src/components/mobile/reports/MobilePdfViewerModal.jsx`<br>• `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`<br>• `backend/src/controllers/reportController.js`<br>• `backend/src/services/pdfService.js` | [task_agent5.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent5.md) |

---

## 3. Rencana Bertahap Penerapan (3 Prioritas Fondasi)
1. **Tahap 1 (Selesai)**: Penyelarasan aturan bisnis, penghapusan `plan.md`, dan implementasi fail-fast `JWT_SECRET` di `server.js`.
2. **Tahap 2**: Penguatan validasi backend transaksi cuti vs penugasan, anti-race condition ploting, dan validasi berkas upload.
3. **Tahap 3**: Pengujian integrasi otomatis (*automated integration test*) dan kesiapan operasional nyata.
