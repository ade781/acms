# LEMBAR TUGAS AGENT 1: AUDIT UI/UX, LAYOUT, ERROR HANDLING & BEBAN LOAD (SHELL, LOGIN & PROFIL MANDIRI)

**Domain Audit:** Shell Navigasi, Autentikasi Login & Profil Mandiri (STKP & Dokumen Saya)  
**Catatan:** **HALAMAN DASHBOARD DIHIRARKAN/DI-SKIP**. Jangan audit dashboard!  
**Fase:** **FASE 1 (Audit & Inventarisasi Masalah - DILARANG MENGUBAH KODE PRODUKSI)**  
**Batasan:** Hanya sebatas inventarisasi temuan masalah, bug visual, kelemahan error handling, analisis beban loading, dan saran perbaikan konkret.

---

## 🎯 BERKAS TARGET AUDIT ANDA:
1. [`frontend/src/components/layout/AppLayout.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/layout/AppLayout.jsx) (Shell utama desktop & pembungkus rute)
2. [`frontend/src/components/layout/Navbar.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/layout/Navbar.jsx) (Header atas, info shift aktif, notifikasi/indikator koneksi, avatar user & dropdown)
3. [`frontend/src/components/layout/Sidebar.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/layout/Sidebar.jsx) (Navigasi samping, ikon menu, badge counter, collapse/expand)
4. [`frontend/src/pages/HalamanLogin.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLogin.jsx) (Tampilan login, card centered, kredensial, form input)
5. [`frontend/src/components/forms/MandatoryPasswordChangeModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/MandatoryPasswordChangeModal.jsx) (Modal ganti password wajib saat pertama login)
6. **Sub-view / Modal Profil Mandiri:** Card 1 Profil & Kredensial STKP, Card 2 Dokumen & Sertifikat Saya, upload berkas, ganti password mandiri (periksa implementasi pemanggilannya dari header).

---

## 🔍 FOKUS AREA AUDIT:

### 1. UI/UX & Tampilan Visual:
- **Halaman Login:** 
  - Pastikan TIDAK ADA footer di halaman login (aturan baku pengguna).
  - Pastikan TIDAK ADA role selector (Admin/Chief/Kru) di login form.
  - Pastikan TIDAK ADA teks filler/slogan demo atau ambient glow neon berlebih.
  - Pastikan kredensial awal `aaa`/`aaaaaa` TIDAK ditampilkan secara terbuka di UI login.
- **Header & Sidebar:**
  - Kerapian alignment nama user, info shift dinas, dan status live.
  - Kepatuhan Aturan GEMINI.md butir 9: Akses Profil Mandiri wajib seragam di Header Atas (Top App Bar via avatar).
- **Profil Mandiri & Dokumen:**
  - Apakah sub-view profil menampilkan 2 Card baku (Card 1: Profil & Kredensial STKP; Card 2: Dokumen & Sertifikat Saya)?
  - Apakah dialog/modal pop-up sempit terpotong atau sudah menjadi sub-view yang lega?

### 2. Error Handling & State Feedback:
- Perilaku saat login gagal (password salah, akun dinonaktifkan, atau server backend mati): Apakah ada alert/toast error informatif atau silent/stuck?
- Validasi form ganti password: pesan error kecocokan password, syarat minimal karakter.
- Upload dokumen sertifikat: penanganan jika ukuran file terlalu besar (> 5MB) atau format salah.

### 3. Analisis Beban & Optimasi Loading (Overload & Anti-Lag):
- **Terlalu banyak load:** Apakah `Navbar.jsx` atau `AppLayout.jsx` melakukan polling data/fetch berulang yang tidak perlu?
- **Performa Input Form:** Apakah ada CSS `transition-all` pada input username/password atau form profil? (Wajib `transition-colors duration-100`).
- **Modal Backdrop:** Apakah modal ganti password atau popup memakai `backdrop-filter: blur(...)` yang membebani GPU saat input teks aktif?

---

## 📝 OUTPUT:
Tuliskan seluruh temuan masalah (kategori: Kritis/Sedang/Minor), analisis beban load, dan saran perbaikan Anda secara terstruktur di:
👉 [`masak/temp/hasil_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent1.md)

⚠️ **ATURAN FORMAT PENULISAN (DARI PENGGUNA):**
- **DILARANG MENGGUNAKAN TABEL ATAU MATRIKS.** Tuliskan dalam format **daftar poin/bullet points hierarkis bernomor** agar nyaman dibaca.
