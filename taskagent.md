# MASTER ROADMAP: FASE EKSEKUSI PERBAIKAN TOTAL 5 AGENT (FIX & VERIFY PHASE)

Dokumen ini adalah **panduan eksekusi utama** bagi **5 Agent Spesialis**.
Seluruh temuan audit dari kelima agen telah **DI-ACC OLEH PENGGUNA** (dengan penegasan bahwa katalog personel tetap fokus 100% pada 4 regu dinas operasional).

> 🚀 **MANDAT FASE 3 (EKSEKUSI PERBAIKAN KODE & PENGUJIAN):**
> 1. **EKSEKUSI PERBAIKAN KODE**: Setiap agen wajib memperbaiki seluruh butir kesalahan di domain masing-masing sesuai instruksi tugas `task_agent[1-5].md`.
> 2. **BATAS KODE EKSKLUSIF (ZERO COLLISION)**: Setiap agen hanya menyentuh berkas yang menjadi tanggung jawabnya. Dilarang mengedit berkas di luar domain.
> 3. **SEMUA PENGUJIAN / TESTING DI FOLDER `masak/`**: Dilarang membuat folder `tests/` di `backend/` atau `frontend/`. Seluruh skrip uji verifikasi ditempatkan di `masak/`.
> 4. **VALIDASI SISTEM VIA CLI**: Pastikan sintaks valid (`node -c`), build lolos (`npm run build`), dan bebas error console.
> 5. **LAPORAN HASIL KERJA MANDIRI**: Tuliskan laporan perbaikan dan bukti pengujian secara mandiri ke `masak/temp/hasil_agent[1-5].md`.

---

## 1. Rekapitulasi Rencana Eksekusi Perbaikan 5 Agent

### **Agent 1: Autentikasi, Shell/Layout, Master Personel, Kredensial STKP & Pejabat**
- **Berkas yang Diperbaiki**:
  - `frontend/src/components/mobile/profile/MobileEditProfileModal.jsx` (Perbaiki opsi ENUM cert_level: Basic, Junior, Senior)
  - `frontend/src/pages/HalamanLogin.jsx` (Hilangkan double redirect / flash navigasi pasca-login role lapangan)
  - `frontend/src/pages/HalamanDetailPersonel.jsx` (Ganti fallback strip `"-"` menjadi `null`, tambahkan tombol & modal Reset Password ke 123456)
  - `frontend/src/components/layout/Navbar.jsx` (Hubungkan avatar header desktop ke profil akun sendiri)
  - `frontend/src/pages/HalamanKelolaPejabat.jsx` & `backend/src/controllers/personnelController.js` (Tambahkan Section Head & normalisasi case-insensitive perbandingan nama regu)
  - `HalamanDetailPersonel.jsx` & `MobileProfileView.jsx` (Ganti `window.alert()` dengan toast notifikasi)
  - `frontend/src/pages/HalamanPersonel.jsx` (Tambahkan dropdown filter sertifikasi lisensi dan pagination terstandar)
  - `backend/src/controllers/authController.js` (Sanitasi `username.trim()` dan fallback default `JWT_EXPIRES_IN || '24h'`)
  - *Catatan Khusus: Katalog personel tetap fokus 4 regu dinas (Alpha, Bravo, Charlie, Delta), tidak perlu menambah tab non-shift/Dept Head.*

### **Agent 2: Dashboard Operasional, Kesiapan Armada (Fleet), & Pengumuman**
- **Berkas yang Diperbaiki**:
  - `frontend/src/pages/HalamanDashboard.jsx` (Perbaiki rute `/deployments` -> `/deployment`, bersihkan 4 kartu placeholder "Coming Soon", ubah badge counter total armada jadi dinamis `{metrics.totalVehicles || 0}`)
  - `backend/src/controllers/dashboardController.js` (Sinkronkan perhitungan carry-over armada rusak unserviceable dengan `readinessController.js`)
  - `frontend/src/pages/HalamanPengumuman.jsx` (Hilangkan hardcode URL `http://localhost:5000` pada pratinjau edaran dinas PDF)
  - `frontend/src/pages/mobile/MobileDashboard.jsx` (Perbaiki mismatch properti file lampiran PDF `previewPdfDoc.file_path`)
  - `frontend/src/pages/HalamanKesiapanKendaraan.jsx` & modal kelaikan (Pasang toast notifikasi sukses/gagal pada tambah/edit/hapus armada dan log kelaikan)
  - `frontend/src/components/forms/VehicleReadinessModal.jsx` (Wajibkan upload foto bukti fisik dan wajibkan catatan perbaikan saat transisi unserviceable -> serviceable)
  - `frontend/src/components/mobile/dashboard/MobilePicReadinessForm.jsx` (Integrasikan kompresi canvas WebP pada foto kamera PIC mobile)

