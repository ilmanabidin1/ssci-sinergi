# Pengumpul korpus SSCI

Skrip di folder ini mengunduh sumber rujukan untuk model AI lokal SSCI dan mengubahnya menjadi teks. Hasilnya dipakai sebagai rujukan yang disisipkan ke prompt (RAG) dan sebagai arsip rujukan tim.

| Skrip | Sumber | Hasil |
|---|---|---|
| `scrape_dsn_fatwa.py` | Daftar fatwa di dsnmui.or.id (PDF di Google Drive) | `corpus/dsn-mui/` |
| `scrape_ojk_regulasi.py` | Pencarian regulasi di ojk.go.id | `corpus/ojk/` |

## Menjalankan

Butuh Python 3.10 ke atas dan `poppler-utils`. Untuk OCR dokumen hasil scan, tambah Tesseract.

```bash
sudo apt-get install poppler-utils tesseract-ocr
```

```bash
python3 scripts/corpus/scrape_dsn_fatwa.py --ocr
```

```bash
python3 scripts/corpus/scrape_ojk_regulasi.py --ocr
```

Pilihan yang berguna:

- `--limit 5` hanya memproses lima dokumen pertama, untuk uji coba.
- `--list` (hanya OJK) menampilkan regulasi yang lolos saringan tanpa mengunduh.
- `--delay 3` mengatur jeda antar permintaan dalam detik.

Skrip aman dijalankan ulang. PDF yang sudah ada di `corpus/raw/` tidak diunduh lagi, dan teks yang sudah jadi tidak diproses lagi. Jadi menjalankan ulang hanya mengambil dokumen baru.

## Susunan hasil

```
corpus/
  dsn-mui/
    manifest.jsonl               satu baris per fatwa
    fatwa-004-murabahah.txt
  ojk/
    manifest.jsonl               satu baris per regulasi, berisi daftar berkasnya
    pojk-24-tahun-2024-kualitas-aset-.../01-....txt
  raw/                           PDF asli, tidak masuk git
```

Setiap berkas teks dibuka dengan kepala singkat (sumber, nomor, judul, tautan), lalu garis `---`, lalu isi dokumen.

Kolom penting di manifest:

| Kolom | Arti |
|---|---|
| `relevance` | `core` langsung menyangkut pembiayaan atau BPRS; `supporting` perbankan syariah secara umum; `general` berlaku untuk semua lembaga jasa keuangan (hanya OJK); `other` di luar pembiayaan BPRS, misalnya pasar modal dan asuransi (hanya fatwa) |
| `text_quality` | `text` teks asli dari PDF digital; `ocr` hasil scan yang dibaca ulang dengan Tesseract; `embedded_ocr` hasil scan dengan teks bawaan PDF yang sering kotor; `needs_ocr` hasil scan tanpa teks |
| `revoked` | (fatwa) `true` bila daftar DSN-MUI menandainya tidak berlaku |
| `sha256` | sidik jari PDF, untuk mengenali dokumen kembar |
| `status` | `ok`, atau alasan gagal di kolom `error` |

## Yang perlu diketahui sebelum memakai hasilnya

- **Teks OCR tidak sempurna.** Fatwa nomor 110 ke atas adalah hasil scan. Angka romawi dan huruf mirip kadang tertukar, misalnya `III` terbaca `I11`. Untuk kutipan resmi, cek ke PDF aslinya.
- **OCR memakai model bahasa Inggris, dengan sengaja.** Model bahasa Indonesia bawaan Tesseract tidak pernah menghasilkan huruf "q", sehingga qardh, fiqh, dan Q.S. terbaca gardh, figh, dan O.S. Model Inggris membaca teks Latin yang sama tanpa cacat itu.
- **Istilah fikih diperbaiki setelah OCR.** Huruf "q" miring masih sering terbaca "g". Daftar `OCR_TERM_FIXES` di `common.py` mengembalikan istilah yang paling sering muncul, misalnya gardh menjadi qardh dan mutanagishah menjadi mutanaqishah. Istilah lain di luar daftar itu masih bisa salah.
- **Teks Arab tidak terbaca.** Dalil berbahasa Arab muncul sebagai karakter acak, baik di PDF digital maupun hasil OCR. Terjemahan Indonesianya tetap utuh.
- **Status berlaku regulasi OJK tidak tercatat.** Situs OJK tidak menandai regulasi yang sudah dicabut atau diganti, jadi regulasi lama ikut terunduh. Contoh: POJK 3/POJK.03/2016 tentang BPRS sudah diganti aturan yang lebih baru. Tim perlu menandainya sebelum dipakai sebagai rujukan.
- **Dokumen kembar.** Situs OJK kadang memuat regulasi yang sama di dua halaman. Kenali lewat `sha256`.
- **Lampiran non-PDF dilewati.** Berkas zip, xlsx, dan docx hanya dicatat di manifest dengan status `skipped_not_pdf`.
- **Firewall OJK.** Situs OJK sesekali menolak permintaan. Skrip menunggu dan mencoba lagi sampai lima kali, jadi satu kali jalan bisa memakan waktu lama.
- **Sumber wajib dicantumkan.** DSN-MUI mengizinkan pengutipan dengan mencantumkan sumber. Kepala setiap berkas teks sudah memuatnya.

## Mengubah cakupan

- Regulasi OJK: ubah daftar `QUERIES` dan `EXCLUDE_TITLE` di `scrape_ojk_regulasi.py`. Setiap entri adalah satu pencarian berdasarkan judul.
- Fatwa: semua fatwa diunduh. Yang diubah hanya labelnya, lewat `CORE_TOPICS` dan `OTHER_TOPICS` di `scrape_dsn_fatwa.py`.

## Uji

```bash
python3 -m unittest discover scripts/corpus
```
