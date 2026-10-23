# PANDUAN TUGAS: AGENT 4 - MOBILE KEGIATAN RUTIN & PELAPORAN INSIDEN OPERASIONAL (CHIEF / ASISTEN)

## Peran & Batasan Tanggung Jawab
Agent 4 bertindak sebagai **Spesialis Logbook Kegiatan Rutin & Manajemen Insiden Mobile**. Bertanggung jawab penuh membangun dua modul operasional krusial bagi Komandan Regu (Chief / Asisten): Tab Kegiatan (`MobileKegiatan.jsx`) dan Tab Insiden (`MobileInsiden.jsx`), beserta modal pencatatan kegiatan dengan foto dokumentasi, dan formulir pelaporan kejadian darurat dengan foto bukti fisik.
- **DILARANG** menyentuh komponen shell luar (`MobileLayout`, `MobileHeader`, `MobileBottomNav`) agar tidak tabrakan dengan Agent 1.
- **DILARANG** mengutak-atik halaman dashboard atau kesiapan tugas PIC (Tugas Agent 2).
- **DILARANG** mengutak-atik halaman ploting 8 unit armada / crew picker (Tugas Agent 3).
- **DILARANG** mengutak-atik halaman laporan shift dinas / modal audit trail (Tugas Agent 5).
- **WAJIB** mematuhi aturan baku di [`GEMINI.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/GEMINI.md), dokumen kebutuhan resmi [`DOK. PEMBUATAN APLILASI OPS ARFF 2026.docx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/DOK.%20PEMBUATAN%20APLILASI%20OPS%20ARFF%202026.docx), dan prototype [`masak/mobile/tipe_2_chief.html`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/mobile/tipe_2_chief.html).

---

## Berkas yang Dikelola oleh Agent 4 (Eksklusif)
1. `frontend/src/pages/mobile/MobileKegiatan.jsx`
2. `frontend/src/pages/mobile/MobileInsiden.jsx`
3. `frontend/src/components/mobile/activities/MobileActivityModal.jsx`
4. `frontend/src/components/mobile/activities/MobileActivityTimelineItem.jsx`
5. `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`
6. `frontend/src/components/mobile/incidents/MobileIncidentTimelineItem.jsx`
7. `frontend/src/components/mobile/incidents/MobileIncidentDetailModal.jsx`

---

## Standar Desain & Aturan Kritis (`GEMINI.md` & `DOK. PEMBUATAN APLILASI OPS ARFF 2026.docx`)

### A. Modul Kegiatan Rutin Shift Dinas (`MobileKegiatan.jsx`)
1. **8 Kategori Baku Operasional ARFF (Wajib Sesuai Dokumen Resmi)**:
   1. *Serah Terima Dinas*
   2. *Apel dan Briefing*
   3. *Pemeriksaan Kendaraan dan Fasilitas*
   4. *Pemeriksaan Kelengkapan Peralatan*
   5. *Kegiatan Latihan atau Drill*
   6. *Kegiatan Pemeliharaan*
   7. *Kegiatan Sosialisasi Keselamatan*
   8. *Catatan Khusus dan Kendala Operasional*
2. **Struktur Data Logbook Kegiatan**:
   - Tanggal & Waktu pelaksanaan (WIB).
   - Kategori kegiatan baku (badge warna netral/slate).
   - Judul kegiatan (singkat & jelas).
   - Nama-nama personel pelaksana yang terlibat.
   - Uraian kronologis pelaksanaan.
   - Hasil pelaksanaan & catatan khusus.
   - **Upload Foto Dokumentasi**: Input unggah foto bukti kegiatan (`image/*`) dengan preview gambar instan dan kompresi WebP.
3. **Linimasa Dinamis Shift Berjalan**:
   - Menampilkan kronologi kegiatan urut waktu (paling baru di atas).
   - Tombol mengambang (CTA): `+ Catat Kegiatan Shift` di posisi strategis jangkauan jempol (*thumb zone*).

