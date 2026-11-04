# Manual Book SSCI (DRAF)

Panduan penggunaan Sustainable Sharia Creditworthiness Index (SSCI) untuk BPRS. Disusun per peran.

## 1. Gambaran alur

```
Nasabah ── data & dokumen ──> Maker (Analis/AO)
                                 │ input pengajuan, unggah dokumen
                                 ▼
                         Pemeriksaan data otomatis ──(temuan)──> konfirmasi analis
                                 │
                                 ▼
                         Penilaian SSCI (aturan)  ──> narasi pendukung (AI, opsional)
                                 │
                                 ▼
               Checker (Komite): verifikasi dokumen, uji sensitivitas,
               peninjauan klasifikasi (opsional), cek syarat jalur
                                 │
                                 ▼
                         Keputusan: setujui / tolak
                                 │
                                 ▼
               Nasabah melihat status & penjelasan di halaman Lacak,
               dapat mengajukan pembaruan data atau peninjauan ulang
```

## 2. Peran pengguna

| Peran | Siapa | Dapat melakukan |
|-------|-------|-----------------|
| Maker | Analis pembiayaan / Account Officer | Membuat pengajuan, mengunggah dokumen dan foto survei, menjalankan penilaian SSCI |
| Checker | Komite pembiayaan / pejabat pemutus | Memverifikasi dokumen, meninjau klasifikasi, menyetujui atau menolak, mengekspor data |
| Admin BPRS | Pengelola akun BPRS | Semua hak checker, mengelola tim, pengaturan BPRS, melihat log audit BPRS-nya |
| SuperAdmin platform | Pengelola platform SSCI | Menyetujui atau menangguhkan pendaftaran BPRS, melihat log audit seluruh BPRS |
| Nasabah | Pemohon pembiayaan | Melacak status, melihat penjelasan keputusan, mengajukan pembaruan data atau peninjauan ulang |

Admin dan checker **wajib** mengaktifkan autentikasi dua faktor (2FA). SuperAdmin juga wajib 2FA.

## 3. Panduan Maker

### 3.1 Membuat pengajuan (4 langkah)
1. **Nasabah & usaha**: segmen produk, identitas (foto KTP dapat dibaca otomatis dan **wajib diperiksa ulang**), usaha, sumber penghasilan, dan profil singkat untuk format Excel BPRS (opsional).
2. **Keuangan & akad**: pilih satu sumber angka (isi langsung, omzet harian, baca dokumen dengan AI, atau import CSV), lalu isi kebutuhan pembiayaan dan ceklist akad. Sistem menampilkan jalur pemeriksaan:
   - **Jalur ringkas**: plafon sampai Rp 25 juta dan bukan pihak terkait. Isian ESG menjadi opsional dan dilipat.
   - **Jalur lengkap**: plafon di atas Rp 25 juta atau pihak terkait.
3. **Dokumen & syariah**: daftar dokumen wajib, kepatuhan syariah, dan tata kelola. Status dokumen di sini hanya catatan awal.
4. **Periksa & kirim**: ringkasan seluruh isian dengan tombol "Ubah" ke langkah terkait.

Draft tersimpan otomatis di perangkat dan dapat dipulihkan.

Segmen yang ditawarkan ada tiga: **UMKM** (penghasilan usaha, tidak tetap), **Karyawan swasta** (penghasilan tetap), dan **Badan hukum** (PT, CV, Koperasi, Yayasan, Firma). Sumber penghasilan mengikuti segmen; hanya UMKM yang dapat memilih penghasilan bersama suami-istri. Untuk **badan hukum** formulirnya berbeda:
1. **Badan usaha**: nama badan usaha, bentuk, NPWP badan (15 atau 16 digit), NIB (13 digit), akta pendirian dan perubahan terakhir, SK Kemenkumham, tanggal berdiri (lama usaha dihitung otomatis), bidang usaha, kontak kantor, penanggung jawab (nama, jabatan, NIK 16 digit, HP), dan pemegang saham utama (opsional). Isian pribadi (KTP, status perkawinan, pasangan, dan sejenisnya) tidak ditanyakan.
2. **Keuangan & akad**: neraca dan laba rugi dua periode (tahun lalu dan periode berjalan) seperti sheet Neraca dan LR pada Excel Analisa Keuangan. Neraca harus seimbang (total aset = kewajiban + modal). Rasio keuangan tampil langsung dengan benchmark bank. Pendapatan bulanan SSCI = penjualan periode berjalan / 12, pengeluaran bulanan = (HPP + seluruh biaya) / 12; keduanya dihitung otomatis dan tidak diketik.

