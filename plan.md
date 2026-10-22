# Rencana Implementasi & Spesifikasi Batasan Role & Tampilan (RBAC) ACMS ARFF YIA

Dokumen ini mendefinisikan arsitektur sistem pembagian 2 antarmuka (**Tampilan Mobile Web App 📱** vs **Tampilan Desktop 💻**), matriks hak akses resmi (*Role-Based Access Control*), serta cetak biru desain layout mobile berbasis standar `GEMINI.md` dan prinsip `antislop`.

---

## 1. Pembagian Platform & Antarmuka Berdasarkan Role

Sistem dibagi menjadi **2 Antarmuka Utama** berdasarkan mobilitas kerja operasional nyata di Bandara YIA:

| Platform / Antarmuka | Role yang Menggunakan | Karakteristik & Lingkungan Penggunaan |
| :--- | :--- | :--- |
| **Tampilan Khusus Mobile 📱**<br>*(Mobile-First Web App)* | • **`chief`** (Ketua Regu)<br>• **`chief_assistant`** (Asisten Chief)<br>• **`senior_firefighter`** (Senior Kru / PIC)<br>• **`junior_firefighter`** (Kru Lapangan) | Web app berbasis browser HP yang dirancang *mobile-first* (bukan desktop yang dikecilkan). Mengutamakan navigasi jempol satu tangan (*one-hand thumb zone*), kartu tugas grounded, checklist fisik dengan kamera, dan minim ketikan. |
| **Tampilan Desktop 💻**<br>*(Command & Office Portal)* | • **`admin`** (Administrator Sistem)<br>• **`dept_head`** (Department Head) | Digunakan melalui PC/Laptop monitor lebar di kantor/ruang komando. Ditujukan untuk konfigurasi master armada bandara, manajemen akun, arsip dokumen, dan pengawasan roster makro. |

---

## 2. Matriks Hak Akses & Pembagian Fitur (Access Control Matrix)

> **Keterangan Platform:**
> - `[M]` = Diakses via Tampilan Mobile Web App
> - `[D]` = Diakses via Tampilan Desktop Portal

