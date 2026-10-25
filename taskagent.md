# DOKUMEN MASTER ORKESTRASI & PEMBAGIAN TUGAS 5 AGENT (FASE 3)

**Status Proyek:** FASE 3 (Eksekusi Perbaikan Kode Produksi Terisolasi)  
**Tujuan:** Mengeliminasi seluruh 38 butir temuan audit pada seluruh aplikasi (Dashboard tetap di-skip 100%).  
**Prinsip Utama:** **ISOLASI TOTAL (Zero File Collision)**, **Anti-Lag Form Input**, dan **Zero Redundant Request**.  
**Pedoman Umum Agen:** Wajib membaca dan mematuhi [`agentrules.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/agentrules.md).

---

## 📋 MATRIKS PEMBAGIAN DOMAIN & BERKAS TERISOLASI:

### 1. AGENT 1: Shell Navigasi Desktop, Autentikasi Login & Profil Mandiri Desktop
- **Lembar Tugas:** [`task_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent1.md)
- **Lembar Laporan Hasil:** [`masak/temp/hasil_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent1.md)
- **Berkas Target Eksklusif:**
  - `frontend/src/components/layout/Navbar.jsx`
  - `frontend/src/components/layout/Sidebar.jsx`
  - `frontend/src/pages/HalamanLogin.jsx`
  - `frontend/src/components/common/InputField.jsx`
  - `frontend/src/components/forms/MandatoryPasswordChangeModal.jsx`
  - `frontend/src/components/profile/DesktopProfileModal.jsx`
- **Poin Fokus:**
  - Pembuatan modal profil mandiri terpusat (GEMINI.md Butir 9) via avatar Navbar untuk seluruh role dan Admin.
  - Pesan error ramah saat backend offline (`Network Error`).
  - Polling pengumuman hemat daya (interval 90s + visibility guard).
  - Mode mini/collapse sidebar desktop `w-20` dengan persistensi `localStorage` dan kuncian rute menu baku yang utuh (pantangan mengubah path rute).

---

### 2. AGENT 2: Master Data Personel Admin, Cuti Desktop & Roster Jadwal
- **Lembar Tugas:** [`task_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent2.md)
- **Lembar Laporan Hasil:** [`masak/temp/hasil_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent2.md)
- **Berkas Target Eksklusif:**
  - `frontend/src/pages/HalamanPersonel.jsx`
  - `frontend/src/pages/HalamanDetailPersonel.jsx`
  - `frontend/src/components/personnel/` (Folder modular modal personel)
  - `frontend/src/pages/HalamanCuti.jsx`
  - `frontend/src/components/forms/CutiModal.jsx`
  - `frontend/src/pages/HalamanJadwal.jsx`
  - `backend/src/controllers/deploymentController.js` (Endpoint leave-history)
  - `backend/src/routes/deploymentRoutes.js` (Route leave-history)
- **Poin Fokus:**
  - Eliminasi `window.confirm` native dan pemecahan file monolitik `HalamanDetailPersonel.jsx` ke 4 modal modular.
  - Debounce pencarian nama personel 350ms dan filter dropdown regu yang menyembunyikan non-matching total.
  - Debounce pemilihan tanggal siklus dan in-memory cache roster bulanan di `HalamanJadwal.jsx`.
  - Tab switcher `[Shift Berjalan]` dan `[Riwayat Bulan Ini]` di `HalamanCuti.jsx` (Endpoint backend `GET /api/deployments/leave-history` sudah dibuat dan diuji aktif oleh Supervisor).
  - Validasi client-side ukuran berkas upload dokumen personel (10 MB) dan bukti cuti (5 MB).

---

### 3. AGENT 3: Operasional Armada, Ploting Penugasan Desktop, Kesiapan PIC & Pejabat
- **Lembar Tugas:** [`task_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent3.md)
- **Lembar Laporan Hasil:** [`masak/temp/hasil_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent3.md)
- **Berkas Target Eksklusif:**
  - `frontend/src/pages/HalamanPenugasan.jsx`
  - `frontend/src/components/forms/DeploymentSlotCard.jsx`
  - `frontend/src/pages/HalamanKesiapanKendaraan.jsx`
  - `frontend/src/components/forms/VehicleReadinessModal.jsx`
  - `frontend/src/components/forms/WatchroomReadinessModal.jsx`
  - `frontend/src/pages/HalamanKelolaPejabat.jsx`
- **Poin Fokus:**
  - Sanitasi `Set` client-side untuk mencegah penugasan ganda pada payload batch ploting.
  - Perbaikan percabangan modal kesiapan Posko Watchroom (`WatchroomReadinessModal`).
  - Penanda merah mencolok `⛔ [CUTI/IZIN]` dan status disabled pada dropdown kru yang sedang cuti.
  - Optimalisasi kerapatan padding slot kru pada perangkat mobile.
  - Eliminasi CSS `transition-all` pada banner notifikasi kesiapan kendaraan.
  - Format tanggal Bahasa Indonesia formal pada modal kesiapan.
  - Tooltip penjelas chip status "Menunggu Foto Fisik" (tetap Serviceable sesuai GEMINI.md No. 17).
  - Thumbnail dan instant preview tanda tangan digital Dept. Head dengan validasi berkas 2 MB.

---

### 4. AGENT 4: Log Kegiatan Dinas, Pelaporan Insiden & Papan Pengumuman
- **Lembar Tugas:** [`task_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent4.md)
- **Lembar Laporan Hasil:** [`masak/temp/hasil_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent4.md)
- **Berkas Target Eksklusif:**
  - `frontend/src/pages/HalamanKegiatan.jsx`
  - `frontend/src/pages/HalamanInsiden.jsx`
  - `frontend/src/pages/HalamanDetailInsiden.jsx`
  - `frontend/src/components/forms/IncidentModal.jsx`
  - `frontend/src/pages/HalamanPengumuman.jsx`
- **Poin Fokus:**
  - Perbaikan props tanggal/shift dan proteksi fallback `useAuth()` pada `IncidentModal.jsx`, serta tombol checklist multi-select armada aktif.
  - Modal Lightbox interaktif foto bukti TKP resolusi penuh dengan navigasi dan unduh berkas asli.
  - Restrukturisasi tampilan kegiatan menjadi **Vertical Step Timeline** bersambung garis vertikal dengan badge jam dinas dan ikon kategori dinas.
  - Lazy-load dokumen PDF dan opsi penyematan pengumuman prioritas (`[MENDESAK]` / `PINNED`) di posisi teratas.
  - Penggantian `window.confirm` hapus pengumuman dengan in-app modal konfirmasi.
  - Timer `setTimeout` 3.5 detik untuk auto-dismiss toast feedback.
  - Query pagination limit default `{ limit: 50 }` pada riwayat insiden.

---

### 5. AGENT 5: Dokumen Laporan Cetak Resmi A4 & Seluruh Ekosistem Mobile View
- **Lembar Tugas:** [`task_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent5.md)
- **Lembar Laporan Hasil:** [`masak/temp/hasil_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent5.md)
- **Berkas Target Eksklusif:**
  - `frontend/src/components/reports/A4DocumentLayout.jsx`
  - `frontend/src/services/reportService.js`
  - `frontend/src/pages/HalamanLaporan.jsx`
  - `frontend/src/pages/HalamanLaporanArmada.jsx`
  - `frontend/src/pages/HalamanLaporanInsiden.jsx`
  - `frontend/src/pages/mobile/MobilePloting.jsx`
  - `frontend/src/components/mobile/ploting/MobileAbsentCrewSection.jsx`
  - `frontend/src/pages/mobile/MobileLaporan.jsx`
  - `frontend/src/components/mobile/MobileHeader.jsx`
  - `frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx`
  - `frontend/src/components/mobile/profile/MobileProfileView.jsx`
  - `frontend/src/components/mobile/profile/MobileEditProfileModal.jsx`
- **Poin Fokus:**
  - Penghapusan modal manual dan tombol tambah cuti sepihak di `MobilePloting.jsx` & `MobileAbsentCrewSection.jsx` (patuh asas cuti mandiri GEMINI.md No. 15).
  - Standardisasi Card 1 Profil Mandiri Mobile (Tempat Lahir dan tombol Ubah Password menyatu di Card 1).
  - Penyatuan ekspor PDF desktop melalui Axios authenticated blob stream di `reportService.js` (menghapus `window.open` dengan raw query token).
  - Presisi styling cetak CSS `@page { size: A4 portrait; margin: 10mm 12mm; }` dan format tanda tangan dinas resmi (garis bawah nama pejabat dan label NIP).
  - Perluasan area touch target header mobile menjadi minimal 44x44px.
  - Pencegahan network flooding dengan `AbortController` pada pergantian filter laporan dinas.
  - Cache fetching pengumuman mobile untuk mengeliminasi pemanggilan berulang dalam rentang 30 detik.

---

## 📝 FORMAT WAJIB PENULISAN LAPORAN HASIL KERJA AGENT:
Setiap agent diwajibkan menuliskan laporan hasil eksekusinya di berkas masing-masing (`masak/temp/hasil_agent1.md` s.d. `hasil_agent5.md`) dengan format baku:

```text
(nomor). (judul) (halaman (ditulis singkat saja)/namafile) .
(deskripsi masalah)
(dampak)
(solusi)
```
