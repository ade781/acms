# PANDUAN EKSEKUSI AGENT 5: FASE PERBAIKAN TOTAL (JADWAL DINAS, REKAP LAPORAN, EXPORT PDF A4 & DATABASE)

> 🚀 **MANDAT FASE 3 (EKSEKUSI PERBAIKAN KODE & PENGUJIAN):**
> 1. **EKSEKUSI SELURUH PERBAIKAN DI BAWAH INI** pada berkas yang menjadi tanggung jawab Anda.
> 2. **BATAS KODE EKSKLUSIF (ZERO COLLISION)**: Hanya edit berkas domain Agent 5.
> 3. **SEMUA PENGUJIAN DI FOLDER `masak/`**: Dilarang membuat folder `tests/` di `backend/` atau `frontend/`.
> 4. **VALIDASI SISTEM VIA CLI**: Jalankan `node -c` dan pastikan sintaks 100% valid.
> 5. **LAPORAN HASIL KERJA MANDIRI**: Tuliskan laporan perbaikan ke `masak/temp/hasil_agent5.md`.

---

## Daftar Pekerjaan Eksekusi Perbaikan Agent 5

1. **Lengkapi Pratinjau Rekapitulasi Laporan Dinas di Desktop (`HalamanLaporan.jsx`)**:
   - Selaraskan fetching data di `HalamanLaporan.jsx` seperti pada versi mobile menggunakan `Promise.allSettled` untuk memanggil endpoint:
     * `/api/readiness/vehicles` (Tabel kesiapan 8 armada lengkap dengan PIC & catatan kelaikan)
     * `/api/readiness/watchroom` (Status kesiapan posko watchroom)
     * `/api/activities` (Tabel logbook kegiatan shift)
     * `/api/incidents` (Tabel rekapitulasi insiden kejadian darurat)
   - Render tabel-tabel tersebut di lembar pratinjau desktop sehingga lengkap dan setara dengan dokumen cetak resmi PDF.

2. **Perbarui Kop Surat Dokumen Laporan Dinas Desktop**:
   - Di `HalamanLaporan.jsx` baris 125–128, perbarui header kop surat agar identik dengan standar resmi:
     *"PT ANGKASA PURA INDONESIA - KANTOR CABANG BANDARA INTERNASIONAL YOGYAKARTA (YIA) - AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION • KODE WAHI • KATEGORI 8"*
     serta sertakan nomor dinas dinamis: `NOMOR: DSR/ARFF-YIA/{YYYYMMDD}/S{SHIFT}`.

3. **Perbaiki Gagal Autentikasi (401) saat "Buka Layar Penuh" PDF di Mobile**:
   - Di `frontend/src/components/mobile/reports/MobilePdfViewerModal.jsx` baris 47–48, ubah pembacaan token dari local storage agar membaca kunci `'arff_token'` (bukan `'token'`), dan utamakan nilai token aktif dari `AuthContext`.

4. **Perbaiki Potensi Error 404 URL Ganda `/api/api/reports/pdf` di Mobile**:
   - Di `MobilePdfViewerModal.jsx` baris 48 & 60, hilangkan awalan `/api` ganda saat memanggil instance Axios `api.get` agar URL tidak menjadi `/api/api/reports/pdf`.

5. **Ganti Popup Native `window.confirm` & `window.alert` di `HalamanJadwal.jsx`**:
   - Di baris 228 & 239 pada fungsi `handleResetToDefault`, ganti dialog native browser dengan modal konfirmasi dan toast notifikasi visual in-app sesuai Rule 10 `GEMINI.md`.

6. **Perbaiki Dead Click pada Grid Kalender Jadwal bagi Kru Biasa**:
   - Di `HalamanJadwal.jsx`, kondisikan class `cursor-pointer` dan handler klik hanya aktif bagi pengguna dengan role pimpinan/admin (`isAdmin || isSupervisor`). Untuk kru biasa, gunakan `cursor-default` tanpa aksi klik kosong.

7. **Tambahkan Penanganan Visual Error pada Pratinjau Laporan Desktop**:
   - Di `HalamanLaporan.jsx`, tangani blok `catch` pada `fetchShiftData`: tampilkan banner notifikasi error yang jelas dilengkapi tombol "Muat Ulang Data", hilangkan kegagalan hening (*silent failure*).

8. **Kirim Data Personel Cuti ke Generator PDF Dokumen Resmi A4**:
   - Di `backend/src/controllers/reportController.js` pada fungsi `getShiftReportPdf`, ambil seluruh data personel yang berstatus cuti/izin pada shift terkait dan teruskan ke `generateShiftReportPdf` di `backend/src/services/pdfService.js`, sehingga dokumen cetak resmi mencantumkan daftar nama dan alasan cuti secara akurat (tidak lagi tercetak "0 Orang Cuti").

9. **Teruskan Anchor Date Kustom ke `getScheduleCyclePreview`**:
   - Di `backend/src/controllers/scheduleController.js` baris 210, ambil nilai `schedule_anchor_date` dari `system_settings` dan teruskan ke `resolveRosterForDate(dateStr, storedCycles, anchorDate)`.

10. **Integritas Penempatan Pengujian Murni di Folder `masak/`**:
    - Seluruh skrip uji coba dan testing otomatis tetap wajib ditempatkan di dalam folder `masak/` (misal: `masak/temp/test_report.js`). Dilarang membuat folder `tests/` di backend/frontend.

---

## Format Pelaporan Mandiri di `masak/temp/hasil_agent5.md`

Setelah seluruh kode di atas diperbaiki dan divalidasi via CLI:
Tuliskan rincian hasil pekerjaan, berkas yang diubah, dan bukti pengujian ke dalam `masak/temp/hasil_agent5.md`.
