# Instruksi & Konfigurasi Khusus Proyek ACMS (ARFF YIA)

## Kredensial Administrator Awal (Pusat)
- **Username:** `aaa`
- **Password:** `aaaaaa`
*Catatan Keamanan:* Kredensial ini HANYA digunakan oleh sistem/agent ketika ada instruksi tugas administratif atau seeder database. DILARANG KERAS menampilkan kredensial ini secara terbuka/eksplisit di antarmuka (UI) Halaman Login maupun halaman lainnya.

## Prinsip Teks & Konten UI (Anti-Asumsi / Anti-Slop)
- Jangan menambahkan slogan, jargon, atau teks filler yang tidak diminta pengguna (misal: "SOP ICAO & PKP-PK", "Kesiapan Armada & Penugasan Shift Berkelanjutan", "sesuai SOP keamanan bandara").
- Tampilkan hanya data operasional riil yang diminta dan relevan.

## Aturan Git & Commit
- DILARANG KERAS melakukan `git commit` dan `git push` secara otomatis.
- Jalankan commit dan push HANYA jika ada perintah/permintaan eksplisit dari pengguna.

## Koreksi Diri & Aturan Anti-Kesalahan (Lessons Learned)
1. **Dilarang Menuliskan Tombol Aksi / Keterangan Dobel (Anti-Redundansi UI)**:
   - Dilarang membuat tombol aksi yang sama dua kali dalam satu halaman (misal: tombol "Simpan Draf Ploting" di dalam banner info dan di header tabel sekaligus). Satu aksi wajib memiliki tepat satu tempat yang jelas dan intuitif.
   - Dilarang mengulang teks petunjuk yang sama di dalam banner dan di sub-judul komponen secara bertumpuk.
2. **Penghapusan Fitur Sahkan Shift (Sistem Tanpa Pengesahan Manual)**:
   - Fitur tombol "Sahkan Shift" dihilangkan secara menyeluruh dari sistem (baik mobile, admin, maupun web desktop). Laporan dinas bersifat transparan dan otomatis terekapitulasi dari data operasional shift yang berjalan tanpa memerlukan tombol penguncian/pengesahan manual.
3. **Dilarang Over-Engineering / Menambah Dashboard Pecahan**:
   - Dilarang membuat banyak varian dashboard terpisah (seperti Dashboard Ops, Fleet, Personnel) yang memecah konsentrasi pengguna dan membuat navigasi berantakan. Jaga antarmuka tetap satu pintu, terpadu, ringkas, dan fokus pada operasional riil.
4. **Dilarang Hardcode Data Pejabat / Pimpinan**:
   - Dilarang menuliskan nama pejabat (seperti Dept. Head atau Ketua Regu) secara hardcoded di kode/tampilan (misal: teks statis "TAMSUL SADIKIN"). Semua nama dan jabatan penandatangan wajib ditarik dinamis dari database sesuai shift dan wewenang yang berlaku.
5. **Dilarang Mengasumsikan Identitas Pengesah dari User yang Sedang Login**:
   - Di laporan atau dokumen resmi, nama "Ketua Regu" harus mencerminkan supervisor yang memimpin shift tersebut di database, BUKAN nama user siapa saja yang kebetulan sedang membuka layar browser saat itu.
6. **Integritas Penugasan vs Cuti (Cegah Tabrakan Data)**:
   - Saat personel dicatat cuti/izin, penugasan personel tersebut pada kendaraan operasional wajib otomatis dilepas agar tidak memicu error tabrakan data (satu orang bertugas ganda) di backend.
7. **Integrasi Menyeluruh Dokumen & Aset Digital (No Half-Baked Features)**:
   - Jika fitur upload tanda tangan digital disediakan, maka tanda tangan tersebut WAJIB terpasang nyata di dokumen resmi cetak (PDF), tidak boleh dibiarkan hanya tersimpan di database sementara PDF masih mencetak titik-titik kosong `( ...... )`.
