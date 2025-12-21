# SSCI AI Prototype - Project TODO

## Core Features

- [x] Database schema untuk aplikasi pembiayaan dan hasil scoring
- [x] Algoritma scoring SSCI (3 pilar: Sustainable Finance 55%, Sharia 25%, Legal 20%)
- [x] Model machine learning untuk prediksi kelayakan kredit
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
- [x] Integrate ML model untuk klasifikasi (Sangat Layak/Layak/Perlu Pengawasan/Tidak Layak)
- [x] Build tRPC procedures untuk CRUD operations
- [x] Design professional UI untuk institusi keuangan
- [x] Implement data visualization dengan recharts
- [ ] Add PDF generation functionality
- [x] Write vitest tests untuk core logic