### 3.2 Halaman detail pengajuan
Bagian atas menampilkan **tahap** (Lengkapi, Nilai, Tinjau, Putuskan), **satu aksi berikutnya** sesuai peran, dan **bilah kelengkapan** yang menggabungkan semua kekurangan. Klik kekurangan untuk langsung ke tab terkait. Isi halaman dibagi menjadi tab:
- **Ringkasan**: permintaan nasabah, syarat jalur, skor SSCI (skor utama), dan Asisten AI.
- **Data & Dokumen**: unggah dan verifikasi dokumen, foto survei, data nasabah dan keuangan.
- **Analisis lanjutan**: peninjauan klasifikasi oleh pejabat berwenang dan uji sensitivitas.
- **Format Excel BPRS**: lihat 3.3.
- **Riwayat**: catatan dan aktivitas.

Langkah maker:
1. Di tab **Data & Dokumen**, unggah dokumen wajib dan foto survei. Status dokumen legal untuk skor diambil otomatis dari unggahan dan verifikasi checker saat penilaian.
2. Tekan **Lakukan Penilaian SSCI**. Jika pemeriksaan data menemukan masalah tingkat tinggi atau sedang, perbaiki datanya atau isi **catatan konfirmasi**. Setelah penilaian, pemeriksaan konsistensi, kesesuaian syariah, dan ringkasan komite oleh AI **berjalan otomatis**. Hasil AI adalah catatan pendukung dan tidak mengubah skor.

### 3.3 Format Excel BPRS (Skoring Fluktuatif UMKM)
Panel **Format Excel BPRS** di halaman detail mengisi otomatis file Excel skoring yang selama ini dipakai BPRS.
1. Data SSCI (identitas, alamat, HP, plafon, tenor, margin, akad, tujuan, omzet, biaya usaha, angsuran existing, lama usaha) terisi sendiri.
2. Lengkapi tab **Identitas**, **Tempat tinggal & usaha**, **Bank & pembiayaan**, **Agunan & mitigasi**. Pilihan jawaban sama persis dengan dropdown di Excel.
3. Tab **Rekening koran**: ketik mutasi 3 bulan (satu nominal per baris) atau unggah foto halaman rekening koran lalu tekan **Baca** (AI). Periksa hasilnya, tekan **Pakai hasil ini**, lalu simpan.
4. Tab **Narasi**: tombol **Buat draf narasi dengan AI** menyusun latar belakang, pengalaman usaha, dan indikator reputasi tanpa nama dan NIK. AO wajib menyunting.
5. Jika rincian agunan diisi saat pengajuan belum dinilai, nilai agunan pengajuan ikut diperbarui otomatis dari jumlah nilai pasar.
6. Perhatikan kotak **Periksa sebelum mengunduh** (isian yang saling bertentangan) dan **Estimasi skor format BPRS** dibandingkan skor SSCI. Tombol **Jelaskan perbedaan skor** memberi penjelasan singkat.
7. Tekan **Simpan isian**, lalu **Unduh Excel BPRS**. Excel menghitung ulang skor, rating, dan jadwal angsuran saat file dibuka. Nilai resmi adalah yang tampil di Excel.

Setiap penyimpanan dan pengunduhan tercatat di log audit (`BPRS_PROFILE_UPDATED`, `BPRS_EXCEL_EXPORTED`). File berisi NIK lengkap, jadi simpan sesuai kebijakan data BPRS.

