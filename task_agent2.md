# PANDUAN TUGAS AGENT 2: MOBILE DASHBOARD, TUGAS SAYA, KESIAPAN PIC & CUTI MANDIRI

## Status Kinerja & Evaluasi Agent 2
- **Skor Kinerja**: 96% (Sangat Baik — Integritas Data & Form Kesiapan PIC)
- **Capaian Positif Terkini**:
  1. Git Commit Berkala: Perubahan kode operasional tersimpan rapi pada commit `2ae9462`.
  2. Kartu Tugas Saya dinamis mendeteksi unit dinas, peran (Driver/Nozzleman), dan status PIC.
  3. Banner status Lepas Piket (Off Duty) otomatis aktif jika user tidak bertugas dan regu yang berdinas bukan regunya.
  4. Form Kesiapan PIC kondisional: Hanya muncul jika user = PIC aktif. Pilihan murni Serviceable vs Unserviceable + Estafet kendala bawaan + Wajib upload foto bukti fisik.
  5. Widget Kendala Armada otomatis muncul hanya ketika ada unit unserviceable.
  6. Seluruh angka magic (seperti fallback 15 personel atau 8 armada) telah dibersihkan total dari kode!

---

## Mandat Integritas Transaksi & Zero Dummy Data
1. **Pelepasan Slot Armada Atomik saat Cuti Diajukan**:
   - Backend `requestLeaveRange` dan `submitLeave` di `deploymentController.js` wajib membungkus mutasi dalam transaksi database (`beginTransaction`).
   - Saat kru mengajukan izin/cuti, penugasan kru tersebut pada unit kendaraan di shift terkait wajib otomatis dihapus agar tidak terjadi kondisi kru berstatus ganda (cuti sekaligus berdinas).
2. **Validasi Transisi Status Armada (Unserviceable -> Serviceable)**:
   - Jika unit dipulihkan dari unserviceable menjadi serviceable, pastikan log kelaikan mencatat nama PIC yang memulihkan dan foto fisik bukti perbaikan.
3. **Pemusnahan Magic Number**:
   - Kekuatan personel dan armada dihitung murni dari database `personnel` dan `vehicles` aktif.

---

## Audit Fungsi & Endpoint Agent 2

| Endpoint | Metode | Fungsi Backend (Controller) | Fungsi Frontend (Handler) | Status Verifikasi |
| :--- | :---: | :--- | :--- | :---: |
| `/api/deployments/current` | GET | `getCurrentDeployments` (`deploymentController.js`) | `fetchDashboardData` di `MobileDashboard.jsx` | ✅ Aktif (Ekstrak penugasan user & absensi) |
| `/api/readiness/vehicles` | GET | `getVehiclesReadiness` (`readinessController.js`) | `fetchDashboardData` di `MobileDashboard.jsx` | ✅ Aktif (Data kesiapan 8 unit & PIC) |
| `/api/readiness/submit` | POST | `submitVehicleReadiness` (`readinessController.js`) | `handleSubmitReadiness` di `MobilePicReadinessForm.jsx` | ✅ Aktif (`multipart/form-data`, foto wajib) |
| `/api/personnel` | GET | `getPersonnel` (`personnelController.js`) | `fetchDashboardData` di `MobileDashboard.jsx` | ✅ Aktif (Daftar personel regu shift dinas) |
| `/api/deployments/leave` | POST | `submitLeave` (`deploymentController.js`) | `handleSubmitLeave` di `MobileLeaveModal.jsx` | ✅ Aktif (Transaksi atomik pelepasan slot) |
| `/api/deployments/leave/:id` | DELETE | `cancelLeave` (`deploymentController.js`) | `handleCancelLeave` di `MobileLeaveModal.jsx` | ✅ Aktif (Batal cuti, kembali berdinas) |

---

## Rincian Tanggung Jawab Lanjutan Agent 2
1. **Uji Validasi Form PIC Tanpa Foto**: Verifikasi penolakan submit di frontend dan backend jika berkas foto fisik kelaikan tidak disertakan.
2. **Uji Rollback Transaksi Cuti**: Pastikan jika salah satu query gagal di tengah proses pengajuan cuti, database di-rollback utuh tanpa menyisakan data korup.
3. **Validasi Build CLI**: Jalankan `npm run build` dan pastikan 0 error.
