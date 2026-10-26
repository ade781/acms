# DOKUMEN RIWAYAT QUALITY ASSURANCE (RQA.MD)
**Sistem Pemantauan Operasional ARFF YIA (ACMS)**
Bandara Internasional Yogyakarta (YIA) • PT Angkasa Pura Indonesia

Dokumen ini memuat seluruh arsip riwayat pekerjaan Quality Assurance (QA), resolusi temuan audit, refaktorisasi arsitektur modular, unifikasi fungsi (*Single Source of Truth / Ponytail DRY*), serta verifikasi fitur operasional yang **telah selesai dikerjakan, diuji, dan stabil** pada codebase.

Item yang telah selesai dikerjakan dipindahkan dari `QA.md` ke dokumen `RQA.md` ini agar `QA.md` tetap ringkas dan fokus hanya pada temuan aktif yang belum dikerjakan.

---

## BAGIAN 1: REKAPITULASI REFAKTORISASI BERKAS PADAT (MODULAR ARSITEKTUR)
*Selesai Dikerjakan & Terverifikasi (Commit `589c033`, `70d12ca`, `2c71646`)*

### 1. Dekomposisi Layanan Dokumen PDF (`pdfService.js`)
* **Kondisi Sebelum**: Berkas `pdfService.js` monolitik berukuran 1.500 baris yang menggabungkan seluruh logika generator dokumen (Shift, Armada, Insiden, Kegiatan, Personel).
* **Solusi yang Dieksekusi**:
  * Dibuat subdirektori modul `backend/src/services/pdf/`:
    * `shiftReportPdf.js`: Generator PDF Laporan Dinas Shift terpadu.
    * `vehicleReportPdf.js`: Generator PDF Kelaikan Armada Fisik.
    * `incidentReportPdf.js`: Generator PDF Laporan Investigasi Insiden Bandara.
    * `activitiesReportPdf.js`: Generator PDF Rekapitulasi Kegiatan Shift.
    * `personnelReportPdf.js`: Generator PDF Biodata & Dossier Personel.
    * `pdfHelpers.js`: Helper fungsi umum (header resmi instansi, garis pembatas, formatting sel tabel, konversi mm/pt).
  * Berkas `pdfService.js` dipertahankan sebagai fasad (*facade / re-exporter*) yang ramping (~60 baris) sehingga kompatibilitas ke modul pemanggil tetap 100% utuh tanpa breaking changes.
* **Hasil & Penghematan**: Berkurang lebih dari 1.300 baris dari berkas monolitik utama, arsitektur PDF kini sepenuhnya terisolasi per jenis dokumen.

### 2. Dekomposisi Controller Personel (`personnelController.js`)
* **Kondisi Sebelum**: Berkas `personnelController.js` berukuran lebih dari 1.000 baris yang menampung CRUD personel, upload dokumen, manajemen cuti, dan manajemen pejabat struktural sekaligus.
* **Solusi yang Dieksekusi**:
  * Dibuat controller spesialis mandiri:
    * `backend/src/controllers/leaveController.js`: Menangani pengajuan cuti, riwayat cuti, pembatalan cuti, dan validasi kuota anti-overlap.
    * `backend/src/controllers/officialsController.js`: Menangani CRUD pejabat struktural Department Head dan Section Head.
    * `backend/src/controllers/personnelDocumentController.js`: Menangani pengunggahan dan penghapusan arsip ijazah/STKP/dokumen kepegawaian.
    * `backend/src/utils/competencyHelper.js`: Helper pemetaan validitas dan kedaluwarsa lisensi STKP.
  * Berkas `personnelController.js` menyusut menjadi murni pengelola data induk personel dan ekspor PDF.
* **Hasil & Penghematan**: Berkurang 783 baris kode dari controller personel, routing menjadi jelas dan terisolasi.

