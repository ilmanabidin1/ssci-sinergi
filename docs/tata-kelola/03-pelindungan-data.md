# Pelindungan Data Pribadi (DRAF)

Rujukan utama: Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Ketentuan OJK tentang penyelenggaraan teknologi informasi bagi BPR/BPRS dan pelindungan konsumen **[verifikasi hukum: nomor dan pasal POJK yang berlaku]**.

## 1. Peran para pihak

| Pihak | Peran menurut UU PDP | Keterangan |
|-------|----------------------|------------|
| BPRS | **Pengendali data** | Menentukan tujuan pemrosesan (penilaian pembiayaan) dan memegang hubungan dengan nasabah |
| Penyelenggara platform SSCI | **Prosesor data** | Memproses data atas perintah BPRS; perlu perjanjian pemrosesan data dengan setiap BPRS |
| Penyedia hosting (saat ini Railway, region Singapura) | Sub-prosesor | Menyimpan basis data dan berkas unggahan |
| Penyedia AI (OpenRouter, model OpenAI) | Sub-prosesor | Memproses teks atau gambar untuk fitur AI |

## 2. Data yang diproses

| Kategori | Contoh | Perlakuan di sistem |
|----------|--------|---------------------|
| Identitas | Nama, NIK, alamat, telepon, email | NIK tampil tersamar (`3273********0123`) di daftar, detail, dan PDF; pembukaan NIK lengkap tercatat di audit |
| Keuangan | Pendapatan, pengeluaran, angsuran, agunan | Dipakai untuk skor; ekspor hanya checker dan admin, tercatat |
| Dokumen | KTP, NPWP, NIB, foto survei | Disimpan di server; verifikasi oleh checker |
| Akun pengguna | Email, password (hash), rahasia 2FA (terenkripsi) | Tidak pernah dikirim ke tampilan |

## 3. Data yang dikirim ke AI

| Fitur | Data terkirim | Tidak dikirim |
|-------|---------------|---------------|
| Narasi rekomendasi | Skor, rincian pilar, faktor risiko | Nama, NIK |
| Konsistensi data, kesesuaian syariah, ringkasan komite | Data usaha dan keuangan, alamat, kutipan fatwa | Nama, NIK |
| OCR KTP dan baca dokumen | **Gambar dokumen utuh** (termasuk nama dan NIK di dalamnya) | |
| Analisis foto survei | Foto lokasi usaha | |

**Risiko utama:** gambar KTP dan dokumen dikirim ke penyedia AI di luar negeri.

Opsi mitigasi untuk diputuskan:
- (a) Nonaktifkan OCR dan baca dokumen untuk BPRS yang tidak menyetujui transfer data.
- (b) Gunakan model AI yang dihosting di Indonesia.
- (c) Masukkan persetujuan nasabah atas transfer data ke luar negeri dalam formulir pembiayaan **[verifikasi hukum: ketentuan transfer data pribadi ke luar wilayah hukum RI]**.

## 4. Lokasi data
Server dan basis data saat ini berada di region **Singapura** (Railway `asia-southeast1`). Masukan FGD (Pak Didin) menyarankan pemindahan ke Indonesia. Rencana:
1. Pilih penyedia cloud atau VPS dengan pusat data di Indonesia.
2. Migrasi basis data dan berkas unggahan, lalu verifikasi.
3. Evaluasi model AI lokal untuk fitur yang memproses dokumen identitas.

## 5. Kontrol keamanan yang sudah berjalan
- Password di-hash, dan 2FA wajib untuk admin, checker, dan SuperAdmin. Rahasia 2FA dienkripsi.
- Login dikunci 15 menit setelah 5 kali gagal. Pelacakan publik dibatasi per tiket.
- Pemisahan maker-checker ditegakkan di server.
- Akun nonaktif dan BPRS yang ditangguhkan langsung kehilangan akses.
- Jejak audit untuk pembuatan, penilaian, peninjauan, keputusan, ekspor, pembukaan NIK, perubahan 2FA, dan permintaan nasabah.
- Halaman publik hanya menampilkan nama tersamar dan penjelasan tanpa skor maupun catatan internal.

## 6. Hak subjek data (nasabah)
Perlu prosedur tertulis untuk hak akses, perbaikan, dan penghapusan data **[verifikasi hukum: hak subjek data dan pengecualian kewajiban retensi data perbankan]**. Di sistem saat ini, perbaikan data dapat diajukan nasabah melalui halaman Lacak (permintaan pembaruan data).

## 7. Retensi dan insiden
- Masa simpan data dan dokumen mengikuti ketentuan retensi dokumen perbankan **[verifikasi hukum]**.
- Insiden kebocoran: identifikasi, isolasi, laporkan ke Pengendali (BPRS), lalu ikuti kewajiban pemberitahuan sesuai UU PDP **[verifikasi hukum: batas waktu pemberitahuan]**.
