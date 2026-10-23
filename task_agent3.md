# PANDUAN TUGAS AGENT 3: MOBILE PLOTING 8 UNIT ARMADA, CREW PICKER & KELOLA CUTI

## Status Kinerja & Evaluasi Agent 3
- **Skor Kinerja**: 98% (Luar Biasa — Proteksi Akses Shift, Efisiensi Server & Penyelarasan Baku)
- **Capaian Positif Terkini**:
  1. Proteksi Hak Akses Shift ("Bukan Shift Anda"): Jika Chief/user membuka menu Ploting pada shift yang bukan jadwal dinas regunya, sistem otomatis menolak rendering form unit dan menampilkan layar santun *"Bukan Shift Dinas Anda"*.
  2. Efisiensi Request Server: Saat bukan shift dinas user, pemanggilan API berat di-skip (`early return`), menghemat bandwidth dan kapasitas server.
  3. Simpan Ploting Eksplisit: Seluruh pemilihan kru murni dikelola di state lokal React (`useState`). Permintaan HTTP (`POST /api/deployments/batch`) HANYA dikirimkan ketika user menekan tombol **"Simpan Ploting"** di header.
  4. Tampilan Ploting 8 Unit Rapat (*compact flat rows* tipis 1px) bebas nested cards bloat.
  5. Penyelarasan Dokumen: Berkas acuan `plan.md` telah resmi dihapus dan panduan aturan terpusat pada `GEMINI.md`.

---

## Mandat Integritas Ploting & Anti-Race Condition
1. **Validasi Backend Anti-Tabrakan Slot (Zero Duplicate Assignment)**:
   - Backend `saveDeploymentBatch` di `deploymentController.js` wajib memvalidasi bahwa tidak ada satu personel yang ditugaskan pada dua slot unit berbeda dalam shift yang sama.
   - Jika dua pengguna secara bersamaan mencoba mengisi slot yang sama, transaksi database harus memvalidasi integritas state secara atomik.
2. **Validasi Personel Berstatus Cuti**:
   - Backend wajib menolak penugasan personel yang sedang tercatat izin/cuti aktif pada shift tersebut, kecuali status cutinya telah dibatalkan secara sah terlebih dahulu.
3. **Sinkronisasi PIC pada `vehicle_readiness_logs`**:
   - Setiap kali terjadi pergantian PIC pada unit armada, identitas PIC pada log kelaikan shift harus otomatis tersinkronisasi.

---

## Audit Fungsi & Endpoint Agent 3

| Endpoint | Metode | Fungsi Backend (Controller) | Fungsi Frontend (Handler) | Status Verifikasi |
| :--- | :---: | :--- | :--- | :---: |
| `/api/personnel` | GET | `getPersonnel` (`personnelController.js`) | `loadPlotingData` di `MobilePloting.jsx` | ✅ Aktif (Hanya dipanggil saat shift user) |
| `/api/vehicles` | GET | `getVehicles` (`vehicleController.js`) | `loadPlotingData` di `MobilePloting.jsx` | ✅ Aktif (8 unit operasional bandara YIA) |
| `/api/readiness/vehicles` | GET | `getVehiclesReadiness` (`readinessController.js`) | `loadPlotingData` di `MobilePloting.jsx` | ✅ Aktif (Status kelaikan & PIC aktif) |
| `/api/deployments/current` | GET | `getCurrentDeployments` (`deploymentController.js`) | `loadPlotingData` di `MobilePloting.jsx` | ✅ Aktif (Penugasan terdaftar saat ini) |
| `/api/deployments/save` | POST | `saveDeployments` (`deploymentController.js`) | `handleSavePloting` di `MobilePloting.jsx` | ✅ Aktif (Hanya saat tombol Simpan ditekan) |
| `/api/deployments/leave` | POST | `submitLeave` (`deploymentController.js`) | `handleAddAbsentCrew` di `MobilePloting.jsx` | ✅ Aktif (Pencatatan cuti anggota oleh Chief) |
| `/api/deployments/leave/:id` | DELETE | `cancelLeave` (`deploymentController.js`) | `handleExecuteCancelLeave` di `MobilePloting.jsx` | ✅ Aktif (Kembalikan kru ke status dinas) |

---

## Rincian Tanggung Jawab Lanjutan Agent 3
1. **Validasi Backend Duplikasi Kru**: Tambahkan pengecekan `Set(personnel_ids).size === personnel_ids.length` pada backend `saveDeploymentBatch`.
2. **Validasi Slot PIC Wajib**: Memastikan unit yang berpenumpang kru wajib memiliki penanggung jawab (PIC) di slot 0.
3. **Validasi Build CLI**: Jalankan `npm run build` dan pastikan 0 error.
