# LEMBAR TUGAS AGENT 3: KESIAPAN ARMADA, CARRY-OVER STATUS, & DIRTY STATE PLOTING

## Domain Berkas Eksklusif
- `backend/src/controllers/readinessController.js`
- `frontend/src/pages/HalamanKesiapanKendaraan.jsx`
- `frontend/src/pages/HalamanPenugasan.jsx`
- `frontend/src/pages/mobile/MobilePloting.jsx`

---

## Rincian Butir Tugas

### Poin 1: Koreksi Transisi Status & Carry-Over Kendaraan di `readinessController.js`
- **Deskripsi Masalah**:
  - Saat ploting disimpan, sistem membuat record log baru dengan `status = 'belum_dilaporkan'` di tabel `vehicle_readiness_logs`.
  - Di `readinessController.js` pada fungsi `calculateVehicleTransitionsData` (baris 667-674), pembacaan `latestLog` yang bernilai `'belum_dilaporkan'` tidak memiliki penanganan carry-over status sebelumnya, sehingga transisi statusnya langsung jatuh ke fallback default `'serviceable'`.
  - Hal ini menyebabkan armada yang sebenarnya rusak (*unserviceable*) di shift kemarin mendadak tampil sebagai *serviceable* (siap operasi) di laporan dan pratinjau PDF shift saat ini!
- **Dampak / Risiko**:
  - Bahaya fatal keselamatan operasional penerbangan: kendaraan yang pompa airnya rusak atau mesin mogok tercatat siap beroperasi di dokumen resmi bandara tanpa pernah dicek oleh teknisi/PIC.
- **Instruksi Solusi Konkret**:
  - Di `backend/src/controllers/readinessController.js`:
    1. Pada pembacaan status kendaraan shift saat ini: jika log terbaru berstatus `'belum_dilaporkan'`, lakukan reverse lookup pada log shift sebelumnya.
    2. Jika shift sebelumnya berstatus `'unserviceable'` dan belum ada tindak lanjut selesai (`follow_up_status != 'resolved'`), maka status armada tersebut WAJIB tetap `'unserviceable'`.
    3. Jika tidak ada carry-over kerusakan, maka status armada tetap `'belum_dilaporkan'` (*Belum Dicek*). JANGAN dipaksa berubah menjadi `'serviceable'` sebelum ada laporan fisik dari PIC.

---

### Poin 2: Visual Badge & Rute Navigasi di `HalamanKesiapanKendaraan.jsx`
- **Deskripsi Masalah**:
  - Tombol *"Laporan"* di header `HalamanKesiapanKendaraan.jsx` masih menautkan user ke rute lama `/armada/laporan`.
  - Tampilan UI belum memiliki styling khusus untuk status `'belum_dilaporkan'`.
