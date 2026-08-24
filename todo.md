# SSCI AI Prototype - Project TODO

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
- [ ] Role-based access control untuk analis

## Technical Implementation

- [x] Setup database tables (applications, assessments, users)
- [x] Implement scoring algorithm dengan bobot yang tepat
- [x] Implementasi klasifikasi deterministik yang dapat diaudit
- [x] Build tRPC procedures untuk CRUD operations
- [x] Design professional UI untuk institusi keuangan
- [x] Implement data visualization dengan recharts
- [ ] Add PDF generation functionality
- [x] Write vitest tests untuk core logic

## New Features (User Request)

- [x] Implementasi export PDF untuk assessment report
- [x] Hapus referensi spesifik "BPRS HIK Parahyangan" dari dashboard
- [x] Tambahkan disclaimer prototype untuk proposal SINERGI
- [x] Tambahkan logo Universitas Islam Bandung di halaman awal

## UX Improvements (User Request)

- [x] Ganti SIUP dan TDP dengan NIB (Nomor Induk Berusaha)
- [x] Tambahkan tooltip informasi (ikon i) untuk kepatuhan syariah dan keberlanjutan
- [x] Tandai dengan jelas field wajib (*) dan opsional
- [x] Hilangkan requirement login untuk menggunakan prototype

## Halaman Tentang SSCI (User Request)

- [x] Buat halaman /tentang-ssci dengan metodologi 3 pilar lengkap
- [x] Tampilkan bobot penilaian dan indikator per pilar secara visual
- [x] Tampilkan dasar hukum syariah (fatwa DSN-MUI, regulasi OJK)
- [x] Tampilkan klasifikasi skor dan artinya
- [x] Daftarkan route /tentang-ssci di App.tsx
- [x] Tambahkan link ke halaman Home dan navigasi