### **Agent 3: Ploting Penugasan Shift & Manajemen Cuti / Izin Dinas**
- **Berkas yang Diperbaiki**:
  - `frontend/src/pages/HalamanPenugasan.jsx` (Hapus `setSuccessMsg(null)` di `fetchDeploymentData()` pasca-simpan, jadikan notifikasi floating fixed viewport dengan auto-dismiss, render panel daftar personel izin/cuti shift ini, tambahkan auto-evict kru yang cuti dari slot armada)
  - `frontend/src/pages/mobile/MobilePloting.jsx` (Ubah kontainer `toastMsg` menjadi floating fixed pill viewport dengan timer auto-dismiss 3s, tangani pembatalan cuti lokal tanpa request 404 ke backend)
  - `frontend/src/components/mobile/MobileLayout.jsx` (Pasang listener global `arff:open-leave-modal` agar tombol `+ Cuti Mandiri` di Profil membuka modal secara responsif)
  - `frontend/src/App.jsx` (Teruskan prop `onOpenCutiModal` ke `MobilePloting.jsx` agar tombol `+ Cuti Saya` tampil)
  - `frontend/src/components/mobile/dashboard/MobileLeaveModal.jsx` & `backend/src/controllers/deploymentController.js` (Sediakan dropdown pemilih personel jika dibuka Admin/Chief dan tangani kasus `personnel_id` null agar tidak error 400, serta lengkapi opsi `tukar_dinas`)
  - `frontend/src/pages/HalamanCuti.jsx` (Hapus pembersihan instan pesan sukses di `fetchLeaveData()`)

### **Agent 4: Logbook Kegiatan Rutin, Manajemen Insiden & Upload Berkas**
- **Berkas yang Diperbaiki**:
  - `frontend/src/pages/HalamanInsiden.jsx` (Impor `useNavigate` dan definisikan `const navigate = useNavigate();` untuk mencegah crash baris tabel)
  - `backend/src/controllers/incidentController.js` (Perbaiki variabel `selectedCategory` yang tidak didefinisikan pada `createIncident` agar laporan insiden baru berhasil tersimpan 100%)
  - `frontend/src/pages/HalamanKegiatan.jsx` (Selaraskan opsi kegiatan dengan 8 Kategori Baku Operasional ARFF YIA, tambahkan input upload foto kegiatan, thumbnail gambar, dan tombol Edit/Hapus)
  - `frontend/src/components/forms/IncidentModal.jsx` (Tambahkan dropdown 10 Klasifikasi Baku Kejadian ARFF dan kirim field `category` pada `FormData`)
  - `backend/src/controllers/activityController.js` (Hapus berkas fisik di `uploads/` saat aktivitas berfoto dihapus)
  - `HalamanInsiden.jsx` & `HalamanDetailInsiden.jsx` (Standarisasi pembacaan badge prioritas insiden bahasa Inggris & dinamiskan di halaman detail)
  - Ganti seluruh dialog browser `alert()` dan `confirm()` dengan notifikasi visual in-app.

### **Agent 5: Jadwal Dinas, Rekap Laporan Shift, Export PDF A4 & Database**
- **Berkas yang Diperbaiki**:
  - `frontend/src/pages/HalamanLaporan.jsx` (Lengkapi pemanggilan data: fetch dan render tabel 8 armada kelaikan, tabel presensi & ploting kru, tabel log kegiatan, dan tabel insiden, perbarui kop surat standar PT Angkasa Pura Indonesia YIA Kode WAHI Kategori 8)
  - `frontend/src/components/mobile/reports/MobilePdfViewerModal.jsx` (Ambil token dari key `'arff_token'`, dan perbaiki URL tombol unduh agar tidak ganda `/api/api/...`)
  - `frontend/src/pages/HalamanJadwal.jsx` (Ganti `window.confirm` dan `window.alert` dengan modal/toast in-app, dan nonaktifkan cursor-pointer bagi kru biasa)
  - `frontend/src/pages/HalamanLaporan.jsx` (Tambahkan penanganan visual error yang jelas dan tombol coba lagi jika gagal load data)
  - `backend/src/controllers/reportController.js` & `backend/src/services/pdfService.js` (Kirimkan data personel izin/cuti ke generator PDF agar dokumen cetak A4 mencantumkan daftar nama dan alasan cuti secara akurat)
  - `backend/src/controllers/scheduleController.js` (Teruskan kustomisasi `schedule_anchor_date` ke fungsi `getScheduleCyclePreview`)
  - Pastikan seluruh pengujian integrasi tetap berada di folder `masak/`.

---

## 2. Protokol Pelaporan Akhir
Setelah perbaikan selesai dan divalidasi via CLI:
Setiap agen **WAJIB mengisi laporannya secara mandiri** ke berkas `masak/temp/hasil_agent[1-5].md` dengan menyertakan:
1. Daftar butir yang telah diperbaiki.
2. Hasil verifikasi fungsional dan pengujian CLI.
3. Status kesiapan rilis.
