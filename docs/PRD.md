# PRD: SSCI Sinergi (hasil reverse engineering)

> **Dokumen ini disusun ulang dari kode yang berjalan** (Oktober 2026), bukan dari PRD asli. Isinya menggambarkan perilaku sistem saat ini. Bagian "Pertanyaan terbuka" mencatat hal yang belum diputuskan atau belum dibangun.

| | |
|---|---|
| Produk | SSCI (Sustainable Sharia Creditworthiness Index) Sinergi |
| Jenis | Platform web multi-tenant untuk analisa kelayakan pembiayaan syariah |
| Pengguna utama | BPRS (Bank Pembiayaan Rakyat Syariah) dan nasabahnya |
| Fokus segmen | Pembiayaan UMKM, dengan dukungan segmen karyawan, guru, dan badan usaha |
| Konteks | Penelitian (UNISBA, hibah LPDP) yang diuji coba dengan BPRS mitra |

## 1. Latar belakang dan masalah

BPRS menilai kelayakan pembiayaan dengan file Excel yang diisi manual oleh Account Officer (AO). Proses ini punya beberapa masalah:

1. **Lambat dan rawan salah ketik.** Data nasabah, rekening koran, dan agunan diketik ulang ke beberapa sheet.
2. **Tidak konsisten antar analis.** Penilaian kualitatif (reputasi, pengelolaan keuangan) bergantung pada orang.
3. **Kurang mencakup aspek syariah dan keberlanjutan.** Excel menilai karakter, usaha, dan agunan, tetapi tidak menilai kepatuhan syariah atau legalitas secara terstruktur.
4. **Sulit diaudit.** Tidak ada jejak siapa mengubah apa, dan pemisahan pembuat dan pemutus (maker-checker) tidak ditegakkan sistem.
5. **Nasabah tidak tahu status dan alasan keputusan.**
6. **Template Excel sendiri bisa rusak.** Contohnya, template Fix Income versi awal menghasilkan `#REF!`.

## 2. Tujuan produk

| Tujuan | Ukuran keberhasilan (usulan) |
|---|---|
| Penilaian kelayakan yang konsisten, dapat dijelaskan, dan selaras prinsip syariah | Skor SSCI tersedia untuk setiap pengajuan, dengan rincian per pilar |
| Mempercepat kerja AO tanpa mengubah kebiasaan BPRS | Waktu input per pengajuan turun; Excel BPRS terisi otomatis |
| Keputusan tetap di tangan manusia, dengan tata kelola yang dapat diaudit | 100% keputusan melalui maker-checker dan tercatat di audit log |
| Transparansi bagi nasabah | Nasabah dapat melacak status dan membaca penjelasan keputusan |
| Penerimaan teknologi oleh staf BPRS (TAM) | Skor kemudahan dan kegunaan dari survei staf; tingkat pemakaian ekspor Excel |

### Di luar cakupan
- Pencairan dana, core banking, dan penagihan.
- Keputusan otomatis tanpa pejabat berwenang.
- Penilaian di luar kelayakan pembiayaan.

## 3. Pengguna dan peran

| Peran | Siapa | Kebutuhan utama |
|---|---|---|
| **Maker** | Analis pembiayaan / AO | Input pengajuan cepat, unggah dokumen, menjalankan penilaian, mengisi format Excel BPRS |
| **Checker** | Komite / pejabat pemutus | Melihat ringkasan, memverifikasi dokumen, meninjau, lalu menyetujui atau menolak |
| **Admin BPRS** | Pengelola akun BPRS | Semua hak checker, kelola tim, pengaturan dan branding, kebijakan kredit, audit log |
| **SuperAdmin platform** | Pengelola SSCI | Menyetujui atau menangguhkan BPRS, melihat audit lintas BPRS |
| **Nasabah** | Pemohon pembiayaan | Melacak status, membaca penjelasan, meminta pembaruan data atau peninjauan ulang |

Aturan peran:
- Maker hanya bisa membuat dan menilai pengajuan.
- Checker tidak boleh memutuskan pengajuan yang ia buat atau nilai sendiri (pemisahan maker-checker ditegakkan di server).
- Admin, checker, dan SuperAdmin wajib mengaktifkan 2FA.

## 4. Alur pengguna inti

```
Lengkapi ──► Nilai ──► Tinjau ──► Putuskan
(maker)     (maker)    (checker)   (checker)
```

1. **Pengajuan baru (maker)**, formulir 4 langkah:
   1. Nasabah & usaha: segmen produk, identitas (OCR KTP), usaha, sumber penghasilan, profil singkat format BPRS.
   2. Keuangan & akad: pilih satu sumber angka (isi langsung, omzet harian, baca dokumen AI, atau import CSV), kebutuhan pembiayaan, dan ceklist akad.
   3. Dokumen & syariah: daftar dokumen wajib, kepatuhan syariah, tata kelola, dan ESG (opsional di jalur ringkas).
   4. Periksa & kirim: ringkasan dengan tombol "Ubah" per bagian.
