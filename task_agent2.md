# PENUGASAN AGENT 2: ANTARMUKA MOBILE, KOMPRESI KAMERA, EFISIENSI PAYLOAD & KETAHANAN OFFLINE

**Domain Berkas Eksklusif**:
- `frontend/src/pages/mobile/MobileDashboard.jsx`
- `frontend/src/pages/mobile/MobileDeployment.jsx`
- `frontend/src/pages/mobile/MobileActivities.jsx`
- `frontend/src/pages/mobile/MobileIncidents.jsx`
- `frontend/src/pages/mobile/MobileReports.jsx`
- `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`
- `frontend/src/components/mobile/activities/MobileActivityModal.jsx`
- `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`
- `frontend/src/components/mobile/ploting/MobilePlotCard.jsx`
- `frontend/src/components/common/OfflineBanner.jsx`
*(DILARANG memodifikasi berkas di luar domain ini untuk mencegah tabrakan berkas / zero file collision)*

---

### BUTIR TUGAS 1: Peningkatan Kontras Warna Teks Tanda Tangan Mobile (Temuan #3)
* **Lokasi Berkas**: `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx:135,168`
* **Deskripsi Masalah**: Teks tanggal tanda tangan digital dan label peran menggunakan `text-slate-400` di atas kartu latar putih/slate (kontras 2.53:1).
* **Dampak / Risiko**: Sulit dibaca oleh kru lapangan di bawah sinar matahari apron bandara.
* **Instruksi Solusi Konkret**: Ubah warna teks dari `text-slate-400` menjadi `text-slate-600` (atau `text-slate-500 font-medium`).

---

### BUTIR TUGAS 2: Integrasi Kompresi Kanvas WebP Foto Kamera Kru Mobile (Temuan #6)
* **Lokasi Berkas**: `frontend/src/components/mobile/activities/MobileActivityModal.jsx` & `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`
* **Deskripsi Masalah**: Foto kamera resolusi tinggi dari smartphone kru (5 MB s.d. 12 MB) langsung dimasukkan ke `FormData` tanpa kompresi.
* **Dampak / Risiko**: Gagal upload / timeout jaringan apron, konsumsi bandwidth boros, disk server cepat penuh.
* **Instruksi Solusi Konkret**: Impor `compressImageToWebp` dari `../../../utils/imageCompressor` dan jalankan kompresi otomatis sebelum berkas dimasukkan ke state form:
  ```javascript
  const compressed = await compressImageToWebp(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.8 });
  ```

---

### BUTIR TUGAS 3: Penerapan `AbortController` pada Fetch Hook Mobile (Temuan #9)
* **Lokasi Berkas**: Halaman mobile (`MobileDashboard.jsx`, `MobileDeployment.jsx`, `MobileActivities.jsx`, `MobileIncidents.jsx`, `MobileReports.jsx`)
* **Deskripsi Masalah**: Panggilan API dalam `useEffect` tidak menyertakan sinyal pembatalan.
* **Dampak / Risiko**: Race condition data saat kru berpindah tab navigasi bawah dengan cepat, dan memory leak.
* **Instruksi Solusi Konkret**: Terapkan `const controller = new AbortController()` dan sertakan `{ signal: controller.signal }` pada pemanggilan `api.get`, serta lakukan `controller.abort()` pada return cleanup effect.

---

### BUTIR TUGAS 4: Pemangkasan Payload Mobile Dashboard untuk Hitungan Personel (Temuan #15)
* **Lokasi Berkas**: `frontend/src/pages/mobile/MobileDashboard.jsx`
* **Deskripsi Masalah**: Untuk menampilkan jumlah total kru yang hadir, halaman mobile memicu `GET /api/personnel` yang mengunduh 36 kolom lengkap 95 personel (186 kB).
* **Dampak / Risiko**: Memperlambat rendering mobile dashboard awal sebesar 1.5 - 2 detik pada koneksi 3G/4G apron.
* **Instruksi Solusi Konkret**: Manfaatkan data ringkasan personel yang sudah ada di respon `GET /api/deployments/current` (array ploting kru dinas) atau gunakan query ringkas parameter `?compact=true` agar mobile dashboard tidak memuat full dossier.

---

