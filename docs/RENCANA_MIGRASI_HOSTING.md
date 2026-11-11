# Rencana Pindah Hosting SSCI ke Indonesia

Disusun 11 November 2026. Harga dan sertifikasi diambil dari halaman publik penyedia dan pemberitaan pada tanggal tersebut. Semua angka perlu dikonfirmasi ke penyedia sebelum membeli.

## 1. Dasar kebutuhan

- **Masukan mitra:** hosting sepenuhnya berada di Indonesia. Saat ini aplikasi, database, dan berkas unggahan ada di Railway region Singapura.
- **Aturan OJK:** POJK 34 Tahun 2025 tentang Penyelenggaraan Teknologi Informasi oleh BPR dan BPR Syariah menggantikan POJK 75/2016. Daftar kewajibannya memuat penempatan sistem elektronik pada pusat data dan pusat pemulihan bencana di wilayah Indonesia. Tanggal berlaku, masa transisi, dan ambang modal inti untuk kewajiban pusat pemulihan bencana belum saya periksa di teks peraturannya. Bagian kepatuhan BPRS perlu memastikan ini, termasuk kewajiban BPRS saat memakai penyedia jasa TI pihak ketiga seperti SSCI.

## 2. Yang harus dipindah

| Bagian | Sekarang | Setelah pindah |
|---|---|---|
| Aplikasi (Node.js) | Railway Singapura | Server virtual di Indonesia |
| Database MySQL | Railway Singapura | Server yang sama, atau MySQL terkelola milik penyedia |
| Berkas unggahan (KTP, NPWP, NIB, foto survei, logo) | Volume Railway | Disk server di Indonesia |
| Backup | Belum ada yang terpisah | Object storage di pusat data Indonesia yang berbeda |
| Fitur AI | OpenRouter, diproses di luar negeri | Lihat bagian 5 |
| Font halaman | Google Fonts | Disimpan di server sendiri |

## 3. Perbandingan penyedia lokal

Kebutuhan tahap pilot: 2 vCPU, 4 GB RAM, 60 GB disk. Ini perkiraan untuk satu layanan Node dan satu MySQL dengan beberapa BPRS; pemakaian nyata di Railway belum saya ukur.

| Penyedia | Paket setara 2 vCPU / 4 GB | Harga per bulan | Pusat data | Sertifikasi yang ditemukan | Catatan |
|---|---|---|---|---|---|
| Biznet Gio | NEO Lite MS 4.2 (60 GB) | Rp139.000 | Technovillage Cimanggis (Tier III Uptime Institute) dan MidPlaza Jakarta | ISO 27001 dan PCI DSS | Halaman produk menulis uptime "hingga 99,9%", tanpa SLA resmi. Ada object storage kompatibel S3. |
| Biznet Gio | NEO Virtual Compute SM 4.2 (60 GB) | Rp330.000 | Sama | Sama | Lini yang lebih tinggi dari NEO Lite. |
| IDCloudHost | eXtreme 60 GB | Rp345.000 sampai Rp356.000 | Bogor (Tier III) dan beberapa gedung di Jakarta | ISO 27001:2022 dan ISO 9001 (BSI) | Harga dari situs pembanding, bukan halaman resmi. Ada object storage kompatibel S3. Perusahaan ini juga punya pusat data di Singapura, jadi lokasi harus dipilih saat memesan. |
| Dewaweb | Cloud VPS Lite 4 GB (3 core, 60 GB) | Rp270.000 | DCI Cibitung menurut lingkup sertifikat | ISO 27001:2022 (BSI) | Harga dari situs pembanding. Masa sertifikat di direktori BSI tertulis sampai 1 Juli 2026, jadi status terkininya perlu ditanyakan. |
| Lintasarta Cloudeka | Deka Flexi | Mulai Rp436.600 (spesifikasi tidak tertulis) | Technopark dan Jatiluhur (Tier III bersertifikat) | ISO 27001:2022, ISO 27701, PCI DSS | Kelas korporat, SLA 99,95%. Masa PCI DSS di halaman mereka tertulis sampai Desember 2025, perlu ditanyakan. |

