# LEMBAR TUGAS AGENT 2: AUDIT UI/UX, LAYOUT, ERROR HANDLING & BEBAN LOAD (PERSONEL, ROSTER & CUTI)

**Domain Audit:** Manajemen Personel, Detail Kepegawaian, Roster Shift Kalender, & Pengelolaan Cuti (Desktop)  
**Catatan:** **HALAMAN DASHBOARD DIHIRARKAN/DI-SKIP**.  
**Fase:** **FASE 1 (Audit & Inventarisasi Masalah - DILARANG MENGUBAH KODE PRODUKSI)**  
**Batasan:** Hanya sebatas inventarisasi temuan masalah, bug visual, kelemahan error handling, analisis beban loading, dan saran perbaikan konkret.

---

## 🎯 BERKAS TARGET AUDIT ANDA:
1. [`frontend/src/pages/HalamanPersonel.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPersonel.jsx) (Katalog personel operasional, filter regu, search, list/grid)
2. [`frontend/src/pages/HalamanDetailPersonel.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanDetailPersonel.jsx) (Detail profil lengkap, form STKP, upload dokumen/arsip sertifikat, riwayat dinas)
3. [`frontend/src/pages/HalamanJadwal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanJadwal.jsx) (Kalender jadwal shift, generator rotasi shift, indikator regu dinas)
4. [`frontend/src/pages/HalamanCuti.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanCuti.jsx) (Daftar cuti personel, status pengajuan, filter tanggal, aksi persetujuan/batal)
5. [`frontend/src/components/forms/CutiModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/CutiModal.jsx) (Modal form pengajuan & penyesuaian cuti)

---

## 🔍 FOKUS AREA AUDIT:

### 1. UI/UX & Layout:
- **Katalog Personel:**
  - Apakah fokus pada 4 Regu Dinas (Alpha, Bravo, Charlie, Delta) sesuai GEMINI.md butir 12?
  - Apakah search input dan filter tab regu rapi, tidak melompat (*layout shift*), dan tombol aksi mudah dijangkau?
- **Detail Personel:**
  - Kerapian form edit STKP (Nomor Lisensi, Kualifikasi, Masa Berlaku) dan daftar berkas lampiran PDF/foto.
  - Apakah tombol preview/download berkas lampiran aman dari error HTTP 401 (GEMINI.md butir 16)?
- **Roster Shift (Jadwal):**
  - Tampilan grid kalender bulanan/mingguan: apakah ada elemen terpotong (*overflow*) saat dibuka di resolusi 1280px s.d. 1920px?
  - Kejelasan badge warna shift (Pagi, Siang, Malam, Off).
- **Pengelolaan Cuti & CutiModal:**
  - Kepatuhan GEMINI.md butir 15: Admin DILARANG memiliki tombol "Tambah Cuti Shift Ini" (Cuti adalah self-service; admin murni Read, Edit Status, dan Delete/Batal).
  - Apakah modal cuti responsif, tombol submit tidak terpotong layar, dan pilihan personel dinamis?

### 2. Error Handling & State Feedback:
- Feedback toast instan saat ajukan/batalkan cuti, edit data personel, atau generate jadwal shift (GEMINI.md butir 10).
- Penanganan saat upload dokumen ijazah/STKP gagal (file corrupt, ukuran melebihi batas).
- Empty state: bagaimana tampilan saat tidak ada personel cuti pada tanggal tertentu?

### 3. Analisis Beban & Optimasi Loading (Overload & Anti-Lag):
- **Terlalu banyak load dalam satu halaman:**
  - Pada `HalamanDetailPersonel.jsx` (ukuran 47KB!), apakah data di-fetch sekaligus secara masif (dokumen, riwayat dinas, log cuti, STKP) hingga membebani network?
  - Pada `HalamanJadwal.jsx`, apakah fetching roster 1 bulan/tahun dilakukan secara berulang tanpa caching?
- **Performa Input Form:** 
  - Periksa seluruh `<input>` dan `<textarea>` di `CutiModal.jsx` dan form edit personel: apakah ada CSS `transition-all` atau filter blur yang memicu lag pengetikan?
- **Debounce Search:** Apakah pencarian nama personel di `HalamanPersonel.jsx` memiliki debounce atau memicu re-render berat di setiap ketikan keyboard?

---

## 📝 OUTPUT:
Tuliskan seluruh temuan masalah (kategori: Kritis/Sedang/Minor), analisis beban load, dan saran perbaikan Anda secara terstruktur di:
👉 [`masak/temp/hasil_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent2.md)

⚠️ **ATURAN FORMAT PENULISAN (DARI PENGGUNA):**
- **DILARANG MENGGUNAKAN TABEL ATAU MATRIKS.** Tuliskan dalam format **daftar poin/bullet points hierarkis bernomor** agar nyaman dibaca.
