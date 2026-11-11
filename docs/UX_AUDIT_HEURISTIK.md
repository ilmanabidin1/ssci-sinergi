# Audit UX SSCI: Heuristik Nielsen, WCAG, dan Titik Hambatan

Tanggal audit: 11 November 2026. Versi yang diaudit: branch `claude/git-pull-skrg-p1gf27` (commit `9efdab4`), yaitu versi dengan tiga segmen dan form badan hukum.

## 1. Ringkasan eksekutif

**Skor keseluruhan: 3,5 dari 5.** SSCI sudah layak dipakai untuk uji coba. Tampilannya konsisten dan alur intinya (ajukan, nilai, tinjau, putuskan) dapat diselesaikan tanpa buntu. Kelemahannya ada di pencegahan kesalahan, konsistensi istilah, dan panjang formulir.

Yang sudah kuat:
- Penanda tahap, persentase kelengkapan, dan kalimat "apa yang harus dilakukan sekarang" selalu terlihat di halaman detail.
- Tombol Setujui terkunci sampai syarat terpenuhi, dan alasannya ditulis di bawah tombol.
- Dialog keputusan merangkum nasabah, plafon, skor, dan syarat sebelum checker menyimpan.
- Aksesibilitas dasar baik: 17 dari 26 layar yang diuji tidak punya pelanggaran WCAG otomatis, ada tautan "Lewati ke konten utama", dan fokus keyboard terlihat.

Lima masalah yang paling perlu ditangani:
1. **Penilaian SSCI bisa dijalankan sebelum dokumen wajib ada.** Layar meminta maker melengkapi dokumen dulu, tetapi tombolnya aktif, langsung berjalan tanpa konfirmasi, dan hasilnya tidak bisa diulang oleh maker.
2. **Data contoh badan hukum kadang tidak lolos validasi.** Dari 10 percobaan, 1 menghasilkan neraca tidak seimbang (selisih Rp 46 juta) sehingga pengguna tertahan di langkah 2. Pesan errornya menyebut "kolom ditandai merah", padahal tidak ada kolom yang ditandai.
3. **Dua tombol merah "Tolak" di layar yang sama.** Satu menolak pengajuan, satu menolak dokumen. Checker berisiko menekan yang salah.
4. **Istilah dan format tidak seragam.** Satu hal disebut "Aplikasi", "Pengajuan", dan "Penilaian". Skor ditulis `77.21` di satu panel dan `97,5` di panel lain. Nilai mentah seperti `yes` dan `MURABAHAH` tampil ke pengguna.
5. **Langkah 2 formulir terlalu panjang.** UMKM: 3.208 px dengan 31 isian. Badan hukum: 5.330 px dengan 73 isian dalam satu halaman.

Sebagian besar perbaikannya kecil. Empat belas perbaikan cepat di bagian 5 bisa selesai dalam satu sprint.

## 2. Cakupan dan cara audit

| Hal | Keterangan |
|---|---|
| Cara | Aplikasi dijalankan lokal dengan database MySQL, lalu ditelusuri dengan browser Chromium otomatis (Playwright) |
| Peran | Maker (analis), checker (komite), admin |
| Layar | Desktop 1366 x 768 dan ponsel 390 x 844 |
| Alur yang dijalankan sampai selesai | Pengajuan UMKM dari formulir sampai disetujui; pengajuan badan hukum dari formulir sampai dinilai |
| Uji WCAG otomatis | axe-core, aturan WCAG 2.0, 2.1, dan 2.2 level A dan AA, pada 26 layar |
| Uji keyboard | Urutan Tab dan tampilan fokus di dashboard |

Yang tidak tercakup, sehingga skor di bawah belum memperhitungkannya:
- **Pengguna nyata.** Ini evaluasi pakar, bukan uji kegunaan dengan staf BPRS.
- **Pembaca layar.** Tidak diuji manual dengan NVDA atau TalkBack.
- **Kualitas narasi AI.** Layanan AI tidak tersambung di lingkungan lokal, jadi yang terlihat hanya mode cadangan berbasis aturan.
- **Alur karyawan swasta.** Formulirnya tidak dijalankan terpisah; strukturnya sama dengan UMKM.
- **Zoom 200% dan lebar 320 px.**

## 3. Penilaian tampilan dan navigasi

