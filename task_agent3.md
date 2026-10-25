# LEMBAR PENUGASAN AGENT 3: OPERASIONAL ARMADA, PLOTING PENUGASAN DESKTOP, KESIAPAN PIC & PEJABAT

**Domain Tanggung Jawab:** Ploting Penugasan Shift Desktop (`HalamanPenugasan.jsx`, `DeploymentSlotCard.jsx`), Kesiapan Armada & Posko (`HalamanKesiapanKendaraan.jsx`, `VehicleReadinessModal.jsx`, `WatchroomReadinessModal.jsx`), dan Master Pejabat (`HalamanKelolaPejabat.jsx`).  
**Catatan Penting:** Halaman Dashboard dihiraukan (*skip*).  
**Fase Saat Ini:** **FASE 3 (Eksekusi Perbaikan Kode Produksi)**  

---

## 🎯 BERKAS TARGET PEKERJAAN ANDA (ISOLASI MUTLAK):
1. [`frontend/src/pages/HalamanPenugasan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPenugasan.jsx)
2. [`frontend/src/components/forms/DeploymentSlotCard.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/DeploymentSlotCard.jsx)
3. [`frontend/src/pages/HalamanKesiapanKendaraan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKesiapanKendaraan.jsx)
4. [`frontend/src/components/forms/VehicleReadinessModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/VehicleReadinessModal.jsx)
5. [`frontend/src/components/forms/WatchroomReadinessModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/WatchroomReadinessModal.jsx)
6. [`frontend/src/pages/HalamanKelolaPejabat.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKelolaPejabat.jsx)

---

## ⛔ BATASAN & PANTANGAN KERAS:
1. **DILARANG MENGUBAH STATUS KELAIKAN DEFAULT ARMADA**: Sesuai GEMINI.md No. 17, default status armada tetap *Serviceable* (Siap Operasi) kecuali ditandai rusak oleh PIC.
2. **DILARANG AUTO-SAVE PLOTING**: Penyimpanan ploting kru tetap eksplisit via tombol "Simpan Ploting".
3. **DILARANG MENYENTUH BERKAS DI LUAR DAFTAR TARGET DI ATAS.**

---

## 🛠️ RINCIAN BUTIR TUGAS YANG WAJIB ANDA SELESAIKAN:

1. Ketiadaan Sanitasi Sisi Klien untuk Mencegah Payload Penugasan Duplikat
deskripsi masalah:
Pada `HalamanPenugasan.jsx` (baris 283-325), fungsi `handleSaveDeployments` mengumpulkan data penugasan langsung dari perulangan slot tanpa memeriksa apakah ada `personnel_id` yang terduplikasi secara tidak sengaja akibat glitch UI atau pemilihan ganda.
dampak:
Jika ada ID personel yang terkirim dobel, backend menolak seluruh batch penugasan dengan error database unique constraint (HTTP 409), menyebabkan penyimpanan ploting seluruh armada gagal total.
solusi:
Tambahkan sanitasi deduplikasi sisi klien menggunakan `Set` sebelum pengiriman payload ke endpoint `POST /deployments/batch`. Jika terdeteksi ada personel yang ditugaskan di lebih dari satu slot, batalkan proses simpan dan munculkan toast error peringatan yang spesifik menyebutkan nama personel tersebut.

2. Modal Inspeksi Salah Target untuk Unit Posko Watchroom di Halaman Ploting
deskripsi masalah:
Di `HalamanPenugasan.jsx`, saat tombol "Periksa Kesiapan" pada unit Posko Watchroom diklik, sistem membuka `VehicleReadinessModal` (modal kendaraan fisik dengan input plat nomor dan foto armada pemadam).
dampak:
Petugas Posko Komunikasi tidak dapat menginput maupun memverifikasi checklist fasilitas posko (Radio VHF, Hotline ATC, Crash Bell, PC CCTV).
solusi:
Tambahkan percabangan pada handler buka modal kesiapan di `HalamanPenugasan.jsx`: jika armada bertipe/kategori posko atau berkode `WATCHROOM`, buka `WatchroomReadinessModal`. Jika armada fisik, buka `VehicleReadinessModal`.

3. Visual Peringatan Cuti Real-time dan Penanda Dropdown pada Ploting
deskripsi masalah:
Pada `DeploymentSlotCard.jsx`, personel yang sedang izin/cuti sebelumnya hanya diberi keterangan teks kecil di dropdown sehingga rawan terlewat oleh supervisor shift yang sedang menyusun formasi.
dampak:
Supervisor shift berpotensi salah mengira personel tersebut hadir dan mencoba memilihnya ke dalam slot kendaraan.
solusi:
- Tambahkan penanda visual merah mencolok: `⛔ [CUTI/IZIN]` di awal label nama personel pada opsi dropdown.
- Tambahkan teks penjelas `(Sedang Cuti/Izin - Tidak Dapat Ditugaskan)` dan styling teks merah tebal (`text-red-600 font-bold bg-red-50`).
- Pastikan atribut `disabled={true}` tetap aktif pada opsi personel yang sedang cuti agar tidak dapat diklik/dipilih.