Harga belum termasuk PPN 11% dan belum termasuk biaya backup.

## 4. Rekomendasi

**Biznet Gio.** Alasannya:
1. Pusat data dan badan hukumnya di Indonesia, dengan dua lokasi (Cimanggis dan Jakarta). Backup bisa diletakkan di lokasi kedua tanpa keluar dari penyedia yang sama.
2. Sertifikasi ISO 27001 dan PCI DSS serta pusat data Tier III terdokumentasi di sumber publik, sehingga mudah ditunjukkan ke auditor BPRS.
3. Harganya paling rendah di antara yang sertifikasinya jelas.

Untuk tahap pilot, NEO Lite MS 4.2 sudah cukup. Sebelum dipakai dengan data nasabah nyata dalam jumlah besar, saya sarankan naik ke NEO Virtual Compute atau meminta SLA tertulis, karena NEO Lite tidak mencantumkan SLA resmi.

**Lintasarta Cloudeka** adalah pilihan bila mitra atau auditornya mensyaratkan penyedia kelas korporat dengan SLA tertulis dan sertifikasi privasi data. Biayanya sekitar tiga kali lipat.

Perkiraan biaya bulanan dengan Biznet Gio: Rp139.000 sampai Rp330.000 untuk server, ditambah object storage untuk backup (harganya belum saya temukan), ditambah PPN.

## 5. Fitur AI

Memindahkan hosting tidak mengubah fakta bahwa gambar KTP, dokumen, dan mutasi rekening dikirim ke penyedia AI di luar negeri saat fitur AI dipakai. Tiga pilihan:

| Pilihan | Dampak | Usaha |
|---|---|---|
| Matikan AI di produksi | Baca KTP otomatis, baca rekening koran, dan narasi tidak tersedia. Skor tetap dihitung karena memakai aturan. | Sangat kecil: kosongkan `OPENROUTER_API_KEY`. |
| AI aktif per BPRS dengan persetujuan tertulis | BPRS yang setuju tetap mendapat fitur AI. | Sedang: perlu sakelar per organisasi dan catatan persetujuan. |
| Model AI yang berjalan di Indonesia | Semua data tetap di dalam negeri. | Besar dan mahal. Biznet Gio dan Lintasarta menawarkan GPU lokal, tetapi biaya dan mutu modelnya belum saya periksa. |

Saran saya: mulai dengan pilihan pertama saat pindah, lalu bangun pilihan kedua.

## 6. Langkah migrasi

| Tahap | Pekerjaan | Siapa |
|---|---|---|
| 1. Persiapan | Konfirmasi maksud "sepenuhnya di Indonesia" dan syarat sertifikasi ke mitra. Buat akun penyedia dan pesan server. | Pemilik produk |
| 2. Kemasan aplikasi | Tambahkan Dockerfile dan Docker Compose (aplikasi, MySQL 8, dan proxy HTTPS otomatis). Saat ini build ditangani otomatis oleh Railway, jadi kemasan ini belum ada di repositori. | Pengembang |
| 3. Server | Pasang Docker, aktifkan firewall (hanya port 80, 443, dan SSH dengan kunci), buat pengguna non-root, aktifkan pembaruan keamanan otomatis. | Pengembang |
| 4. Backup | Skrip harian: ekspor MySQL dan salin folder unggahan ke object storage di lokasi kedua, simpan 30 hari. Uji pemulihannya sekali sebelum pindah. | Pengembang |
| 5. Deploy otomatis | GitHub Actions: setiap push ke `main` membangun image dan memperbaruinya di server, lalu menjalankan migrasi database. Ini menggantikan deploy otomatis Railway. | Pengembang |
| 6. Uji coba | Jalankan di server baru dengan salinan data, di alamat sementara. Periksa login, pengajuan, unggah dokumen, unduh Excel dan PDF. | Pengembang dan pemilik produk |
| 7. Pindah | Umumkan jeda layanan sekitar 30 menit. Hentikan Railway, ekspor database dan berkas terakhir, impor ke server baru, arahkan DNS. | Pengembang |
| 8. Setelah pindah | Pantau satu sampai dua minggu. Setelah stabil, hapus database, volume, dan variabel di Railway supaya tidak ada salinan data di Singapura. | Pengembang |