- **Dampak / Risiko**:
  - Navigasi tidak sinkron dengan rute RESTful baru. Status armada yang belum dicek tampak membingungkan atau dianggap error.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/pages/HalamanKesiapanKendaraan.jsx`:
    1. Arahkan tombol *"Laporan"* ke rute baru `/vehicles/reports`.
    2. Tambahkan pemetaan styling badge untuk status `'belum_dilaporkan'`:
       - Gunakan warna abu-abu netral: `bg-slate-700/60 text-slate-300 border border-slate-600/50`.
       - Label tampilan: *"Belum Dicek"*.

---

### Poin 3: Dirty State Tracking, Floating Save Bar, & Route Guard di `HalamanPenugasan.jsx` & `MobilePloting.jsx`
- **Deskripsi Masalah**:
  - Di halaman ploting desktop maupun mobile, saat pengguna mengubah formasi penempatan personel armada, tidak ada indikator visual bahwa data tersebut sedang dalam kondisi "belum disimpan" (*dirty state*).
  - Jika pengguna tidak sengaja berpindah halaman atau me-refresh browser, seluruh penataan kru hilang tanpa peringatan.
- **Dampak / Risiko**:
  - Chief atau asisten sering lupa menekan tombol "Simpan Ploting", mengira data sudah otomatis tersimpan, sehingga formasi dinas shift aktif menjadi kosong/hilang di database.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/pages/HalamanPenugasan.jsx` & `frontend/src/pages/mobile/MobilePloting.jsx`:
    1. Simpan snapshot formasi awal saat data pertama kali dimuat (`initialSlotsRef` atau state `initialSlots`).
    2. Buat computed flag `hasUnsavedChanges = JSON.stringify(initialSlots) !== JSON.stringify(vehicleSlots)`.
    3. Jika `hasUnsavedChanges === true`:
       - Tampilkan **Floating Bottom Bar** mengambang di bawah layar:
         Teks: *"Terdapat perubahan formasi ploting yang belum disimpan!"*
         Tombol: *"Simpan Ploting"* dengan efek animasi denyut halus (`animate-pulse ring-2 ring-amber-500/50`).
       - Pasang proteksi browser `window.onbeforeunload`:
         ```javascript
         useEffect(() => {
           const handleBeforeUnload = (e) => {
             if (hasUnsavedChanges) {
               e.preventDefault();
               e.returnValue = '';
             }
           };
           window.addEventListener('beforeunload', handleBeforeUnload);
           return () => window.removeEventListener('beforeunload', handleBeforeUnload);
         }, [hasUnsavedChanges]);
         ```
       - Pasang dialog konfirmasi instan `window.confirm("Perubahan ploting belum disimpan. Yakin ingin meninggalkan halaman?")` jika user mencoba bernavigasi keluar sebelum menyimpan.

---

### Poin 4: Eliminasi Request Duplikat di `MobilePloting.jsx`
- **Deskripsi Masalah**:
  - `MobilePloting.jsx` memanggil dua endpoint API secara berurutan: `/vehicles?is_active=1` dan `/readiness/vehicles`. Padahal `/readiness/vehicles` sudah mengembalikan data master armada lengkap dengan status kesiapannya.
- **Dampak / Risiko**:
  - Pemborosan bandwidth jaringan dan peningkatan *Total Blocking Time* (TBT) di perangkat mobile.
- **Instruksi Solusi Konkret**:
  - Hapus pemanggilan duplikat `/vehicles?is_active=1` di `MobilePloting.jsx` dan gunakan data dari respons `/readiness/vehicles` secara langsung.

---

## Instruksi Pelaporan Temuan Tambahan, Bug, Ide, & Saran
Apabila selama proses audit maupun perbaikan kode Anda menemukan:
- **Bug / Masalah Baru**: Error, glitch, atau cacat logika tambahan yang belum tercantum di tugas ini.
- **Risiko Keamanan / Integritas Data**: Celah otentikasi, potensi tabrakan data, atau regresi performa.
- **Ide / Saran Pengembangan**: Usulan optimasi UI/UX, efisiensi komponen, atau ide fitur yang relevan bagi operasional.

**ATURAN TINDAKAN**:
1. **Dilarang keras memodifikasi berkas di luar domain eksklusif Agent 3 secara sepihak.**
2. **Catat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporan Anda (`masak/temp/hasil_agent3.md`)** menggunakan format poin hierarkis:
   - **Judul Temuan / Ide**: Ringkasan topik.
   - **Deskripsi Masalah / Konsep**: Penjelasan detail teknis.
   - **Dampak / Manfaat**: Urgensi atau keuntungan bagi pengguna.
   - **Rekomendasi Tindak Lanjut**: Saran perbaikan konkret untuk diorkestrasi selanjutnya.

---

## Verifikasi & Pelaporan
1. Jalankan `node -c backend/src/controllers/readinessController.js`.
2. Jalankan `npm run build` di root frontend.
3. Tuliskan ringkasan hasil kerja secara mandiri di `masak/temp/hasil_agent3.md`.
