# MASTER ORKESTRASI PERBAIKAN SISTEM ACMS (ARFF YIA) - FASE 3 EKSEKUSI

Dokumen ini memuat master rencana perbaikan sistem terpadu (*Zero File Collision*) untuk Agent 1 sampai dengan Agent 5 dengan menyertakan konteks penuh: **Deskripsi Masalah**, **Dampak / Risiko**, dan **Instruksi Solusi Konkret**.

---

## Ringkasan Matriks Domain & Penugasan Agen

### 1. Agent 1: URL Routing, Navigasi RESTful, & Mobile Shell
- **Domain Berkas**:
  - `frontend/src/App.jsx`
  - `frontend/src/components/layout/Sidebar.jsx`
  - `frontend/src/components/layout/MobileBottomNav.jsx`
- **Fokus Utama**: Menstandarisasi URL hirarkis `/vehicles` dan `/vehicles/reports`, mengaktifkan `/incidents/reports`, memasang redirect otomatis dari path lama, menyinkronkan active route sidebar, dan memastikan tab bottom bar mobile kru hanya berisi 3 tab baku (Dashboard, Kegiatan, Laporan).

### 2. Agent 2: Modul Personel, Validasi Cuti, & Lencana STKP
- **Domain Berkas**:
  - `frontend/src/pages/HalamanPersonel.jsx`
  - `frontend/src/components/CutiModal.jsx`
  - `backend/src/controllers/personnelController.js`
- **Fokus Utama**: Menambahkan lencana peringatan kedaluwarsa lisensi STKP (amber ≤ 60 hari, merah expired), validasi tanggal cuti bentrok di frontend, dan memperkuat proteksi mutasi/penonaktifan personel saat bertugas aktif di backend.

### 3. Agent 3: Kesiapan Armada, Carry-Over Status, & Ploting Dirty State
- **Domain Berkas**:
  - `backend/src/controllers/readinessController.js`
  - `frontend/src/pages/HalamanKesiapanKendaraan.jsx`
  - `frontend/src/pages/HalamanPenugasan.jsx`
  - `frontend/src/pages/mobile/MobilePloting.jsx`
- **Fokus Utama**: Memperbaiki transisi status armada agar log baru berstatus `belum_dilaporkan` (badge abu-abu netral) dengan tetap membawa carry-over unserviceable dari shift sebelumnya, memasang pelacakan dirty state (`hasUnsavedChanges`) dengan floating bar berdenyut dan route guard peringatan, serta menghapus request ganda di mobile.

### 4. Agent 4: Modul Kegiatan, Insiden, & Proteksi Read-Only Kru Non-Pimpinan (Nomor 8)
- **Domain Berkas**:
  - `backend/src/controllers/activityController.js`
  - `backend/src/controllers/incidentController.js`
  - `frontend/src/pages/HalamanKegiatan.jsx`
  - `frontend/src/pages/HalamanInsiden.jsx`
  - `frontend/src/pages/mobile/MobileKegiatan.jsx`
  - `frontend/src/pages/mobile/MobileInsiden.jsx`
- **Fokus Utama**: Memproteksi backend endpoint (HTTP 403 Forbidden) untuk Create/Update/Delete jika bukan Admin, Chief, atau Asisten Chief; menerapkan mode Read-Only murni di UI frontend mobile bagi kru biasa; menambahkan tombol "Rekap Laporan" di header insiden; dan membersihkan dead code unused import.

### 5. Agent 5: Laporan Operasional, Pratinjau PDF, Tanda Tangan Digital, & Invalidation Cache
- **Domain Berkas**:
  - `frontend/src/pages/HalamanLaporanArmada.jsx`
  - `frontend/src/pages/HalamanLaporan.jsx`
  - `frontend/src/components/A4DocumentLayout.jsx`
  - `backend/src/services/pdfService.js`
  - `backend/src/controllers/deploymentController.js`
- **Fokus Utama**: Menghubungkan token otentikasi pada `src` gambar tanda tangan digital di layout A4 PDF guna mengatasi HTTP 401 Unauthorized, format garis tanda tangan basah bila belum ada tanda tangan digital, menghapus angka hardcode 8 dan "7 Unit Kendaraan" di laporan dinas, dan memanggil `clearPdfCache()` saat penyimpanan ploting.

---

## Protokol Eksekusi & Pelaporan Temuan Tambahan
1. Setiap agen membaca lembar tugas spesifiknya (`task_agent1.md` s.d. `task_agent5.md`).
2. Dilarang menyentuh berkas di luar domain eksklusif masing-masing (*Zero File Collision*).
3. Seluruh pengujian kode wajib dilakukan via CLI (`npm run build` dan `node -c`). Dilarang membuka browser otomatis (`browser_subagent`).
4. **Kanal Temuan, Bug, Ide, & Saran Tambahan**:
   - Apabila selama inspeksi/eksekusi agen menemukan bug baru, anomali logika, celah keamanan/performa, ide inovasi, atau saran peningkatan UI/UX di luar tugas utamanya:
   - **DILARANG mengubah kode di luar domain/tugas secara sepihak.**
   - Agen **WAJIB mencatat seluruh temuan, ide, dan saran tersebut di berkas laporannya (`masak/temp/hasil_agent*.md`)** menggunakan format hierarkis: Judul Temuan/Ide, Deskripsi Masalah/Konsep, Dampak/Manfaat, dan Rekomendasi Solusi agar dapat dievaluasi bersama oleh Pengawas dan Pengguna.
5. Setelah eksekusi tuntas dan lulus verifikasi CLI, agen menuliskan laporannya secara mandiri di `masak/temp/hasil_agent*.md`.
