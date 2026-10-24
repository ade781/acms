# LEMBAR TUGAS AGENT 5: AUDIT UI/UX, LAYOUT, ERROR HANDLING & BEBAN LOAD (DOKUMEN CETAK & SELURUH MOBILE VIEW)

**Domain Audit:** Laporan Resmi Cetak (PDF/A4 Layout) & Seluruh Ekosistem Antarmuka Mobile  
**Catatan:** **HALAMAN DASHBOARD DIHIRARKAN/DI-SKIP**.  
**Fase:** **FASE 1 (Audit & Inventarisasi Masalah - DILARANG MENGUBAH KODE PRODUKSI)**  
**Batasan:** Hanya sebatas inventarisasi temuan masalah, bug visual, kelemahan error handling, analisis beban loading, dan saran perbaikan konkret.

---

## 🎯 BERKAS TARGET AUDIT ANDA:
1. **Dokumen Resmi Cetak (Desktop):**
   - [`frontend/src/pages/HalamanLaporan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporan.jsx) (Pusat laporan dinas, filter tanggal & shift, pratinjau lembar cetak)
   - [`frontend/src/pages/HalamanLaporanArmada.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporanArmada.jsx) (Laporan kesiapan dan kelaikan armada)
   - [`frontend/src/pages/HalamanLaporanInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporanInsiden.jsx) (Dokumen rekapitulasi penanganan insiden darurat)
   - [`frontend/src/components/reports/A4DocumentLayout.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/reports/A4DocumentLayout.jsx) (Format baku kertas A4, kop surat dinas, tabel matriks, kolom tanda tangan)
2. **Seluruh Ekosistem Mobile View:**
   - [`frontend/src/components/mobile/MobileLayout.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/MobileLayout.jsx) & [`MobileHeader.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/MobileHeader.jsx)
   - [`frontend/src/components/mobile/MobileBottomNav.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/MobileBottomNav.jsx)
   - [`frontend/src/pages/mobile/MobilePloting.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/mobile/MobilePloting.jsx)
   - [`frontend/src/pages/mobile/MobileKegiatan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/mobile/MobileKegiatan.jsx)
   - [`frontend/src/pages/mobile/MobileInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/mobile/MobileInsiden.jsx)
   - [`frontend/src/pages/mobile/MobileLaporan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/mobile/MobileLaporan.jsx)
   - Seluruh komponen pendukung di folder [`frontend/src/components/mobile/`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile)

---

## 🔍 FOKUS AREA AUDIT:

### 1. UI/UX & Layout:
- **Dokumen Laporan Cetak (A4 Layout):**
  - Kepatuhan Tanda Tangan: Tanda tangan digital WAJIB terpasang nyata di dokumen resmi cetak (PDF), tidak boleh dibiarkan titik-titik kosong `( ...... )` jika TTD tersedia (GEMINI.md butir 7).
  - Dilarang hardcode nama pejabat: Nama Ketua Regu dan Dept. Head wajib ditarik dinamis dari database, bukan teks statis (GEMINI.md butir 4).
  - Penghapusan fitur "Sahkan Shift": Pastikan tidak ada sisa tombol/state "Sahkan Shift" manual (GEMINI.md butir 2).
  - Presisi cetak: Apakah ada elemen yang terpotong saat diekspor ke PDF / dicetak pada ukuran kertas A4?
- **Tampilan Mobile View:**
  - Kepatuhan Navigasi: Navigasi bawah (*Bottom Navigation Bar*) HANYA untuk alur dinas operasional (Tugas, Cuti, Posko, Ploting, Kegiatan, Insiden, Laporan). **Dilarang memasukkan menu Profil ke Bottom Bar** (Akses profil wajib di Header Atas - GEMINI.md butir 9).
  - Ukuran tap target (*touch target size*): Apakah tombol-tombol di mobile ramah sentuhan jempol (minimal 44x44px)?
  - Responsivitas & Overflow: Apakah ada teks/tabel yang meluap ke samping (*horizontal scroll*) di layar smartphone (360px s.d. 412px)?

### 2. Error Handling & State Feedback:
- Feedback saat unduh/cetak dokumen laporan: bagaimana jika generate PDF gagal?
- Konsistensi Single Source of Truth: Apakah format dan penarikan data laporan di mobile dan desktop menggunakan service yang sama atau terduplikasi berbeda (GEMINI.md butir 14)?
- Penanganan saat koneksi internet lambat di lapangan pada mobile view: apakah ada offline / retry fallback yang jelas?

### 3. Analisis Beban & Optimasi Loading (Overload & Anti-Lag):
- **Terlalu banyak load dalam satu halaman:**
  - Pada `HalamanLaporan.jsx` dan pratinjau A4: apakah data shift, personel, kesiapan armada, kegiatan, dan insiden ditarik semua sekaligus secara beruntun (*heavy waterfall*)?
  - Pada Mobile View: apakah komponen mobile mengunduh aset/data desktop yang tidak ditampilkan di layar kecil?
- **Performa Input Form di Mobile:**
  - Periksa input catatan kegiatan & insiden di mobile: pastikan tidak ada CSS `transition-all` atau blur backdrop yang membebani chipset HP.

---

## 📝 OUTPUT:
Tuliskan seluruh temuan masalah (kategori: Kritis/Sedang/Minor), analisis beban load, dan saran perbaikan Anda secara terstruktur di:
👉 [`masak/temp/hasil_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent5.md)

⚠️ **ATURAN FORMAT PENULISAN (DARI PENGGUNA):**
- **DILARANG MENGGUNAKAN TABEL ATAU MATRIKS.** Tuliskan dalam format **daftar poin/bullet points hierarkis bernomor** agar nyaman dibaca.