8. **Pembersihan Kode Mati (No Dead Code)**:
   - Setiap kali memindahkan fungsi atau tombol antar-halaman, segera bersihkan handler lama, state yang tidak terpakai, dan sisa referensi agar tidak menimbulkan dead code atau potensi `ReferenceError`.
9. **Keseragaman Akses Profil Mandiri di Header Atas (Anti-Tercecer UI/UX)**:
   - Akses Profil Pribadi, data kredensial STKP, dan arsip dokumen kepegawaian di seluruh role (Admin, Chief, Kru) wajib **SERAGAM ditempatkan di Header Atas (*Top App Bar*)** melalui avatar / ikon profil pengguna.
   - Navigasi bawah (*Bottom Navigation Bar*) HANYA untuk alur operasional dinas utama (Tugas, Cuti, Posko, Ploting, Kegiatan, Insiden, Laporan). Dilarang memasukkan menu Profil ke dalam Bottom Bar Kru maupun Chief.
   - Tampilan profil wajib menggunakan layout kartu baku yang seragam:
     1. Card 1: **PROFIL & KREDENSIAL** (Nama Lengkap, NIP, Tempat/Tanggal Lahir, Pendidikan Terakhir, Golongan Darah, Kualifikasi STKP, Nomor Lisensi STKP, Masa Berlaku STKP, tombol Edit Data, dan tombol Kunci Ubah Password).
     2. Card 2: **DOKUMEN & SERTIFIKAT SAYA** (Arsip ijazah/STKP/diklat, tombol `+ Upload Dokumen`, dan list berkas PDF terunduh).
   - Profil dibuka sebagai tampilan layar/halaman penuh (*sub-view*) yang nyaman dan bersih, bukan sekadar pop-up modal sempit yang terpotong.
10. **Wajib Umpan Balik Visual Instan (Feedback Toast / Notification) pada Setiap Aksi Pengguna**:
    - Setiap aksi interaktif pengguna (seperti Simpan Ploting, Ajukan Cuti, Batalkan Cuti, Simpan Kesiapan PIC, Catat Kegiatan, Lapor Insiden, Edit Profil, dll.) WAJIB memunculkan notifikasi/toast visual yang jelas dan seketika (indikator Berhasil hijau atau Gagal merah beserta pesan error spesifik jika ditolak server).
    - Dilarang keras membiarkan aksi selesai hening (*silent action*) tanpa umpan balik, sehingga pengguna bingung apakah datanya sudah tersimpan atau gagal.
11. **Integritas Interaktivitas Fitur Cuti (Anti-Macet / Must Be Clickable)**:
    - Seluruh tombol dan alur pengajuan/pembatalan cuti (di Dashboard, Ploting, maupun modal kru) WAJIB berfungsi responsif dan dapat diklik (*clickable*).
    - Modal cuti wajib terbuka mulus, pilihan personel dan alasan cuti harus terisi dinamis, serta status perubahan cuti langsung terrefleksi di UI seketika.
12. **Katalog Personel Fokus pada 4 Regu Dinas**:
    - Katalog data personel operasional (baik di desktop maupun mobile) sengaja difokuskan 100% pada 4 regu dinas operasional (Alpha, Bravo, Charlie, Delta).
    - Tidak perlu menambahkan tab, filter, atau kartu khusus untuk personel non-shift atau Dept. Head di dalam katalog regu operasional.
13. **Halaman Dashboard Dikosongkan (Status Coming Soon)**:
    - Halaman dashboard (`frontend/src/pages/HalamanDashboard.jsx`) dikosongkan dan HANYA menampilkan tulisan 'Coming Soon'.
    - DILARANG KERAS mengubah, mengisi kembali, atau menambahkan widget/komponen pada halaman dashboard kecuali ada instruksi eksplisit dari pengguna.
14. **Konsistensi Laporan Mobile vs Desktop & Larangan Duplikasi Fungsi Mirip (Single Source of Truth / DRY)**:
    - Dilarang membuat 2 fungsi/logika terpisah untuk hal yang tujuannya sama antara desktop dan mobile (seperti penarikan data laporan atau generator dokumen).
    - Seluruh fungsi bisnis yang serupa wajib disatukan ke dalam satu modul helper/service terpadu agar hemat kode, mudah dirawat, dan menjamin konsistensi output data.
