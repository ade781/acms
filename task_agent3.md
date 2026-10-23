# PANDUAN EKSEKUSI AGENT 3: FASE PERBAIKAN TOTAL (PLOTING PENUGASAN SHIFT & FITUR CUTI)

> 🚀 **MANDAT FASE 3 (EKSEKUSI PERBAIKAN KODE & PENGUJIAN):**
> 1. **EKSEKUSI SELURUH PERBAIKAN DI BAWAH INI** pada berkas yang menjadi tanggung jawab Anda.
> 2. **BATAS KODE EKSKLUSIF (ZERO COLLISION)**: Hanya edit berkas domain Agent 3.
> 3. **SEMUA PENGUJIAN DI FOLDER `masak/`**: Dilarang membuat folder `tests/` di `backend/` atau `frontend/`.
> 4. **VALIDASI SISTEM VIA CLI**: Jalankan `node -c` dan pastikan sintaks 100% valid.
> 5. **LAPORAN HASIL KERJA MANDIRI**: Tuliskan laporan perbaikan ke `masak/temp/hasil_agent3.md`.

---

## Daftar Pekerjaan Eksekusi Perbaikan Agent 3

1. **Perbaiki Feedback Notifikasi Simpan Ploting di Desktop (`HalamanPenugasan.jsx`)**:
   - Di `fetchDeploymentData()`, hapus panggilan `setSuccessMsg(null)` yang menghapus pesan sukses dalam 0 ms.
   - Ubah styling banner notifikasi sukses menjadi fixed floating pill di viewport layar (misal pojok kanan bawah atau tengah atas) dengan timer auto-dismiss 3–4 detik, agar selalu terlihat oleh pengguna pada posisi scroll manapun.

2. **Perbaiki Posisi Notifikasi Simpan Ploting di Mobile (`MobilePloting.jsx`)**:
   - Ubah kontainer `toastMsg` (baris 520–534) dari in-flow dokumen biasa menjadi floating fixed pill di viewport: `fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm shadow-lg`.
   - Tambahkan efek timer auto-dismiss (`setTimeout` 3000 ms) agar toast menghilang secara otomatis setelah 3 detik.

3. **Perbaiki Tombol Cuti Mandiri Macet di Profil Mobile**:
   - Di `frontend/src/components/mobile/MobileLayout.jsx`, tangani event `arff:open-leave-modal` dengan memasang listener `window.addEventListener('arff:open-leave-modal', ...)` yang mengontrol pembukaan `MobileLeaveModal` secara global, sehingga klik tombol `+ Cuti Mandiri` di Profil langsung membuka modal tanpa macet.

4. **Sediakan Prop Handler `onOpenCutiModal` di `frontend/src/App.jsx`**:
   - Di `App.jsx` baris 112, teruskan prop `onOpenCutiModal` ke rute `<MobilePloting />` agar tombol `+ Cuti Saya` pada header bagian ketidakhadiran tampil dan bisa diklik oleh pengguna.

5. **Perbaiki Penolakan HTTP 400 Akun Admin & Sediakan Dropdown Personel di `MobileLeaveModal.jsx`**:
   - Di `MobileLeaveModal.jsx`, jika pengguna adalah Admin atau Chief/Supervisor, tampilkan dropdown pilihan personel aktif agar dapat memilih anggota yang diajukan cuti.
   - Di `backend/src/controllers/deploymentController.js` (fungsi `requestLeaveRange`), tangani kasus saat `personnel_id` tidak ada pada akun admin: pastikan `targetPersonnelId` divalidasi dengan aman dan informatif.

6. **Tangani Pembatalan Cuti Lokal (Timestamp ID) di `MobilePloting.jsx`**:
   - Di fungsi `handleConfirmCancelLeave`, jika item cuti berstatus lokal (`Date.now()`), jangan kirimkan `DELETE /api/deployments/leave/:id` ke backend (yang memicu error 404), melainkan cukup hapus dari state lokal `absentList` dan perbarui draf.

7. **Render Tabel / Panel Daftar Personel Izin/Cuti di Desktop (`HalamanPenugasan.jsx`)**:
   - Tambahkan panel "Daftar Personel Izin / Cuti Shift Ini" di bagian bawah grid armada pada `HalamanPenugasan.jsx` (lengkap dengan badge alasan dan tombol aksi), sehingga pengawas desktop memiliki visibilitas anggota yang berhalangan dinas.

8. **Perbaiki Notifikasi Cuti Cepat Hilang di Desktop (`HalamanCuti.jsx`)**:
   - Di `HalamanCuti.jsx`, hapus `setSuccessMsg(null)` pada awal fungsi `fetchLeaveData()` agar notifikasi sukses simpan cuti tidak terhapus seketika.

9. **Terapkan Auto-Evict Kru Cuti dari Slot Armada di Desktop**:
   - Di `HalamanPenugasan.jsx`, saat data cuti dimuat atau saat personel dicatat cuti, otomatis kosongkan slot armada yang sebelumnya ditempati oleh personel tersebut agar tidak memicu error tabrakan data saat simpan.

10. **Lengkapi Opsi Alasan Ketidakhadiran di `MobileLeaveModal.jsx`**:
    - Tambahkan opsi `<option value="tukar_dinas">Tukar Dinas</option>` agar konsisten dengan desktop dan lembar ploting.

---

## Format Pelaporan Mandiri di `masak/temp/hasil_agent3.md`

Setelah seluruh kode di atas diperbaiki dan divalidasi via CLI:
Tuliskan rincian hasil pekerjaan, berkas yang diubah, dan bukti pengujian ke dalam `masak/temp/hasil_agent3.md`.
