# LEMBAR TUGAS AGENT 4: KEGIATAN, INSIDEN, & PROTEKSI READ-ONLY KRU NON-PIMPINAN

## Domain Berkas Eksklusif
- `backend/src/controllers/activityController.js`
- `backend/src/controllers/incidentController.js`
- `frontend/src/pages/HalamanKegiatan.jsx`
- `frontend/src/pages/HalamanInsiden.jsx`
- `frontend/src/pages/mobile/MobileKegiatan.jsx`
- `frontend/src/pages/mobile/MobileInsiden.jsx`

---

## Rincian Butir Tugas

### Poin 1: Proteksi Backend Controller Kegiatan & Insiden (Role Guard)
- **Deskripsi Masalah**:
  - Endpoint mutasi data kegiatan (`POST /activities`, `PUT /activities/:id`, `DELETE /activities/:id`) dan insiden (`POST /incidents`, `PUT /incidents/:id`, dll.) belum memvalidasi apakah pengguna yang sedang memanggil API memiliki hak wewenang pimpinan.
- **Dampak / Risiko**:
  - Kru operasional biasa yang tidak memiliki wewenang komando dapat melakukan modifikasi catatan jurnal kegiatan harian atau mengubah status insiden penerbangan, memicu kekacauan data operasional resmi.
- **Instruksi Solusi Konkret**:
  - Di `backend/src/controllers/activityController.js`:
    - Pada method `createActivity`, `updateActivity`, dan `deleteActivity`:
      ```javascript
      const allowedRoles = ['admin', 'chief', 'chief_assistant'];
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak: Hanya Chief, Asisten Chief, atau Admin yang berhak mencatat, mengubah, atau menghapus kegiatan operasional.'
        });
      }
      ```
  - Di `backend/src/controllers/incidentController.js`:
    - Pada method `createIncident`, `updateIncident`, dan `resolveIncident`:
      ```javascript
      const allowedRoles = ['admin', 'chief', 'chief_assistant'];
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak: Hanya Chief, Asisten Chief, atau Admin yang berhak melaporkan atau memperbarui status penanganan insiden.'
        });
      }
      ```

---

### Poin 2: Tombol "Rekap Laporan" di Header `HalamanInsiden.jsx`
- **Deskripsi Masalah**:
  - Pada halaman daftar insiden desktop (`HalamanInsiden.jsx`), tidak ada tombol untuk mengakses halaman rekapitulasi laporan insiden (`/incidents/reports`), sehingga modul laporan insiden tersembunyi.
- **Dampak / Risiko**:
  - Pimpinan unit dan inspektur keselamatan kesulitan mengekspor atau melihat rekap laporan insiden dalam format resmi.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/pages/HalamanInsiden.jsx`:
    - Di sebelah tombol aksi utama di bagian header atas, tambahkan tombol *"Rekap Laporan"* dengan ikon dokumen/laporan yang mengarahkan pengguna ke `/incidents/reports`.

---

### Poin 3: Pembersihan Dead Code di `HalamanKegiatan.jsx`
- **Deskripsi Masalah**:
  - `HalamanKegiatan.jsx` mengimpor `downloadActivityReportPdf` dari `services/reportService`, tetapi fungsi tersebut tidak digunakan sama sekali di dalam kode komponen.
- **Dampak / Risiko**:
  - Menyebabkan *bundle bloat* dan potensi kebingungan tim pengembang (dead code).
- **Instruksi Solusi Konkret**:
  - Hapus import `downloadActivityReportPdf` yang tidak terpakai di `frontend/src/pages/HalamanKegiatan.jsx`.

---

### Poin 4: Proteksi Read-Only Murni Kru di `MobileKegiatan.jsx` & `MobileInsiden.jsx`
- **Deskripsi Masalah**:
  - Di antarmuka mobile, kru biasa masih disuguhkan form input dan tombol aksi mutasi penambahan kegiatan/insiden.
- **Dampak / Risiko**:
  - Membingungkan kru di lapangan dan berisiko memicu error HTTP 403 saat kru mencoba menekan tombol simpan yang ditolak oleh backend.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/pages/mobile/MobileKegiatan.jsx`:
    1. Ambil data role user dari context: `const { user } = useAuth(); const isLeader = ['admin', 'chief', 'chief_assistant'].includes(user?.role);`.
    2. Jika `!isLeader`:
       - Sembunyikan tombol `+ Tambah Kegiatan`.
       - Sembunyikan tombol aksi Edit / Hapus pada setiap kartu daftar kegiatan.
       - Tampilkan banner ringkas informatif di atas daftar kegiatan: *"Mode Pratinjau (Read-Only) - Log kegiatan operasional dikelola oleh Chief / Asisten Regu."*
  - Di `frontend/src/pages/mobile/MobileInsiden.jsx`:
    1. Jika `!isLeader`:
       - Sembunyikan tombol `+ Laporkan Insiden`.
       - Nonaktifkan/sembunyikan tombol pengubah status penyelesaian insiden.
       - Tampilkan badge Read-Only yang bersih.

---

## Instruksi Pelaporan Temuan Tambahan, Bug, Ide, & Saran
Apabila selama proses audit maupun perbaikan kode Anda menemukan:
- **Bug / Masalah Baru**: Error, glitch, atau cacat logika tambahan yang belum tercantum di tugas ini.
- **Risiko Keamanan / Integritas Data**: Celah otentikasi, potensi tabrakan data, atau regresi performa.
- **Ide / Saran Pengembangan**: Usulan optimasi UI/UX, efisiensi komponen, atau ide fitur yang relevan bagi operasional.

**ATURAN TINDAKAN**:
1. **Dilarang keras memodifikasi berkas di luar domain eksklusif Agent 4 secara sepihak.**
2. **Catat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporan Anda (`masak/temp/hasil_agent4.md`)** menggunakan format poin hierarkis:
   - **Judul Temuan / Ide**: Ringkasan topik.
   - **Deskripsi Masalah / Konsep**: Penjelasan detail teknis.
   - **Dampak / Manfaat**: Urgensi atau keuntungan bagi pengguna.
   - **Rekomendasi Tindak Lanjut**: Saran perbaikan konkret untuk diorkestrasi selanjutnya.

---

## Verifikasi & Pelaporan
1. Jalankan `node -c backend/src/controllers/activityController.js`.
2. Jalankan `node -c backend/src/controllers/incidentController.js`.
3. Jalankan `npm run build` di root frontend.
4. Tuliskan ringkasan hasil kerja secara mandiri di `masak/temp/hasil_agent4.md`.