| No | Modul & Fitur Sistem | `admin` [D] | `dept_head` [D] | `chief` [M] | `chief_assistant` [M] | `senior_firefighter` [M] | `junior_firefighter` [M] |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **A** | **Master Kendaraan & Armada** | | | | | | |
| 1 | Lihat daftar armada & status kesiapan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Tambah, edit data teknis, & hapus armada | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **B** | **Manajemen Personel & Akun** | | | | | | |
| 3 | Lihat daftar personel & riwayat dinas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | Tambah personel baru & generate akun | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 5 | Hapus data personel | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 6 | Edit profil sendiri (NIP, lisensi, pendidikan) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | Edit profil orang lain / ubah jabatan & regu | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 8 | Reset password anggota | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 9 | Tetapkan pejabat Dept. Head definitif | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 10 | Tetapkan pejabat Chief per regu | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 11 | Unggah spesimen tanda tangan digital | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **C** | **Roster & Jadwal Dinas** | | | | | | |
| 12 | Lihat kalender jadwal dinas harian | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 13 | Ubah siklus pola shift harian (Alpha–Delta) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 14 | Atur pengecualian jadwal / libur (*override*) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 15 | Ubah tanggal patokan (*Anchor Date*) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **D** | **Ploting & Penugasan Armada (Shift)** | | | | | | |
| 16 | Lihat ploting kendaraan shift berjalan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 17 | Simpan / ubah ploting penugasan armada | ✅ | ✅ | ✅ *(Mobile)* | ✅ *(Mobile)* | ❌ | ❌ |
| 18 | Pengajuan izin / cuti mandiri | ✅ | ✅ | ✅ *(Mobile)* | ✅ *(Mobile)* | ✅ *(Mobile)* | ✅ *(Mobile)* |
| 19 | Kelola / catat cuti personel regunya | ✅ | ✅ | ✅ *(Mobile)* | ✅ *(Mobile)* | ❌ | ❌ |
| **E** | **Kesiapan Armada (*Vehicle Readiness*)** | | | | | | |
| 20 | Input checklist kesiapan & temuan armada | ✅ | ✅ | ✅ *(Semua)* | ✅ *(Semua)* | ✅ *(Khusus PIC)* | ✅ *(Khusus PIC)* |
| 21 | Verifikasi & tindak lanjut kendala armada | ✅ | ✅ | ✅ *(Mobile)* | ✅ *(Mobile)* | ❌ | ❌ |
| **F** | **Laporan Dinas & Dokumen Cetak** | | | | | | |
| 22 | Lihat rekap dinas harian & cetak PDF | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 23 | Sahkan Shift (*Approval* Resmi Laporan) | ✅ | ✅ | ✅ *(Mobile)* | ✅ *(Mobile)* | ❌ | ❌ |
| **G** | **Laporan Kegiatan Harian & Insiden** | | | | | | |
| 24 | Input, perbarui, atau hapus kegiatan harian | ✅ | ✅ | ✅ *(Mobile)* | ✅ *(Mobile)* | ❌ | ❌ |
| 25 | Laporkan insiden gawat darurat (*emergency*) | ✅ | ✅ | ✅ *(Mobile)* | ✅ *(Mobile)* | ❌ | ❌ |
| 26 | Kelola master kategori insiden | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **H** | **Papan Pengumuman Resmi (*Announcements*)** | | | | | | |
| 27 | Baca & unduh surat edaran / pengumuman | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 28 | Terbitkan pengumuman baru (PDF & teks) | ✅ | ✅ | ✅ *(Mobile)* | ✅ *(Mobile)* | ❌ | ❌ |
| 29 | Hapus pengumuman resmi | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Evaluasi Kritis & Hasil Audit Desain Mobile
*(Wajib dipatuhi agar saat desain diajukan tidak terjadi kesalahan atau asumsi fiktif)*

