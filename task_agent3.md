# PENUGASAN AGENT 3: KEAMANAN, OTORISASI RBAC, PENCEGAHAN IDOR & RATE LIMITING

**Domain Berkas Eksklusif**:
- `backend/src/routes/activityRoutes.js`
- `backend/src/controllers/activityController.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/controllers/authController.js`
- `backend/src/middleware/authMiddleware.js`
- `backend/src/middleware/errorHandler.js`
*(DILARANG memodifikasi berkas di luar domain ini untuk mencegah tabrakan berkas / zero file collision)*

---

### BUTIR TUGAS 1: Proteksi Autentikasi Berkas Sensitif `/uploads/*` (Temuan #26)
* **Lokasi Berkas**: `backend/src/middleware/authMiddleware.js`
* **Deskripsi Masalah**: Seluruh foto bukti investigasi insiden darurat dan dokumen kepegawaian dapat diakses siapa saja di internet jika URL berkas diketahui tanpa memerlukan login atau token JWT.
* **Dampak / Risiko**: Kebocoran data sensitif operasional dan kerahasiaan insiden bandara ke publik.
* **Instruksi Solusi Konkret**:
  1. Siapkan fungsi middleware verifikasi berkas `verifyUploadAccess` di `authMiddleware.js` yang mendukung otentikasi fleksibel: membaca token dari header `Authorization: Bearer <token>` maupun query string `?token=...` (sesuai aturan GEMINI.md Butir 16).
  2. Tolak akses tanpa token valid dengan status HTTP 401 Unauthorized.

---

### BUTIR TUGAS 2: Penutupan Celah IDOR pada Logbook Kegiatan (Temuan #27)
* **Lokasi Berkas**: `backend/src/controllers/activityController.js` (pada method `updateActivity` dan `deleteActivity`)
* **Deskripsi Masalah**: Handler hanya memeriksa `WHERE id = ?` tanpa memverifikasi apakah personel/regu yang melakukan edit/delete adalah pemilik sah catatan kegiatan atau berstatus admin/chief yang berwenang.
* **Dampak / Risiko**: Kerentanan *Insecure Direct Object Reference* (IDOR) & Horizontal Privilege Escalation; kru regu lain dapat mengubah atau menghapus catatan kegiatan shift yang bukan wewenangnya.
* **Instruksi Solusi Konkret**:
  1. Ambil data kegiatan dari database terlebih dahulu.
  2. Tambahkan validasi otorisasi: Izinkan mutasi data HANYA jika `req.user.role === 'admin'`, atau `req.user.role === 'chief'` pada regu yang sama, atau `activity.created_by === req.user.id`.
  3. Kembalikan status HTTP 403 Forbidden dengan pesan jelas jika di luar wewenang.

---

### BUTIR TUGAS 3: Penyelarasan Otorisasi RBAC Middleware vs Controller (Temuan #28)
* **Lokasi Berkas**: `backend/src/routes/activityRoutes.js` & `backend/src/controllers/activityController.js`
* **Deskripsi Masalah**: Pada file rute `activityRoutes.js`, middleware `requireRole(['admin', 'chief'])` membatasi hak akses, namun komentar atau logika di controller membolehkan kru mencatat kegiatan dinas.
* **Dampak / Risiko**: Inkonsistensi izin akses; kru operasional sah yang ditugaskan mencatat kegiatan lapangan terblokir dengan HTTP 403.
* **Instruksi Solusi Konkret**: Selaraskan definisi hak akses peran (*Role-Based Access Control*). Izinkan peran `crew` untuk membuat kegiatan baru (`createActivity`), namun batasi hak hapus hanya untuk `admin` dan `chief`.

---

### BUTIR TUGAS 4: Pemasangan Rate Limiting pada Endpoint Login (Temuan #29)
* **Lokasi Berkas**: `backend/src/routes/authRoutes.js` (atau middleware terkait)
* **Deskripsi Masalah**: Endpoint `/api/auth/login` tidak memiliki pembatasan frekuensi percobaan (*rate limiter*).
* **Dampak / Risiko**: Rentan terhadap serangan brute-force tebakan password NIP secara massal dan CPU exhaustion akibat hashing bcrypt berulang.
* **Instruksi Solusi Konkret**:
  1. Pasang package `express-rate-limit` pada rute `/api/auth/login`.
  2. Terapkan konfigurasi: maksimal 10 percobaan gagal per 15 menit per IP address.
  3. Berikan respon HTTP 429 Too Many Requests jika batas terlampaui: "Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi dalam 15 menit."

---

### BUTIR TUGAS 5: Mekanisme Revokasi Token JWT saat Ganti Password & Logout (Temuan #30)
* **Lokasi Berkas**: `backend/src/controllers/authController.js` & `backend/src/middleware/authMiddleware.js`
* **Deskripsi Masalah**: Saat pengguna mengganti password atau mengklik logout, token JWT lama tetap valid hingga masa kedaluwarsa habis karena tidak ada validasi versi token atau revocation tracking.
* **Dampak / Risiko**: Sesi lama pada perangkat yang hilang atau dicuri tetap dapat mengakses sistem meskipun kredensial sudah diubah oleh admin.
* **Instruksi Solusi Konkret**:
  1. Manfaatkan kolom `token_version` atau kolom `updated_at` password pada tabel `users`.
  2. Saat ganti password berhasil di `changePassword`, naikkan nilai `token_version = token_version + 1`.
  3. Di middleware `authMiddleware.js`, verifikasi apakah `payload.token_version === user.token_version`. Jika tidak cocok, tolak request dengan HTTP 401 Unauthorized (token hangus).

---

### BUTIR TUGAS 6: Sanitasi Respons Error HTTP 500 Global (Temuan #39)
* **Lokasi Berkas**: `backend/src/middleware/errorHandler.js`
* **Deskripsi Masalah**: Ketika terjadi error runtime database atau server, middleware error mengembalikan objek error mentah (`err.message`, `err.stack`, dan query SQL internal) ke respon klien.
* **Dampak / Risiko**: Kebocoran informasi arsitektur database (*Information Disclosure*) yang dapat dimanfaatkan penyerang untuk merancang injeksi SQL.
* **Instruksi Solusi Konkret**:
  1. Buka `errorHandler.js`.
  2. Pada kondisi `NODE_ENV === 'production'`, pastikan respon HTTP 500 HANYA mengembalikan pesan generik aman:
     `{ success: false, message: "Terjadi kesalahan internal pada server operasional." }`.
  3. Catat detail stack trace dan query SQL hanya ke log terminal server (`console.error`), jangan pernah bocorkan ke payload klien.

---

### KANAL TERBUKA TEMUAN, BUG, IDE & SARAN TAMBAHAN
Apabila selama proses eksekusi Agent 3 menemukan kelemahan sistem lain, bug tersembunyi, celah logika, ide pengembangan, atau saran optimasi UI/UX di luar tugas utamanya, **Agent 3 DILARANG mengubah kode di luar domainnya secara sepihak**. Agent 3 WAJIB mencatat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporannya (`masak/temp/hasil_agent3.md`) agar dapat dievaluasi oleh Pengawas.

### INSTRUKSI AKHIR & VALIDASI
* Validasi sintaks backend melalui CLI terminal:
  `node -c backend/src/controllers/activityController.js backend/src/controllers/authController.js backend/src/middleware/authMiddleware.js backend/src/middleware/errorHandler.js`.
* Tuliskan hasil pekerjaan dan bukti verifikasi CLI di `masak/temp/hasil_agent3.md`.
* DILARANG melakukan `git commit` atau `git push` otomatis.
* DILARANG menggunakan tool `browser_subagent`.
