# PANDUAN EKSEKUSI AGENT 4: FASE PERBAIKAN TOTAL (LOGBOOK KEGIATAN, MANAJEMEN INSIDEN & UPLOAD BERKAS)

> 🚀 **MANDAT FASE 3 (EKSEKUSI PERBAIKAN KODE & PENGUJIAN):**
> 1. **EKSEKUSI SELURUH PERBAIKAN DI BAWAH INI** pada berkas yang menjadi tanggung jawab Anda.
> 2. **BATAS KODE EKSKLUSIF (ZERO COLLISION)**: Hanya edit berkas domain Agent 4.
> 3. **SEMUA PENGUJIAN DI FOLDER `masak/`**: Dilarang membuat folder `tests/` di `backend/` atau `frontend/`.
> 4. **VALIDASI SISTEM VIA CLI**: Jalankan `node -c` dan pastikan sintaks 100% valid.
> 5. **LAPORAN HASIL KERJA MANDIRI**: Tuliskan laporan perbaikan ke `masak/temp/hasil_agent4.md`.

---

## Daftar Pekerjaan Eksekusi Perbaikan Agent 4

1. **Perbaiki Fatal Crash Layar Putih di `HalamanInsiden.jsx`**:
   - Di baris 118, impor `useNavigate` dari `react-router-dom` dan deklarasikan `const navigate = useNavigate();` di awal komponen, agar klik baris tabel insiden desktop tidak memicu `ReferenceError: navigate is not defined`.

2. **Perbaiki Error 500 pada Pelaporan Insiden Baru di `incidentController.js`**:
   - Di baris 187 pada fungsi `createIncident`, perbaiki query SQL: ganti variabel `selectedCategory` yang tidak didefinisikan dengan pemetaan kategori yang valid (`category || 'other'`), sehingga setiap pelaporan insiden baru tersimpan 100% tanpa rollback.

3. **Selaraskan Kategori Kegiatan Desktop dengan 8 Kategori Baku Operasional ARFF YIA**:
   - Di `frontend/src/pages/HalamanKegiatan.jsx` baris 207–212, ganti opsi kategori sembarang dengan 8 Kategori Baku resmi ARFF YIA:
     * `serah_terima` (Serah Terima Shift)
     * `apel_briefing` (Apel & Briefing Dinas)
     * `periksa_armada` (Pemeriksaan Kendaraan & Uji Pancar)
     * `periksa_peralatan` (Pemeriksaan Alat Operasional & Rescue)
     * `latihan_drill` (Latihan Fisik & Drill Basah/Kering)
     * `pemeliharaan` (Pemeliharaan Fasilitas & Kendaraan)
     * `sosialisasi_keselamatan` (Edukasi & Inspeksi Runway/Apron)
     * `catatan_kendala` (Catatan Khusus & Hambatan Dinas)

4. **Tambahkan Input Foto Dokumentasi Kegiatan, Thumbnail & Aksi Edit/Hapus di Desktop**:
   - Di `HalamanKegiatan.jsx`, tambahkan input file upload foto kegiatan (JPEG/PNG/WebP), render thumbnail gambar jika ada lampiran, dan sediakan tombol Edit serta Hapus kegiatan untuk Chief/Admin.

5. **Tambahkan Dropdown 10 Klasifikasi Baku Kejadian ARFF di `IncidentModal.jsx`**:
   - Di `frontend/src/components/forms/IncidentModal.jsx`, tambahkan pemilih dropdown 10 Klasifikasi Baku Kejadian ARFF dan sertakan field `category` pada pengiriman `FormData` ke backend.

6. **Hapus File Fisik di `uploads/` saat Catatan Kegiatan Berfoto Dihapus**:
   - Di `backend/src/controllers/activityController.js` pada fungsi `deleteActivity`, baca `attachment_url` sebelum menghapus baris dari database, dan jika terdapat file fisik di direktori `uploads/`, hapus file menggunakan `fs.promises.unlink` secara aman.

7. **Standarisasi Pembacaan Badge Prioritas Insiden Desktop**:
   - Di `HalamanInsiden.jsx` dan `HalamanDetailInsiden.jsx`, standarisasi fungsi `getPriorityBadge` agar membaca nilai ENUM database bahasa Inggris (`critical`, `high`, `medium`, `low`) dengan benar, dan dinamiskan badge di halaman detail insiden.

8. **Ganti Seluruh `alert()` dan `confirm()` Browser dengan Notifikasi Visual In-App**:
   - Di `HalamanDetailInsiden.jsx`, `MobileKegiatan.jsx`, dan `MobileIncidentDetailModal.jsx`, singkirkan dialog bawaan browser dan ganti dengan toast/banner notifikasi visual instan sesuai Rule 10 `GEMINI.md`.

9. **Terapkan Paginasi Efisien pada Query Insiden dan Kegiatan Desktop**:
   - Sediakan kontrol paginasi (`page` & `limit`) pada tabel kegiatan dan insiden desktop agar rendering tetap responsif.

---

## Format Pelaporan Mandiri di `masak/temp/hasil_agent4.md`

Setelah seluruh kode di atas diperbaiki dan divalidasi via CLI:
Tuliskan rincian hasil pekerjaan, berkas yang diubah, dan bukti pengujian ke dalam `masak/temp/hasil_agent4.md`.
