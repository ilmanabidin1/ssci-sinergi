# SSCI BPRS Platform - Project TODO

## Core Features

- [x] Database schema untuk aplikasi pembiayaan dan hasil scoring
- [x] Algoritma scoring SSCI (3 pilar: Sustainable Finance 55%, Sharia 25%, Legal 20%)
- [x] Scorecard berbasis aturan dengan narasi rekomendasi OpenRouter
- [x] Form input data nasabah komprehensif (data keuangan, profil bisnis, dokumen legal, kepatuhan syariah)
- [x] Sistem autentikasi untuk analis pembiayaan BPRS
- [x] Dashboard analitik dengan visualisasi hasil penilaian
- [x] Breakdown scoring per aspek dan rekomendasi pembiayaan
- [x] Halaman riwayat penilaian dengan search dan filter
- [ ] Fungsi export PDF untuk laporan penilaian
- [x] Role-based access control untuk analis (maker/checker/admin ditegakkan di tRPC: decide & hapus penilaian = checker+, hapus permanen = admin; UI menyembunyikan aksi sesuai role)

## Technical Implementation

- [x] Setup database tables (applications, assessments, users)
- [x] Implement scoring algorithm dengan bobot yang tepat
- [x] Implementasi klasifikasi deterministik yang dapat diaudit
- [x] Build tRPC procedures untuk CRUD operations
- [x] Design professional UI untuk institusi keuangan
- [x] Implement data visualization dengan recharts
- [x] Add PDF generation functionality
- [x] Write vitest tests untuk core logic

## New Features (User Request)

- [x] Implementasi export PDF untuk assessment report
- [x] Hapus referensi spesifik "BPRS HIK Parahyangan" dari dashboard
- [x] Tambahkan disclaimer keputusan final tetap pada BPRS
- [x] Tambahkan logo Universitas Islam Bandung di halaman awal

## UX Improvements (User Request)

- [x] Ganti SIUP dan TDP dengan NIB (Nomor Induk Berusaha)
- [x] Tambahkan tooltip informasi (ikon i) untuk kepatuhan syariah dan keberlanjutan
- [x] Tandai dengan jelas field wajib (*) dan opsional
- [x] Terapkan login untuk akses operasional BPRS

## Tahapan 1: Penyesuaian Pedoman Kebijakan Pembiayaan BPRS (KPB 2025)

- [x] Engine evaluasi kebijakan BPRS `shared/bprsPolicy.ts` (Rasio DSR maks 40%, limit kewenangan memutus 3 jenjang, taksasi internal vs KJPP threshold Rp 500 jt, trigger Opini Kepatuhan Rp 100 jt, Opini Legal Rp 250 jt/Badan Usaha)
- [x] Integrasi evaluasi kebijakan BPRS ke scoring & detail pengajuan `server/scoring.ts`, `server/routers.ts`
- [x] Kartu Kesesuaian Pedoman Kebijakan Pembiayaan BPRS di halaman `ApplicationDetail.tsx`
- [x] Integrasi tabel evaluasi kebijakan BPRS di cetakan PDF laporan penilaian `server/pdfReport.ts`
- [x] Unit test kepatuhan kebijakan BPRS `server/bprsPolicy.test.ts` (4 tests lulus)

## Tahapan 2: Segmentasi Form Pengajuan & Persyaratan Dokumen Sesuai Produk BPRS

- [x] Definisi 4 segmen produk BPRS (`umkm`, `karyawan_swasta`, `guru_sertifikasi`, `non_perorangan`) beserta batas DSR dan checklist dokumen di `shared/bprsPolicy.ts`
- [x] Langkah ke-0 di wizard `NewApplication.tsx` untuk pemilihan segmen produk pembiayaan dengan kartu visual interaktif
- [x] Checklist dokumen legal dinamis di form dan detail pengajuan sesuai segmen produk terpilih
- [x] Perluasan tipe dokumen unggahan (`documentUpload.ts`, `drizzle/schema.ts`) mendukung dokumen khusus BPRS (sertifikat pendidik, SK mengajar, slip gaji, BPJS-TK, akta AD/ART badan usaha)
- [x] Unit test DSR relaksasi segmen guru sertifikasi 80% lulus (total 44 tests passing)

## Tahapan 3: Lembar Disposisi Komite Pembiayaan & Format Opini Kepatuhan/Legal di PDF

