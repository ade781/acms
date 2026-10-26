# PENUGASAN AGENT 1: UI/UX DESKTOP, AKSESIBILITAS WCAG, ERROR BOUNDARY & STANDARISASI ANTI-SLOP

**Domain Berkas Eksklusif**:
- `frontend/index.html`
- `frontend/public/shield-alert.svg`
- `frontend/src/components/layout/Navbar.jsx`
- `frontend/src/components/dashboard/ShiftHeaderCard.jsx`
- `frontend/src/pages/OfficialsManagementPage.jsx`
- `frontend/src/pages/ShiftReportsPage.jsx`
- `frontend/src/pages/LeaveManagementPage.jsx`
- `frontend/src/components/common/ErrorBoundary.jsx`
- `frontend/src/main.jsx`
- Seluruh halaman desktop untuk AbortController (`PersonnelPage.jsx`, `DeploymentPage.jsx`, `ActivitiesPage.jsx`, `IncidentsPage.jsx`, `VehicleReadinessPage.jsx`)
*(DILARANG memodifikasi berkas di luar domain ini untuk mencegah tabrakan berkas / zero file collision)*

---

### BUTIR TUGAS 1: Pembuatan Aset Vektor Resmi Favicon `shield-alert.svg` (Temuan #1)
* **Deskripsi Masalah**: `frontend/index.html:5` memanggil `/shield-alert.svg`, tetapi berkas belum ada di `frontend/public/`. Vite menyajikan fallback `index.html` (1.1 kB `text/html`).
* **Dampak / Risiko**: Logo tab browser default, memboroskan 1 HTTP request awal, skor audit aset Lighthouse turun.
* **Instruksi Solusi Konkret**:
  1. Buat folder `frontend/public/` dan berkas `frontend/public/shield-alert.svg`.
  2. Gunakan vektor SVG murni lambang perisai ARFF YIA dengan palet warna resmi amber-ember/oranye-merah (`#ea580c` / `#f97316`), tanpa efek glow/blur norak. Atribut: `viewBox="0 0 24 24" width="32" height="32" fill="none"`.

---

### BUTIR TUGAS 2: Pemasangan Meta Description Resmi pada Dokumen HTML (Temuan #5)
* **Deskripsi Masalah**: `frontend/index.html` belum memiliki tag `<meta name="description">`.
* **Dampak / Risiko**: Skor SEO Lighthouse turun (skor 82), ringkasan PWA/shortcut desktop tidak memiliki deskripsi resmi.
* **Instruksi Solusi Konkret**: Tambahkan di dalam `<head>` pada `frontend/index.html`:
  `<meta name="description" content="Sistem Pemantauan Operasional ARFF YIA - Monitoring Personel, Armada, dan Laporan Dinas Shift" />`.

---

### BUTIR TUGAS 3: Koreksi Accessible Name Mismatch pada Tombol Profil Desktop (Temuan #4)
* **Lokasi Berkas**: `frontend/src/components/layout/Navbar.jsx`
* **Deskripsi Masalah**: Tombol profil memiliki `aria-label="Buka Profil Pribadi"`, tetapi di layar menampilkan nama pengguna. Screen reader tidak sinkron dengan visual.
* **Dampak / Risiko**: Pengguna difabel dengan kontrol suara gagal mengklik tombol profil; melanggar WCAG 2.5.3 (Label in Name).
* **Instruksi Solusi Konkret**: Ganti `aria-label` menjadi `aria-label={`Profil ${user?.name || user?.username || 'Pengguna'}`}` atau hilangkan `aria-label` agar teks visual dibaca alami.

---

### BUTIR TUGAS 4: Pembersihan Hardcoded Nama Pejabat Pimpinan di Placeholder Form (Temuan #2)
* **Lokasi Berkas**: `frontend/src/pages/OfficialsManagementPage.jsx:562`
* **Deskripsi Masalah**: Input nama Department Head tertulis statis `placeholder="Contoh: Tamsul Sadikin"`.
* **Dampak / Risiko**: Melanggar aturan GEMINI.md Butir 4 (Anti-Hardcode Nama Pejabat). Membingungkan saat terjadi mutasi pejabat baru.
* **Instruksi Solusi Konkret**: Ganti placeholder menjadi: `placeholder="Masukkan nama lengkap beserta gelar resmi..."`.