2. **Lengkapi (maker):** unggah KTP, NPWP, NIB, dan foto survei di halaman detail. Bilah kelengkapan menunjukkan apa yang kurang.
3. **Nilai (maker):** pemeriksaan data otomatis berjalan. Temuan tingkat tinggi atau sedang wajib diperbaiki atau dikonfirmasi dengan catatan. Setelah itu skor SSCI dihitung, dan asisten AI (konsistensi, syariah, ringkasan komite) berjalan otomatis.
4. **Tinjau (checker):** pratinjau dan verifikasi dokumen, uji sensitivitas, peninjauan klasifikasi dengan alasan bila perlu, dan pengecekan syarat jalur.
5. **Putuskan (checker):** dialog keputusan menampilkan ringkasan dan syarat. Tombol Setujui hanya aktif bila syarat jalur terpenuhi, dan catatan keputusan wajib diisi.
6. **Nasabah:** melacak status dengan nomor tiket dan 4 digit terakhir NIK, membaca penjelasan per aspek, dan mengajukan permintaan.

## 5. Kebutuhan fungsional

### 5.1 Akun, organisasi, dan keamanan
- **FR-01** Pendaftaran BPRS mandiri. Akun aktif setelah disetujui SuperAdmin.
- **FR-02** Login email dan password, terkunci 15 menit setelah 5 kali gagal.
- **FR-03** 2FA TOTP wajib untuk admin, checker, dan SuperAdmin. Admin dapat mereset 2FA anggota tim.
- **FR-04** Kelola tim: tambah maker atau checker (password minimal 8 karakter berisi huruf dan angka) dan nonaktifkan akun dengan konfirmasi. Admin tidak bisa menonaktifkan diri sendiri.
- **FR-05** Akun nonaktif dan BPRS yang ditangguhkan langsung kehilangan akses.
- **FR-06** Peringatan sebelum sesi berakhir. Setelah login ulang, pengguna kembali ke halaman terakhir.
- **FR-07** Pemulihan darurat akun admin awal lewat variabel lingkungan, tercatat di audit.

### 5.2 Pengajuan pembiayaan
- **FR-10** Segmen produk dengan dokumen wajib dan batas DSR berbeda:

  | Segmen | Batas DSR |
  |---|---|
  | UMKM | 40% |
  | Karyawan | 40% |
  | Guru sertifikasi | 80% |
  | Badan usaha | 40% |

- **FR-11** Empat akad dengan ceklist kepatuhan masing-masing: Murabahah, Mudharabah, Qardh, dan Ijarah Multijasa.
- **FR-12** Empat cara mengisi angka keuangan:
  - isi langsung;
  - kalkulator omzet harian;
  - baca dokumen dengan AI (slip gaji, mutasi, NIB, NPWP);
  - import CSV.

  Sumber angka yang dipakai tercatat.
- **FR-13** OCR KTP dan baca dokumen dengan AI. Hasilnya wajib diperiksa analis sebelum dipakai.
- **FR-14** Draft tersimpan otomatis di perangkat dan dapat dipulihkan atau dibuang dengan konfirmasi.
- **FR-15** Validasi per kolom, misalnya NIK 16 digit, nomor telepon, dan nisbah Mudharabah yang harus berjumlah 100%.
- **FR-16** Jalur pemeriksaan:
  - **Jalur ringkas:** plafon sampai Rp 25 juta dan bukan pihak terkait. Wajib KTP terverifikasi.
  - **Jalur lengkap:** selain itu. Wajib KTP, NPWP, NIB terverifikasi dan minimal 1 foto survei.
- **FR-17** Pencarian riwayat nasabah. Pengajuan baru dapat dimulai dari Master Nasabah.
- **FR-18** Pembatalan pengajuan (selama belum dinilai), dengan alasan opsional.

### 5.3 Penilaian SSCI
- **FR-20** Skor SSCI 0 sampai 100 dari tiga pilar, dengan aturan deterministik versi `ssci-rules-1.1.0`:

  | Pilar | Bobot |
  |---|---|
  | Keuangan berkelanjutan | 55 |
  | Kepatuhan syariah | 25 |
  | Legalitas | 20 |

- **FR-21** Klasifikasi dari skor:

  | Skor | Klasifikasi |
  |---|---|
  | 80 ke atas | Sangat Layak |
  | 65 sampai di bawah 80 | Layak |
  | 50 sampai di bawah 65 | Perlu Pengawasan |
  | di bawah 50 | Tidak Layak |

