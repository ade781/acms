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

## Aturan Dokumentasi QA (`QA.md`) vs Riwayat QA (`RQA.md`)
- **Fungsi `QA.md` (Active Quality Assurance Tracker)**:
  - Berkas `QA.md` HANYA memuat daftar temuan audit aktif, bug terbuka (*open/pending*), atau item perbaikan teknis yang belum/sedang dikerjakan.
  - Setiap kali ada butir QA atau perbaikan arsitektur yang telah selesai dikerjakan, diuji, dan stabil, butir tersebut **WAJIB DIHAPUS dari `QA.md`** agar `QA.md` tetap ringkas, bersih, dan fokus pada sisa pekerjaan yang belum selesai.
- **Fungsi `RQA.md` (Riwayat Quality Assurance & Resolved Changelog)**:
  - Berkas `RQA.md` adalah arsip permanen untuk seluruh pekerjaan QA, refaktorisasi, unifikasi, dan resolusi bug yang telah selesai dikerjakan (*resolved / completed*).
  - Setiap butir temuan atau pekerjaan yang selesai dikerjakan dan dihapus dari `QA.md` **WAJIB DIPINDAHKAN dan dicatat ke dalam `RQA.md`** secara rapi, lengkap dengan konteks masalah, solusi konkret yang diambil, dan berkas/commit yang terpengaruh.

## Aturan Format Penulisan Nama File di Dokumentasi (Anti-Path Panjang)
- DILARANG menuliskan tautan path file absolut yang panjang dan berisik seperti `(file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/...)`.
- Cukup tuliskan **nama file saja** (misal: `pdfService.js` atau `backend/src/services/pdfService.js`) menggunakan format backtick kode markdown.

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
     1. Card 1: **PROFIL & KREDENSIAL** (Nama Lengkap, NIP, Tempat/Tanggal Lahir, Pendidikan Terakhir, Kualifikasi STKP, Nomor Lisensi STKP, Masa Berlaku STKP, tombol Edit Data, dan tombol Kunci Ubah Password).
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
17. **Default Status Kelaikan Kendaraan Berstatus Belum Dicek / Belum Dilaporkan**:
    - Default status kesiapan kendaraan operasional pada shift berjalan yang belum diperiksa oleh PIC armada adalah berstatus `belum_dilaporkan` (*Belum Dicek*).
    - Jika ada carry-over kerusakan (*unserviceable*) dari shift sebelumnya yang belum terselesaikan (`follow_up_status != 'resolved'`), status kendaraan otomatis terbawa sebagai `unserviceable` (rusak/kendala).
    - Kendaraan baru berstatus `serviceable` apabila PIC armada pada shift berjalan telah melakukan pemeriksaan kelaikan fisik operasional.
18. **Input Struktural Pejabat Department Head (Bukan Memilih dari Regu Operasional)**:
    - Jabatan Department Head (Dept. Head) adalah pimpinan struktural unit di atas 4 regu dinas operasional.
    - Data Department Head wajib DIINPUT mandiri (Nama Lengkap, NIP, Jabatan, dan Tanda Tangan), BUKAN dipilih dari daftar anggota regu operasional.
19. **Batasan Kuota Cuti (Maksimal 2 Cuti Berjalan) & Konsolidasi Paket Riwayat (Anti-Dobel)**:
    - Setiap anggota personel dibatasi maksimal memiliki **2 pengajuan cuti yang sedang/akan berjalan** (*active/upcoming leave*).
    - Untuk mengajukan cuti baru di atas kuota tersebut, anggota harus menunggu hingga tanggal cuti sebelumnya selesai terlewati atau membatalkan salah satu pengajuan cuti yang ada.
    - Sistem secara ketat menolak pengajuan tanggal cuti yang beririsan (*anti-overlap*).
    - Seluruh riwayat cuti disajikan dalam format **Paket Pengajuan Terpadu** (rentang tanggal, durasi hari, status berjalan/selesai) sehingga tidak memecah baris harian yang tampak dobel.