### B. Modul Pelaporan & Pemantauan Insiden (`MobileInsiden.jsx`)
1. **10 Klasifikasi Baku Kejadian ARFF Sisi Udara (Wajib)**:
   1. *Aircraft Accident*
   2. *Aircraft Incident*
   3. *Kebakaran Gedung atau Terminal*
   4. *Kebakaran Fasilitas atau Objek Lain di Bandara*
   5. *Aircraft Go-Around*
   6. *Hewan Liar atau Wildlife Hazard*
   7. *Emergency atau Standby Operasional*
   8. *Temuan Gangguan Fasilitas*
   9. *Latihan atau Kegiatan Operasional*
   10. *Kejadian Lainnya*
2. **Struktur Data Formulir Pelaporan Insiden**:
   - Nomor Laporan Resmi: Dihasilkan otomatis (format: `INC-YYYY-XXXX`).
   - Waktu Kejadian (WIB).
   - Tingkat Prioritas: Kritis (Siaga I - Merah), Tinggi (Siaga II - Oranye), Sedang (Siaga III - Amber), Rendah (Info - Biru).
   - Klasifikasi kejadian baku.
   - Lokasi kejadian (Area Sisi Udara / Grid Map, misal: *Runway 11*, *Taxiway C*, *Apron B*).
   - Informasi Pesawat / Flight (Nomor registrasi pesawat & nomor penerbangan jika ada).
   - Uraian kronologis kejadian & Sumber informasi.
   - Tindakan penanganan operasional (aktivasi armada & kru).
   - Kondisi terakhir & Pihak yang dikoordinasikan.
   - Status tindak lanjut: *Selesai* / *Dalam Proses* / *Menunggu Tindak Lanjut*.
   - **Upload Foto Bukti Visual Insiden**: Input foto dokumentasi visual kejadian dari lapangan (`image/*`) dengan thumbnail preview.
3. **Detail Modal Insiden (`MobileIncidentDetailModal.jsx`)**:
   - Tampilan bersih untuk membaca kronologis lengkap insiden tanpa navigasi berpindah halaman.

---

## Rincian Tugas yang Wajib Dikerjakan

### 1. Bangun Tab `MobileKegiatan.jsx`
- Ambil daftar kegiatan shift berjalan dari API `/api/activities?date=...&shift=...`.
- Sediakan state kosong (*empty state*) elegan jika belum ada kegiatan yang dicatat: *"Belum ada kegiatan rutin yang dicatat pada shift ini"*.
- Pasang tombol aksi `+ Catat Kegiatan` yang membuka `MobileActivityModal`.

### 2. Kembangkan `MobileActivityModal.jsx`
- Form modal modal bersih dengan transisi instan tanpa efek backdrop-blur berat.
- Dropdown 8 kategori baku operasional.
- Input file foto dokumentasi dengan indikator status file dan tombol hapus foto sebelum disimpan.
- Kirim payload kegiatan ke endpoint `/api/activities` (mendukung `multipart/form-data` untuk pengunggahan foto).

### 3. Bangun Tab `MobileInsiden.jsx`
- Ambil riwayat insiden shift berjalan dari API `/api/incidents?date=...&shift=...`.
- Tampilkan kartu ringkasan jumlah insiden dan prioritas siaga aktif.
- Daftar kartu insiden dengan indikator siaga berwarna tegas.
- Tombol aksi `+ Lapor Insiden Baru` membuka `MobileIncidentModal`.

### 4. Kembangkan `MobileIncidentModal.jsx` & `MobileIncidentDetailModal.jsx`
- Form modal laporan insiden lengkap dan nyaman diketik pada ponsel pintar.
- Input tingkat prioritas, lokasi kejadian airside, nomor penerbangan opsional.
- Input file foto bukti insiden di lapangan.
- Kirim payload laporan kejadian ke endpoint `/api/incidents` (mendukung `multipart/form-data`).

---

## Kriteria Selesai Agent 4
- Tab Kegiatan berhasil menampilkan linimasa aktivitas shift dengan 8 kategori baku resmi.
- Modal pencatatan kegiatan berhasil menyimpan logbook beserta foto dokumentasi ke database backend.
- Tab Insiden menampilkan daftar kejadian dengan 10 klasifikasi baku dan badge tingkat siaga.
- Modal pelaporan insiden berhasil menyimpan laporan lengkap beserta foto bukti lapangan.
- Kompilasi `npm run build` sukses 0 error.