15. **Logika Hak Kelola Cuti (Pemisahan Pengajuan Mandiri vs Kelola Admin)**:
    - Pengajuan cuti adalah hak prerogatif personel (*self-service*).
    - Admin DILARANG memiliki tombol untuk mengajukan cuti anggotanya ("Tambah Cuti Shift Ini" di admin dinilai tidak logis).
    - Peran Admin pada modul cuti murni sebagai pengawas & pengelola: **Read (Melihat daftar cuti), Edit (Menyesuaikan status), dan Delete / Batal (Membatalkan/Menghapus)**.
16. **Autentikasi Pengunduhan / Pratinjau Berkas Lampiran**:
    - Seluruh endpoint file/attachment di backend wajib mendukung autentikasi fleksibel: baik melalui header `Authorization: Bearer <token>` maupun fallback query parameter `?token=...` agar pembukaan berkas via tab baru/link browser tidak menghasilkan error HTTP 401 Unauthorized.
17. **Default Status Kelaikan Kendaraan Tetap Serviceable**:
    - Default status kesiapan kendaraan operasional pada shift berjalan MEMANG berstatus `serviceable` (siap operasi penuh).
    - Status hanya berubah jika ada carry-over kerusakan (*unserviceable*) dari shift sebelumnya yang belum terselesaikan, atau PIC armada secara sadar mengubahnya menjadi `unserviceable` disertai catatan kendala.
18. **Input Struktural Pejabat Department Head (Bukan Memilih dari Regu Operasional)**:
    - Jabatan Department Head (Dept. Head) adalah pimpinan struktural unit di atas 4 regu dinas operasional.
    - Data Department Head wajib DIINPUT mandiri (Nama Lengkap, NIP, Jabatan, dan Tanda Tangan), BUKAN dipilih dari daftar anggota regu operasional.

## Aturan Pengelolaan Database & Folder Kerja Khusus (`masak/`)
- **Fungsi Folder `masak/` (Sandbox / Workroom Database & Testing):**
  - Folder `masak/` adalah area kerja khusus untuk mengolah dan mengedit database, menjalankan skrip coba-coba, manipulasi data, testing ad-hoc, maupun pengujian query dan skrip tes integrasi.
  - Folder `masak/` telah didaftarkan ke dalam `.gitignore` sehingga bebas digunakan tanpa mengotori repositori git.
  - Setiap kali membutuhkan skrip pemrosesan sementara atau pengujian data/integrasi, tempatkan seluruh berkas tersebut di dalam folder `masak/`.
- **Integritas Berkas Produksi & Larangan Folder Test di Root/Produksi:**
  - Dilarang membuat skrip pemrosesan sementara atau seeder sekali jalan di dalam folder produksi `backend/src/` atau `frontend/src/`.
  - **DILARANG KERAS membuat folder `tests/` atau skrip pengujian di dalam `backend/` atau `frontend/` atau root proyek.** Seluruh skrip uji coba dan testing WAJIB ditempatkan di dalam folder `masak/`.
  - Definisi struktur tabel dan skema baku sistem tetap dicatat secara permanen di [`backend/src/config/schema.sql`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/backend/src/config/schema.sql).
  - Jika membutuhkan dump SQL atau data dari pengguna, mintakan langsung kepada pengguna dan olah di dalam folder `masak/`.

## Standar & Preferensi Desain UI Pengguna (Anti-AI-Slop)
Berdasarkan feedback eksplisit pengguna:
1. **Pondasi Desain Terbaik (Favorit)**:
   - Mengacu pada konsep **Login #2**: Card mengambang di tengah (centered floating card) yang grounded, elegan, dan proporsional.
   - Menggunakan warna dasar dark stone/charcoal natural dengan sentuhan hangat oranye-merah/amber (warm amber-ember) khas ARFF yang subtle, BUKAN merah mencolok atau pink berlebihan.
   - DILARANG KERAS menambahkan efek GLOW (seperti orbs ambient blur-3xl, radial-gradient spotlight, atau colored box-shadow). Card harus bersih, tajam, dan grounded.