| Aspek | Penilaian | Catatan |
|---|---|---|
| Warna | Baik | Palet navy, emas, dan gading dipakai konsisten. Warna status (hijau, kuning, merah) selalu disertai ikon dan teks. |
| Tipografi | Baik | Serif untuk judul dan sans untuk isi memberi hierarki yang jelas. Hampir tidak ada teks di bawah 12 px. |
| Jarak | Baik | Kartu dan kisi rapi. Di ponsel tidak ada halaman yang bergeser ke samping. |
| Hierarki visual | Cukup | Halaman detail jelas. Dashboard kosong menampilkan 9 kartu bernilai nol tanpa ajakan memulai. |
| Keterbacaan | Cukup | Teks abu-abu di atas latar berwarna dan teks merah kurang kontras di 9 layar (lihat A-01). Beberapa paragraf penjelasan panjang. |
| Navigasi | Cukup | Empat menu utama jelas. Di ponsel, menu bergulir ke samping tanpa tanda bahwa masih ada item lain. Sepuluh sub-tab di panel Format Excel BPRS terpotong di kanan ("Perizi..."). |

## 4. Skor heuristik Nielsen

Skala 1 sampai 5; 5 berarti hampir tanpa masalah.

| No | Heuristik | Skor | Yang sudah baik | Yang mengurangi skor |
|---|---|---|---|---|
| 1 | Visibilitas status sistem | 4 | Penanda tahap, kelengkapan, langkah berikutnya, toast setelah setiap aksi | Dua angka kelengkapan berbeda di layar yang sama (83% dan 85%). Toast menutupi angka skor dan tombol unggah. |
| 2 | Kecocokan dengan dunia nyata | 4 | Bahasa Indonesia, format Rupiah, istilah akad, pilihan sama dengan Excel BPRS | Nilai mentah `yes` dan `MURABAHAH`. Istilah teknis "Model narasi: Fallback aturan" dan "ssci-rules-1.1.0". Tanggal `mm/dd/yyyy`. |
| 3 | Kontrol dan kebebasan pengguna | 3 | Urungkan data contoh, draf tersimpan otomatis, tombol Ubah di langkah periksa | Penilaian langsung berjalan dan tidak bisa diulang. Isian hilang bila pindah halaman lewat menu. Lupa password harus lewat admin. |
| 4 | Konsistensi dan standar | 3 | Komponen dan gaya seragam di semua halaman | Tiga istilah untuk satu hal. Dua tombol "Tolak". Format angka dan tanggal berbeda antarpanel. Huruf kapital label tidak seragam. |
| 5 | Pencegahan kesalahan | 3 | Cek neraca seimbang, penghitung digit NIK, kunci tombol Setujui, dialog konfirmasi keputusan | Penilaian bisa dijalankan sebelum dokumen ada. Data contoh badan hukum kadang tidak valid. Tanggal ambigu. |
| 6 | Mengenali, bukan mengingat | 4 | Langkah periksa sebelum kirim, ringkasan di dialog keputusan, rumus di bawah nama rasio | Sub-tab tersembunyi. Daftar Riwayat tidak menampilkan skor, nomor tiket, atau segmen. |
| 7 | Fleksibilitas dan efisiensi | 3 | Baca KTP otomatis, kalkulator omzet harian, impor CSV, isi otomatis dari Master Nasabah | Langkah 2 sangat panjang. Tidak ada pengurutan daftar, aksi massal, atau pintasan keyboard. |
| 8 | Estetika dan desain minimalis | 4 | Bersih, tidak ramai, satu aksi utama per layar | Hambatan yang sama ditulis empat kali di halaman detail. "Pemeriksaan data" muncul dua kali. |
| 9 | Membantu pulih dari kesalahan | 4 | Pesan error berbahasa Indonesia, error di bawah kolom, fokus pindah ke kolom pertama yang salah | Ringkasan error tidak bisa diklik. Error neraca tidak menunjuk barisnya. |
| 10 | Bantuan dan dokumentasi | 3 | Panel panduan akad, halaman Tentang SSCI, petunjuk di bawah kolom | Manual book tidak bisa dibuka dari aplikasi. Singkatan DSR, DSCR, dan LTV tanpa penjelasan. Tidak ada panduan awal di dashboard kosong. |

**Rata-rata: 3,5.**

### Ringkasan WCAG

