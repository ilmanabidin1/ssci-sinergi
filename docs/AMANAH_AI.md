# Amanah AI

Amanah AI adalah nama layanan AI di SSCI. Di baliknya ada satu model bahasa yang juga bisa membaca gambar, dipanggil lewat API yang kompatibel dengan OpenAI. Model itu bisa di-host sendiri, sehingga data pengajuan dan dokumen nasabah tidak keluar dari server milik sendiri.

Amanah AI hanya membantu: membaca dokumen, memeriksa kejanggalan data, mencocokkan pengajuan dengan fatwa, dan menyusun narasi. Skor SSCI tetap dihitung oleh aturan, dan keputusan tetap milik BPRS.

## Mengarahkan SSCI ke server model

Tiga variabel lingkungan di server aplikasi:

| Variabel | Isi |
|---|---|
| `AI_BASE_URL` | alamat server model sampai `/v1` |
| `AI_API_KEY` | kunci server model; bila kosong, semua fitur AI mati dan sistem memakai aturan |
| `AI_MODEL` | nama model di server itu |

Nama lama `OPENROUTER_API_KEY` dan `OPENROUTER_BASE_URL` masih dibaca, jadi instalasi yang ada tetap jalan sampai variabel baru diisi. Tanpa `AI_MODEL`, model bawaannya `openai/gpt-6-luna` di OpenRouter.

Setelah mengubah variabel, mulai ulang aplikasi. Nama model yang dipakai tetap tercatat di setiap penilaian (kolom `recommendationModel`) untuk keperluan audit, tetapi yang tampil ke pengguna hanya "Amanah AI".

## Model yang sudah diuji

Diuji dengan `scripts/ai-eval` pada lima pengajuan rekaan dan tujuh dokumen rekaan, memakai prompt produksi apa adanya (24 dan 25 November 2026).

| Model | Hasil |
|---|---|
| `Qwen/Qwen3.8-27B` | Semua fungsi teks dan gambar lolos; mutu analisis setara model OpenRouter pada uji ini. Butuh GPU sekitar 80 GB. |
| `Qwen/Qwen3.8-27B-FP8` | Sama untuk fungsi teks. Satu transaksi rekening koran terlewat tanpa peringatan. Muat di GPU 48 GB. |
| `Qwen/Qwen3-14B` | Format lolos, tetapi salah vonis syariah dan rujukan fatwa dikarang. Tidak bisa membaca gambar. Tidak disarankan. |

Yang belum diuji: foto dokumen dari ponsel (uji memakai dokumen rekaan yang bersih), foto survei tempat usaha, dan beban banyak pengguna sekaligus. Kedua model Qwen3.8 juga kurang peka daripada model OpenRouter pada cek konsistensi: murabahah untuk uang tunai dan usaha tidak halal hanya tertangkap di cek syariah.

## Menjalankan server model

Perintah yang dipakai saat uji, dengan image `vllm/vllm-openai:v0.32.0` (butuh driver CUDA 13):

```bash
vllm serve Qwen/Qwen3.8-27B-FP8 \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.92 \
  --max-num-seqs 16 \
  --reasoning-parser qwen3 \
  --default-chat-template-kwargs '{"enable_thinking": false}'
```

- `VLLM_API_KEY` wajib diisi di lingkungan server model; nilainya yang dipakai sebagai `AI_API_KEY`.
- `--default-chat-template-kwargs` mematikan mode berpikir. Tanpa itu, jatah token habis untuk berpikir dan jawaban JSON terpotong.
- `--max-num-seqs 16` wajib di GPU 48 GB. Dengan nilai bawaan (256) server gagal menyala karena memori cache tidak cukup.
- Untuk versi presisi penuh di GPU 80 GB, ganti nama model dan hapus `--max-num-seqs`.
- Bobot FP8 memakan 28,4 GB memori GPU dan sekitar 29 GB disk.

Waktu jawab pada satu GPU saat uji: 2 sampai 9 detik untuk fungsi pendek, 20 sampai 28 detik untuk cek syariah dan ringkasan komite, sekitar 20 detik untuk rekening koran dua halaman.

## Sebelum dipakai di produksi

1. Jalankan `pnpm eval:ai` terhadap server model yang baru (lihat `scripts/ai-eval/README.md`) dan bandingkan dengan model sebelumnya.
2. Uji pembacaan rekening koran dan KTP dengan foto sungguhan yang sudah dianonimkan. Salah baca di rekening koran langsung memengaruhi angka analisis.
3. Perbarui daftar sub-prosesor di `docs/tata-kelola/03-pelindungan-data.md`: penyedia AI luar diganti server sendiri.

## Asal model

Amanah AI adalah nama layanan, bukan model buatan sendiri. Model dasarnya Qwen dari Alibaba Cloud, berlisensi Apache 2.0, yang mengizinkan pemakaian komersial dan penamaan ulang layanan. Dalam dokumen tata kelola dan laporan penelitian, sebutkan model dasarnya agar klaimnya akurat.