20. **Integritas Mutasi Regu & Larangan Pemindahan Personel Bertugas Aktif (Proteksi Data Penugasan)**:
    - Mutasi atau pemindahan regu personel (`team_group`) idealnya dilakukan saat personel berstatus *Off Duty* / Lepas Piket.
    - Sistem secara otomatis memblokir pemindahan regu (`team_group`), penonaktifan (`is_active = 0`), atau penghapusan personel jika yang bersangkutan sedang tercatat aktif bertugas di armada operasional atau posko pada shift yang sedang berjalan.
    - Jika ada kondisi darurat mutasi di tengah jam dinas aktif, Chief Regu wajib terlebih dahulu melepaskan atau mengganti slot penugasan personel tersebut di menu **Ploting Dinas** dan menekan tombol **"Simpan Ploting"**, sebelum Admin dapat memproses pemindahan regu di master data personel.

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
7. **Anti-Redundansi Metrik & Minimalisme Keterangan Armada (Karakteristik Baku Dashboard)**:
   - Dilarang membuat container/card KPI ringkasan yang mengulang informasi yang sudah ada di tabel matriks bawahnya (misal: jangan buat kartu KPI kesiapan armada terpisah jika di bawah sudah ada tabel kesiapan armada operasional yang lengkap).
   - Label keterangan armada wajib ringkas: Cukup nama kendaraannya saja (misal: "Foam Tender 1", "Rapid Intervention Vehicle", "Ambulance"). DILARANG menambahkan detail berlebihan yang tidak esensial seperti kategori "utama/pendukung" atau nomor plat jika nama kendaraan sudah jelas.
   - Posisi PIC Armada: Nama PIC diletakkan tepat di bawah nama kendaraan (sub-teks kecil), tanpa kolom keterangan panjang dan tanpa kolom jumlah kru, sehingga container armada menjadi ramping/kompak.
   - DILARANG KERAS menyelipkan teks slogan, asumsi, atau jargon filler seperti: *"Formasi regu dinas memenuhi SOP ICAO"*, *"Standar kesiapsiagaan area movement aman"*, *"Target Response: ≤ 180 detik"*, *"Kategori Bandara: CAT IX (ICAO)"*, atau yang sejenis. Fokus murni pada data UI dan fungsionalitas nyata.
   - ZERO DUMMY DATA secara mutlak untuk SELURUH AGENT (1 s.d. 5): Seluruh angka dan metrik wajib bersumber nyata dari API / database riil.
   - Halaman Dashboard TIDAK BOLEH dipasangi seksi/banner pengumuman dinas kecuali ada perintah eksplisit.
8. **Struktur Scorecard, Container Fix Ber-scroll, & Ragam Konsep Dashboard**:
   - **Scorecard Atas Tetap 4 Card**: Slot atas tetap menggunakan formasi 4 kartu metrik (misal: Regu Berdinas, Total Personel Aktif Unit / Dinas Shift Sekarang, Personel Izin/Cuti, dan Agenda/Insiden Shift).
   - **Penyajian Data Personel**: Menggunakan format gabungan seluruh regu (Total Seluruh Personel Aktif Unit / yang berdinas di shift aktif saat ini).
   - **Entitas Kesiapan Dinamis Termasuk Posko**: Menampilkan seluruh data operasional riil dari API (termasuk Watch Room / Posko Komunikasi). Data bersifat dinamis mengikuti array database (DILARANG hardcode jumlah kendaraan).
   - **Pemanfaatan Sisa Ruang (Container Ukuran Fix dengan Scroll)**: Sisa ruang kosong dari container armada yang ramping diisi dengan container/panel lain yang berukuran fix (pasti). Jika data di dalamnya panjang, wajib menggunakan container bervolume tetap dengan fitur scroll vertikal (`overflow-y-auto max-h-[...]`).
   - **Keanekaragaman Konsep Antar-Agent (Desain Variatif)**: Konsep Dashboard Agent 1, 2, 4, dan 5 TIDAK HARUS SAMA isinya. Setiap agen wajib menghadirkan keunikan tata letak (*layout*) dan variasi komponen pendukung operasional (misal: quick dispatch, timeline kegiatan, status radio posko, atau visualisasi rasio personel dinamis).
9. **PERINGATAN KERAS: DILARANG MEMBUAT FLOATING ACTION BAR NORAK / DESAIN UI SLOP**:
   - **Kasus Evaluasi Nyata**: Fitur dirty state penugasan/ploting yang dibuat melayang di bawah layar (*floating bottom bar* dengan `fixed bottom-6`, dot kedip `animate-ping`, pulse gradient merah-amber mencolok, serta teks bertumpuk *"Terdapat perubahan formasi ploting yang belum disimpan! Simpan Ploting"*) adalah **CONTOH KASUS FATAL DESAIN AI SLOP**.
   - Desain melayang semacam itu merusak estetika operasional, menutupi konten dan navigasi mobile, serta menciptakan tombol aksi ganda (*action button duplication*) yang melanggar aturan anti-redundansi.
   - **Standar Baku**: Indikator perubahan formasi/dirty state WAJIB terintegrasi secara alami dan tenang (*grounded*) pada tombol aksi yang SUDAH ADA di header atau toolbar utama (misal: dot aksen amber kecil statis di samping tombol simpan, atau status tombol yang berubah warna tenang).
   - Proteksi pencegahan data hilang dijalankan secara hening melalui route guard browser (`window.onbeforeunload` dan konfirmasi navigasi), BUKAN dengan memunculkan banner mengambang norak di tengah layar pandang pengguna.

## Protokol Orkestrasi & Pembagian Tugas 5 Agent (Agent 1 - 5)
- **Kewenangan Penuh Orkestrator**:
  - Orkestrator bebas membagi butir pekerjaan apa pun kepada Agent 1 s.d. 5, dengan syarat mutlak: pembagian tugas tidak boleh bertabrakan dan berkas terisolasi (*zero file collision*).
