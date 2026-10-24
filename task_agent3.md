# LEMBAR TUGAS AGENT 3: AUDIT UI/UX, LAYOUT, ERROR HANDLING & BEBAN LOAD (ARMADA, PLOTING & PEJABAT)

**Domain Audit:** Operasional Armada, Ploting Penugasan Shift, Kesiapan PIC & Pejabat Struktural  
**Catatan:** **HALAMAN DASHBOARD DIHIRARKAN/DI-SKIP**.  
**Fase:** **FASE 1 (Audit & Inventarisasi Masalah - DILARANG MENGUBAH KODE PRODUKSI)**  
**Batasan:** Hanya sebatas inventarisasi temuan masalah, bug visual, kelemahan error handling, analisis beban loading, dan saran perbaikan konkret.

---

## 🎯 BERKAS TARGET AUDIT ANDA:
1. [`frontend/src/pages/HalamanPenugasan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPenugasan.jsx) (Halaman Ploting penugasan kru & armada shift dinas)
2. [`frontend/src/components/forms/DeploymentSlotCard.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/DeploymentSlotCard.jsx) (Komponen pemilihan kru per posisi kendaraan)
3. [`frontend/src/pages/HalamanKesiapanKendaraan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKesiapanKendaraan.jsx) (Katalog status armada & form ceklis kesiapan PIC)
4. [`frontend/src/components/forms/VehicleReadinessModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/VehicleReadinessModal.jsx) (Modal update status kelaikan kendaraan)
5. [`frontend/src/components/forms/WatchroomReadinessModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/WatchroomReadinessModal.jsx) (Modal update status kesiapan Posko / Watch Room)
6. [`frontend/src/pages/HalamanKelolaPejabat.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanKelolaPejabat.jsx) (Kelola pejabat Dept. Head, input data mandiri & upload tanda tangan digital)

---

## 🔍 FOKUS AREA AUDIT:

### 1. UI/UX & Layout:
- **Ploting Penugasan (`HalamanPenugasan.jsx` & `DeploymentSlotCard.jsx`):**
  - Kepatuhan Aturan Shift: Jika pengguna bukan anggota shift aktif atau bukan shift dinasnya, apakah halaman menampilkan proteksi *"Bukan Shift Dinas Anda"* tanpa melakukan fetch ploting berat?
  - Dilarang tombol dobel: Apakah tombol "Simpan Ploting" berada di satu tempat yang jelas (tidak ganda di header dan banner)?
  - Desain Padat (Anti-Card Bersarang): Apakah tampilan slot kru padat, rapi, dan tidak memakan scroll berlebih?
  - Integritas Cuti vs Tugas: Apakah personel yang berstatus cuti/izin otomatis dicegah agar tidak bisa dipilih bertugas ganda?
- **Kesiapan Armada & Posko (`VehicleReadinessModal.jsx` & `WatchroomReadinessModal.jsx`):**
  - Kepatuhan status default: Default kendaraan operasional wajib `serviceable` (GEMINI.md butir 17).
  - Tampilan form modal checklist: apakah rapi, checkbox/radio button mudah disentuh, catatan kendala jelas?
- **Kelola Pejabat (`HalamanKelolaPejabat.jsx`):**
  - Kepatuhan GEMINI.md butir 18: Dept. Head wajib diinput mandiri (Nama, NIP, Jabatan, Tanda Tangan), BUKAN dipilih dari daftar anggota regu operasional.
  - Apakah kanvas/pratinjau tanda tangan digital muncul tajam dan tidak pecah?

### 2. Error Handling & State Feedback:
- Feedback toast instan saat "Simpan Ploting", update kesiapan armada, atau simpan data Dept. Head (GEMINI.md butir 10).
- Penanganan konflik penugasan: apa yang terjadi jika satu orang terpilih di dua kendaraan sekaligus? Apakah ada pesan peringatan visual yang jelas?
- Empty state: bagaimana tampilan jika belum ada kendaraan yang terdaftar di database?

### 3. Analisis Beban & Optimasi Loading (Overload & Anti-Lag):
- **Terlalu banyak load / request berulang:**
  - Apakah `HalamanPenugasan.jsx` melanggar aturan anti-auto-save? (Perubahan ploting wajib lokal di state frontend dan hanya dikirim saat user menekan "Simpan Ploting").
  - Apakah ada pemanggilan API ganda saat berganti tab armada atau memilih personel di slot dropdown?
- **Performa Input Form:**
  - Periksa `DeploymentSlotCard.jsx`, `VehicleReadinessModal.jsx`, dan `HalamanKelolaPejabat.jsx`: apakah ada CSS `transition-all` pada elemen select/input/textarea?
  - Apakah backdrop modal menggunakan filter blur berat yang memicu frame-drop?

---

## 📝 OUTPUT:
Tuliskan seluruh temuan masalah (kategori: Kritis/Sedang/Minor), analisis beban load, dan saran perbaikan Anda secara terstruktur di:
👉 [`masak/temp/hasil_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent3.md)

⚠️ **ATURAN FORMAT PENULISAN (DARI PENGGUNA):**
- **DILARANG MENGGUNAKAN TABEL ATAU MATRIKS.** Tuliskan dalam format **daftar poin/bullet points hierarkis bernomor** agar nyaman dibaca.