---

### BUTIR TUGAS 5: Peningkatan Rasio Kontras Teks Keterangan Laporan Dinas (Temuan #3)
* **Lokasi Berkas**: `frontend/src/pages/ShiftReportsPage.jsx`
* **Deskripsi Masalah**: Teks keterangan kendala kosong menggunakan `text-slate-400` di atas latar belakang terang (kontras 2.45:1).
* **Dampak / Risiko**: Keterangan sulit terbaca di bawah cahaya terang apron; melanggar WCAG AA (minimal 4.5:1).
* **Instruksi Solusi Konkret**: Tingkatkan utility warna dari `text-slate-400` menjadi `text-slate-600` (atau `text-slate-500 font-medium`).

---

### BUTIR TUGAS 6: Eliminasi Dead Control Insiden pada `ShiftHeaderCard` (Temuan #18)
* **Lokasi Berkas**: `frontend/src/components/dashboard/ShiftHeaderCard.jsx`
* **Deskripsi Masalah**: Kartu metrik insiden pada header memiliki styling hover seolah dapat diklik, namun tidak memicu aksi navigasi atau modal apa pun.
* **Dampak / Risiko**: Membingungkan pengguna yang mengira kartu tersebut dapat membuka daftar riwayat insiden.
* **Instruksi Solusi Konkret**: Tambahkan navigasi rute ke `/incidents` saat kartu metrik insiden diklik pengguna, atau hilangkan cursor pointer/hover jika murni indikator pasif.

---

### BUTIR TUGAS 7: Eliminasi Redundansi Informasi Shift Bertumpuk (Temuan #19)
* **Lokasi Berkas**: `frontend/src/components/layout/Navbar.jsx` & `frontend/src/components/dashboard/ShiftHeaderCard.jsx`
* **Deskripsi Masalah**: Teks status regu dinas dan tanggal aktif diulang bertumpuk di Navbar atas dan di banner `ShiftHeaderCard`.
* **Dampak / Risiko**: Melanggar prinsip anti-redundansi UI GEMINI.md Butir 1. Memboroskan ruang vertikal layar.
* **Instruksi Solusi Konkret**: Di Navbar, pertahankan hanya chip ringkas (contoh: "Regu Bravo • Shift 2"). Biarkan detail lengkap kalender dan perwira piket disajikan di dalam halaman melalui `ShiftHeaderCard`.

---

### BUTIR TUGAS 8: Penghapusan Animasi Berkedip Tanpa Henti (*Endless Pulse Loops*) (Temuan #23)
* **Lokasi Berkas**: Komponen desktop (`ShiftHeaderCard.jsx`, tombol status armada)
* **Deskripsi Masalah**: Penggunaan class Tailwind `animate-ping` atau `animate-pulse` terus menerus pada status operasional normal (hijau/standar).
* **Dampak / Risiko**: Mengalihkan konsentrasi pengguna, mengonsumsi siklus render GPU browser secara terus-menerus, dan melanggar aturan anti-AI-slop GEMINI.md Butir 9.
* **Instruksi Solusi Konkret**: Hapus `animate-ping` / `animate-pulse` dari badge operasional normal. Pertahankan animasi hanya untuk indikator darurat merah aktif (kebakaran pesawat/crash alarm). Gunakan dot statis yang elegan dan grounded.

---

