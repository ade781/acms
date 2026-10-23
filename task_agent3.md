# PANDUAN TUGAS: AGENT 3 - MOBILE PLOTING & KESIAPAN 8 UNIT ARMADA (CHIEF / ASISTEN)

## Peran & Batasan Tanggung Jawab
Agent 3 bertindak sebagai **Spesialis Ploting Penugasan & Kesiapan 8 Unit Armada Mobile**. Bertanggung jawab penuh membangun Tab Ploting (`MobilePloting.jsx`), kartu ploting padat (*ultra-compact plot cards*) untuk 8 unit operasional (7 kendaraan + 1 watchroom), lembar pemilih kru (*Crew Picker Bottom Sheet*), wadah personel tidak hadir (cuti/izin), dialog konfirmasi pembatalan cuti (*Cancel Cuti*), serta integrasi simpan ploting ke backend.
- **DILARANG** menyentuh komponen shell luar (`MobileLayout`, `MobileHeader`, `MobileBottomNav`) agar tidak tabrakan dengan Agent 1.
- **DILARANG** mengutak-atik halaman dashboard atau form kesiapan tugas kru biasa (Tugas Agent 2).
- **DILARANG** mengutak-atik modul kegiatan rutin & insiden (Tugas Agent 4).
- **DILARANG** mengutak-atik halaman laporan shift dinas / modal audit trail (Tugas Agent 5).
- **WAJIB** mematuhi aturan baku di [`GEMINI.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/GEMINI.md) Butir 6 & Butir 9, [`plan.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/plan.md), dan prototype [`masak/mobile/tipe_2_chief.html`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/mobile/tipe_2_chief.html).

---

## Berkas yang Dikelola oleh Agent 3 (Eksklusif)
1. `frontend/src/pages/mobile/MobilePloting.jsx`
2. `frontend/src/components/mobile/ploting/MobilePlotCard.jsx`
3. `frontend/src/components/mobile/ploting/MobileCrewPickerSheet.jsx`
4. `frontend/src/components/mobile/ploting/MobileAbsentCrewSection.jsx`
5. `frontend/src/components/mobile/ploting/MobileCancelLeaveConfirmModal.jsx`

---

## Standar Desain & Aturan Kritis (`GEMINI.md` & `plan.md`)
1. **Desain Padat & Anti-Card Bersarang (Dense Ops Layout - Anti Cards Inside Cards)**:
   - Sesuai `GEMINI.md` Butir 6: Dilarang membungkus setiap baris personel ke dalam kartu kotak tebal bersarang (*nested cards bloat*).
   - Gunakan layout daftar baris kompak (*compact flat divided rows*) dengan divider halus 1px (`divide-y divide-slate-100 py-0.5 px-0.5`).
   - Padding kartu dibuat mikro (`px-2.5 py-1.5`) dengan jarak vertikal `space-y-1.5` agar **4 unit armada langsung termonitor sekaligus dalam 1 layar pandang smartphone 20:9 tanpa scrolling melelahkan**.
   - Hilangkan teks filler jenis armada (*"Kendaraan Utama"*, *"Kendaraan Pendukung"*) dan level kompetensi (*"Junior"*, *"Basic"*); nama personel tampil bersih dan elegan.
2. **Struktur 8 Unit Operasional ARFF YIA**:
   - Total 8 Unit yang setara penuh:
     1. Foam Tender 01 (FT-01)
     2. Foam Tender 02 (FT-02)
     3. Rapid Intervention Vehicle (RIV-01)
     4. Nurse Tender 01 (NT-01)
     5. Ambulance (AMB-01)
     6. Command Car / Utility (COMM-01)
     7. Rescue Boat / Support (RESCUE-01)
     8. Watchroom (Posko Komunikasi & Pengendalian Operasi)
   - Setiap kartu unit memuat:
     - Header Unit: Kode Unit, Nama Unit, dan Badge Kesiapan (`Serviceable` hijau / `Unserviceable` merah / `Belum Dilaporkan` kuning) dengan 1 titik indikator status.
     - **Slot 0 (Paling Atas)**: Terkunci permanen sebagai **PIC / Pengemudi / Operator Utama**.
     - **Slot 1 s.d. 4 (Kru Lapangan)**: Dinamis. Dilengkapi tombol `+ Tambah Kru` (otomatis disembunyikan jika kapasitas slot maksimal 4 orang telah tercapai).
