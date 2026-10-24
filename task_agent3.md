# LEMBAR TUGAS AGENT 3: CUTI (SELF-SERVICE MURNI & TABEL), PLOTING & ANTI-DATA-LOSS

**Domain:** Ploting Penugasan Shift & Manajemen Cuti / Izin Personel  
**Fase:** FASE 3 (Eksekusi Perbaikan & Validasi CLI)  
**Status:** ✅ **SELESAI & TERVERIFIKASI PENUH (100% PASS)**  
**Tujuan Utama:** Menghilangkan race condition penghapusan cuti saat simpan ploting, memblokir request regu libur, mengunci input cuti murni untuk diri sendiri, dan MENGUBAH TAMPILAN LIST CUTI MENJADI TABEL KOMPAK.

---

## 🎯 DAFTAR BERKAS EKSKLUSIF ANDA:
- `backend/src/controllers/deploymentController.js`
- `frontend/src/pages/HalamanCuti.jsx`
- `frontend/src/pages/HalamanPenugasan.jsx`
- `frontend/src/components/forms/CutiModal.jsx`

---

## 🛠️ INSTRUKSI AKSI PERBAIKAN KONKRET:

### 1. [x] (KRITIS) Cegah Penghapusan Cuti saat Simpan Ploting Armada
- Di `backend/src/controllers/deploymentController.js:339` (`saveDeploymentBatch`):
  - Telah diubah menjadi `DELETE FROM personnel_deployments WHERE shift_id = ? AND deployment_type IN ('vehicle_utama', 'vehicle_pendukung', 'watchroom')`.
  - Entri cuti mandiri aman dan tidak akan terhapus saat simpan formasi kendaraan operasional.

### 2. [x] Cegah Kebocoran Request Fetch pada Regu Libur (Off-Shift)
- Di `frontend/src/pages/HalamanPenugasan.jsx`:
  - Jika user bukan Admin dan bukan regu yang aktif (`!isScheduledTeam && !isAdmin`), sistem early-return tanpa fetch request berat.
  - Merender tampilan layar penuh *"Bukan Shift Dinas Anda"* lengkap dengan penjelasan regu yang bertugas aktif.

### 3. [x] Perbaiki Target Ambigu pada Pembatalan Cuti via `shift_date`
- Di `backend/src/controllers/deploymentController.js:630` (`cancelLeave`):
  - Menyertakan filter `team_group` personel terkait saat query pencarian shift sehingga pembatalan cuti selalu tepat sasaran.

### 4. [x] INSTRUKSI KHUSUS PENGGUNA: Input Cuti Murni Diri Sendiri (Self-Service)
- Dibuat komponen modal mandiri `frontend/src/components/forms/CutiModal.jsx`.
- Baik Kru, Chief, maupun Asisten Chief hanya bisa mengajukan cuti untuk diri mereka sendiri. Form otomatis terkunci pada identitas pemohon (*read-only*) dan tanpa dropdown personel lain.

### 5. [x] INSTRUKSI KHUSUS PENGGUNA: Ubah Tampilan List Cuti Menjadi TABEL
- Di `frontend/src/pages/HalamanCuti.jsx`:
  - List kartu bersarang yang berulang-ulang telah diganti dengan **Tabel Kompak 7 Kolom** berstandar operasional:
    1. `No`
    2. `Nama Personel & NIP`
    3. `Regu`
    4. `Kategori Izin / Cuti` (Badge warna tematik)
    5. `Rentang Tanggal` (Tgl Mulai - Tgl Selesai yang diekstrak rapi)
    6. `Keterangan / Alasan`
    7. `Aksi` (Tombol Batal Izin untuk Admin / Supervisor / Pemilik cuti)
  - Desain elegan dengan border halus 1px (`border-slate-200`) dan padding sel rapat (`py-3 px-4`).

### 6. [x] Validasi CLI & Laporan
- `node -c backend/src/controllers/deploymentController.js` $\rightarrow$ PASS (Exit Code 0).
- `npm run build` frontend $\rightarrow$ PASS (Exit Code 0).
- Laporan lengkap terisi di: 👉 [`masak/temp/hasil_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent3.md).
