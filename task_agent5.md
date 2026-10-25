# LEMBAR TUGAS AGENT 5: LAPORAN OPERASIONAL, PRATINJAU PDF, TANDA TANGAN DIGITAL, & CACHE

## Domain Berkas Eksklusif
- `frontend/src/pages/HalamanLaporanArmada.jsx`
- `frontend/src/pages/HalamanLaporan.jsx`
- `frontend/src/components/A4DocumentLayout.jsx`
- `backend/src/services/pdfService.js`
- `backend/src/controllers/deploymentController.js`

---

## Rincian Butir Tugas

### Poin 1: Koreksi Tombol Kembali di `HalamanLaporanArmada.jsx`
- **Deskripsi Masalah**:
  - Tombol *"Kembali"* pada halaman laporan armada masih menautkan user ke rute lama `/readiness/vehicles`.
- **Dampak / Risiko**:
  - Memutus navigasi pengguna atau memicu redirect berulang yang tidak efisien.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/pages/HalamanLaporanArmada.jsx`:
    - Ganti path tautan navigasi tombol *"Kembali"* menjadi `/vehicles`.

---

### Poin 2: Eliminasi Hardcode Metrik di `HalamanLaporan.jsx`
- **Deskripsi Masalah**:
  - Pada `HalamanLaporan.jsx` baris 252, terdapat formula hardcode:
    `Math.max(vehicles.length, 8)`.
  - Pada baris 335, terdapat teks statis:
    `"7 Unit Kendaraan Operasional"`.
- **Dampak / Risiko**:
  - Menghasilkan data palsu / tidak akurat di laporan resmi jika jumlah armada aktif berbeda dari 8 atau 7, melanggar aturan mutlak *Zero Dummy Data*.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/pages/HalamanLaporan.jsx`:
    1. Ganti `Math.max(vehicles.length, 8)` menjadi murni `vehicles.length`.
    2. Ganti string statis `"7 Unit Kendaraan Operasional"` menjadi string interpolasi dinamis: `${vehicles.length} Unit Kendaraan Operasional`.

---

### Poin 3: Otentikasi Tanda Tangan Digital & Fallback Tanda Tangan Basah di `A4DocumentLayout.jsx`
- **Deskripsi Masalah**:
  - Di `A4DocumentLayout.jsx`, elemen `<img>` yang merender tanda tangan pejabat memanggil `src={signer.signature_url}` secara langsung tanpa menyertakan token otentikasi. Karena backend (`app.js`) melindungi file `signature-*` dengan auth guard, browser gagal memuat gambar dan memicu status HTTP 401 Unauthorized.
  - Selain itu, jika pejabat belum mengunggah tanda tangan digital, area tanda tangan dibiarkan kosong melompong tanpa garis penandatangan manual.
- **Dampak / Risiko**:
  - Tanda tangan digital yang sah tidak muncul pada pratinjau dokumen PDF (icon gambar rusak / 401).
  - Dokumen cetak tidak rapi dan tidak memiliki panduan tanda tangan basah jika tanda tangan digital belum tersedia.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/components/A4DocumentLayout.jsx`:
    1. Buat helper otentikasi URL gambar:
       ```javascript
       const getAuthorizedUrl = (url) => {
         if (!url) return null;
         const token = localStorage.getItem('token');
         if (!token) return url;
         const separator = url.includes('?') ? '&' : '?';
         return `${url}${separator}token=${encodeURIComponent(token)}`;
       };
       ```
    2. Gunakan `src={getAuthorizedUrl(signer.signature_url)}` pada tag `<img>`.
    3. Jika tanda tangan digital belum tersedia (`!signer.signature_url`), tampilkan garis panduan tanda tangan manual yang elegan di atas nama pejabat:
       ```jsx
       <div className="h-16 flex items-end justify-center">
         <span className="text-slate-400 font-mono tracking-widest text-xs">( ......................................... )</span>
       </div>
       ```

---

### Poin 4: Cache Invalidation PDF di `deploymentController.js`
- **Deskripsi Masalah**:
  - Service `pdfService.js` memiliki mekanisme caching selama 60 detik. Namun fungsi `clearPdfCache()` tidak pernah dipanggil ketika terjadi pembaruan data ploting dinas di `deploymentController.js`.
- **Dampak / Risiko**:
  - Ketika Chief menyimpan perubahan ploting baru, dokumen PDF yang dibuka dalam rentang 60 detik masih menampilkan formasi personel lama (*stale data*).
- **Instruksi Solusi Konkret**:
  - Di `backend/src/services/pdfService.js`:
    - Pastikan helper `clearPdfCache()` diekspor dengan benar.
  - Di `backend/src/controllers/deploymentController.js`:
    - Import `clearPdfCache` dari `../services/pdfService.js`.
    - Di akhir method `saveDeployment`, panggil `clearPdfCache()` setelah transaksi database berhasil di-commit.

---

## Instruksi Pelaporan Temuan Tambahan, Bug, Ide, & Saran
Apabila selama proses audit maupun perbaikan kode Anda menemukan:
- **Bug / Masalah Baru**: Error, glitch, atau cacat logika tambahan yang belum tercantum di tugas ini.
- **Risiko Keamanan / Integritas Data**: Celah otentikasi, potensi tabrakan data, atau regresi performa.
- **Ide / Saran Pengembangan**: Usulan optimasi UI/UX, efisiensi komponen, atau ide fitur yang relevan bagi operasional.

**ATURAN TINDAKAN**:
1. **Dilarang keras memodifikasi berkas di luar domain eksklusif Agent 5 secara sepihak.**
2. **Catat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporan Anda (`masak/temp/hasil_agent5.md`)** menggunakan format poin hierarkis:
   - **Judul Temuan / Ide**: Ringkasan topik.
   - **Deskripsi Masalah / Konsep**: Penjelasan detail teknis.
   - **Dampak / Manfaat**: Urgensi atau keuntungan bagi pengguna.
   - **Rekomendasi Tindak Lanjut**: Saran perbaikan konkret untuk diorkestrasi selanjutnya.

---

## Verifikasi & Pelaporan
1. Jalankan `node -c backend/src/controllers/deploymentController.js`.
2. Jalankan `npm run build` di root frontend.
3. Tuliskan ringkasan hasil kerja secara mandiri di `masak/temp/hasil_agent5.md`.