2. **Dilarang Keras Memasang Footer di Halaman Login**:
   - Halaman login tidak boleh menggunakan footer (aneh dan mengganggu fokus). Tampilan login harus bersih dan terpusat.
3. **Dilarang Efek AI Slop & Glow Berlebihan (Benci Gaya #1 & #5)**:
   - Dilarang membuat efek neon glow/ambient berlebihan, glassmorphism murahan bertumpuk, atau badge teknologi generik yang membuat tampilan terkesan template AI murahan.
4. **Dilarang Layout Kaku / Brutalist Monospace Aneh (Benci Gaya #3)**:
   - Dilarang membuat layout kaku, blueprint garis 1px tanpa kurva, atau font monospace teknikal yang terasa seperti terminal kuno.
5. **Dilarang Gimmick Berlebihan & Komponen Tidak Masuk Akal (Benci Gaya #4)**:
   - Dilarang memasang tombol pemilih peran (Admin/Chief/PIC) pada form login.
   - Dilarang menampilkan teks demo atau gimmick kepura-puraan.
   - Form login harus murni, fungsional, dan kredibel untuk operasional nyata (hanya NIP/Username, Password, tombol Masuk, dan link lupa sandi bila perlu).
6. **Desain Padat & Anti-Card Bersarang (Dense Ops Layout - Anti Cards Inside Cards)**:
   - Dilarang membungkus setiap baris personel ke dalam kartu kotak tebal berulang-ulang (*nested cards bloat*).
   - Gunakan layout daftar baris kompak (*compact flat rows*) dengan divider halus 1px agar 3–4 unit armada dapat termonitor sekaligus dalam 1 layar pandang tanpa scrolling melelahkan.

## Protokol Orkestrasi & Pembagian Tugas 5 Agent (Agent 1 - 5)
- **Kewenangan Penuh Orkestrator**:
  - Setiap kali pengguna memberikan instruksi atau daftar koreksi/kesalahan, orkestrator berwenang penuh membagi dan menugaskan butir-butir pekerjaan kepada Agent 1 sampai 5 sesuai domain dan batas berkas eksklusif masing-masing.
  - Pembagian dilakukan secara terisolasi agar kelima agen dapat bekerja secara simultan/paralel tanpa tabrakan berkas (*zero file collision*).
- **Protokol 4 Fase Siklus Orkestrasi**:
  1. **Fase 1 (Audit & Inventarisasi)**: Seluruh agen menyisir domain untuk menemukan kesalahan tanpa modifikasi kode produksi, dan mencatatnya ke `masak/temp/hasil_agent*.md`.
  2. **Fase 2 (Persetujuan / ACC Pengguna)**: Pengawas merekap dan mempresentasikan seluruh temuan kepada pengguna untuk disetujui / diselaraskan.
  3. **Fase 3 (Eksekusi Perbaikan Terisolasi)**: Pengawas memperbarui `taskagent.md` dan `task_agent1.md` s.d. `task_agent5.md` dengan daftar aksi perbaikan konkret, mengosongkan `masak/temp/hasil_agent*.md`, lalu mengarahkan agen mengeksekusi perbaikan.
  4. **Fase 4 (Verifikasi & Laporan Akhir)**: Setiap agen mengisi `masak/temp/hasil_agent*.md` secara mandiri dengan hasil eksekusi dan bukti pengujian CLI (`npm run build`, `node -c`).
- **Kewajiban Sinkronisasi Berkas Tugas (`task_agent1.md` s.d. `task_agent5.md`)**:
  - Pada setiap instruksi pengguna, seluruh isi berkas tugas `task_agent1.md` sampai `task_agent5.md` serta `taskagent.md` WAJIB diperbarui secara berkala dan terdokumentasi rapi.

## Peran & Standar Kerja Agent Tipe Pengawas (Supervisor / Orchestrator Agent)
Sesi percakapan utama ini bertindak khusus sebagai **Pengawas / Orkestrator (Supervisor Agent)** yang memimpin jalannya operasional 5 agen pelaksana:

1. **Fungsi Utama Pengawas**:
   - **Komandan & Koordinator Pusat**: Berfungsi sebagai satu-satunya pintu penghubung langsung antara Pengguna (*User*) dan kelima agen pelaksana (*Agent 1 s.d. 5*).
   - **Delegasi Tugas Presisi (*Task Delegation*)**: Mengurai setiap perintah atau koreksi dari pengguna menjadi butir-butir tugas terisolasi, lalu menuliskannya ke berkas `task_agent1.md` s.d. `task_agent5.md` serta `taskagent.md` tanpa tumpang tindih berkas (*zero file collision*).
   - **Pemantauan Latar Belakang (*Live Background Monitoring*)**: Memantau aktivitas kerja kelima agen secara non-intrusif melalui transkrip percakapan mereka (`C:\Users\ad\.gemini\antigravity-ide\brain\<id>\...`), mengecek apakah ada agen yang macet, butuh input, atau sudah selesai.
   - **Konsolidasi Laporan (*Consolidated Reporting*)**: Membaca, menyaring, dan menyajikan laporan temuan atau hasil perbaikan dari `masak/temp/hasil_agent*.md` kepada pengguna secara terstruktur, ringkas, dan jelas.
   - **Penjaga Aturan Baku (*Rule Enforcement*)**: Mengawal agar seluruh agen patuh 100% pada aturan `GEMINI.md` (Zero Dummy Data, proteksi shift dinas, feedback toast instan, anti-lag form, seluruh pengujian di `masak/`).
   - **Penanganan Kebuntuan / Bug Kritis (*Emergency Intervention*)**: Hanya turun tangan langsung menyentuh kode jika ada error fatal lintas domain yang memblokir alur aplikasi (seperti `ReferenceError` yang memicu HTTP 500) atau bila ada perintah eksplisit dari pengguna.

2. **Larangan & Batasan Ketat Pengawas (Anti-Pola)**:
   - **DILARANG Mengambil Alih Eksekusi Domain Agen Secara Sepihak**: Pada alur normal, biarkan kelima agen spesialis yang mengeksekusi perbaikan kode di jendela/sesinya masing-masing.
   - **DILARANG Mengisi Berkas `masak/temp/hasil_agent*.md`**: Berkas laporan di `masak/temp/` dikhususkan untuk diisi secara mandiri oleh masing-masing agen pelaksana (Agent 1 s.d. 5) setelah selesai mengeksekusi tugas.
   - **DILARANG Git Commit / Push Otomatis**: Commit hanya dijalankan atas instruksi eksplisit pengguna.
   - **DILARANG Menjalankan Browser Automation (`browser_subagent`)**: Seluruh verifikasi kode wajib melalui CLI terminal (`node -c`, `npm run build`).

## Aturan Hak Akses Ploting Shift & Efisiensi Request Server
1. **Proteksi Hak Akses Ploting Berdasarkan Shift Dinas ("Bukan Shift Anda")**:
   - Halaman Ploting hanya dapat diakses dan diubah oleh Chief / Asisten Chief / Personel yang regunya bertugas aktif pada shift tersebut (atau Admin/Dept Head).
   - Jika user sedang tidak berdinas atau shift yang aktif bukan shift regunya, halaman Ploting WAJIB menolak rendering form armada dan menampilkan layar: *"Bukan Shift Dinas Anda"* (disertai penjelasan bahwa operasional sedang dipimpin oleh regu yang bertugas aktif).
   - Dalam kondisi bukan shift user, sistem DILARANG melakukan request fetch data ploting berat ke server demi menghemat bandwidth dan sumber daya server.
2. **Simpan Ploting Bersifat Eksplisit (Anti-Spam Request / No Auto-Save)**:
   - Seluruh perubahan penempatan kru di halaman Ploting wajib dikelola murni pada state lokal frontend.
   - Perubahan HANYA disimpan ke database server ketika pengguna secara sadar menekan tombol "Simpan Ploting".
   - Dilarang keras membuat fungsi auto-save per pemilihan slot kru karena membebani jaringan dan database.

