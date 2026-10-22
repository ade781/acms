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

## Aturan Pengelolaan Database & Folder Kerja Khusus (`masak/`)
- **Fungsi Folder `masak/` (Sandbox / Workroom Database):**
  - Folder `masak/` adalah area kerja khusus untuk mengolah dan mengedit database, menjalankan skrip coba-coba, manipulasi data, testing ad-hoc, maupun pengujian query.
  - Folder `masak/` telah didaftarkan ke dalam `.gitignore` sehingga bebas digunakan tanpa mengotori repositori git.
  - Setiap kali membutuhkan skrip pemrosesan sementara atau pengujian data, tempatkan seluruh berkas tersebut di dalam folder `masak/`.
- **Integritas Berkas Produksi:**
  - Dilarang membuat skrip pemrosesan sementara atau seeder sekali jalan di dalam folder produksi `backend/src/` atau `frontend/src/`.
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