| Kriteria | Hasil | Catatan |
|---|---|---|
| 1.4.3 Kontras minimum | Gagal di 9 dari 26 layar | Satu-satunya jenis pelanggaran yang ditemukan axe-core. Rasio 3,89 sampai 4,49, batasnya 4,5. |
| 2.1.1 Keyboard | Lolos pada yang diuji | Kartu pilihan memakai `radiogroup`; urutan Tab logis. |
| 2.4.1 Lewati blok | Lolos | Ada tautan "Lewati ke konten utama". |
| 2.4.7 Fokus terlihat | Lolos | Delapan elemen pertama di dashboard semuanya menampilkan cincin fokus. |
| 2.5.8 Ukuran target (24 px) | Lolos di ponsel | Di ponsel hampir semua target minimal 44 px. Di desktop ada beberapa elemen di bawah 24 px pada halaman Tim dan Log audit yang belum diperiksa satu per satu. |
| 3.3.1 dan 3.3.3 Identifikasi dan saran error | Sebagian | Baik untuk kolom biasa. Error neraca tidak terhubung ke kolomnya. |
| 4.1.3 Pesan status | Perlu perbaikan | Komponen `Alert` selalu memakai `role="alert"`, termasuk untuk panel informasi biasa (37 pemakaian). Pembaca layar akan membacakannya sebagai peringatan mendesak. |

## 5. Daftar masalah dan dampaknya

Tingkat: **Tinggi** berarti bisa menghasilkan keputusan atau data yang salah, **Sedang** berarti memperlambat atau membingungkan, **Rendah** berarti mengurangi kesan rapi.

### Tinggi

| ID | Masalah | Bukti | Dampak ke bisnis |
|---|---|---|---|
| F-01 | Penilaian SSCI bisa dijalankan saat tahap masih "Lengkapi" | Pengajuan badan hukum tanpa KTP, NPWP, dan NIB berhasil dinilai dengan satu klik. Tidak ada konfirmasi. Setelah itu tombol Penilaian dan Batalkan hilang dari maker. | Skor dihitung dari data yang belum lengkap dan tidak bisa diperbaiki maker. Ini melemahkan kepercayaan komite pada skor. |
| F-02 | Data contoh badan hukum kadang neracanya tidak seimbang | 1 dari 10 percobaan tertahan di langkah 2 dengan selisih Rp 46.000.000. | Demo ke BPRS bisa gagal di depan mitra, tepat di fitur yang baru mereka minta. |
| F-03 | Dua tombol merah "Tolak" dengan akibat berbeda | Di tab Data & Dokumen untuk checker: "Tolak" di kepala halaman menolak pengajuan, "Tolak" di baris KTP menolak dokumen. | Risiko salah tekan pada aksi yang paling sensitif, karena labelnya tidak membedakan keduanya. |
| F-04 | Error neraca tidak menunjuk sumbernya | Pesan "Ada 1 kolom... ditandai merah di bawah", tetapi tidak ada kolom bertanda. Baris selisih berada jauh di bawah pada halaman 5.330 px. | Analis harus menggulir dan mencari sendiri. Di form terpanjang, ini titik paling mungkin membuat orang menyerah. |

### Sedang