- **Prosedur Wajib Setiap Penugasan Agent**:
  Setiap kali pengguna menyuruh untuk menugaskan agent, Pengawas WAJIB menjalankan 3 langkah ini:
  1. **Ganti total isi berkas `task_agent1.md` s.d. `task_agent5.md` (dan `taskagent.md`) dengan instruksi baru**: Semua instruksi lama WAJIB dihapus bersih, jangan ditumpuk dengan riwayat lama agar agen fokus 100% hanya pada tugas baru saat ini.
  2. **Kosongkan berkas `hasil_agent` di folder temp (`masak/temp/hasil_agent1.md` s.d. `masak/temp/hasil_agent5.md`)**: Berkas lama dikosongkan bersih, dan agen diinstruksikan untuk menuliskan hasil kerjanya secara mandiri di berkas tersebut.
  3. **Wajib Memuat Deskripsi Masalah & Dampak Risiko**: Setiap butir tugas di dalam `task_agent1.md` s.d. `task_agent5.md` dan `taskagent.md` WAJIB menguraikan:
     - **Deskripsi Masalah**: Penjelasan teknis mengenai kode/logika/UI yang keliru saat ini.
     - **Dampak / Risiko**: Dampak nyata terhadap operasional, integritas data, atau pengguna jika masalah dibiarkan.
     - **Instruksi Solusi Konkret**: Panduan teknis presisi langkah demi langkah perbaikan yang harus dieksekusi agen. Hal ini krusial agar agen memahami konteks penuh dan tidak salah mengambil keputusan teknis.
  4. **Kanal Terbuka untuk Temuan, Bug, Ide, & Saran Tambahan**: Setiap lembar penugasan WAJIB menginstruksikan agen: Apabila selama proses audit atau eksekusi agen menemukan kelemahan sistem lain, bug tersembunyi, celah logika, ide pengembangan, atau saran optimasi UI/UX di luar tugas utamanya, agen DILARANG mengubah kode di luar domainnya secara sepihak. Agen WAJIB mencatat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporannya (`masak/temp/hasil_agent*.md`) agar dapat dievaluasi dan ditugaskan oleh Pengawas bersama Pengguna pada iterasi berikutnya.
  5. **Wajib Menugaskan Seluruh Butir Temuan Secara Lengkap & Menyeluruh (Anti-Penugasan Singkat / Anti-Sampel Parsial)**:
     - Saat mendistribusikan tugas audit dari `QA.md`, Supervisor DILARANG KERAS hanya memilih sebagian kecil temuan (sampel singkat) dan meninggalkan temuan lainnya tanpa kejelasan.
     - Seluruh butir temuan yang masih terbuka (*open/pending*) di `QA.md` WAJIB dipetakan dan ditugaskan secara tuntas, rinci, dan berbobot ke dalam 5 domain agent pelaksana (Agent 1 s.d. 5) sehingga tidak ada item QA yang tercecer atau terbengkalai.
- **Protokol 4 Fase Siklus Orkestrasi**:
  1. **Fase 1 (Audit & Inventarisasi)**: Seluruh agen menyisir domain untuk menemukan kesalahan tanpa modifikasi kode produksi, dan mencatatnya ke `masak/temp/hasil_agent*.md`.
  2. **Fase 2 (Persetujuan / ACC Pengguna)**: Pengawas merekap dan mempresentasikan seluruh temuan kepada pengguna untuk disetujui / diselaraskan.
  3. **Fase 3 (Eksekusi Perbaikan Terisolasi)**: Pengawas memperbarui `taskagent.md` dan `task_agent1.md` s.d. `task_agent5.md` dengan daftar aksi perbaikan konkret baru (memuat masalah, dampak, dan solusi), mengosongkan `masak/temp/hasil_agent*.md`, lalu mengarahkan agen mengeksekusi perbaikan.
  4. **Fase 4 (Verifikasi & Laporan Akhir)**: Setiap agen mengisi `masak/temp/hasil_agent*.md` secara mandiri dengan hasil eksekusi dan bukti pengujian CLI (`npm run build`, `node -c`).

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

## Standar Format Laporan Temuan & Komunikasi (Anti-Tabel / Anti-Matriks)
- **DILARANG Menggunakan Tabel atau Matriks Markdown:** Pengguna tidak menyukai dan kesulitan membaca format tabel markdown atau matriks lebar di layar.
- **Wajib Format Poin Hierarkis Vertikal:** Seluruh inventarisasi temuan di `masak/temp/hasil_agent*.md` maupun respon rangkuman pengawas WAJIB disajikan menggunakan format poin-poin bernomor / bullet points bertingkat dengan judul tebal yang jelas, terpisah rapi per poin masalah, dampak risiko, dan rekomendasi solusi konkret.
