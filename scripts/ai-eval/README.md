# Uji banding model AI SSCI

Alat ini menjawab satu pertanyaan: apakah model pengganti (misalnya Qwen yang di-host sendiri) bisa mengerjakan tugas AI di SSCI sebaik model yang dipakai sekarang.

Alat ini memanggil fungsi AI produksi apa adanya, jadi prompt, skema JSON, dan parameternya sama persis dengan aplikasi. Yang diganti hanya alamat server dan nama model.

## Fungsi yang diuji

| Nama | Fungsi produksi | Masukan |
|---|---|---|
| `konsistensi` | `checkApplicationConsistency` | data pengajuan |
| `syariah` | `checkShariaConformity` | data pengajuan dan teks fatwa |
| `komite` | `generateCommitteeBrief` | data pengajuan, skor, kebijakan |
| `narasi_bprs` | `draftBprsNarrative` | data pengajuan dan profil format BPRS |
| `rekomendasi` | `generateNarrativeRecommendation` | skor dan temuan |
| `beda_skor` | `explainScoreComparison` | skor SSCI dan skor format BPRS |
| `ktp` | `extractKtpOcr` | foto KTP |
| `dokumen` | `extractSupportingDocument` | slip gaji, mutasi rekening, NIB, NPWP |
| `rekening_koran` | `readBankStatement` | halaman rekening koran |
| `survei` | `analyzeSurveyImage` | foto tempat usaha |

## Menyiapkan

1. Pasang dependensi: `pnpm install`.
2. Salin daftar model lalu sesuaikan:

   ```bash
   mkdir -p ai-eval && cp scripts/ai-eval/models.example.json ai-eval/models.json
   ```

   Setiap model butuh `name` (nama di laporan), `baseUrl` (alamat API yang kompatibel dengan OpenAI, sampai `/v1`), dan `model`. Isi `apiKeyEnv` dengan nama variabel lingkungan yang menyimpan kunci; hapus baris itu untuk server lokal tanpa kunci. Kunci tidak pernah ditulis di berkas.

3. Untuk fungsi gambar, taruh berkas JPG atau PNG di `ai-eval/data/`:

   ```
   ai-eval/data/
     ktp/               budi.jpg, budi.expected.json
     slip_gaji/         ...
     mutasi_rekening/   ...
     nib/               ...
     npwp/              ...
     survei/            toko.jpg
     rekening_koran/
       kasus-1/         hal-1.jpg, hal-2.jpg, expected.json
   ```

Belum punya dokumen uji? Buat dokumen rekaan beserta nilai benarnya (KTP, slip gaji, NIB, NPWP, rekening koran; butuh Playwright dengan Chromium):

```bash
node scripts/ai-eval/make-sample-docs.mjs
```

Dokumen rekaan ini bersih dan mudah dibaca, jadi hanya menyaring model yang gagal total. Untuk menilai ketahanan, pakai foto dokumen sungguhan yang sudah dianonimkan.

Folder `ai-eval/` tidak masuk git, jadi dokumen uji dan hasilnya tetap di komputer ini.

## Nilai benar

Berkas `*.expected.json` berisi nilai yang seharusnya terbaca. Tulis hanya kolom yang ingin dinilai; kolom lain diabaikan.

```json
{ "customerName": "Budi Santoso", "customerId": "3200000000000001" }
```

Teks dianggap cocok tanpa melihat huruf besar dan tanda baca. Angka dianggap cocok bila selisihnya paling banyak 1 persen.

Untuk rekening koran, nilai benar ditulis sebagai jumlah per bulan:

```json
{ "holderName": "Budi Santoso", "2026-01 totalKredit": 45200000, "2026-01 totalDebit": 38100000 }
```

Tanpa nilai benar, fungsi gambar tetap dijalankan dan keluarannya tampil berdampingan di laporan.

## Menjalankan

```bash
pnpm eval:ai
```

```bash
pnpm eval:ai --tasks syariah,komite --models qwen
```

```bash
pnpm eval:ai --list
```

Pilihan lain: `--timeout 300` (detik per panggilan, bawaan 180) dan `--config <berkas>` untuk daftar model di tempat lain.

Hasil ditulis ke `ai-eval/results/<waktu>/`:

- `report.md`: ringkasan per fungsi dan model, daftar kegagalan, kolom yang salah baca, lalu keluaran tiap model berdampingan untuk dinilai ahli.
- `results.json`: data lengkap, termasuk jawaban mentah model dan jumlah token.

## Membaca ringkasan

- **Berhasil**: model mengembalikan JSON yang lolos skema produksi. Model yang sering gagal di sini tidak bisa dipakai apa pun isi jawabannya.
- **Patuh aturan**: tidak melanggar aturan yang tertulis di prompt dan bisa dicek mesin, misalnya jumlah butir ringkasan komite, larangan menulis nama nasabah di narasi, dan rujukan fatwa bernomor.
- **Kolom cocok**: untuk kasus yang punya nilai benar.
- **Waktu tengah**: lama satu panggilan.

Mutu isi narasi dan ketepatan analisis tidak dinilai mesin. Itu dibaca ahli dari bagian keluaran berdampingan.

## Kasus teks

`cases.json` berisi lima pengajuan rekaan, tanpa data nasabah sungguhan. Tambahkan kasus baru dengan bentuk yang sama. Blok `assessment`, `policy`, `profile`, dan `bprsScore` bersifat pilihan; fungsi yang membutuhkannya dilewati bila bloknya tidak ada. Blok `expect` berisi nilai benar, dan daftar berarti "salah satu dari ini".

## Yang perlu diketahui

- **Data dikirim ke setiap model di daftar.** Bila daftar memuat layanan luar seperti OpenRouter, dokumen di `ai-eval/data/` ikut terkirim ke sana. Pakai dokumen rekaan atau yang sudah dianonimkan.
- **Server model harus mendukung keluaran JSON berskema** (`response_format` jenis `json_schema`). vLLM dan Ollama versi baru mendukungnya. Tanpa itu, model akan sering gagal di kolom "Berhasil".
- **Fungsi gambar butuh model yang bisa membaca gambar.** Model teks saja akan gagal di empat fungsi itu.
- **Lima kasus teks hanya cukup untuk penyaringan awal.** Untuk keputusan, tambah kasus dari pengajuan nyata yang sudah dianonimkan.