### 3. Modularisasi Halaman Kegiatan (`ActivitiesPage.jsx`)
* **Kondisi Sebelum**: Berkas halaman berukuran 800+ baris yang memuat seluruh modal formulir kegiatan, modal pratinjau foto, modal hapus, modal ekspor, dan linimasa kegiatan dalam satu berkas.
* **Solusi yang Dieksekusi**:
  * Dibuat subkomponen terisolasi di `frontend/src/components/activities/`:
    * `ActivityFormModal.jsx`: Modal tambah dan edit kegiatan harian.
    * `ActivityPhotoModal.jsx`: Modal pratinjau galeri foto dokumentasi beresolusi penuh.
    * `ActivityDeleteModal.jsx`: Modal konfirmasi penghapusan log kegiatan.
    * `ActivityExportModal.jsx`: Modal pemilihan rentang tanggal ekspor laporan PDF.
    * `ActivityTimelineList.jsx`: Komponen render linimasa visual kegiatan operasional.
    * `frontend/src/utils/activityCategories.js`: Konstanta kategori kegiatan terpusat.
  * Berkas `ActivitiesPage.jsx` menyusut dari 800+ baris menjadi ~200 baris controller page yang bersih.
* **Hasil & Penghematan**: Berkurang 677 baris dari halaman utama, performa re-rendering input form menjadi instan.

### 4. Modularisasi Halaman Manajemen Cuti (`LeaveManagementPage.jsx`)
* **Kondisi Sebelum**: Berkas halaman berukuran 850+ baris yang menumpuk logika personel izin shift aktif, cuti yang sedang berjalan, riwayat cuti bulanan, dan modal pembatalan.
* **Solusi yang Dieksekusi**:
  * Dibuat subkomponen di `frontend/src/components/leave/`:
    * `CurrentShiftAbsentsView.jsx`: Tampilan daftar personel yang tidak hadir pada shift berjalan.
    * `OngoingLeavesView.jsx`: Tampilan paket pengajuan cuti yang sedang/akan berjalan.
    * `MonthlyLeaveHistoryView.jsx`: Tampilan tab riwayat cuti bulanan beserta filter tahun/regu.
    * `CancelLeaveModal.jsx`: Modal konfirmasi pembatalan cuti dinas.
    * `frontend/src/utils/leaveHelpers.jsx`: Helper format durasi hari dan badge status cuti.
  * Berkas `LeaveManagementPage.jsx` menyusut dari 850+ baris menjadi ~350 baris controller page.
* **Hasil & Penghematan**: Berkurang 593 baris dari halaman utama.

---

## BAGIAN 2: HASIL UNIFIKASI FUNGSI REDUNDAN (PONYTAIL DRY LOG) & PEMBERSIHAN MASAK
*Selesai Dikerjakan & Terverifikasi (Commit `6e5da5c`, `9d8c9ca`)*

### 1. Pembersihan Menyeluruh Folder Kerja Khusus `masak/`
* **Tindakan**: Menghapus seluruh skrip sementara (`clean_split_pdf.cjs`, `refactor_personnel.cjs`, `split_pdf_service.cjs`, `complete_page_tester.mjs`, `comprehensive_page_audit.mjs`, `network_deep_audit.mjs`, `page_by_page_deep_audit.mjs`).
* **Hasil**: Folder `masak/` kini 100% steril dari berkas eksekusi sisa migrasi, hanya menyisakan subdirektori data kerja resmi (`login/`, `mobile/`, `temp/`).

### 2. Unifikasi Utilitas Unduh Berkas Blob di Frontend (`fileHelper.js`)
* **Tindakan**: Dibuat modul tunggal `frontend/src/utils/fileHelper.js` yang mengekspor fungsi `downloadBlob(blob, filename)`.
* **Dampak**: 
  * Menghilangkan duplikasi manipulasi DOM `document.createElement('a')` di 7 tempat berbeda.
  * Mencegah memory leak di browser melalui pembersihan otomatis `URL.revokeObjectURL(url)` setelah 100ms.
  * Dibuat fungsi terpusat `downloadShiftReportPdf` di `reportService.js` yang menyatukan alur unduh laporan dinas antara versi Desktop dan Mobile (*Single Source of Truth*).

