# LEMBAR PENUGASAN AGENT 4: LOG KEGIATAN DINAS, PELAPORAN INSIDEN & PAPAN PENGUMUMAN

**Domain Tanggung Jawab:** Logbook Kegiatan Shift (`HalamanKegiatan.jsx`), Pelaporan Insiden & Detail Kejadian (`HalamanInsiden.jsx`, `HalamanDetailInsiden.jsx`, `IncidentModal.jsx`), Papan Pengumuman Dinas Desktop (`HalamanPengumuman.jsx`).  
**Catatan Penting:** Halaman Dashboard dihiraukan (*skip*).  
**Fase Saat Ini:** **FASE 3 (Eksekusi Perbaikan Kode Produksi)**  

---

## 🎯 BERKAS TARGET PEKERJAAN ANDA (ISOLASI MUTLAK):
1. [`frontend/src/pages/HalamanKegiatan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKegiatan.jsx)
2. [`frontend/src/pages/HalamanInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanInsiden.jsx)
3. [`frontend/src/pages/HalamanDetailInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanDetailInsiden.jsx)
4. [`frontend/src/components/forms/IncidentModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/IncidentModal.jsx)
5. [`frontend/src/pages/HalamanPengumuman.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPengumuman.jsx)

---

## ⛔ BATASAN & PANTANGAN KERAS:
1. **DILARANG MENGUBAH / MENYENTUH HALAMAN LAPORAN RESMI ATAU PLOTING**: Domain `HalamanLaporan*.jsx` dan `HalamanPenugasan.jsx` dikerjakan oleh agent lain. Fokus 100% pada Kegiatan, Insiden, dan Pengumuman.
2. **DILARANG MENYENTUH BERKAS DI LUAR DAFTAR TARGET DI ATAS.**

---

## 🛠️ RINCIAN BUTIR TUGAS YANG WAJIB ANDA SELESAIKAN:

1. Missing Props Tanggal & Shift pada IncidentModal (Potensi Kegagalan Pelaporan Insiden)
deskripsi masalah:
Pemanggilan `IncidentModal` di `HalamanInsiden.jsx` sebelumnya tidak menyertakan props `activeDate`, `activeShiftNumber`, dan `activeTeam`, sementara `IncidentModal` bergantung langsung pada nilai props tersebut untuk mengirimkan data kejadian ke database.
dampak:
Nilai tanggal yang dikirim ke backend berubah menjadi string teks literal `"undefined"`, yang pada mode strict database memicu kegagalan query SQL (`Incorrect date value`) dan menyebabkan pelaporan insiden darurat gagal total.
solusi:
- Di `HalamanInsiden.jsx`, kirimkan props `activeDate={activeDate} activeShiftNumber={activeShiftNumber} activeTeam={activeTeam}` ke `IncidentModal`.
- Di `IncidentModal.jsx`, tambahkan proteksi defensif fallback `useAuth()`:
  ```javascript
  const auth = useAuth();
  const effectiveDate = activeDate || auth.activeDate;
  const effectiveShift = activeShiftNumber || auth.activeShiftNumber;
  const effectiveTeam = activeTeam || auth.activeTeam;
  ```
- Sediakan juga tombol checklist multi-select armada aktif yang dikerahkan ke TKP (misal: Foam Tender 1, 2, 3, RIV, Nurse Tender, Ambulance, Command Car) yang otomatis tercatat ke catatan penanganan operasional.

2. Ketiadaan Modal Lightbox Foto TKP pada Halaman Detail Insiden
deskripsi masalah:
Di `HalamanDetailInsiden.jsx`, foto dokumentasi bukti kejadian di TKP hanya ditampilkan dalam kotak kecil statis tanpa kemampuan interaksi klik atau pembesaran resolusi.
dampak:
Investigator, pimpinan, maupun Chief tidak dapat memeriksa detail krusial pada foto bukti kejadian seperti titik tumpahan avtur, retakan badan pesawat, atau serpihan benda asing (FOD) di landasan pacu.
solusi:
Buat foto dokumentasi dapat diklik untuk membuka Modal Lightbox resolusi penuh berlatar gelap (`bg-slate-900/90`), dilengkapi tombol navigasi foto Sebelumnya/Selanjutnya (`ChevronLeft` / `ChevronRight`), nomor urut foto, tombol unduh berkas asli, dan tombol tutup (`X`).

3. Format Tampilan Kegiatan Kurang Mencerminkan Logbook Dinas Resmi
deskripsi masalah:
Di `HalamanKegiatan.jsx` (baris 349-430), kegiatan operasional disajikan sebagai sekumpulan kartu kotak terpisah secara vertikal (`space-y-4`). Tata letak ini tidak memberikan kesan alur kronologis dinas (*chronological flow*) yang kuat layaknya jurnal resmi dinas ARFF.
dampak:
Pengguna kesulitan memindai kronologi waktu kegiatan dari awal apel serah terima hingga akhir shift.
solusi:
Restrukturisasi tampilan kegiatan dari kartu terpisah menjadi **Vertical Step Timeline** bersambung garis dinas kronologis vertikal:
- Garis vertikal halus di sisi kiri (`before:w-0.5 before:bg-slate-200`) dengan badge waktu dinas (misal: `07:30 WIB`, `08:15 WIB`, `13:00 WIB`).
- Ikon kategori spesifik di setiap simpul (Apel/Briefing, Uji Pancar Armada, Alat Rescue, Fire Drill, Pemeliharaan Fasilitas, Patroli Runway, Catatan Kendala).
- Optimasi perhitungan jumlah kategori menggunakan `useMemo` (`categoryCounts`) agar tidak me-reloop array saat render.

4. Beban Loading Otomatis Berkas PDF Berat pada Papan Pengumuman (Overload Iframe)
deskripsi masalah:
Pada `HalamanPengumuman.jsx`, sistem secara otomatis memilih dokumen pertama dan langsung memuat iframe PDF begitu halaman dibuka.
dampak:
Jika surat edaran pertama berukuran besar (hingga 10 MB), browser langsung menyedot bandwidth dan memperlambat LCP secara drastis saat membuka halaman pengumuman.
solusi:
Terapkan *Lazy / On-Demand Preview*: hapus pemuatan otomatis iframe di awal muat halaman. Pratinjau PDF hanya dimuat saat pengguna aktif mengklik kartu pengumuman atau menekan tombol *"Muat Pratinjau Dokumen PDF"*.

5. Konfirmasi Hapus Pengumuman Masih Menggunakan Native Browser Dialog
deskripsi masalah:
Di `HalamanPengumuman.jsx` baris 186, aksi penghapusan surat edaran pengumuman oleh admin masih menggunakan `window.confirm()`.
dampak:
Membekukan thread UI browser dan tidak selaras secara estetika dengan standar desain aplikasi.
solusi:
Ganti dengan in-app confirmation modal bertema modern dengan feedback visual yang jelas.

6. Ketiadaan Status / Badge Pinned pada Papan Pengumuman
deskripsi masalah:
Seluruh pengumuman disajikan setara tanpa adanya hirarki penanda instruksi darurat/mendesak (misal: *Instruksi Kesiapsiagaan Cuaca Ekstrem* vs *Surat Edaran Rutin*).
dampak:
Personel lapangan kesulitan membedakan instruksi prioritas tinggi yang memerlukan tindakan segera dari surat edaran biasa.
solusi:
Tambahkan opsi checklist *"Sematkan Sebagai Pengumuman Mendesak (Pinned)"* pada form unggah, dan sistem secara otomatis mengurutkan pengumuman bertanda `[MENDESAK]` / `PINNED` di posisi paling atas dengan badge warna merah khusus.

7. Toast Feedback Tanpa Timer Auto-Dismiss
deskripsi masalah:
Di `HalamanKegiatan.jsx` (baris 252-267) dan `HalamanInsiden.jsx` (baris 157-172), notifikasi toast berhasil (`toastMsg`) tidak memiliki timer tutup otomatis, memaksa pengguna selalu mengklik tombol 'X' secara manual.
dampak:
Mengganggu alur input pengguna yang harus terus-menerus menutup banner toast secara manual.
solusi:
Pasang timer `setTimeout` 3.5 detik untuk menutup toast notifikasi secara otomatis setelah muncul.

8. Beban Data & Network Overload pada Riwayat Insiden
deskripsi masalah:
Di `HalamanInsiden.jsx`, saat filter diubah ke "Semua Riwayat", endpoint backend `/incidents` dipanggil tanpa parameter pembatas data (`limit`).
dampak:
Jika data insiden bertambah banyak, server akan mengirimkan seluruh baris ke browser sekaligus, memicu lonjakan memori dan render lambat.
solusi:
Tambahkan query default `{ limit: 50 }` saat memanggil data riwayat insiden untuk mencegah over-fetching data.

---

## 📝 FORMAT WAJIB PENULISAN LAPORAN ANDA DI `masak/temp/hasil_agent4.md`:
Setelah selesai mengeksekusi kode dan lulus uji CLI (`npm --prefix frontend run build`), tulis laporan hasil kerja Anda dan temuan baru lainnya dengan format berikut:

```text
(nomor). (judul) (halaman (ditulis singkat saja)/namafile) .
(deskripsi masalah)
(dampak)
(solusi)
```
