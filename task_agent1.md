# PANDUAN EKSEKUSI AGENT 1: FASE PERBAIKAN TOTAL (AUTH, SHELL, PERSONEL, STKP & PEJABAT)

> 🚀 **MANDAT FASE 3 (EKSEKUSI PERBAIKAN KODE & PENGUJIAN):**
> 1. **EKSEKUSI SELURUH PERBAIKAN DI BAWAH INI** pada berkas yang menjadi tanggung jawab Anda.
> 2. **BATAS KODE EKSKLUSIF (ZERO COLLISION)**: Hanya edit berkas domain Agent 1.
> 3. **SEMUA PENGUJIAN DI FOLDER `masak/`**: Dilarang membuat folder `tests/` di `backend/` atau `frontend/`.
> 4. **VALIDASI SISTEM VIA CLI**: Jalankan `node -c` dan pastikan sintaks 100% valid.
> 5. **LAPORAN HASIL KERJA MANDIRI**: Tuliskan laporan perbaikan ke `masak/temp/hasil_agent1.md`.

---

## Daftar Pekerjaan Eksekusi Perbaikan Agent 1

1. **Perbaiki Mismatch ENUM `cert_level` di `MobileEditProfileModal.jsx`**:
   - Di baris 151–153, ubah nilai `<option value="...">`:
     * Dari `"Basic Fire Fighter"` -> ubah ke value `"Basic"` (label tetap "Basic Fire Fighter").
     * Dari `"Junior Fire Fighter"` -> ubah ke value `"Junior"` (label tetap "Junior Fire Fighter").
     * Dari `"Senior Fire Fighter"` -> ubah ke value `"Senior"` (label tetap "Senior Fire Fighter").
   - Ini mencegah MySQL menolak data dengan error *Data truncated for column 'cert_level'*.

2. **Hilangkan Double Redirect / Layar Berkedip di `HalamanLogin.jsx`**:
   - Di baris 30, periksa role pengguna yang dikembalikan dari fungsi `login`.
   - Jika role tergolong lapangan (`chief`, `chief_assistant`, `senior_firefighter`, `junior_firefighter`, `firefighter`), langsung arahkan ke `/m/dashboard`.
   - Jika role adalah `admin` atau `dept_head`, arahkan ke `/dashboard`.

3. **Ganti Fallback Strip `"-"` Menjadi `null` di `HalamanDetailPersonel.jsx`**:
   - Di baris 149–160 pada fungsi `handleUpdatePersonnel`, ubah fallback atribut opsional (`nip`, `cert_number`, `formal_education`, `birth_date`) dari `|| '-'` menjadi `|| null` agar database tersimpan bersih.

4. **Tambahkan Fitur Reset Kata Sandi Personel ke 123456**:
   - Di `HalamanDetailPersonel.jsx`, tambahkan tombol *"Reset Password"* (khusus role `admin`) pada kartu kedinasan lengkap dengan modal/konfirmasi.
   - Di `backend/src/controllers/personnelController.js` & `personnelRoutes.js`, sediakan endpoint `POST /api/personnel/:id/reset-password` yang mengenkripsi ulang password menjadi hash `123456` dan mengatur flag `must_change_password = 1`.

5. **Hubungkan Avatar Header Desktop ke Profil Akun Mandiri di `Navbar.jsx`**:
   - Di baris 91–93, bungkus avatar inisial pengguna dengan tombol/link interaktif yang mengarahkan pengguna ke halaman profil akun miliknya (`/personnel/${user.personnel_id}`) sesuai mandat Rule 9 `GEMINI.md`.

6. **Tambahkan Pengelolaan Section Head di `HalamanKelolaPejabat.jsx` & `getOfficials`**:
   - Perluas query dan respon `getOfficials` di `personnelController.js` untuk menyertakan `section_head`.
   - Tambahkan kartu dan modal pergantian Section Head di `HalamanKelolaPejabat.jsx` (serupa dengan Dept. Head).

7. **Normalisasi Case-Insensitive Perbandingan Nama Regu di `getOfficials`**:
   - Di `personnelController.js` baris 775–780, gunakan `(c.team_group || '').toLowerCase().trim() === 'alpha'` dst., agar tidak gagal mencocokkan regu jika ada variasi huruf kecil/besar di database.

8. **Ganti Seluruh `window.alert()` dengan Toast Notifikasi Visual**:
   - Di `HalamanDetailPersonel.jsx` dan `MobileProfileView.jsx`, ganti seluruh alert blocking dengan toast notifikasi visual instan (hijau untuk sukses, merah untuk error) sesuai Rule 10 `GEMINI.md`.

9. **Tambahkan Dropdown Filter Lisensi STKP di `HalamanPersonel.jsx`**:
   - Pasang elemen dropdown pilihan tingkat lisensi STKP (`Semua Kualifikasi`, `Basic`, `Junior`, `Senior`) di samping input pencarian nama agar state `selectedCert` berfungsi nyata.

10. **Tambahkan Pagination Terstandar di `HalamanPersonel.jsx`**:
    - Pasang navigasi halaman dan batasan baris per halaman pada tabel katalog personel desktop.
    - *Catatan Penting*: Katalog personel tetap fokus 100% pada 4 regu dinas operasional (Alpha, Bravo, Charlie, Delta), tidak perlu menambah tab non-shift/Dept Head.

11. **Sanitasi `username.trim()` & Fallback `JWT_EXPIRES_IN` di Backend**:
    - Di `authController.js`, tambahkan `.trim()` pada username sebelum query database, dan tambahkan fallback `process.env.JWT_EXPIRES_IN || '24h'`.

---

## Format Pelaporan Mandiri di `masak/temp/hasil_agent1.md`

Setelah seluruh kode di atas diperbaiki dan divalidasi via CLI:
Tuliskan rincian hasil pekerjaan, berkas yang diubah, dan bukti pengujian ke dalam `masak/temp/hasil_agent1.md`.