Ada dua template, dipilih otomatis dari sumber penghasilan pengajuan dan dapat diganti analis:
- **Skoring Fluktuatif Income UMKM** untuk penghasilan tidak tetap (usaha).
- **Skoring Fix Income dengan Agunan** untuk penghasilan tetap (karyawan). Tab **Pekerjaan & gaji** berisi status karyawan, slip gaji, rekening gaji, potongan gaji, gaji bulanan, dan data instansi. Jika tenor melewati usia pensiun (55 tahun untuk non PNS), Excel memotong skor menjadi 70%; untuk PNS/TNI/POLRI Excel tidak memotong, tetapi SSCI tetap memberi peringatan.

#### Badan hukum: Excel Analisa Keuangan
Untuk pengajuan segmen badan hukum, tab ini bernama **Analisa Keuangan** dan menggantikan skoring BPRS (workbook bank hanya berisi rasio, tanpa skor):
1. Ubah neraca dan laba rugi dua periode bila perlu, lalu **Simpan isian**. Selama pengajuan belum dinilai, pendapatan dan pengeluaran bulanan pengajuan ikut diperbarui.
2. Tabel **Rasio keuangan** menampilkan current, quick, dan cash ratio, DER, DAR, equity multiplier, NPM, ROA, ROE, dan BOPO beserta benchmark bank (CR ≥ 150%, QR ≥ 100%, cash ratio ≥ 50%, DER < 70%, DAR < 70%, ROA > 1,45%, ROE > 23%, BOPO ≤ 83%).
3. Bagian **Pertumbuhan** dan **Kebutuhan modal kerja** (siklus kas = hari piutang + hari persediaan - hari hutang) mengikuti sheet Pertumbuhan dan Keb Modal. Proyeksi pertumbuhan penjualan diisi ke sel E33 Keb Modal-B; bila kosong, Excel memakai pertumbuhan historis.
4. **Unduh Excel Analisa Keuangan** mengisi sel Neraca (E5 sampai J19 dan E28 sampai J42, label periode A2 dan A25), LR (D5 sampai D17 dan D30 sampai D42), serta Keb Modal-B (E33 sebagai pecahan, misalnya 12% ditulis 0,12, dan I14 jumlah hari). Rumus rasio dihitung ulang oleh Excel saat file dibuka. Kelengkapan alur kerja badan hukum mensyaratkan neraca dan laba rugi kedua periode terisi dan seimbang sebelum penilaian.

**Memasang template (untuk admin teknis).** Template belum disertakan; sampai dipasang, tombol unduh menampilkan "Template Analisa Keuangan belum tersedia, hubungi admin". Cara memasang: salin file asli bank `ANALISA_KEUANGAN_ORIGINAL.xlsx` apa adanya (seluruh angka contohnya 0, jadi tidak perlu dibersihkan) ke `templates/bprs/analisa-keuangan.xlsx`, lalu jalankan `npx vitest run server/analisaKeuangan.test.ts`. Uji "template bank" yang sebelumnya dilewati akan berjalan dan memastikan semua sel isian di atas bukan rumus. Bila bank mengubah tata letak sheet, sesuaikan peta sel di `server/analisaKeuanganExcel.ts`. Pengunduhan tercatat di log audit (`ANALISA_KEUANGAN_EXPORTED`), penyimpanan sebagai `COMPANY_PROFILE_UPDATED`.

## 4. Panduan Checker

1. **Verifikasi dokumen** yang diunggah maker.
2. Periksa **syarat persetujuan jalur**:
   - Jalur ringkas: KTP terverifikasi.
   - Jalur lengkap: KTP, NPWP, NIB terverifikasi dan minimal 1 foto survei.
   - Kedua jalur: semua permintaan nasabah sudah ditanggapi.

   Persetujuan ditolak sistem jika syarat belum terpenuhi. Penolakan tetap dapat dilakukan.