### 3. Pembersihan Dead Code Alias Dwibahasa & Pengayaan `formatIndoDate`
* **Tindakan**:
  * Dihapus 6 fungsi alias mati di `shiftHelper.js` (`bersihkanNamaRegu`, `formatNamaRegu`, `ambilReguTerjadwal`, `ambilJadwalHarian`, `ambilShiftOperasionalSaatIni`, `formatTanggalIndonesia`).
  * Fungsi `formatIndoDate` diperkaya dengan opsi kustom serta proteksi parsing `NaN`.
  * Komponen profil Desktop (`DesktopProfileModal.jsx`) dan Mobile (`MobileProfileView.jsx`, `MobilePersonnelAccordion.jsx`) kini memanfaatkan fungsi standar dari `shiftHelper.js`.

### 4. Unifikasi Backend: `roleMapper.js` & `officialHelper.js`
* **Tindakan**:
  * Dibuat modul sentral `backend/src/utils/roleMapper.js` menampung `mapRankPositionToRole`, `isLeadershipRole`, `isPrivilegedRole`, dan `cleanTeam`. Menghubungkan kembali impor terputus pada `personnelDocumentController.js` yang berpotensi crash runtime.
  * Dibuat modul `backend/src/utils/officialHelper.js` untuk menyatukan query penandatangan resmi `getOfficialSignatory()`, mengeliminasi duplikasi query SQL manual di `reportController.js`, `deploymentController.js`, dan `personnelController.js`.
  * Diterapkan fungsi `cleanTeam` secara seragam di `dashboardController.js` untuk mencegah masalah case-sensitivity pada query SQL database.

---

## BAGIAN 3: RIWAYAT IMPLEMENTASI FITUR & ATURAN BISNIS COMMIT SEBELUMNYA
*Selesai Dikerjakan & Terverifikasi (Commit `1dec3f8` s.d. `dd32c99`)*

### 1. Proteksi Mutasi Personel Bertugas Aktif (*Safeguard Anti-Bentrok Dinas*)
* **Status**: Stabil & Teruji (Commit `92d7329`).
* **Implementasi**: Di `backend/src/controllers/personnelController.js`, sistem secara otomatis menolak dan memblokir mutasi regu (`team_group`), penonaktifan (`is_active = 0`), atau penghapusan personel jika yang bersangkutan sedang tercatat aktif bertugas di armada atau posko shift berjalan. Chief wajib memindahkan slot penugasan di Ploting terlebih dahulu sebelum mutasi dapat diproses admin.

### 2. Standarisasi Akses Profil Mandiri di Header Navigasi Atas (Top App Bar)
* **Status**: Stabil & Teruji (Commit `1dec3f8`).
* **Implementasi**: Akses Profil Pribadi, data kredensial STKP, dan arsip dokumen kepegawaian di seluruh role (Admin, Chief, Kru) diseragamkan ditempatkan di Header Atas melalui avatar pengguna (`Navbar.jsx` dan `MobileHeader.jsx`). Menu Profil dihapus dari Bottom Navigation Bar Mobile sesuai aturan Butir 9 `GEMINI.md`.

### 3. Pembersihan Data Non-Operasional Golongan Darah
* **Status**: Stabil & Teruji (Commit `1dec3f8` & `b8b8ab7`).
* **Implementasi**: Seluruh atribut input, kolom tabel, dan label `blood_type` (Golongan Darah) dihapus dari seluruh antarmuka dan skema laporan operasional karena bukan merupakan data kelaikan tugas ARFF.

### 4. Penataan Hierarki Sidebar Navigasi
* **Status**: Stabil & Teruji (Commit `73de10e`).
* **Implementasi**: Menu Manajemen Izin/Cuti diposisikan tepat di atas Roster/Jadwal Dinas di `Sidebar.jsx`, menciptakan alur navigasi kerja yang logis dan runtut bagi pengguna manajerial.