| ID | Masalah | Bukti | Dampak ke bisnis |
|---|---|---|---|
| F-05 | Tiga istilah untuk satu hal | Menu "Pengajuan baru", judul "Aplikasi Pembiayaan Baru", tombol dashboard "Mulai penilaian baru", tombol kirim "Kirim Aplikasi", toast "Aplikasi pembiayaan berhasil dibuat". | Staf baru ragu apakah ketiganya hal yang berbeda. Menambah beban pelatihan. |
| F-06 | Format angka dan tanggal tidak seragam | Skor `77.21` dan `97.50` di panel Format BPRS, `97,5` di ringkasan. Tanggal `11/11/2026, 01.07.11` dan kolom tanggal `mm/dd/yyyy`. | `08/12/1992` bisa dibaca 8 Desember atau 12 Agustus. Salah tanggal lahir berarti salah usia dan salah hitung batas pensiun di skor. |
| F-07 | Nilai mentah sistem tampil ke pengguna | "Kepatuhan Syariah: yes", "Skema Akad: MURABAHAH", "Model narasi: Fallback aturan". | Kesan produk belum matang di depan komite dan auditor. |
| F-08 | Dua angka kelengkapan berbeda | Kepala halaman "Kelengkapan 83%", kaki kartu skor "Kelengkapan data: 85%". | Pengguna tidak tahu angka mana yang dipakai. |
| F-09 | Langkah 2 terlalu panjang | UMKM 3.208 px dan 31 isian. Badan hukum 5.330 px dan 73 isian. Ceklis murabahah ditulis "seluruhnya opsional" tetapi terbuka penuh. | Waktu input lama dan rawan ditinggal di tengah. Ini berlawanan dengan tujuan mempercepat kerja analis. |
| F-10 | Hambatan yang sama ditulis empat kali | "Belum terverifikasi: KTP" muncul di bawah tombol, di kalimat langkah berikutnya, di daftar kelengkapan, dan di panel kuning. | Layar terasa ramai, dan informasi penting lain tenggelam. |
| F-11 | Dua skor tanpa penjelasan yang langsung terlihat | Estimasi format BPRS 77,21 (BBB+) berdampingan dengan SSCI 97,5 (Sangat Layak). Penjelasan hanya lewat tombol AI, yang tidak selalu tersedia. | Selisih 20 poin memancing pertanyaan "mana yang benar" di rapat komite. |
| F-12 | Isian hilang saat pindah halaman lewat menu | Peringatan hanya muncul saat menutup atau memuat ulang tab, tidak saat menekan menu Dashboard. | Isian panel Format BPRS (69 kolom) bisa hilang tanpa peringatan. |
| F-13 | Daftar Riwayat minim informasi | Kartu hanya berisi nama, usaha, plafon, tanggal. Tidak ada skor, nomor tiket, segmen, atau pengurutan. | Checker harus membuka satu per satu untuk memilih prioritas. |
| F-14 | Sub-tab panel Format BPRS tersembunyi | Sepuluh sub-tab dalam satu baris, terpotong di kanan tanpa tanda gulir. | Tab Perizinan, Pejabat, dan Rincian poin mudah terlewat, sehingga Excel tidak lengkap. Ini keluhan awal mitra. |
| F-15 | Keterangan dokumen wajib tidak cocok | Kartu segmen menulis "9 Dokumen Wajib", daftar kelengkapan hanya meminta 3 (KTP, NPWP, NIB). Untuk badan hukum tidak dijelaskan KTP siapa. | Analis tidak yakin dokumen apa yang harus dikumpulkan dari nasabah. |
| F-16 | Tidak ada reset password mandiri | Halaman login: "Lupa password? Hubungi administrator". | Beban admin BPRS bertambah, dan staf tertahan di luar jam kerja admin. |
| F-17 | Bantuan tidak tersedia di dalam aplikasi | Manual book hanya ada di repositori. Singkatan DSR, DSCR, LTV tanpa keterangan. | Staf baru bergantung pada pelatihan tatap muka. |
| A-01 | Kontras teks kurang | Abu-abu `#60708c` di atas latar berwarna: 3,89 sampai 4,46. Merah `#e7000b`: 4,13 sampai 4,49. | Sulit dibaca di layar redup atau oleh staf berusia lanjut. Tidak memenuhi WCAG AA. |
| A-02 | Panel informasi diumumkan sebagai peringatan | `role="alert"` dipakai untuk panduan akad dan catatan dokumen. | Pengguna pembaca layar mendengar "peringatan" setiap kali pindah langkah. |

### Rendah