### BUTIR TUGAS 5: Optimasi Dropdown Modal Ganti Chief (Temuan #16)
* **Lokasi Berkas**: `frontend/src/components/mobile/ploting/MobilePlotCard.jsx`
* **Deskripsi Masalah**: Dropdown modal ganti Chief mengunduh seluruh personel unit sejak inisialisasi awal layar, bukan saat tombol ganti diklik.
* **Dampak / Risiko**: Pemuatan awal halaman ploting menjadi lambat karena request tambahan yang belum tentu dibuka pengguna.
* **Instruksi Solusi Konkret**: Terapkan *lazy-fetch*: panggil data kandidat pengganti Chief HANYA saat modal / sheet pemilihan pengganti Chief dibuka (`if (isOpen) fetchCandidates()`).

---

### BUTIR TUGAS 6: Eliminasi Duplikasi Pemasangan Komponen `MobileLeaveModal` (Temuan #20)
* **Lokasi Berkas**: `frontend/src/pages/mobile/MobileDashboard.jsx` & komponen anak mobile
* **Deskripsi Masalah**: Modal pengajuan izin/cuti mandiri di-mount dua kali di level layout/dashboard dan di level kartu ploting.
* **Dampak / Risiko**: Potensi double state, duplikasi DOM modal tersembunyi, dan event listener ganda.
* **Instruksi Solusi Konkret**: Satukan pemanggilan `MobileLeaveModal` ke satu pintu di level halaman induk (`MobileDashboard.jsx`), hapus instance duplikat di komponen anak.

---

### BUTIR TUGAS 7: Eliminasi Permintaan Jaringan Pengumuman Ganda pada Mobile Dashboard (Temuan #21)
* **Lokasi Berkas**: `frontend/src/pages/mobile/MobileDashboard.jsx`
* **Deskripsi Masalah**: `MobileDashboard` memanggil `GET /api/announcements` di hook halaman utama dan komponen widget anak `MobileRecentAnnouncements` memanggilnya kembali secara terpisah.
* **Dampak / Risiko**: Terjadi 2 request HTTP yang meminta data persis sama secara bersamaan di awal buka aplikasi mobile.
* **Instruksi Solusi Konkret**: Ambil data pengumuman satu kali di `MobileDashboard.jsx`, lalu operkan (*pass as props*) ke komponen widget `MobileRecentAnnouncements`.

---

### BUTIR TUGAS 8: Pemasangan Banner Deteksi Jaringan Offline (Temuan #41)
* **Lokasi Berkas**: Buat `frontend/src/components/common/OfflineBanner.jsx` dan pasang di `frontend/src/components/mobile/MobileLayout.jsx`
* **Deskripsi Masalah**: Kru yang bergerak di area apron sering kehilangan sinyal seluler (*blind spot*), namun aplikasi tidak memberi indikator status offline. Form yang disubmit saat offline langsung error tanpa penjelasan.
* **Dampak / Risiko**: Kru frustrasi mengira sistem rusak saat mengisi kesiapan kendaraan di lokasi apron tanpa sinyal.
* **Instruksi Solusi Konkret**: Buat komponen `OfflineBanner.jsx` yang memantau event browser `window.addEventListener('offline')` dan `'online'`. Tampilkan banner amber tenang di atas layar: *"Mode Offline: Koneksi internet terputus. Pastikan sinyal stabil sebelum menyimpan data."*.

---

### KANAL TERBUKA TEMUAN, BUG, IDE & SARAN TAMBAHAN
Apabila selama proses eksekusi Agent 2 menemukan kelemahan sistem lain, bug tersembunyi, celah logika, ide pengembangan, atau saran optimasi UI/UX di luar tugas utamanya, **Agent 2 DILARANG mengubah kode di luar domainnya secara sepihak**. Agent 2 WAJIB mencatat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporannya (`masak/temp/hasil_agent2.md`) agar dapat dievaluasi oleh Pengawas.

### INSTRUKSI AKHIR & VALIDASI
* Validasi seluruh perubahan melalui terminal CLI: jalankan `npm run build` di folder `frontend/`.
* Tuliskan hasil pekerjaan dan bukti build di `masak/temp/hasil_agent2.md`.
* DILARANG melakukan `git commit` atau `git push` otomatis.
* DILARANG menggunakan tool `browser_subagent`.
