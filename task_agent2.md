# LEMBAR TUGAS AGENT 2: MODUL PERSONEL, CUTI, & LENCANA STKP

## Domain Berkas Eksklusif
- `frontend/src/pages/HalamanPersonel.jsx`
- `frontend/src/components/CutiModal.jsx`
- `backend/src/controllers/personnelController.js`

---

## Rincian Butir Tugas

### Poin 1: Lencana Indikator Kedaluwarsa Lisensi STKP di `HalamanPersonel.jsx`
- **Deskripsi Masalah**:
  - Pada katalog personel (`HalamanPersonel.jsx`), masa berlaku lisensi STKP (`stkp_expiry_date`) hanya ditampilkan sebagai tanggal teks polos tanpa indikator visual urgensi jika lisensi mendekati habis atau sudah kedaluwarsa.
- **Dampak / Risiko**:
  - Pimpinan regu dan admin gagal mengantisipasi masa berlaku lisensi kru yang akan habis, berisiko menugaskan personel dengan lisensi kedaluwarsa yang melanggar regulasi keselamatan penerbangan (KP / ICAO).
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/pages/HalamanPersonel.jsx`:
    1. Hitung sisa hari dari hari ini: `const diffDays = Math.ceil((new Date(person.stkp_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));`.
    2. Tampilkan badge status STKP yang jelas dan kontras:
       - **Expired / Kedaluwarsa** (jika `diffDays <= 0`): Badge merah pekat (`bg-red-500/20 text-red-400 border border-red-500/30`) bertuliskan *"Kedaluwarsa"*.
       - **Hampir Kedaluwarsa** (jika `0 < diffDays <= 60`): Badge amber/kuning (`bg-amber-500/20 text-amber-400 border border-amber-500/30`) bertuliskan `Hampir Habis (${diffDays} hari)`.
       - **Aktif / Berlaku** (jika `diffDays > 60`): Badge hijau netral (`bg-emerald-500/20 text-emerald-400 border border-emerald-500/30`) bertuliskan *"Aktif"*.

---

### Poin 2: Validasi Tanggal Bentrok pada Pengajuan Cuti di `CutiModal.jsx`
- **Deskripsi Masalah**:
  - Di `CutiModal.jsx`, input tanggal mulai dan tanggal selesai belum memiliki validasi klien yang ketat. Pengguna bisa memilih tanggal mulai yang lebih besar daripada tanggal selesai atau memilih tanggal yang tumpang-tindih sebelum mengirimkan request ke server.
- **Dampak / Risiko**:
  - Request gagal dengan error dari backend atau data rentang cuti menjadi anomali (tanggal minus) jika lolos, membingungkan pengguna yang sedang mengajukan cuti.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/components/CutiModal.jsx`:
    1. Tambahkan pengecekan sebelum submit: jika `new Date(startDate) > new Date(endDate)`, segera tampilkan pesan toast peringatan error instan: *"Tanggal mulai cuti tidak boleh melebihi tanggal selesai"*.
    2. Batasi atribut `min` pada input tanggal selesai agar otomatis bernilai minimal sebesar `startDate`.

---

### Poin 3: Penguatan Proteksi Mutasi Personel Bertugas Aktif di `personnelController.js`
- **Deskripsi Masalah**:
  - Mutasi regu (`team_group`), penonaktifan (`is_active = 0`), atau penghapusan personel berpotensi dilakukan saat personel masih tercatat aktif di ploting kendaraan shift yang sedang berjalan.
- **Dampak / Risiko**:
  - Terjadi anomali foreign key dan kekosongan slot kru armada secara tiba-tiba di tengah dinas aktif bandara (*data integrity crash*).
- **Instruksi Solusi Konkret**:
  - Di `backend/src/controllers/personnelController.js`:
    1. Pada handler update/delete personel, lakukan pengecekan ke tabel `shift_assignments` pada shift dinas aktif saat ini.
    2. Jika personel tersebut sedang aktif bertugas di kendaraan operasional atau posko pada shift yang sedang berjalan dan dicoba diubah regunya atau dinonaktifkan:
       - Kembalikan HTTP 400 Bad Request dengan pesan: *"Personel sedang aktif bertugas pada shift dinas saat ini. Lepaskan penugasan di menu Ploting terlebih dahulu sebelum melakukan mutasi/penonaktifan."*

---

## Instruksi Pelaporan Temuan Tambahan, Bug, Ide, & Saran
Apabila selama proses audit maupun perbaikan kode Anda menemukan:
- **Bug / Masalah Baru**: Error, glitch, atau cacat logika tambahan yang belum tercantum di tugas ini.
- **Risiko Keamanan / Integritas Data**: Celah otentikasi, potensi tabrakan data, atau regresi performa.
- **Ide / Saran Pengembangan**: Usulan optimasi UI/UX, efisiensi komponen, atau ide fitur yang relevan bagi operasional.

**ATURAN TINDAKAN**:
1. **Dilarang keras memodifikasi berkas di luar domain eksklusif Agent 2 secara sepihak.**
2. **Catat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporan Anda (`masak/temp/hasil_agent2.md`)** menggunakan format poin hierarkis:
   - **Judul Temuan / Ide**: Ringkasan topik.
   - **Deskripsi Masalah / Konsep**: Penjelasan detail teknis.
   - **Dampak / Manfaat**: Urgensi atau keuntungan bagi pengguna.
   - **Rekomendasi Tindak Lanjut**: Saran perbaikan konkret untuk diorkestrasi selanjutnya.

---

## Verifikasi & Pelaporan
1. Jalankan `node -c backend/src/controllers/personnelController.js`.
2. Jalankan `npm run build` di root frontend.
3. Tuliskan ringkasan hasil eksekusi secara mandiri di `masak/temp/hasil_agent2.md`.