Berdasarkan telaah dokumen **`DOK. PEMBUATAN APLIKASI OPS ARFF 2026.docx`**, kode produksi [`HalamanDetailPersonel.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanDetailPersonel.jsx), serta arahan pengguna:

1. **Koreksi Fitur Upload Dokumen:**
   - **Bukan pada Form Cuti Lapangan**: Form pengajuan cuti/izin operasional murni mencatat tanggal mulai, tanggal selesai, dan jenis keterangan cuti tanpa input upload berkas yang membebani petugas.
   - **Fitur Upload Dokumen Berada di Profil Personel**: Sesuai hak akses personel (`isOwner` / `canUploadDoc`), anggota memiliki akses mandiri untuk:
     - Mengedit data pribadi: NIP, Tanggal Lahir, Pendidikan Terakhir, Tingkat Lisensi STKP (Basic/Junior/Senior), Nomor STKP, dan Masa Berlaku STKP.
     - **Mengunggah berkas dokumen pendukung resmi**: Sertifikat STKP, Ijazah Pendidikan, atau Sertifikat Pelatihan Tambahan (`/personnel/:id/documents`).

2. **Kewajiban Fasilitas & Pos Jaga "Watchroom":**
   - Dokumen resmi menegaskan: *Watchroom diperlakukan sebagai fasilitas operasional tersendiri yang wajib dimonitor setiap shift.*
   - Ploting penugasan wajib memuat operator jaga Watchroom.
   - Checklist kesiapan shift wajib memuat pemeriksaan fasilitas Watchroom (Perangkat Komunikasi Radio, Sarana Informasi & Pelaporan, Komputer/Sistem Pendukung).

3. **Ploting 4 Posisi Resmi & Wadah Personel "Tidak Hadir":**
   - Penempatan ploting resmi mencakup:
     1. **Kendaraan Utama** (*Foam Tender*)
     2. **Kendaraan Pendukung** (*Nurse Tender, RIV, Ambulance, Comm*)
     3. **Pos Watchroom** (Operator Komunikasi Posko)
     4. **Kategori Tambahan Personel Tidak Hadir** (dengan keterangan: *Cuti, Sakit, Dinas Luar, Tukar Dinas*).

4. **Status Awal Kesiapan Wajib "Belum Dilaporkan":**
   - Dokumen mewajibkan kendaraan & Watchroom yang belum diperiksa berstatus **Belum Dilaporkan** (Kuning/Netral), bukan otomatis dianggap *Serviceable*.
   - Status hanya berubah menjadi `Serviceable` (Hijau) atau `Unserviceable` (Merah) setelah PIC mengisi checklist.

5. **10 Kategori Baku Kejadian / Insiden Operasional:**
   - Wajib menggunakan 10 kategori resmi:
     1. *Aircraft Accident*
     2. *Aircraft Incident*
     3. *Kebakaran Gedung atau Terminal*
     4. *Kebakaran Fasilitas atau Objek Lain di Bandara*
     5. *Aircraft Go-Around*
     6. *Hewan Liar / Wildlife Hazard*
     7. *Emergency atau Standby Operasional*
     8. *Temuan Gangguan Fasilitas*
     9. *Latihan atau Kegiatan Operasional*
     10. *Kejadian Lainnya*

6. **Pencatatan Kegiatan Rutin Shift:**
   - Komandan regu wajib dapat mencatat kegiatan rutin: *Serah Terima Dinas*, *Apel & Briefing*, *Pemeriksaan Fasilitas & Peralatan*, *Latihan/Drill*, dan *Pemeliharaan Armada*.

7. **Standar Desain Bersih & Anti-Slop:**
   - Tema dasar **PUTIH BERSIH (*Light Theme*)**, kontras tinggi untuk siang hari bandara, bebas efek neon glow / ambient orbs.
   - Tanpa slider persentase fiktif (Air/Foam/DCP/BBM). Field kesiapan murni: `status`, `justification`, `notes`, dan foto bukti fisik WebP.

8. **Adaptasi Rasio Layar Modern 20:9 / 19.5:9 (Viewport Jangkung Modern):**
   - Rata-rata smartphone modern (Samsung Galaxy, Xiaomi, iPhone terkini) menggunakan rasio **20:9** (~393×852 px s.d. 412×915 px), bukan lagi 16:9 yang pendek dan lebar (360×640 px).
   - Penyesuaian layout mobile:
     - Lebar frame disesuaikan menjadi siluet ramping modern: `max-w-[412px]` atau `max-w-[393px]` (bukan `max-w-md` 448px yang terasa phablet jadul).
     - Pembagian *Thumb-Zone*: Area atas (1/3) khusus *Viewing Zone* (status ringkas), area tengah-bawah (2/3) untuk *Touch/Action Zone*.
     - Tombol aksi utama (CTA) diposisikan mengambang (*sticky*) di atas bottom navigation agar instan ditekan satu jempol.
     - Spacing vertikal lebih bernapas (`space-y-4` hingga `space-y-5`) tanpa efek terjepit 16:9.
     - Bottom Navigation Bar mendukung *safe-area-inset-bottom* (padding ekstra `pb-5`) agar aman dari *gesture bar* ponsel modern.

9. **Koreksi Fitur & Anti-Redundansi Operasional (Hasil Audit Komprehensif):**
   - **Koreksi 1 (Laporan PIC Murni):** PIC armada **hanya** mengisi status `serviceable` atau `unserviceable` (+ justifikasi wajib dan foto jika rusak). Dilarang membuat form checklist mekanik fiktif per-item.
    - **Koreksi 2 (Fitur Profil & Dokumen Chief Sama dengan Kru):** Fitur dokumen dan profil pada Chief disamakan persis dengan Kru dan modul manajemen personel (`HalamanDetailPersonel.jsx`):
      - Edit data pribadi mandiri: NIP, tanggal lahir, pendidikan, nomor STKP, masa berlaku lisensi.
      - Upload arsip dokumen pribadi resmi: Lisensi STKP, Sertifikat Diklat, MCU (Medical Check-Up), SK Tugas, dan Dokumen Lainnya.
      - *Catatan Pejabat:* Tanda tangan pejabat atasan (Dept Head, Supervisor, Admin) diatur terpusat di portal web Admin/Command, sehingga tidak perlu diurus atau ditampilkan di antarmuka mobile.
    - **Koreksi 2B (Watchroom Setara Penuh dengan Unit Kendaraan):**
      - Watchroom diperlakukan sama persis dan setara dengan 7 unit kendaraan operasional (Total 8 Unit: 7 Kendaraan + 1 Watchroom).
      - Status kesiapan Watchroom murni: `serviceable` vs `unserviceable` (tanpa checklist saklar terpisah).
      - Di halaman Ploting, Watchroom ditampilkan sebagai salah satu Plot Card operasional dengan Slot 0 sebagai Operator Utama/PIC.
    - **Koreksi 2C (Revisi Total Layout Ploting - Model Plot Card):**
      - Seluruh kendaraan dan watchroom ditampilkan per-unit dalam bentuk **Plot Card** berurutan (tanpa tab terpisah).
      - Slot 0 (paling atas) selalu terkunci sebagai **PIC / Pengemudi / Operator Utama**.
      - Slot 1 dst. sebagai Kru dengan tombol dinamis `+ Tambah Slot Kru` dan hapus slot.
      - Bagian bawah memuat wadah **Personel Tidak Hadir / Absen** (Cuti, Sakit, Tugas Luar, Tukar Dinas) dengan keterangan status.
- **Koreksi 3 (Pemisahan Tab Kegiatan vs Insiden & Penggabungan Ploting + Kesiapan):**
      - **5 Menu Bottom Bar Chief:**
        1. **Posko**: Status ringkas shift, kekuatan personel (15/17), status unit (7/8 siap), dan kartu tindak lanjut unit unserviceable.
        2. **Ploting**: Penggabungan **Ploting Personel & Kesiapan 8 Unit** (7 Kendaraan + 1 Watchroom) dalam bentuk Plot Cards operasional terpadu (Slot 0 FIX PIC, slot kru dinamis, toggle/inspeksi kesiapan `Serviceable`/`Unserviceable` langsung pada kartu unit, serta wadah Personel Tidak Hadir di bawah).
        3. **Kegiatan**: Khusus **Logbook Aktivitas Rutin Shift** murni merujuk pada **Dokumen Kebutuhan Modul 3 Bagian 3**:
           - **8 Kategori Baku**: 1. Serah Terima Dinas, 2. Apel dan Briefing, 3. Pemeriksaan Kendaraan dan Fasilitas, 4. Pemeriksaan Kelengkapan Peralatan, 5. Kegiatan Latihan atau Drill, 6. Kegiatan Pemeliharaan, 7. Kegiatan Sosialisasi Keselamatan, 8. Catatan Khusus dan Kendala Operasional.
           - **Field Data Lengkap**: Tanggal, Waktu (WIB), Kategori Baku, Judul Kegiatan, **Pelaksana** (personel yang terlibat), **Uraian Kegiatan**, **Hasil & Catatan Khusus**, serta **Lampiran / Foto Dokumentasi Kegiatan**.
        4. **Insiden**: Khusus **Pelaporan Insiden & Kejadian Operasional** merujuk pada **Dokumen Kebutuhan Modul 3 Bagian 1 & 2**:
           - 10 Klasifikasi Baku Kejadian ARFF, Tingkat Prioritas (Siaga I/II), Nomor Laporan Resmi (`INC-YYYY-XXXX`), Lokasi Airside/Grid, Info Pesawat/Flight, Uraian Kronologis, Tindakan Penanganan, Kondisi Terakhir, dan Status Tindak Lanjut.
        5. **Laporan**: Pemusatan pengesahan resmi shift dinas ("Sahkan Laporan Shift Dinas") dan pratinjau lembar rekapitulasi PDF A4.
   - **Koreksi 4 (Eliminasi Tombol/Fungsi Dobel - Strict GEMINI.md):** Dilarang memasang tombol pintasan di dalam Posko jika aksi tersebut sudah memiliki tab resmi di bottom bar. Aksi wajib punya tepat 1 tempat yang jelas.
   - **Koreksi 5 (Keseragaman Akses Profil Mandiri di Header Atas - Pemindahan dari Bottom Bar):**
     - Menu Profil **DIKELUARKAN dari Bottom Navigation Bar** pada antarmuka Kru maupun Chief.
     - Bottom Bar difokuskan murni untuk aksi operasional:
       - **Kru**: 2 Menu Utama: 1. `Tugas Saya` (Penugasan & Lapor Kesiapan PIC) dan 2. `Cuti / Izin` (Pengajuan Cuti Operasional).
       - **Chief**: 5 Menu Utama: `Posko`, `Ploting`, `Kegiatan`, `Insiden`, `Laporan`.
     - Akses Profil Pribadi dan Arsip Dokumen seragam dibuka melalui **Avatar / Tombol Profil di Header Atas (*Top App Bar*)** di samping lonceng 🔔 dan kunci 🔒.
   - **Koreksi 6 (Fitur Pengumuman / Edaran via Ikon Lonceng 🔔):** Akses pengumuman dan surat edaran dinas dipindahkan ke header atas berupa ikon lonceng notifikasi (dengan badge indikator). Mengklik ikon ini membuka drawer/modal daftar pengumuman resmi tanpa membebani navigasi bawah.
   - **Koreksi 7 (Fitur Ubah Password dengan Ikon Kunci 🔒):** Disediakan tombol ubah kata sandi dengan simbol kunci di tab Profil (dan header bagi Chief) yang memicu modal ganti password aman (password lama, password baru, konfirmasi) sesuai standar autentikasi.
   - **Koreksi 8 (Keseragaman Tampilan Data Profil & Dokumen di Halaman Baru):**
     - Baik Chief maupun Kru menampilkan antarmuka profil yang seragam berbasis 2 kartu baku:
       1. **`PROFIL & KREDENSIAL`**: Data pribadi (Nama Lengkap, NIP, Tempat/Tanggal Lahir, Pendidikan, Golongan Darah, Kualifikasi STKP, Nomor STKP, Masa Berlaku STKP), tombol `Edit Data`, dan tombol `🔒`.
       2. **`DOKUMEN & SERTIFIKAT SAYA`**: Arsip berkas (Ijazah, Lisensi STKP, Sertifikat Diklat), tombol `+ Upload Dokumen`, dan list berkas PDF terunduh.
     - Pada Chief, tampilan ini dibuka sebagai tampilan/halaman mandiri (*sub-view*) yang nyaman dan bersih, bukan sekadar modal sempit yang terpotong.
   - **Koreksi 9 (Pembersihan & Perampingan Ekstrem Ploting - Ultra-Compact Dense Layout):**
     - Kotak-kotak tebal bersarang dihilangkan total, digantikan oleh baris datar (*flat divided rows*) 1px tipis (`divide-y divide-slate-100 py-0.5 px-0.5`).
     - Menghilangkan teks filler jenis armada (`Kendaraan Utama` / `Kendaraan Pendukung`) dan tingkatan kompetensi (`Junior` / `Basic` / `Senior`) di samping nama personel.
     - Menghilangkan subteks banner (*"Slot 0 wajib PIC..."*) dan mengecilkan tombol Simpan menjadi sangat ramping (`px-2 py-0.5 text-[10px]`).
     - Menghilangkan tombol `X` merah di baris kru; di lembar pemilih personel (*crew picker sheet*), opsi paling atas menyediakan tombol: `— Kosongkan Slot Ini (Hapus) —`.
     - Menghilangkan tanda plus dobel pada tombol tambah kru; tombol `+ Tambah Kru` otomatis disembunyikan jika kapasitas maksimal 4 kru telah terpenuhi.
     - Menghilangkan titik hijau ganda di kartu unit; nama armada tampil bersih dan hanya ada 1 indikator titik di dalam badge status kanan.
     - Padding kartu dipangkas mikro (`px-2.5 py-1.5`) dengan jarak vertikal `space-y-1.5` sehingga **4 unit armada langsung termonitor sekaligus dalam 1 layar pandang smartphone 20:9** tanpa scrolling.
   - **Koreksi 10 (Struktur 2 Berkas Mandiri & Penghematan Kode - Tanpa Berkas Index):**
     - Berkas mobile disederhanakan menjadi **2 berkas mandiri**: `tipe_1_kru.html` (mode default Kru) dan `tipe_2_chief.html` (mode default Chief). Berkas sementara `index.html` dihapus.
     - Kedua berkas tetap berbagi standar komponen yang seragam dan efisien (anti-duplikasi).
   - **Koreksi 11 (Kewajiban Foto Fisik Keduanya & Istilah Baku Serviceable / Unserviceable):**
     - Istilah status kesiapan wajib menggunakan standar resmi operasional ARFF: **`Serviceable`**, **`Unserviceable`**, dan **`Belum Dilaporkan`** (bukan istilah bebas seperti *Siap Operasi* / *Ada Kendala*).
     - Pada formulir laporan kesiapan PIC, **foto bukti fisik kendaraan WAJIB diunggah/diambil untuk KEDUANYA** (baik saat berstatus `Serviceable` sebagai bukti inspeksi fisik pergantian shift, maupun `Unserviceable` sebagai bukti kerusakan).
     - Jika status `Unserviceable`, field *Keterangan Kerusakan & Kendala* wajib diisi.
   - **Koreksi 12 (Dukungan Chief / Asisten Sebagai PIC Armada):**
     - Jika Chief atau Asisten Chief ditugaskan sebagai PIC pada salah satu unit armada/watchroom, sistem menampilkan banner penugasan *'Tugas Anda (PIC)'* di tab Posko dengan akses instan ke formulir lapor kesiapan PIC yang identik dengan Kru (100% code reuse).
   - **Koreksi 13 (Tab Laporan Bersih - Ringkasan Kartu & Unduh PDF Resmi):**
     - Menghilangkan mock iframe PDF palsu. Tab Laporan menampilkan kartu ringkasan dinas resmi, status tanda tangan supervisor/Chief, tombol *Sahkan Laporan Shift Dinas*, dan tombol *Unduh PDF Resmi (A4)*.
   - **Koreksi 14 (Akses Pengajuan Cuti Mandiri untuk Chief):**
     - Komandan Regu (Chief) difasilitasi untuk mengajukan cuti/izin mandiri langsung dari antarmuka mobile melalui:
       1. Tombol **`+ Cuti Saya`** di samping wadah Personel Izin/Cuti pada tab Ploting.
       2. Tombol **`+ Izin Saya`** pada ringkasan Personel di tab Posko.
       3. Tombol **`+ Cuti Saya`** pada Sub-View Profil Mandiri di Header Atas.
       4. Membuka modal formulir permohonan resmi (*Cuti Tahunan, Sakit, Dinas Luar, Tukar Dinas*) yang diajukan langsung ke pimpinan unit.

---

## 4. Cetak Biru Desain Layout Mobile Web App (Standar `GEMINI.md` & `/antislop`)

Tampilan mobile ini **tetap berjalan di browser website biasa**, tetapi memiliki struktur layout dan *feel* layaknya aplikasi mobile native yang kokoh, cepat, dan kredibel untuk operasional lapangan.

### A. Anatomi Shell Layout Mobile (`MobileLayout.jsx`)

```
+-----------------------------------------------------------+
| 1. TOP APP BAR (Sticky Top, H: 56px)                      |
| [ARFF YIA Logo]  [Regu Alpha • Shift 2]  [Avatar/Logout]  |
+-----------------------------------------------------------+
| 2. MAIN SCROLLABLE CONTENT CANVAS                         |
| (W: max-w-md mx-auto, P: px-4 py-3, Pb: pb-24)            |
|                                                           |
| [KARTU TUGAS HARI INI / OPERATIONAL BANNER]               |
|                                                           |
| [CONTENT SECTIONS: Ploting / Checklist / Cuti / Roster]   |
|                                                           |
|                                                           |
|                                     [FAB: Sahkan / +] (Chief)
+-----------------------------------------------------------+
| 3. BOTTOM NAVIGATION BAR (Fixed Bottom, H: 64px + safe-area)
| [🏠 Beranda] [🚒 Armada] [📋 Ploting*] [📅 Dinas] [📢 Info]
+-----------------------------------------------------------+
*Tab Ploting hanya tampil untuk Chief & Asisten Chief
```

### B. Prinsip Desain Anti-Slop & Aturan Performa (`GEMINI.md`)

1. **Palet Warna & Nuansa (Clean White & Slate Professional)**:
   - Warna latar: `bg-slate-50` / `bg-[#f8fafc]` terang dan bersih, kontras tinggi dan mudah dibaca di bawah sinar matahari bandara.
   - Kartu & Kontainer: `bg-white border border-slate-200 shadow-sm` tajam, grounded, dan rapi.
   - Aksen Operasional: Merah pemadam terarah (`bg-red-600`) dan hijau operasional (`emerald-600`), tanpa warna ungu/pink generic AI.
   - **DILARANG KERAS**: Efek neon glow, glassmorphism bertumpuk murahan, dan orbs ambient.

2. **Integritas Data Operasional Riil (Anti-Asumsi / Anti-Slop Data)**:
   - Dilarang membuat kolom atau metrik fiktif yang tidak ada di skema database (seperti slider persentase Air, Foam, DCP, BBM).
   - Form kesiapan armada merujuk 100% pada struktur riil `vehicle_readiness_logs`:
     - Pilihan status: `serviceable` (Siap Operasi) vs `unserviceable` (Ada Kerusakan)
     - `justification` (Wajib bila unserviceable)
     - `notes` (Catatan tambahan opsional)
     - `photo_webp_url` (Foto bukti kendala dari kamera HP / upload)

3. **Aturan Performa Anti-Lag & Form Input (INP & LCP Strict)**:
   - **Anti-Lag Input Form**: Dilarang menggunakan CSS `transition-all` pada `<input>` dan `<textarea>`. Gunakan `transition-colors duration-100` agar respon ketik instan (<16ms).
   - **Bebas Backdrop-Blur pada Modal Input**: Dilarang memakai `backdrop-filter: blur(...)` saat modal pengisian checklist atau form aktif agar GPU mobile tidak meraster ulang layar saat mengetik.
   - **Zero LCP Freeze**: Header dan kontainer atas fold dilarang memuat background image > 100kB. Gunakan CSS solid murni.

3. **Prinsip Tata Letak Mobile (`antislop-layoutmobile`)**:
   - **Zona Jangkauan Jempol (*Thumb Zone*)**: Tombol aksi utama (simpan checklist, sahkan shift, ganti tab) diletakkan di area bawah layar yang mudah dijangkau satu tangan.
   - **Ukuran Target Sentuh (*Tap Target*)**: Seluruh tombol, switch, dan item menu memiliki tinggi/lebar minimal `44px x 44px` agar tidak salah ketuk saat bertugas di lapangan.
   - **Zero Horizontal Scroll Leak**: Tidak boleh ada tabel atau elemen teks yang meluber ke kanan. Tabel desktop diubah menjadi kartu vertikal (*card list*).
   - **Safe Area Insets**: Mendukung `pb-safe` untuk navigasi bawah pada perangkat dengan gesture bar / notch iPhone & Android.

---

## 4. Dua Mode Antarmuka Mobile Berdasarkan Role

### A. Mode Komandan Regu (Khusus `chief` & `chief_assistant`)
1. **Navigasi Bawah (Bottom Bar)**:
   - **Beranda**: Status shift aktif, rangkuman kesiapan regu, dan tombol darurat/insiden.
   - **Armada**: Daftar status kesiapan armada, verifikasi temuan *unserviceable*, dan riwayat kerusakan.
   - **Ploting**: Penugasan kru armada per kendaraan via kartu geser (*swipeable vehicle cards*) dan pemilihan nama via *bottom sheet modal*.
   - **Regu & Cuti**: Pantau kehadiran anggota regunya dan catat izin/cuti anggota.
   - **Edaran**: Papan pengumuman dinas dan terbitkan info darurat.
2. **Fitur Pengesahan (*One-Tap Shift Approval*)**:
   - Tombol mengambang (*Floating Action Button / Action Card*) yang aktif saat seluruh kru terploting dan checklist armada selesai diperiksa.

### B. Mode Kru Pelaksana (Khusus `senior_firefighter` & `junior_firefighter`)
1. **Navigasi Bawah (Bottom Bar)**:
   - **Tugas Saya**: Menampilkan secara gamblang di mana posisi bertugas hari ini: nama kendaraan, peran (Driver / Nozzleman / Rescuer), dan badge PIC.
   - **Checklist Kendaraan**: Formulir inspeksi fisik armada (khusus bagi yang menjadi PIC di shift tersebut), terhubung langsung ke kamera HP.
   - **Jadwal Dinas**: Kalender shift pribadi untuk mengecek jadwal dinas regunya dan pengajuan cuti mandiri.
   - **Edaran**: Membaca surat keputusan atau info operasional bandara.
   - **Profil**: Cek data diri, NIP, dan masa berlaku lisensi STKP.
2. **Bebas Distraksi**:
   - Sama sekali tidak menampilkan tombol administratif, master data, penetapan pejabat, atau tombol hapus data.

---

## 5. Rencana Tahapan Eksekusi

1. **Langkah 1: Pembuatan Komponen Shell Mobile**
   - Buat [`MobileLayout.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/MobileLayout.jsx), [`MobileHeader.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/MobileHeader.jsx), dan [`MobileBottomNav.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/MobileBottomNav.jsx).
2. **Langkah 2: Integrasi Routing di `App.jsx`**
   - Tambahkan deteksi role pada routing: jika user adalah Chief/Kru, arahkan ke rute `/m/...` (atau render otomatis `MobileLayout` saat diakses oleh role lapangan).
3. **Langkah 3: Pembuatan Halaman Mobile Kru (Firefighter)**
   - Halaman **Beranda Tugas Saya** (`MobileHomeFirefighter.jsx`).
   - Halaman **Checklist Inspeksi PIC** (`MobileVehicleChecklist.jsx`).
   - Halaman **Jadwal & Cuti Mandiri** (`MobileScheduleLeave.jsx`).
4. **Langkah 4: Pembuatan Halaman Mobile Komandan (Chief & Asisten)**
   - Halaman **Ploting Cepat Armada** (`MobilePloting.jsx`).
   - Halaman **Monitoring Kesiapan & Verifikasi** (`MobileReadinessMonitor.jsx`).
   - Dialog **Pengesahan Shift / Approval** (`MobileShiftApprovalModal.jsx`).
5. **Langkah 5: Validasi & Uji Coba Performa**
   - Uji respon form checklist tanpa lag (<16ms).
   - Pastikan zero horizontal scroll pada berbagai ukuran resolusi smartphone (360px – 430px).