4. Kerapatan Slot Kru di Layar Smartphone
deskripsi masalah:
Pada `DeploymentSlotCard.jsx` (baris 163-298), jarak vertikal slot kru (`space-y-2.5`, padding `p-3`, min-height `38px`) membuat kartu kendaraan dengan 4 slot memanjang hingga ~400px. Pada layar smartphone, 6 armada membutuhkan scrolling vertikal yang sangat panjang dan melelahkan.
dampak:
Pengalaman pengguna mobile menjadi buruk dan memakan waktu lama saat memantau susunan personel lapangan.
solusi:
Terapkan padding responsif lebih ramping pada breakpoint mobile: container kartu `p-3.5 sm:p-5`, item slot `p-2 sm:p-2.5`, tinggi select field `min-h-[36px] sm:min-h-[38px]`, dan badge peran yang kompak di layar kecil.

5. Pelanggaran Anti-Lag Form: Penggunaan CSS transition-all pada Halaman Kesiapan Kendaraan
deskripsi masalah:
Pada `HalamanKesiapanKendaraan.jsx` baris 187, banner/toast notifikasi feedback menggunakan class `transition-all duration-150`.
dampak:
Melanggar aturan ketat performa frontend GEMINI.md (Anti-Lag Form Input & Strict INP). `transition-all` memicu GPU layout recalculation dan reflow saat banner feedback muncul atau ditutup.
solusi:
Ganti class `transition-all duration-150` menjadi `transition-colors duration-100` yang ringan dan bebas reflow.

6. Format Tanggal Mentah pada Subtitle Modal Kesiapan
deskripsi masalah:
Pada `VehicleReadinessModal.jsx` (baris 134) dan `WatchroomReadinessModal.jsx` (baris 72), subtitle header modal menampilkan string tanggal mentah format ISO `YYYY-MM-DD` (contoh: `2026-10-24`).
dampak:
Tampilan antarmuka terkesan mentah/teknikal dan tidak selaras dengan standar Bahasa Indonesia formal aplikasi.
solusi:
Gunakan helper tanggal Bahasa Indonesia resmi (misal: `24 Oktober 2026`).

7. Keterangan Status "Menunggu Foto Fisik" Perlu Penjelasan Tooltip
deskripsi masalah:
Pada `HalamanKesiapanKendaraan.jsx` (baris 248-251), chip status `Menunggu Foto Fisik` berwarna netral slate dan tidak memiliki keterangan pendukung.
dampak:
Pengguna atau pimpinan baru sering salah mengira bahwa armada tersebut belum siap pakai atau rusak (unserviceable).
solusi:
Tambahkan ikon info kecil (`HelpCircle`) dengan tooltip penjelas resmi bahwa status operasional armada tetap *Serviceable* (Siap Operasi) sesuai standar rotasi dinas GEMINI.md Butir 17.

8. Ketiadaan Pratinjau Tanda Tangan Aktif pada Modal Dept. Head
deskripsi masalah:
Pada `HalamanKelolaPejabat.jsx` (baris 570-584), di dalam modal edit Dept. Head hanya terdapat input file tanpa menampilkan pratinjau spesimen tanda tangan yang saat ini sedang aktif tersimpan di server.
dampak:
Admin tidak mengetahui apakah pejabat sudah memiliki tanda tangan aktif atau belum, dan unggahan file berukuran besar (> 2 MB) dapat memicu kegagalan server.
solusi:
- Tampilkan thumbnail tanda tangan aktif dari database.
- Tampilkan instant preview berkas baru seketika saat user memilih file gambar.
- Tambahkan validasi sisi klien: batas ukuran berkas maksimal 2 MB dan format gambar PNG/JPG/WEBP.

---

## 📝 FORMAT WAJIB PENULISAN LAPORAN ANDA DI `masak/temp/hasil_agent3.md`:
Setelah selesai mengeksekusi kode dan lulus uji CLI (`npm --prefix frontend run build`), tulis laporan hasil kerja Anda dan temuan baru lainnya dengan format berikut:

```text
(nomor). (judul) (halaman (ditulis singkat saja)/namafile) .
(deskripsi masalah)
(dampak)
(solusi)
```