Variabel lingkungan yang ikut dipindah: `DATABASE_URL`, `JWT_SECRET`, `PILOT_ADMIN_EMAIL`, `PILOT_ADMIN_PASSWORD`, `SUPERADMIN_EMAILS`, `ENFORCE_TWO_FACTOR`, `UPLOAD_DIR`, dan `OPENROUTER_API_KEY` bila AI tetap dipakai.

## 7. Yang berubah bagi tim

- **Tanggung jawab bertambah.** Railway mengurus server, sertifikat HTTPS, dan pemulihan otomatis. Di server sendiri, pembaruan sistem, pemantauan, dan backup menjadi tanggung jawab tim.
- **Akses lebih cepat dari Indonesia.** Server di Jakarta atau Cimanggis lebih dekat ke pengguna daripada Singapura.
- **Dokumen tata kelola perlu diperbarui:** lokasi data di `docs/tata-kelola/` dan `docs/TECH_STACK.md` masih menyebut Railway Singapura.

## 8. Yang perlu diputuskan

1. Apakah mitra mensyaratkan penyedia berbadan hukum Indonesia, atau cukup lokasi data di Indonesia?
2. Apakah perlu pusat pemulihan bencana terpisah sejak awal, atau cukup backup di lokasi kedua untuk tahap pilot?
3. Fitur AI: dimatikan, dibuat opsional per BPRS, atau dicarikan model lokal?
4. Siapa yang memegang akun penyedia dan menerima tagihan?

## Sumber

- [Biznet Gio: NEO Lite](https://biznetgio.com/product/neo-lite)
- [Biznet Gio: promo NEO Virtual Compute](https://biznetgio.com/promo/real-merdeka)
- [Detik: Biznet Data Center tersertifikasi Tier III](https://inet.detik.com/telecommunication/d-6069120/tersertifikasi-global-biznet-terkoneksi-gratis-ke-6-data-center)
- [Warta Ekonomi: Biznet Gio raih ISO 27001](https://wartaekonomi.co.id/read168701/usung-standar-manajemen-keamanan-biznet-gio-raih-sertifikasi-iso-27001)
- [IDCloudHost: ringkasan perusahaan](https://idcloudhost.com/llms.txt)
- [whtop: paket IDCloudHost eXtreme 60 GB](https://www.whtop.com/id/plans/idcloudhost.com/148733)
- [BSI: profil sertifikat PT Dewaweb](https://www.bsigroup.com/en-ID/products-and-services/assessment-and-certification/validation-and-verification/client-directory-profile/PT_DEW-0047634949-001)
- [Cloudeka: Deka Flexi](https://www.cloudeka.id/products/deka-flexi-fx2/)
- [Cloudeka: sertifikasi](https://docs.cloudeka.id/certification)
- [Lintasarta: data center](https://www.lintasarta.net/en/products-services/lintasarta-data-center)
- [OJK: POJK 34 Tahun 2025](https://ojk.go.id/id/regulasi/Pages/POJK-34-Tahun-2025-Penyelenggaraan-Teknologi-Informasi-oleh-Bank-Perekonomian-Rakyat-dan-Bank-Perekonomian-Rakyat-Syariah.aspx)
- [Bisnis.com: OJK cabut aturan lama TI BPR](https://finansial.bisnis.com/read/20260108/90/1942716/ojk-cabut-aturan-lama-ti-bpr-standar-keamanan-digital-kini-lebih-ketat)
