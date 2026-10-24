# LEMBAR TUGAS AGENT 1: PERBAIKAN PENGUMUMAN & NOTIFIKASI

**Domain:** Autentikasi, Notifikasi/Pengumuman, Shell Layout & Profil  
**Fase:** FASE 3 (Eksekusi Perbaikan & Validasi CLI)  
**Tujuan Utama:** Menghilangkan tuntas bug indikator merah unread pengumuman yang selalu muncul kembali setiap kali halaman dibuka.

---

## 🎯 DAFTAR BERKAS EKSKLUSIF ANDA:
- `backend/src/controllers/announcementController.js`
- `backend/src/routes/announcementRoutes.js`
- `frontend/src/pages/HalamanPengumuman.jsx`
- `frontend/src/components/mobile/MobileHeader.jsx`
- `frontend/src/components/layout/Navbar.jsx`

---

## 🛠️ INSTRUKSI AKSI PERBAIKAN KONKRET:

### 1. Buat Tabel `announcement_reads` & Perbaiki Backend Controller
1. **Di Database:**
   Pastikan tabel `announcement_reads` dibuat secara aman (jalankan migrasi/query di controller jika belum ada):
   ```sql
   CREATE TABLE IF NOT EXISTS announcement_reads (
     announcement_id INT NOT NULL,
     user_id INT NOT NULL,
     read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (announcement_id, user_id),
     FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
   ```
2. **Di `announcementController.js`:**
   - Pada `getAnnouncements`:
     - Lakukan `LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?` dengan parameter `req.user.id`.
     - Kembalikan properti terhitung: `IF(ar.read_at IS NOT NULL, 1, 0) AS is_read`.
     - Hitung jumlah pengumuman yang belum dibaca (`unread_count`) secara riil per user, bukan di-hardcode 0.
   - Pada `markAsRead`:
     - Hapus kode stub dummy! Ganti dengan operasi riil:
       ```sql
       INSERT INTO announcement_reads (announcement_id, user_id, read_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE read_at = NOW();
       ```

### 2. Perbaiki Frontend `HalamanPengumuman.jsx` & `MobileHeader.jsx`
1. Di `HalamanPengumuman.jsx`:
   - Pastikan `isUnread = Boolean(!ann.is_read || ann.is_read === 0)`.
   - Ketika pengumuman diklik/dibaca (`handleSelectAnnouncement`), tandai `is_read: 1` di state lokal dan perbarui counter unread agar badge merah langsung hilang seketika.
2. Di `MobileHeader.jsx`:
   - Hapus hardcoded titik merah permanen pada lonceng:
     `<span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full ..."></span>`
   - Hanya render titik merah jika `unreadCount > 0`.

### 3. Validasi CLI & Laporan
- Jalankan pengecekan sintaksis:
  `node -c backend/src/controllers/announcementController.js`
  `npm --prefix frontend run build` (atau cek via terminal tanpa browser automation).
- Tuliskan bukti eksekusi dan laporan lengkap di:
  👉 [`masak/temp/hasil_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent1.md)