3. Jalankan **Uji Sensitivitas Skor** untuk melihat seberapa stabil klasifikasi jika data bergeser ±10% dan ±20%, dan seberapa jauh setiap input dari ambang klasifikasi.
4. Jika klasifikasi sistem tidak mencerminkan kondisi nyata, gunakan **Peninjauan oleh Pejabat Berwenang**. Pilih klasifikasi baru dan tulis alasan (minimal 20 karakter). Skor asli tetap tersimpan.
5. **Setujui** atau **Tolak** dengan catatan keputusan. Catatan keputusan bersifat internal dan **tidak** ditampilkan ke nasabah.
6. Tanggapi **Permintaan Nasabah** di halaman detail. Tanggapan ini **terlihat oleh nasabah**.

Checker tidak dapat memutuskan atau meninjau pengajuan yang ia buat atau nilai sendiri.

## 5. Panduan Admin BPRS
- **Kelola Tim**: tambah maker atau checker, nonaktifkan akun (akun nonaktif langsung tidak dapat mengakses sistem), reset 2FA anggota yang kehilangan ponsel.
- **Pengaturan**: profil BPRS, logo, kebijakan kredit, 2FA pribadi, ubah password.
- **Audit Log**: riwayat tindakan penting di BPRS.

## 6. Panduan SuperAdmin platform
- Menu **Konsol SuperAdmin** (dari menu profil).
- **Organisasi BPRS**: setujui pendaftaran baru atau tangguhkan BPRS.
- **Log audit platform**: seluruh kejadian lintas BPRS, dapat difilter per BPRS.
- SuperAdmin ditetapkan oleh pengelola server melalui variabel `SUPERADMIN_EMAILS`, bukan dari aplikasi.

## 7. Panduan Nasabah (halaman Lacak Pengajuan)
1. Masukkan nomor tiket (misalnya SSCI-00015) dan 4 digit terakhir NIK.
2. Lihat tahapan proses. Setelah keputusan, tampil **penjelasan hasil penilaian** per aspek dan, jika belum disetujui, hal yang dapat diperbaiki.
3. Ajukan **pembaruan data** (sebelum dinilai) atau **peninjauan ulang** (setelah belum disetujui).

## 8. Keamanan untuk semua pengguna
- Jangan bagikan password atau kode 2FA.
- Login dikunci 15 menit setelah 5 kali gagal.
- NIK lengkap hanya dibuka bila perlu melalui tombol "Tampilkan"; setiap pembukaan tercatat.
- Ekspor data (SLIK, semua pengajuan) hanya untuk checker dan admin, dan tercatat.

## 9. Pengaturan server (untuk pengelola teknis)

| Variabel | Fungsi |
|----------|--------|
| `ENFORCE_TWO_FACTOR` | `false` untuk menonaktifkan wajib 2FA (hanya untuk demo) |
| `SUPERADMIN_EMAILS` | Daftar email SuperAdmin dipisah koma; jika kosong memakai `PILOT_ADMIN_EMAIL` |
| `OPENROUTER_API_KEY` | Kunci layanan AI; jika kosong fitur AI nonaktif dan sistem memakai aturan |
| `RESET_PILOT_ADMIN_PASSWORD` | `true` untuk mereset password pilot admin (SuperAdmin) ke nilai `PILOT_ADMIN_PASSWORD` saat server dimulai; hapus lagi setelah berhasil login |
| `RESET_PILOT_ADMIN_2FA` | `true` untuk mereset 2FA pilot admin jika ponsel hilang; hapus lagi setelah dipakai |

### Lupa password SuperAdmin
1. Di Railway, buka service aplikasi, tab Variables.
2. Isi `PILOT_ADMIN_PASSWORD` dengan password baru, lalu tambahkan `RESET_PILOT_ADMIN_PASSWORD=true` (dan `RESET_PILOT_ADMIN_2FA=true` jika aplikasi authenticator juga hilang).
3. Tunggu redeploy selesai, lalu login dengan password baru.
4. **Hapus** variabel `RESET_...` agar password tidak tereset lagi setiap server dimulai ulang.
5. Pemulihan ini tercatat di log audit sebagai `PILOT_ADMIN_RECOVERED`.
