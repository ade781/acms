# TUGAS AGENT 2: KESIAPAN ARMADA, WATCHROOM & HALAMAN LAPORAN ARMADA

**Peran**: Spesialis Kesiapan Armada, Watchroom & Pengumuman/Edaran Dinas  
**Status**: 🚀 **FASE EKSEKUSI FITUR BARU, AUDIT TAHAP 2 & REKOMENDASI**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/readinessController.js`
- `backend/src/routes/readinessRoutes.js`
- `backend/src/controllers/vehicleController.js`
- `frontend/src/pages/HalamanKesiapanArmada.jsx`
- `frontend/src/pages/HalamanLaporanArmada.jsx` (halaman baru laporan armada)
- `frontend/src/components/forms/VehicleReadinessModal.jsx`

## 2. Butir Tindakan & Mandat
1. **Saran 1 (Konsolidasi Watchroom)**:
   - Satukan status dan log posko Watch Room ke dalam struktur data fasilitas khusus agar sinkron dengan kelaikan armada.
2. **Instruksi Tambahan Pengguna: Tombol & Halaman Laporan Armada Penuh (`/armada/laporan`)**:
   - Di `HalamanKesiapanArmada.jsx`, tambahkan tombol **"Laporan Kesiapan Armada" / "Report"** di bagian header aksi yang membuka rute `/armada/laporan`.
   - Buat halaman baru `HalamanLaporanArmada.jsx`:
     - Tombol navigasi kembali (*Back ke Kesiapan Armada*).
     - **Filter Periode Baku**:
       - Default: **1 Bulan Terakhir**
       - Pilihan Cepat: **3 Bulan**, **1 Tahun**
       - **Kustom**: Pilihan memilih rentang tanggal awal s.d. tanggal akhir (*Start Date* s.d. *End Date*).
     - **Tabel Data Armada**:
       - Menampilkan seluruh kendaraan operasional ARFF.
       - Kategori armada, status kelaikan saat ini (*Serviceable* / *Unserviceable*).
       - **Metrik Transisi Status**: Berapa kali kendaraan berganti status (*serviceable* ke *unserviceable* dan sebaliknya) pada periode yang dipilih, dihitung per shift/per hari.
       - Daftar tanggal & catatan kendala saat kendaraan mengalami unserviceable pada periode tersebut.
     - **Tombol Ekspor / Cetak PDF**: Memanggil generator PDF laporan kelaikan armada (Agent 5).
3. **Endpoint Agregasi Transisi Status di Backend**:
   - Di `readinessController.js`, buat endpoint API `GET /api/readiness/transitions-report` yang menerima query `?period=1month|3months|1year` atau `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`.
   - Hitung pergantian status kelaikan per armada berdasarkan riwayat shift log di database.
4. **Cari List Kesalahan / Celah Baru**:
   - Sisir logika kelaikan kendaraan, carryover kerusakan, dan audit trail armada untuk menemukan celah baru.
5. **Berikan Saran / Ide Pengembangan Lanjutan**:
   - Tuliskan ide-ide inovatif untuk perawatan armada, reminder servis, atau telemetri kendaraan di laporan Anda.

## 3. Kewajiban Laporan
Setelah audit dan verifikasi via CLI (`node -c`, `npm run build`):
- Tuliskan temuan masalah, status implementasi, dan ide/saran baru Anda ke: [`masak/temp/hasil_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent2.md).
