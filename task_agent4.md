# LEMBAR TUGAS AGENT 4: AUDIT UI/UX, LAYOUT, ERROR HANDLING & BEBAN LOAD (KEGIATAN, INSIDEN & PENGUMUMAN)

**Domain Audit:** Kegiatan Rutin Harian, Pelaporan Insiden & Pengumuman Dinas (Desktop)  
**Catatan:** **HALAMAN DASHBOARD DIHIRARKAN/DI-SKIP**.  
**Fase:** **FASE 1 (Audit & Inventarisasi Masalah - DILARANG MENGUBAH KODE PRODUKSI)**  
**Batasan:** Hanya sebatas inventarisasi temuan masalah, bug visual, kelemahan error handling, analisis beban loading, dan saran perbaikan konkret.

---

## 🎯 BERKAS TARGET AUDIT ANDA:
1. [`frontend/src/pages/HalamanKegiatan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKegiatan.jsx) (Pencatatan kegiatan harian shift, log timeline, filter kategori & tanggal)
2. [`frontend/src/pages/HalamanInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanInsiden.jsx) (Daftar laporan insiden/emergency bandara, filter status, severity badge)
3. [`frontend/src/pages/HalamanDetailInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanDetailInsiden.jsx) (Detail investigasi insiden, kronologi, armada & personel terlibat, foto dokumentasi)
4. [`frontend/src/components/forms/IncidentModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/IncidentModal.jsx) (Modal form pelaporan insiden darurat, upload foto TKP, multi-input armada)
5. [`frontend/src/pages/HalamanPengumuman.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPengumuman.jsx) (Pusat pengumuman kedinasan, broadcast admin, prioritas banner)

---

## 🔍 FOKUS AREA AUDIT:

### 1. UI/UX & Layout:
- **Kegiatan Harian (`HalamanKegiatan.jsx`):**
  - Tampilan timeline kegiatan: apakah rapi, mudah dibaca, dan badge waktu dinas jelas?
  - Form pencatatan kegiatan: apakah field input durasi/kategori jelas dan intuitif?
- **Pelaporan Insiden (`HalamanInsiden.jsx` & `IncidentModal.jsx`):**
  - Severity level (Low, Medium, High, Critical): kontras badge warna, kejelasan label.
  - Multi-select personel/kendaraan yang terlibat dalam insiden: apakah mudah digunakan atau membingungkan?
  - Upload foto dokumentasi insiden: preview thumbnail foto, penanganan foto berukuran besar.
- **Detail Insiden (`HalamanDetailInsiden.jsx`):**
  - Layout informasi investigasi, koordinat/lokasi kejadian (Runway/Taxiway/Apron), dan kronologi.
  - Apakah foto dokumentasi dapat dilihat dalam resolusi penuh (*lightbox/modal view*)?
- **Pengumuman Dinas (`HalamanPengumuman.jsx`):**
  - Hirarki visual pengumuman penting (urgent/pinned) vs reguler.
  - Kerapian tampilan pembaca teks pengumuman panjang.

### 2. Error Handling & State Feedback:
- Feedback toast instan saat catat kegiatan, lapor insiden baru, update status insiden, atau publikasi pengumuman (GEMINI.md butir 10).
- Penanganan saat upload foto dokumentasi gagal atau format tidak didukung (harus ada pesan error jelas).
- Handling parsing data insiden: backend terkadang mengirimkan `{ total_open, recent: [...] }` atau array langsung — pastikan kode tidak crash dengan `TypeError: incidents.map is not a function`.
- Empty state: bagaimana tampilan saat belum ada insiden/kegiatan pada shift berjalan?

### 3. Analisis Beban & Optimasi Loading (Overload & Anti-Lag):
- **Terlalu banyak load dalam satu halaman:**
  - Apakah `HalamanKegiatan.jsx` memuat seluruh riwayat kegiatan masa lalu tanpa pagination/infinite scroll?
  - Pada `IncidentModal.jsx`, apakah memuat seluruh daftar personel unit sekaligus tanpa memoized selector?
  - Apakah gambar dokumentasi di-load sekaligus dalam ukuran asli (*uncompressed*) sehingga membebani bandwidth dan memperlambat LCP?
- **Performa Input Form:**
  - Periksa `IncidentModal.jsx` dan form modal kegiatan: apakah ada CSS `transition-all` pada textarea kronologi atau input nama insiden?
  - Pastikan tidak ada re-fetch network request di saat pengguna sedang mengetik uraian kejadian.

---

## 📝 OUTPUT:
Tuliskan seluruh temuan masalah (kategori: Kritis/Sedang/Minor), analisis beban load, dan saran perbaikan Anda secara terstruktur di:
👉 [`masak/temp/hasil_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent4.md)

⚠️ **ATURAN FORMAT PENULISAN (DARI PENGGUNA):**
- **DILARANG MENGGUNAKAN TABEL ATAU MATRIKS.** Tuliskan dalam format **daftar poin/bullet points hierarkis bernomor** agar nyaman dibaca.