- **FR-22** Pemeriksaan data sebelum penilaian, misalnya NIK tidak 16 digit, angsuran melebihi sisa pendapatan, plafon di atas nilai agunan, atau margin Murabahah 0%. Temuan yang memblokir wajib dikonfirmasi dengan catatan, dan catatan itu tercantum di laporan.
- **FR-23** Status dokumen legal untuk skor diambil dari unggahan dan verifikasi checker, bukan dari pilihan manual.
- **FR-24** Rekomendasi plafon indikatif, DSCR, LTV, dan evaluasi Pedoman Kebijakan Pembiayaan BPRS (DSR, kewenangan memutus, taksasi internal atau KJPP untuk plafon Rp 500 juta ke atas, pihak terkait).
- **FR-25** Uji sensitivitas: perubahan klasifikasi bila data bergeser plus atau minus 10% dan 20%, atau bila bobot pilar digeser.
- **FR-26** Peninjauan klasifikasi oleh pejabat berwenang dengan alasan minimal 20 karakter. Skor asli tetap tersimpan.

### 5.4 Asisten AI (pendukung, tidak mengubah skor)
- **FR-30** Narasi rekomendasi, dengan cadangan berbasis aturan.
- **FR-31** Pemeriksaan konsistensi data (aturan ditambah AI).
- **FR-32** Pemeriksaan kesesuaian syariah akad yang merujuk teks fatwa DSN-MUI di sistem.
- **FR-33** Ringkasan untuk komite: poin pendukung, poin risiko, dan pertanyaan.
- **FR-34** Analisis foto survei lapangan, yang dapat diulang bila gagal.
- **FR-35** Nama dan NIK tidak dikirim ke AI dalam bentuk teks.

### 5.5 Format Excel BPRS
- **FR-40** Ekspor ke template Excel asli BPRS: Skoring Fluktuatif Income UMKM dan Skoring Fix Income dengan Agunan. Dropdown dan rumus dipertahankan, dan Excel menghitung ulang saat dibuka.
- **FR-41** Template dipilih otomatis dari sumber penghasilan dan dapat diganti analis.
- **FR-42** Isian profil format BPRS dengan teks pilihan yang persis sama dengan Excel.
- **FR-43** Estimasi skor, rating (AAA sampai D), dan status format BPRS dengan bobot sheet Parameter, termasuk potongan 70% bila RPC tidak memadai atau tenor melewati usia pensiun (non PNS). Hasilnya diverifikasi sama dengan Excel.
- **FR-44** Pemeriksaan isian yang saling bertentangan sebelum unduh.
- **FR-45** AI membaca foto rekening koran ke tabel 3 bulan, menyusun draf narasi, dan menjelaskan selisih skor SSCI dengan skor format BPRS.
- **FR-46** Rincian agunan menjadi sumber tunggal nilai agunan pengajuan selama pengajuan belum dinilai.

### 5.6 Keputusan dan laporan
- **FR-50** Keputusan Setujui atau Tolak hanya oleh checker atau admin yang bukan pembuat atau penilai. Catatan keputusan wajib diisi.
- **FR-51** Setujui hanya bila syarat jalur terpenuhi. Menolak tetap bisa kapan saja.
- **FR-52** Laporan PDF penilaian dengan NIK tersamar, rincian pilar, pemeriksaan data, hasil peninjauan, sumber angka keuangan, dan lampiran disposisi komite.
- **FR-53** Ekspor SLIK dan ekspor sesuai filter, hanya untuk checker dan admin, tercatat di audit.

### 5.7 Nasabah
- **FR-60** Halaman publik Lacak Pengajuan dengan nomor tiket dan 4 digit terakhir NIK, dibatasi per tiket.
- **FR-61** Penjelasan keputusan per aspek tanpa skor dan tanpa catatan internal.
- **FR-62** Permintaan pembaruan data (sebelum dinilai) atau peninjauan ulang (setelah belum disetujui). Tanggapan petugas terlihat oleh nasabah.

### 5.8 Dashboard dan administrasi
- **FR-70** Dashboard operasional:
  - jumlah per status dan total plafon;
  - tren skor dan kinerja analis;
  - antrean dengan SLA;
  - filter periode, analis, dan status.
- **FR-71** Riwayat penilaian, Master Nasabah, dan notifikasi (tandai dibaca per item atau semua).
- **FR-72** Pengaturan BPRS: profil, logo dan warna brand, kebijakan kredit, 2FA pribadi, dan ganti password.
- **FR-73** Audit log BPRS dan audit log platform, dengan nama pelaku dan label aksi berbahasa Indonesia.
- **FR-74** Konsol SuperAdmin: daftar BPRS, setujui atau tangguhkan, dan audit lintas BPRS.

## 6. Kebutuhan non-fungsional

