# TUGAS AGENT 1: EKSEKUSI PERBAIKAN AUTENTIKASI, PROFIL & PEJABAT

**Peran**: Spesialis Autentikasi, Shell/Layout, Master Personel, Kredensial STKP & Kelola Pejabat  
**Status**: 🚀 **FASE EKSEKUSI PERBAIKAN TERISOLASI (FIX & VERIFY PHASE)**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/authController.js`
- `backend/src/controllers/personnelController.js`
- `frontend/src/pages/HalamanKelolaPejabat.jsx`
- `frontend/src/components/mobile/MobileLayout.jsx`
- `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`

## 2. Butir Tindakan Perbaikan
1. **Sinkronisasi Role Section Head**:
   - Di `personnelController.js` (`replaceSectionHead`), perbarui kolom `users.role = 'section_head'` untuk pejabat baru dan kembalikan role pejabat lama ke role awalnya agar wewenang login sinkron.
2. **Aturan Khusus Pengguna: Dept Head Diinput Mandiri**:
   - Di `HalamanKelolaPejabat.jsx` dan `personnelController.js`, ubah alur penunjukan Dept Head menjadi **form input data mandiri** (Nama Lengkap, NIP, Jabatan, Unggah Tanda Tangan), **BUKAN memilih dari anggota regu operasional**.
3. **Cegah Login Akun Nonaktif**:
   - Di `authController.js` (`login`), tambahkan pengecekan kondisi status keaktifan personel (`p.is_active = 1`). Tolak login dengan pesan error jika akun telah dinonaktifkan.
4. **Perbaikan Update Profil Mandiri**:
   - Di `authController.js` (`updateProfile`), perbaiki query agar nilai `null` yang dikirim pengguna untuk field opsional dapat menghapus data lama (jangan gunakan `COALESCE` yang mengunci nilai lama).
5. **Evaluasi Must Change Password di Mobile**:
   - Di `MobileLayout.jsx`, evaluasi flag `user?.must_change_password` dan tampilkan modal wajib ganti sandi jika bernilai true.
6. **Perbaikan Tanda Tangan 401 Unauthorized**:
   - Di `MobileSignaturesSection.jsx`, tambahkan query token `?token=...` pada URL tanda tangan agar gambar tidak terblokir HTTP 401 saat dimuat tag `<img>`.

## 3. Kewajiban Laporan (Ide & Saran)
Setelah pengujian lolos via CLI:
- Tuliskan bukti pengujian dan penyelesaian masalah ke: [`masak/temp/hasil_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent1.md).
- **Wajib cantumkan ide, saran arsitektur, dan rekomendasi perbaikan lanjutan** untuk modul Anda di bagian akhir laporan!
