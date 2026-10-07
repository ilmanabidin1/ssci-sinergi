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

### 3.1 Membuat pengajuan
1. Menu **Pengajuan baru**, pilih segmen produk.
2. Isi data nasabah. Foto KTP dapat dibaca otomatis (OCR) dan **wajib diperiksa ulang**.
3. Isi data usaha dan keuangan. Tiga cara mengisi angka keuangan:
   - **Laporan keuangan** jika tersedia.
   - **Kalkulator omzet harian** untuk nasabah tanpa laporan keuangan (omzet per hari, hari buka, persentase modal, biaya tetap).
   - **Baca dokumen dengan AI** dari slip gaji, mutasi rekening, NIB, atau NPWP. Angka hanya dipakai jika menekan "Pakai".

   Metode yang dipakai tercatat dan tampil di laporan.
4. Sistem menampilkan **jalur pemeriksaan**:
   - **Jalur ringkas**: plafon sampai Rp 25 juta dan bukan pihak terkait.
   - **Jalur lengkap**: plafon di atas Rp 25 juta atau pihak terkait.
5. Lengkapi akad, dokumen legal, kepatuhan syariah, dan tinjauan ESG, lalu kirim.

### 3.2 Menilai pengajuan
1. Buka detail pengajuan, unggah dokumen (KTP, NPWP, NIB) dan foto survei lapangan.
2. Tekan **Lakukan Penilaian SSCI**. Jika pemeriksaan data menemukan masalah tingkat tinggi atau sedang (misalnya NIK tidak 16 digit), perbaiki datanya atau isi **catatan konfirmasi**. Catatan ini tersimpan dan tercantum di laporan.
3. Gunakan **Asisten AI Penilaian** bila perlu: konsistensi data, kesesuaian syariah (merujuk fatwa DSN-MUI), dan ringkasan komite. Hasil AI adalah catatan pendukung dan tidak mengubah skor.

### 3.3 Format Excel BPRS (Skoring Fluktuatif UMKM)
Panel **Format Excel BPRS** di halaman detail mengisi otomatis file Excel skoring yang selama ini dipakai BPRS.
1. Data SSCI (identitas, alamat, HP, plafon, tenor, margin, akad, tujuan, omzet, biaya usaha, angsuran existing, lama usaha) terisi sendiri.
2. Lengkapi tab **Identitas**, **Tempat tinggal & usaha**, **Bank & pembiayaan**, **Agunan & mitigasi**. Pilihan jawaban sama persis dengan dropdown di Excel.
3. Tab **Rekening koran**: ketik mutasi 3 bulan (satu nominal per baris) atau unggah foto halaman rekening koran lalu tekan **Baca** (AI). Periksa hasilnya, tekan **Pakai hasil ini**, lalu simpan.
4. Tab **Narasi**: tombol **Buat draf narasi dengan AI** menyusun latar belakang, pengalaman usaha, dan indikator reputasi tanpa nama dan NIK. AO wajib menyunting.
5. Perhatikan kotak **Periksa sebelum mengunduh** (isian yang saling bertentangan) dan **Estimasi skor format BPRS** dibandingkan skor SSCI. Tombol **Jelaskan perbedaan skor** memberi penjelasan singkat.
6. Tekan **Simpan isian**, lalu **Unduh Excel BPRS**. Excel menghitung ulang skor, rating, dan jadwal angsuran saat file dibuka. Nilai resmi adalah yang tampil di Excel.

Setiap penyimpanan dan pengunduhan tercatat di log audit (`BPRS_PROFILE_UPDATED`, `BPRS_EXCEL_EXPORTED`). File berisi NIK lengkap, jadi simpan sesuai kebijakan data BPRS.

Template Fix Income (karyawan) belum didukung karena rumus skor akhirnya rusak (`#REF!`) di file asli BPRS.

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
