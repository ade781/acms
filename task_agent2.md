# TUGAS AGENT 2: EKSEKUSI PERBAIKAN LAMPIRAN, ARMADA & WATCHROOM

**Peran**: Spesialis Kesiapan Armada (Fleet), Fasilitas Watchroom & Pengumuman/Edaran Dinas  
**Status**: 🚀 **FASE EKSEKUSI PERBAIKAN TERISOLASI (FIX & VERIFY PHASE)**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/announcementController.js`
- `backend/src/routes/announcementRoutes.js`
- `backend/src/controllers/readinessController.js`
- `frontend/src/pages/HalamanPengumuman.jsx`
- `frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx`
- `frontend/src/pages/mobile/MobileDashboard.jsx` (area pengumuman)

## 2. Butir Tindakan Perbaikan
1. **Tuntaskan Error 401 Unauthorized Lampiran Pengumuman**:
   - Di `HalamanPengumuman.jsx` (`getPdfUrl`), `MobileDashboard.jsx`, dan `MobileAnnouncementsModal.jsx`, sematkan token JWT dari localStorage sebagai fallback query string: `?token=${encodeURIComponent(token)}`.
   - Di `announcementRoutes.js`, pastikan middleware autentikasi membaca token dari `req.query.token`.
2. **Seragamkan Alur UX Pengumuman Mobile**:
   - Di `MobileAnnouncementsModal.jsx`, ganti pemanggilan `window.open` mentah dengan pratinjau modal in-app yang seragam dengan mobile dashboard.
3. **Aturan Khusus Pengguna: Default Kendaraan Tetap Serviceable**:
   - **Pertahankan status awal kendaraan tetap `serviceable`** (siap operasi penuh), kecuali unit tersebut memiliki carry-over backlog unserviceable dari shift sebelumnya.
4. **Perbaiki Carry-Over Kendala Posko Watchroom**:
   - Di `readinessController.js` (`getWatchroomReadiness`), tambahkan logika carry-over status rusak dari shift sebelumnya jika watchroom belum dilaporkan di shift aktif, dan perbarui `follow_up_status = 'resolved'` saat dipulihkan.
5. **Pencegahan Berkas Sampah (*Orphan Files*)**:
   - Di `announcementController.js`, tambahkan pembersihan `fs.unlink` di blok catch saat create gagal, dan pastikan hapus file fisik dilakukan SETELAH query database delete sukses.

## 3. Kewajiban Laporan (Ide & Saran)
Setelah pengujian lolos via CLI:
- Tuliskan bukti pengujian dan penyelesaian masalah ke: [`masak/temp/hasil_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent2.md).
- **Wajib cantumkan ide, saran arsitektur, dan rekomendasi perbaikan lanjutan** untuk modul Anda di bagian akhir laporan!