| Area | Kebutuhan |
|---|---|
| Keamanan | Password di-hash; rahasia 2FA dienkripsi; pemisahan maker-checker di server; pembatasan percobaan login dan pelacakan publik |
| Privasi | NIK tersamar di daftar, detail, dan PDF; membuka NIK lengkap tercatat di audit; data minimal ke AI |
| Auditabilitas | Jejak audit untuk pembuatan, penilaian, peninjauan, keputusan, ekspor, pembukaan NIK, perubahan 2FA, permintaan nasabah, ekspor Excel BPRS |
| Keterjelasan | Skor deterministik, versi aturan tercatat di setiap penilaian, penjelasan untuk nasabah |
| Ketersediaan AI | Semua fitur inti berjalan tanpa AI (cadangan aturan) |
| Bahasa | Seluruh antarmuka dan pesan error dalam Bahasa Indonesia |
| Aksesibilitas | Target sentuh 44px di perangkat sentuh, label terhubung ke kolom, fokus keyboard terlihat, dialog dengan fokus terkunci, zoom tidak diblokir |
| Responsif | Tanpa scroll horizontal di lebar 375px |
| Multi-tenant | Semua data dibatasi per organisasi (BPRS) |

## 7. Model data inti

```
organizations 1─* users
organizations 1─* applications 1─1 assessments
                  applications 1─* documentFiles
                  applications 1─* surveyPhotos
                  applications 1─* applicationComments
                  applications 1─* customerRequests
organizations 1─1 creditPolicies
users 1─* notifications
organizations 1─* auditLogs
```

Status pengajuan berjalan: `pending → assessed → approved / rejected`. Pengajuan juga bisa `cancelled` selama masih `pending`.

## 8. Integrasi eksternal

| Sistem | Pemakaian |
|---|---|
| OpenRouter (`openai/gpt-6-luna`) | OCR, baca dokumen dan rekening koran, narasi, konsistensi, syariah, ringkasan komite, analisis foto |
| Template Excel BPRS | Diisi otomatis, dihitung ulang oleh Excel di komputer staf |
| Railway | Hosting aplikasi dan database (Singapura) |

## 9. Asumsi dan batasan
- Satu service Railway menyajikan API dan frontend. Berkas unggahan disimpan di volume disk lokal.
- Dokumen identitas yang dibaca AI dikirim ke penyedia AI di luar negeri. Mitigasinya masih menunggu keputusan (lihat `docs/tata-kelola/03-pelindungan-data.md`).
- Lokasi server di Singapura. Pemindahan ke pusat data Indonesia direncanakan, tetapi ditunda.
- Folder `mobile/` adalah aplikasi lain (AKADIFY) dan bukan bagian dari produk ini.

## 10. Pertanyaan terbuka dan pekerjaan lanjutan

| No | Topik | Status |
|---|---|---|
| 1 | Maqasid Syariah sebagai indikator skor atau penilaian kualitatif terpisah | Menunggu keputusan tim |
| 2 | *Allowance factor* (penyesuaian skor terbatas) dan pemegang wewenangnya | Menunggu keputusan tim |
| 3 | Penyedia AI yang diizinkan (luar negeri, lokal, atau dihosting sendiri) | Menunggu keputusan |
| 4 | Ekspor Excel **Analisa Keuangan** (neraca dan laba rugi dua periode) | Belum dibangun; butuh data neraca |
| 5 | Kode cadangan 2FA | Belum dibangun; butuh perubahan skema |
| 6 | Peringatan isian belum disimpan saat pindah halaman di dalam aplikasi | Belum ada (sudah ada saat menutup atau memuat ulang tab) |
| 7 | Konfirmasi BPRS: potongan tenor melewati pensiun untuk PNS; uang lembur di rasio RPC Fix Income | Menunggu BPRS |
| 8 | Akses berkas `/uploads` disajikan statis tanpa pemeriksaan sesi; nama berkas acak, tetapi siapa pun yang tahu URL dapat membukanya | **Perlu ditinjau**; disarankan diganti dengan endpoint berotorisasi |
| 9 | Membedakan BPRS "menunggu verifikasi" dan "ditangguhkan" di data organisasi | Belum ada |
| 10 | Migrasi server ke Indonesia | Ditunda |

## 11. Rujukan di repositori

| Dokumen | Lokasi |
|---|---|
| Stack teknologi | `docs/TECH_STACK.md` |
| Manual book, RACI, pelindungan data, kebijakan AI | `docs/tata-kelola/` |
| Audit UI/UX dan status perbaikannya | `UI_UX_AUDIT.md` |
| Ringkasan perubahan dari format Excel BPRS | `docs/laporan/Ringkasan-Perubahan-SSCI-Format-BPRS.pdf` |