- [x] Tambahkan halaman lampiran khusus ke `server/pdfReport.ts`: "LEMBAR DISPOSISI KOMITE PEMBIAYAAN & OPINI RISIKO"
- [x] Format kolom isian tertulis resmi untuk Opini Kepatuhan & Manajemen Risiko (Plafon >= Rp 100 Juta)
- [x] Format kolom isian tertulis resmi untuk Opini Legal Pembiayaan (Plafon >= Rp 250 Juta / Non-Perorangan)
- [x] Kolom tanda tangan berjenjang 3 pemutus (Inisiasi AO, Review Kacab/Koordinator, Final Pemutus sesuai plafon)
- [x] Informasi di UI `ApplicationDetail.tsx` bahwa dokumen PDF menyertakan lembar disposisi komite & opini risiko

## Tahapan 4: Kepatuhan Pihak Terkait, Pemilahan Sumber Pembayaran, dan Akad Al-Qardh

- [x] Deteksi Calon Nasabah Pihak Terkait BPRS (`isRelatedParty`, `relatedPartyRelation`) dengan eskalasi pemutus ke Direktur Bisnis & Dewan Komisaris + alert BMPD Pihak Terkait maks 10%
- [x] Opsi Akad Pembiayaan Al-Qardh (pinjaman kebajikan/talangan mikro/haji, margin 0%, biaya administrasi nominal riil) di `NewApplication.tsx`, `schema.ts`, dan `routers.ts`
- [x] Pemilahan Sumber Pembayaran Utama (`incomeSourceType`: Penghasilan Tetap, Tidak Tetap, Joint Income) dengan panduan bukti pendukung kapasitas DSR 40%
- [x] Integrasi tanda tangan Dewan Komisaris & warning Pihak Terkait pada lembar disposisi cetak PDF
- [x] Unit test eskalasi Pihak Terkait di `server/bprsPolicy.test.ts` (total 45 tests lulus)

## Tahapan 5: Integrasi Pembiayaan Ijarah Multijasa (Fatwa DSN-MUI No. 44 & Pedoman OJK)

- [x] Skema database & migrasi 0019 untuk akad Multijasa (`multijasaAkadType`, `multijasaServiceCategory`, `multijasaServiceProvider`, `multijasaSourceObject`, `multijasaServiceCost`, `multijasaDownPayment`, `multijasaUjrahAmount`, `multijasaWakalah`, `multijasaDpsReviewed`, `multijasaTaazirToWelfare`)
- [x] Logika kalkulasi piutang Ijarah Multijasa (pokok = biaya jasa - uang muka; piutang = pokok + ujrah nominal; angsuran bulanan) di `server/multijasa.ts`
- [x] Form wizard akad ke-4: Ijarah Multijasa di `NewApplication.tsx` dengan kategori manfaat jasa (pendidikan/kuliah, umrah/haji, kesehatan, renovasi/tenaga kerja, sewa properti)
- [x] Rincian objek jasa dan nilai ujrah di halaman `ApplicationDetail.tsx` dan tabel PDF `server/pdfReport.ts`
- [x] Unit test kalkulasi multijasa di `server/multijasa.test.ts` (total 47 tests lulus)

## Tahapan 6: Portal Pelacakan Status Pengajuan (Loan Tracker)

- [x] Endpoint publik `applications.trackStatus` di `server/routers.ts` dan `server/db.ts` dengan verifikasi 4 digit terakhir NIK nasabah demi privasi
- [x] Halaman publik `/track` (`TrackApplication.tsx`) untuk nasabah/AO melacak progres 4 tahapan penilaian (Berkas Terdaftar -> Penilaian SSCI -> Telaah Komite -> Keputusan Final)
- [x] Label nomor tiket resmi (contoh: `SSCI-00042`) di halaman `ApplicationDetail.tsx`
- [x] Tautan navigasi "Lacak Pengajuan" di halaman Beranda (`Home.tsx`)

## Halaman Tentang SSCI (User Request)

- [x] Buat halaman /tentang-ssci dengan metodologi 3 pilar lengkap
- [x] Tampilkan bobot penilaian dan indikator per pilar secara visual
- [x] Tampilkan dasar hukum syariah (fatwa DSN-MUI, regulasi OJK)
- [x] Tampilkan klasifikasi skor dan artinya
- [x] Daftarkan route /tentang-ssci di App.tsx
- [x] Tambahkan link ke halaman Home dan navigasi
