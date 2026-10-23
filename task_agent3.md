# TUGAS AGENT 3: EKSEKUSI PERBAIKAN CUTI & PLOTING PENUGASAN REGU

**Peran**: Spesialis Ploting Penugasan Shift & Manajemen Cuti / Izin Dinas  
**Status**: ✅ **SELESAI & TERVERIFIKASI PENUH (100% PASS)**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/deploymentController.js`
- `frontend/src/pages/HalamanCuti.jsx`
- `frontend/src/pages/HalamanPenugasan.jsx`

## 2. Butir Tindakan Perbaikan
1. **Hapus Tombol Redundan Cuti di Desktop**:
   - Di `HalamanCuti.jsx`, hapus tombol *"Tambah Cuti Shift Ini"*.
2. **Rasionalisasi Hak Kelola Cuti Admin**:
   - Jadikan modul cuti di desktop murni sebagai **Konsol Pengawasan & Tata Kelola Admin (Read, Edit, Delete/Batal)**.
   - Hapus kemampuan Admin/Supervisor mengajukan cuti atas nama anggotanya (pengajuan cuti adalah hak prerogatif mandiri personel).
   - Di `HalamanPenugasan.jsx`, hapus tombol `+ Catat Personel Cuti` dan jadikan panel "Daftar Personel Izin/Cuti" sebagai panel informasi read-only transparan.
3. **Pembatalan Cuti Instan di Desktop**:
   - Di `HalamanCuti.jsx`, ubah klik tombol hapus/batal agar langsung memanggil endpoint API `DELETE /api/deployments/leave/:id` ke server (disertai konfirmasi in-app) agar tidak hilang saat refresh.
4. **Penguatan Otorisasi Shift di Backend**:
   - Di `deploymentController.js` (`saveDeploymentBatch`), tambahkan validasi wewenang shift: Jika bukan admin/dept_head, tolak request (HTTP 403) jika user yang login berasal dari regu yang sedang libur/off.

## 3. Kewajiban Laporan (Ide & Saran)
Setelah pengujian lolos via CLI:
- Tuliskan bukti pengujian dan penyelesaian masalah ke: [`masak/temp/hasil_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent3.md).
- **Wajib cantumkan ide, saran arsitektur, dan rekomendasi perbaikan lanjutan** untuk modul Anda di bagian akhir laporan!