| ID | Masalah | Bukti |
|---|---|---|
| F-18 | Salah ketik label | "Periode periode berjalan" di editor neraca. |
| F-19 | Rujukan tab salah untuk badan hukum | Panel info menyebut "tab Format Excel BPRS", padahal untuk badan hukum tabnya bernama "Analisa Keuangan". |
| F-20 | Tombol "Ya, setujui" mati tanpa keterangan | Baru muncul "Wajib diisi" setelah kolom catatan disentuh. |
| F-21 | Toast menutupi isi | Menutupi nilai "55/55" dan tombol Unggah NPWP di kanan bawah. |
| F-22 | Dashboard kosong tanpa panduan | Sembilan kartu bernilai nol dan grafik kosong; tidak ada ajakan "buat pengajuan pertama". |
| F-23 | Menu ponsel terpotong | "Riwayat" terpotong di tepi kanan tanpa bayangan atau panah. |
| F-24 | Menu "Pengajuan baru" tampil untuk checker | Perlu dipastikan apakah checker memang boleh membuat pengajuan; jika tidak, menunya sebaiknya disembunyikan. |
| F-25 | Nama pengguna terpotong | "Drs. H. Mulyadi (Komit..." karena jabatan digabung ke nama. |
| F-26 | Plafon rekomendasi tanpa pembanding | "Rp 73 jt" ditampilkan tanpa plafon yang diajukan (Rp 23 jt) di sampingnya. |
| F-27 | NIK pasangan tampil penuh | NIK nasabah disamarkan, NIK pasangan di panel Format BPRS tidak. |
| F-28 | Kolom pilih file berbahasa Inggris | "Choose File No file chosen" pada unggah foto KTP. |
| T-01 | Skrip analitik rusak di setiap halaman | `index.html` memuat `%VITE_ANALYTICS_ENDPOINT%/umami` yang tidak terisi; browser mencatat error di tiap halaman. |
| T-02 | Atribut `data-loc` ikut ke produksi | Setiap elemen membawa path berkas sumber, misalnya `client/src/pages/NewApplication.tsx:1349`. |

## 6. Rekomendasi

### Perbaikan cepat untuk sprint berikutnya (dampak besar, usaha kecil)

| Urutan | Perbaikan | Menjawab | Usaha |
|---|---|---|---|
| 1 | Kunci tombol "Lakukan Penilaian SSCI" selama dokumen wajib belum diunggah, dengan alasan di bawah tombol seperti pada Setujui. Tolak juga di server. | F-01 | Kecil |
| 2 | Perbaiki pembuat data contoh badan hukum supaya neraca selalu seimbang setelah pembulatan, dan tambahkan tes yang melewati validasi formulir. | F-02 | Kecil |
| 3 | Ganti label menjadi "Tolak pengajuan" dan "Tolak dokumen". | F-03 | Sangat kecil |
| 4 | Saat neraca tidak seimbang, gulir ke baris selisih dan ubah pesannya menjadi "Neraca periode berjalan belum seimbang", tanpa menyebut kolom merah. | F-04 | Kecil |
| 5 | Pakai satu istilah, "Pengajuan": judul "Pengajuan Pembiayaan Baru", tombol "Kirim pengajuan", toast "Pengajuan berhasil dibuat", tombol dashboard "Buat pengajuan". | F-05 | Sangat kecil |
| 6 | Satu fungsi format angka dan satu fungsi format tanggal untuk semua panel: `77,21` dan `11 Nov 2026, 01.07`. | F-06 | Kecil |
| 7 | Terjemahkan nilai mentah: `yes` menjadi "Ya, sepenuhnya", `MURABAHAH` menjadi "Murabahah", "Fallback aturan" menjadi "Tanpa AI (aturan otomatis)". | F-07 | Sangat kecil |
| 8 | Tampilkan satu angka kelengkapan. Ganti yang di kaki kartu skor dengan nama lain, misalnya "Data terisi saat dinilai". | F-08 | Sangat kecil |
| 9 | Gelapkan dua token warna: `--muted-foreground` ke `#55647f` (rasio 4,64 sampai 5,97) dan merah error ke `#d1000a` (4,89 sampai 5,65). Keduanya lolos di semua latar yang gagal. | A-01 | Sangat kecil |
| 10 | Komponen `Alert`: `role="alert"` hanya untuk varian error; panel informasi tanpa role. | A-02 | Sangat kecil |
| 11 | Perbaiki teks: "Periode periode berjalan", rujukan tab untuk badan hukum, "9 Dokumen Wajib", dan keterangan "KTP penanggung jawab". | F-15, F-18, F-19 | Sangat kecil |
| 12 | Pindahkan toast ke atas tengah, dan tampilkan "Catatan wajib diisi" di dialog keputusan sejak awal. | F-20, F-21 | Sangat kecil |
| 13 | Tambahkan skor, nomor tiket, dan segmen di kartu Riwayat. | F-13 | Kecil |
| 14 | Hapus tag analitik yang tidak terisi dan matikan `data-loc` di build produksi. | T-01, T-02 | Sangat kecil |

### Perbaikan sedang (sprint sesudahnya)

