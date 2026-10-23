# PANDUAN TUGAS AGENT 1: SHELL MOBILE, HEADER, NAVIGASI, PROFIL MANDIRI & DOKUMEN

## Status Kinerja & Evaluasi Agent 1
- **Skor Kinerja**: 98% (Sangat Baik — Penyelarasan Aturan Bisnis & Penghapusan `plan.md` Selesai)
- **Capaian Positif Terkini**:
  1. Penyelarasan Dokumen Baku: Berkas acuan `plan.md` telah resmi dihapus karena seluruh implementasi telah terserap 100% ke dalam kode produksi dan panduan baku kini terpusat pada `GEMINI.md`.
  2. Fail-Fast Security: `validateSecurityConfig()` di `backend/src/server.js` telah diperketat; pada mode produksi (`NODE_ENV === 'production'`), aplikasi otomatis menolak booting (`process.exit(1)`) jika `JWT_SECRET` lemah atau < 32 karakter.
  3. Kontainer shell terpusat smartphone modern 20:9 (`max-w-[412px]`) stabil dan grounded.
  4. Bottom Nav Bar dinamis: Kru 2 menu, Chief 5 menu (bebas menu profil/cuti di navigasi bawah).
  5. Kotak merah "ARFF" pada header mobile telah dihapus tuntas.

---

## Mandat Prioritas Keamanan & Zero Dummy Data
1. **Pengamanan Akses Langsung Berkas Privat (`/uploads`)**:
   - Seluruh dokumen kepegawaian (`document-*`) dan tanda tangan digital (`signature-*`) wajib diproteksi dari akses URL publik langsung tanpa autentikasi.
   - Uji verifikasi hak akses kepemilikan dokumen (`isOwner` atau `isLeadership`) untuk mencegah IDOR (*Insecure Direct Object Reference*).
2. **Zero Dummy Policy**:
   - Seluruh data personel dan kredensial STKP ditarik 100% dari tabel `users`, `personnel`, dan `personnel_documents`.

---

## Audit Fungsi & Endpoint Agent 1

| Endpoint | Metode | Fungsi Backend (Controller) | Fungsi Frontend (Handler) | Status Verifikasi |
| :--- | :---: | :--- | :--- | :---: |
| `/api/announcements` | GET | `getAnnouncements` (`announcementController.js`) | `fetchAnnouncements` di `MobileAnnouncementsModal.jsx` | ✅ Aktif (13 Tabel, tanpa join `announcement_reads`) |
| `/api/announcements/:id/attachment` | GET | `getAnnouncementAttachment` (`announcementController.js`) | Pratinjau PDF di `MobileHeader.jsx` & modal | ✅ Aktif (Akses edaran dinas resmi) |
| `/api/personnel/:id/documents` | GET | `getPersonnelDocuments` (`documentController.js`) | `fetchDocuments` di `MobileProfileView.jsx` | ✅ Aktif (Tarik data berkas dari DB) |
| `/api/personnel/:id/documents` | POST | `uploadDocument` (`documentController.js`) | Handler upload di `MobileProfileView.jsx` | ✅ Aktif (`multipart/form-data`) |
| `/api/auth/profile` | PUT | `updateProfile` (`authController.js`) | `handleSaveProfile` di `MobileEditProfileModal.jsx` | ✅ Aktif (Update NIP, TTL, Gol Darah) |
| `/api/auth/change-password` | PUT | `changePassword` (`authController.js`) | `handleChangePassword` di `MobileChangePasswordModal.jsx` | ✅ Aktif (Bcrypt hash & proteksi sandi) |

---

## Rincian Tanggung Jawab Lanjutan Agent 1
1. **Uji Penetrasi Endpoint `/uploads`**: Pastikan akses `curl /uploads/document-xxx.pdf` tanpa token ditolak dengan HTTP 401, dan akses oleh kru berbeda ditolak HTTP 403.
2. **Validasi Anti-Lag Input Profil**: Memastikan seluruh form edit profil dan ganti sandi tetap responsif (< 16ms).
3. **Validasi Build CLI**: Jalankan `npm run build` dan pastikan 0 error.
