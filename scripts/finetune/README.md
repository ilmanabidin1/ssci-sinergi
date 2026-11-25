# Fine-tune ringan Amanah AI dengan fatwa DSN-MUI

Dua langkah: menyusun data latih dari korpus fatwa, lalu melatih adaptor LoRA kecil di atas model dasar.

## 1. Data latih

```bash
python3 scripts/finetune/build_fatwa_dataset.py
```

Hasilnya `corpus/dataset/train.jsonl` (833 pasangan) dan `val.jsonl` (41 pasangan) dari 92 fatwa. Fatwa yang sudah tidak berlaku dan yang di luar pembiayaan BPRS (pasar modal, asuransi, dan sejenisnya) tidak ikut.

Tidak ada model bahasa yang dipakai untuk menyusunnya. Setiap jawaban adalah teks yang diambil dari fatwa, dan setiap pertanyaan diturunkan dari susunan fatwa itu:

| Jenis | Jumlah | Isi |
|---|---|---|
| `definition` | 445 | Butir "X adalah ..." dari ketentuan umum |
| `fatwa_section` | 360 | Satu pasangan per bagian diktum (Pertama, Kedua, dan seterusnya) |
| `fatwa_overview` | 69 | Fatwa mana yang mengatur suatu akad dan apa saja isinya |

Sebagian teks berasal dari OCR (`meta.text_quality` bernilai `ocr`), jadi bisa memuat salah baca.

## 2. Melatih adaptor

```bash
pip install "transformers>=5.8" peft accelerate
```

```bash
python3 scripts/finetune/train_lora.py --out /workspace/amanah-lora
```

Butuh GPU sekitar 80 GB untuk model 27B. Bobot model dasar tidak diubah; hasilnya folder adaptor berukuran ratusan MB.

**Skrip ini belum pernah dijalankan.** Ia ditulis tanpa GPU. Coba dulu dengan `--limit 16`, periksa daftar lapisan yang dicetak, dan pastikan loss turun sebelum melatih penuh.

## 3. Memakai hasilnya

vLLM memuat adaptor di samping model dasar dan memberinya nama sendiri:

```bash
vllm serve Qwen/Qwen3.8-27B --lora-modules amanah-ai=/workspace/amanah-lora ...
```

Lalu isi `AI_MODEL=amanah-ai` di SSCI. Flag lain sama dengan `docs/AMANAH_AI.md`.

## 4. Wajib: uji ulang sebelum dipakai

Data latih ini mengajarkan isi fatwa, bukan tugas SSCI. Fine-tune bisa saja menurunkan kemampuan yang sudah baik, misalnya kepatuhan pada format JSON atau pembacaan dokumen. Jalankan `pnpm eval:ai` terhadap model dasar dan model beradaptor, lalu pakai adaptornya hanya bila hasilnya tidak lebih buruk.