### BUTIR TUGAS 9: Pembersihan Teks Filler "Rekapitulasi Berjalan (Real-Time)" (Temuan #24)
* **Lokasi Berkas**: `frontend/src/components/dashboard/ShiftHeaderCard.jsx`
* **Deskripsi Masalah**: Terdapat badge dengan teks jargon filler "Rekapitulasi Berjalan (Real-Time)" di header halaman.
* **Dampak / Risiko**: Melanggar prinsip GEMINI.md (Anti-Asumsi / Anti-Slop). Memperkeruh visual dengan informasi yang tidak esensial.
* **Instruksi Solusi Konkret**: Hapus teks jargon filler tersebut. Cukup tampilkan data waktu dinas aktual (contoh: "Pukul 08:00 - 20:00 WIB").

---

### BUTIR TUGAS 10: Eliminasi Concurrent Burst Requests pada Halaman Cuti (Temuan #11)
* **Lokasi Berkas**: `frontend/src/pages/LeaveManagementPage.jsx:184-215`
* **Deskripsi Masalah**: Saat membuka halaman `/leave`, terjadi 4 request independen secara bersamaan tanpa koordinasi data.
* **Dampak / Risiko**: Lonjakan koneksi simultan ke backend dan potensi kegagalan parsial jika salah satu endpoint lambat.
* **Instruksi Solusi Konkret**: Koordinasikan pengambilan data awal menggunakan `Promise.allSettled` dengan penanganan loading state terpadu, dan gunakan query terpadu bila memungkinkan.

---

### BUTIR TUGAS 11: Penerapan `AbortController` pada Fetch Hook Desktop (Temuan #9)
* **Lokasi Berkas**: Halaman desktop (`PersonnelPage.jsx`, `DeploymentPage.jsx`, `ActivitiesPage.jsx`, `IncidentsPage.jsx`, `VehicleReadinessPage.jsx`)
* **Deskripsi Masalah**: `api.get()` dipanggil tanpa `AbortSignal`.
* **Dampak / Risiko**: Race condition data saat user mengganti filter regu/shift secara cepat, serta memory leak setState pada komponen unmounted.
* **Instruksi Solusi Konkret**: Pasang pola standar `AbortController` di dalam `useEffect`:
  ```javascript
  useEffect(() => {
    const controller = new AbortController();
    fetchData({ signal: controller.signal });
    return () => controller.abort();
  }, [dependencies]);
  ```

---

### BUTIR TUGAS 12: Pemasangan React Error Boundary (Temuan #40)
* **Lokasi Berkas**: Buat `frontend/src/components/common/ErrorBoundary.jsx` dan integrasikan di `frontend/src/main.jsx`.
* **Deskripsi Masalah**: Aplikasi belum memiliki batas error React (*Error Boundary*). Satu kegagalan render di komponen kecil akan memicu layar putih kosong (*fatal white screen*) bagi seluruh aplikasi.
* **Dampak / Risiko**: Petugas operasional di bandara kehilangan akses sistem saat terjadi anomali data kecil.
* **Instruksi Solusi Konkret**:
  1. Buat kelas komponen `ErrorBoundary.jsx` yang menangkap `componentDidCatch` dan menyajikan UI darurat yang tenang (pesan error bersahabat dengan tombol "Muat Ulang Halaman").
  2. Bungkus `<App />` di dalam `<ErrorBoundary>` pada `frontend/src/main.jsx`.

---

### KANAL TERBUKA TEMUAN, BUG, IDE & SARAN TAMBAHAN
Apabila selama proses eksekusi Agent 1 menemukan kelemahan sistem lain, bug tersembunyi, celah logika, ide pengembangan, atau saran optimasi UI/UX di luar tugas utamanya, **Agent 1 DILARANG mengubah kode di luar domainnya secara sepihak**. Agent 1 WAJIB mencatat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporannya (`masak/temp/hasil_agent1.md`) agar dapat dievaluasi oleh Pengawas.

### INSTRUKSI AKHIR & VALIDASI
* Validasi seluruh perubahan melalui terminal CLI: jalankan `npm run build` di folder `frontend/`.
* Tuliskan hasil pekerjaan dan bukti build di `masak/temp/hasil_agent1.md`.
* DILARANG melakukan `git commit` atau `git push` otomatis.
* DILARANG menggunakan tool `browser_subagent`.