3. **Crew Picker Sheet (`MobileCrewPickerSheet.jsx`)**:
   - Dibuka sebagai bottom sheet saat Chief mengetuk salah satu baris slot personel pada kartu unit.
   - Header sheet: Judul pemilihan slot (misal: "Pilih PIC Foam Tender 01"), kolom input pencarian nama personel (`filterCrewList`).
   - **Opsi Teratas Bersih**: Tombol bergaris putus-putus merah:
     `— Kosongkan Slot Ini (Hapus) —`
     (Meniadakan tombol silang merah kasar `✕` pada baris kru di kartu unit).
   - Daftar personel: Menampilkan seluruh personel regu yang siap dinas (mengecualikan personel yang sedang izin/cuti atau sudah terploting di unit lain).
4. **Wadah Personel Tidak Hadir / Absen (`MobileAbsentCrewSection.jsx`)**:
   - Diletakkan di bagian paling bawah halaman Ploting.
   - Menampung seluruh personel yang tercatat izin/cuti (Cuti Tahunan, Sakit, Dinas Luar, Tukar Dinas) di shift berjalan.
   - Dilengkapi tombol **`+ Cuti Saya`** di pojok kanan agar Chief dapat mengajukan izin mandiri dengan cepat.
   - **Aksi Resmi "Cancel Cuti"**: Menggantikan tombol hapus silang `✕`. Mengklik tombol ini membuka `MobileCancelLeaveConfirmModal` dengan dialog penegasan resmi:
     *"Batalkan pengajuan izin/cuti untuk [Nama Personel]? Personel akan dikembalikan ke status aktif dinas."*
   - Sesuai `GEMINI.md` Butir 6: Saat cuti dibatalkan, personel kembali tersedia untuk diploting pada unit armada.
5. **Tombol Simpan Ploting Ramping**:
   - Tombol simpan ditempatkan di header atas halaman Ploting: `px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[10px]` dengan ikon disket.
   - Mengirim seluruh distribusi penugasan 8 unit ke API backend dalam 1 payload transaksi terpadu.

---

## Rincian Tugas yang Wajib Dikerjakan

### 1. Bangun Halaman `MobilePloting.jsx`
- Ambil data penugasan shift berjalan dari API `/api/deployments/current`.
- Ambil daftar seluruh personel regu aktif dari `/api/personnel?team=Alpha` (atau regu aktif).
- Ambil daftar personel cuti/izin aktif dari `/api/leave?date=...&shift=...`.
- Kelola state penugasan lokal (array 8 unit dengan susunan slot kru).

### 2. Kembangkan `MobilePlotCard.jsx`
- Terapkan layout baris datar (*flat divided rows*) bebas kotak tebal bersarang.
- Tangani klik pada slot 0 (PIC) maupun slot kru untuk membuka `MobileCrewPickerSheet`.
- Tombol `+ Tambah Kru` yang menambahkan baris slot baru secara dinamis hingga batas maksimum 4 slot kru.

### 3. Kembangkan `MobileCrewPickerSheet.jsx`
- Bottom sheet mengambang dengan transisi halus tanpa backdrop-blur berat.
- Input pencarian cepat nama atau NIP.
- Opsi `— Kosongkan Slot Ini (Hapus) —` yang mengosongkan personel dari slot terkait.
- Penanda jika seorang personel sudah terploting di kendaraan lain.

### 4. Kembangkan `MobileAbsentCrewSection.jsx` & `MobileCancelLeaveConfirmModal.jsx`
- Tampilkan daftar personel yang tidak berdinas dengan badge kategori (Cuti, Sakit, Dinas Luar).
- Pasang tombol "Cancel Cuti" yang memanggil endpoint pembatalan izin `/api/leave/:id/cancel`.
- Pasang tombol `+ Cuti Saya` yang memicu pembukaan `MobileLeaveModal` (komponen Agent 2).

### 5. Integrasi Penyimpanan Ploting ke Backend
- Saat tombol "Simpan" ditekan, validasi bahwa minimal Slot 0 (PIC) pada armada utama telah terisi.
- Kirim payload ke endpoint `/api/deployments/batch` atau `/api/deployments`.
- Berikan toast notifikasi sukses dan sinkronkan data ke seluruh modul.

---

## Kriteria Selesai Agent 3
- Seluruh 8 Unit Operasional (7 Kendaraan + 1 Watchroom) tampil dalam layout padat flat rows (4 unit terlihat sekaligus dalam 1 layar smartphone 20:9).
- Slot 0 terkunci permanen sebagai PIC; slot kru dinamis bertambah dan berkurang dengan rapi.
- Crew Picker Sheet bekerja cepat, mampu mencari nama, dan memiliki opsi `— Kosongkan Slot Ini (Hapus) —`.
- Tombol "Cancel Cuti" berfungsi membatalkan izin dan mengembalikan personel ke status siap dinas.
- Aksi Simpan Ploting berhasil terkirim dan tersimpan di database backend tanpa error.
- Kompilasi `npm run build` sukses 0 error.