| Perbaikan | Menjawab |
|---|---|
| Lipat ceklis akad secara bawaan dan pecah langkah 2 badan hukum menjadi "Laporan keuangan" dan "Pembiayaan & akad". | F-09 |
| Tampilkan hambatan sekali saja di panel tahap; bagian lain cukup menaut ke sana. | F-10 |
| Tampilkan penjelasan selisih skor BPRS dan SSCI berbasis aturan tanpa perlu AI: tiga kriteria dengan selisih poin terbesar. | F-11 |
| Peringatan saat pindah halaman lewat menu ketika ada isian belum disimpan. | F-12 |
| Ganti sepuluh sub-tab dengan daftar di sisi kiri yang menampilkan jumlah kolom kosong per bagian. | F-14 |
| Reset password mandiri lewat email. | F-16 |
| Halaman Bantuan di menu profil yang memuat manual book dan daftar istilah, serta tooltip untuk DSR, DSCR, dan LTV. | F-17 |
| Kolom tanggal dengan format `dd/mm/yyyy` yang tetap, tidak bergantung bahasa browser. | F-06 |
| Dashboard kosong dengan tiga langkah awal: buat pengajuan, unggah dokumen, jalankan penilaian. | F-22 |
| Uji kegunaan dengan 3 sampai 5 staf BPRS mitra untuk memvalidasi temuan ini. | Semua |

## 7. Catatan di luar lingkup UX

Saat menyiapkan lingkungan uji, terlihat bahwa `server/passwordAuth.ts` selalu membuat tiga akun demo (`analis@bprs.id`, `komite@bprs.id`, `admin@bprs.id`) dengan password yang tertulis di kode sumber, tanpa syarat lingkungan. Jika berlaku juga di produksi, siapa pun yang membaca repositori bisa masuk sebagai admin organisasi pertama. Ini perlu diperiksa terpisah dari audit UX.

## 8. Status perbaikan (11 November 2026)

Keempat belas perbaikan cepat di bagian 6 sudah dikerjakan dan diverifikasi di aplikasi yang berjalan. Uji WCAG otomatis diulang pada 11 layar, termasuk semua layar yang sebelumnya gagal kontras: hasilnya 0 pelanggaran.

| Urutan | Perbaikan | Status | Catatan |
|---|---|---|---|
| 1 | Kunci tombol penilaian | Selesai | Tombol mati dengan alasan di bawahnya. Server menolak dengan pesan yang sama. |
| 2 | Data contoh badan hukum | Selesai | Penyebabnya: saat kas kurang, penyeimbang neraca dihitung ke arah yang salah. Tes diperluas dari 60 menjadi 2.000 variasi dan terbukti gagal pada kode lama. Di aplikasi, 15 dari 15 percobaan lolos. |
| 3 | Label "Tolak pengajuan" dan "Tolak dokumen" | Selesai | |
| 4 | Error neraca | Selesai | Ringkasan error kini berupa daftar yang bisa diklik dan menyebut masalahnya, misalnya "Neraca periode berjalan belum seimbang". Berlaku untuk semua langkah formulir. |
| 5 | Satu istilah "Pengajuan" | Selesai | |
| 6 | Format angka dan tanggal | Selesai | Fungsi bersama di `client/src/lib/format.ts`. Kolom pilih tanggal bawaan browser belum diganti (masuk perbaikan sedang). |
| 7 | Nilai mentah | Selesai | Juga di laporan PDF. |
| 8 | Satu angka kelengkapan | Selesai | Angka di kaki kartu skor dinamai "Keyakinan skor". |
| 9 | Kontras warna | Selesai | |
| 10 | Peran `Alert` | Selesai | |
| 11 | Perbaikan teks | Selesai | Untuk badan hukum, dokumen ditulis "KTP penanggung jawab" dan "NPWP badan". |
| 12 | Toast dan petunjuk catatan | Selesai dengan penyesuaian | Toast dipindah ke bawah tengah, bukan atas tengah. Saat diuji, posisi atas tengah menutupi nomor tiket dan tombol penilaian. |
| 13 | Kartu Riwayat | Selesai | Menampilkan skor, klasifikasi, nomor tiket, dan segmen. |
| 14 | Tag analitik dan `data-loc` | Selesai | Analitik hanya dimuat bila variabel lingkungannya diisi. |

Perbaikan sedang di bagian 6 dan temuan di bagian 7 belum dikerjakan.
