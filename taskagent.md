# MASTER ROADMAP: AUDIT MENYELURUH UI/UX, LAYOUT, ERROR HANDLING & PERFORMA LOAD

**Peran Sesi:** Pengawas / Orkestrator  
**Fase Saat Ini:** **FASE 1 (Audit & Inventarisasi Masalah Tampilan & Performa - Zero Code Modification)**  
**Catatan Penting:** **HALAMAN DASHBOARD DIHIRARKAN/DI-SKIP**. Audit difokuskan ke seluruh halaman fungsional, fitur, form, popup/modal, drawer, dokumen cetak, dan tampilan mobile.  
**Batasan Mutlak:** **HANYA SEBATAS TEMUAN, MASALAH, DAN SARAN PERBAIKAN (DILARANG MENGUBAH KODE PRODUKSI)**  

---

## 🎯 TUJUAN & FOKUS AUDIT:
1. **UI/UX, Layout & Visual Glitches:**
   - Typo, inkonsistensi warna/spasi, kontras teks, alignment, badge/status visual aneh.
   - Layout responsif: elemen terpotong, overflow horizontal, padding/margin janggal di layar desktop maupun mobile.
   - Kebersihan konten: deteksi teks slogan filler, jargon AI, atau asumsi SOP yang tidak perlu.
2. **Error Handling & State Recovery:**
   - Penanganan saat API down, token expired, atau data null/kosong (*empty state*).
   - Ketiadaan feedback visual instan (*toast notifications*) saat aksi simpan/ubah/batal.
   - Penanganan error validasi form yang ramah pengguna vs raw technical error.
3. **Analisis Beban & Optimasi Loading (Overload & Anti-Lag):**
   - **Terlalu banyak load dalam satu halaman:** Deteksi request waterfall, fetch paralel tak terkontrol, re-fetch berulang yang boros bandwidth.
   - **Performa Input Form (Anti-Lag):** Deteksi CSS `transition-all` pada input/textarea, pemakaian `backdrop-filter: blur(...)` pada overlay modal aktif, atau re-fetch saat user sedang mengetik.
   - **Beban Data Berat:** Rendering daftar panjang tanpa pagination/infinite scroll/virtualisasi (misal log kegiatan, berkas, atau riwayat dinas).
4. **Kepatuhan Aturan Baku GEMINI.md:**
   - Zero dummy data, hak akses shift dinas, hak kelola cuti mandiri vs admin, TTD pejabat dinamis (bukan hardcode), konsistensi single source of truth mobile vs desktop.

---

## 📋 PEMBAGIAN DOMAIN EKSKLUSIF 5 AGENT (ZERO OVERLAP - DASHBOARD EXCLUDED)

| Agent | Domain Eksklusif Audit | Berkas Target Audit |
| :--- | :--- | :--- |
| **Agent 1** | **Shell Navigasi, Autentikasi Login & Profil Mandiri** | [`AppLayout.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/layout/AppLayout.jsx), [`Navbar.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/layout/Navbar.jsx), [`Sidebar.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/layout/Sidebar.jsx), [`HalamanLogin.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLogin.jsx), [`MandatoryPasswordChangeModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/MandatoryPasswordChangeModal.jsx), Modal/Sub-view Profil Mandiri |
| **Agent 2** | **Manajemen Personel, Roster Shift & Pengelolaan Cuti (Desktop)** | [`HalamanPersonel.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPersonel.jsx), [`HalamanDetailPersonel.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanDetailPersonel.jsx), [`HalamanJadwal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanJadwal.jsx), [`HalamanCuti.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanCuti.jsx), [`CutiModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/CutiModal.jsx) |
| **Agent 3** | **Operasional Armada, Ploting Penugasan & Pejabat Struktural** | [`HalamanPenugasan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPenugasan.jsx), [`DeploymentSlotCard.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/DeploymentSlotCard.jsx), [`HalamanKesiapanKendaraan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKesiapanKendaraan.jsx), [`VehicleReadinessModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/VehicleReadinessModal.jsx), [`WatchroomReadinessModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/WatchroomReadinessModal.jsx), [`HalamanKelolaPejabat.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKelolaPejabat.jsx) |
| **Agent 4** | **Kegiatan Harian, Pelaporan Insiden & Pengumuman Dinas** | [`HalamanKegiatan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKegiatan.jsx), [`HalamanInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanInsiden.jsx), [`HalamanDetailInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanDetailInsiden.jsx), [`IncidentModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/IncidentModal.jsx), [`HalamanPengumuman.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPengumuman.jsx) |
| **Agent 5** | **Dokumen Laporan Resmi (Cetak/PDF) & Seluruh Ekosistem Mobile** | [`HalamanLaporan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporan.jsx), [`HalamanLaporanArmada.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporanArmada.jsx), [`HalamanLaporanInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporanInsiden.jsx), [`A4DocumentLayout.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/reports/A4DocumentLayout.jsx), Folder [`frontend/src/pages/mobile/`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/mobile), Folder [`frontend/src/components/mobile/`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile) |

---

## 📝 OUTPUT:
Setiap agen wajib menuliskan seluruh daftar masalah (Kritis/Sedang/Minor), analisis tata letak/UI/UX, analisis beban loading/performa, dan rekomendasi perbaikan di:
👉 `masak/temp/hasil_agent[1-5].md`

⚠️ **ATURAN FORMAT PENULISAN (PENTING DARI PENGGUNA):**
- **DILARANG KERAS MENGGUNAKAN TABEL ATAU MATRIKS MARKDOWN.** Pengguna kesulitan membaca format tabel di layar.
- Wajib gunakan format **daftar poin bernomor / bullet points hierarkis vertikal** dengan judul tebal yang jelas, terpisah rapi per poin masalah, dampak, dan solusinya.
