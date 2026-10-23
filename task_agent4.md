# TUGAS AGENT 4: EKSEKUSI PERBAIKAN LOGBOOK KEGIATAN & INSIDEN

**Peran**: Spesialis Logbook Kegiatan Rutin, Manajemen Insiden Darurat & Upload Berkas  
**Status**: 🚀 **FASE EKSEKUSI PERBAIKAN TERISOLASI (FIX & VERIFY PHASE)**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/activityController.js`
- `backend/src/controllers/incidentController.js`
- `frontend/src/pages/HalamanKegiatan.jsx`
- `frontend/src/pages/HalamanInsiden.jsx`
- `frontend/src/pages/HalamanDetailInsiden.jsx`
- `frontend/src/pages/mobile/MobileInsiden.jsx`
- `frontend/src/components/forms/IncidentModal.jsx`

## 2. Butir Tindakan Perbaikan
1. **Perbaiki Bug Penghapusan Foto saat Edit Kegiatan**:
   - Di `HalamanKegiatan.jsx`, saat user mengklik "Hapus Foto", kirim `formData.append('attachment_url', '')` agar `activityController.js` mendeteksi penghapusan foto dan menghapus berkas fisik lama dari storage.
2. **Selaraskan Filter Insiden Lintas Perangkat**:
   - Di `HalamanInsiden.jsx` dan `MobileInsiden.jsx`, sediakan tab filter seragam: *"Shift Berjalan"* vs *"Semua Riwayat"* agar data tidak terkesan hilang saat dibuka di mobile.
3. **Lengkapi Field Form & Tampilan Detail Insiden**:
   - Di `IncidentModal.jsx` desktop, tambahkan field `source_info` (Asal Info/ATC) dan `coordinated_parties`, serta dukungan multi-foto hingga 5 berkas.
   - Di `HalamanDetailInsiden.jsx`, tampilkan kedua field tersebut pada kartu informasi detail.
4. **Proteksi Wewenang Tombol Aksi**:
   - Di `HalamanDetailInsiden.jsx` dan `HalamanInsiden.jsx`, sembunyikan tombol "Tandai Selesai Ditangani" dan "Tambah Insiden" bagi kru junior non-hak untuk mencegah error 403.
5. **Modal Konfirmasi Tindakan Akhir Penutupan Insiden**:
   - Tambahkan dialog ringkas input `action_taken` (Tindakan Akhir) dan `last_condition` (Kondisi Akhir TKP) sebelum mengirim status 'selesai' ke backend.

## 3. Kewajiban Laporan (Ide & Saran)
Setelah pengujian lolos via CLI:
- Tuliskan bukti pengujian dan penyelesaian masalah ke: [`masak/temp/hasil_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent4.md).
- **Wajib cantumkan ide, saran arsitektur, dan rekomendasi perbaikan lanjutan** untuk modul Anda di bagian akhir laporan!