### 5. Default Status Kesiapan Armada "Belum Dicek"
* **Status**: Stabil & Teruji (Commit `dd32c99`).
* **Implementasi**: Default status kesiapan kendaraan pada shift berjalan yang belum diperiksa oleh PIC armada berstatus `belum_dilaporkan` (*Belum Dicek*). Jika ada kendala carry-over dari shift sebelumnya yang belum diselesaikan (`unserviceable`), status otomatis terbawa rusak. Kendaraan baru berstatus `serviceable` setelah dilakukan pemeriksaan fisik operasional.

### 6. Layanan Ekspor Dokumen Resmi PDF
* **Status**: Stabil & Dimodularisasi (Commit `dd32c99` & `589c033`).
* **Implementasi**: Tersedia generator dokumen PDF kedinasan lengkap dengan kop resmi PT Angkasa Pura Indonesia, tabel matriks dinas, dan tanda tangan digital terpasang nyata (Laporan Dinas Shift, Kelaikan Armada, Investigasi Insiden, Rekap Kegiatan, Dossier Personel).

### 7. Status Halaman Dashboard Dikosongkan (Coming Soon)
* **Status**: Stabil & Terkunci (Aturan Butir 13 `GEMINI.md`).
* **Implementasi**: Halaman `frontend/src/pages/HalamanDashboard.jsx` dikosongkan dan hanya menampilkan teks 'Coming Soon' sesuai instruksi eksplisit pengguna.

### 8. Proteksi Hak Akses Ploting Dinas ("Bukan Shift Dinas Anda")
* **Status**: Stabil & Teruji (Aturan Ploting `GEMINI.md`).
* **Implementasi**: Halaman Ploting hanya dapat diakses dan diubah oleh regu yang sedang bertugas aktif pada shift berjalan. Jika bukan shift user, antarmuka menolak rendering form armada dan menampilkan layar *"Bukan Shift Dinas Anda"*, serta membatalkan fetch data ploting berat ke server demi menghemat bandwidth.

### 9. Penghapusan Fitur "Sahkan Shift" (Sistem Tanpa Pengesahan Manual)
* **Status**: Stabil & Teruji (Aturan Butir 2 `GEMINI.md`).
* **Implementasi**: Tombol "Sahkan Shift" dihapus menyeluruh dari desktop dan mobile. Laporan dinas bersifat transparan dan otomatis terekapitulasi dari data operasional shift yang berjalan tanpa penguncian manual.

### 10. Batasan Kuota Cuti Mandiri (Maksimal 2 Cuti Berjalan) & Anti-Overlap
* **Status**: Stabil & Teruji (Aturan Butir 19 `GEMINI.md`).
* **Implementasi**: Setiap personel dibatasi maksimal memiliki 2 pengajuan cuti yang sedang/akan berjalan. Sistem memblokir pengajuan tanggal cuti yang beririsan (*anti-overlap*), dan menyajikan data dalam format Paket Pengajuan Terpadu.

### 11. Autentikasi Fleksibel Pengunduhan Dokumen Lampiran (`?token=...` Fallback)
* **Status**: Stabil & Teruji (Aturan Butir 16 `GEMINI.md`).
* **Implementasi**: Seluruh endpoint file/attachment di backend mendukung autentikasi via header `Authorization: Bearer <token>` maupun query parameter fallback `?token=...` sehingga pembukaan dokumen di tab baru browser tidak menghasilkan error HTTP 401 Unauthorized.

### 12. Katalog Personel Fokus pada 4 Regu Dinas Operasional
* **Status**: Stabil & Teruji (Aturan Butir 12 `GEMINI.md`).
* **Implementasi**: Seluruh antarmuka katalog personel difokuskan 100% pada 4 regu dinas operasional (Alpha, Bravo, Charlie, Delta), tanpa tab atau filter terpisah untuk Dept. Head di dalam katalog regu.

