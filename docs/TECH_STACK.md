# Teknologi yang Dipakai SSCI Sinergi

Dokumen ini merangkum stack teknologi platform **SSCI (Sustainable Sharia Creditworthiness Index)**. Isinya disusun dari kode di repositori `ilmanabidin1/ssci-sinergi` (branch `main`, Oktober 2026).

## Ringkasan satu baris

Aplikasi web **full-stack TypeScript** dengan dua bagian:
- **Frontend:** React 19 + Vite + Tailwind CSS v4 + shadcn/ui.
- **Backend:** Express + tRPC v11, database MySQL lewat Drizzle ORM, AI lewat OpenRouter.

Aplikasi di-deploy ke **Railway** (region Singapura) sebagai satu service yang menyajikan API sekaligus halaman web.

## Arsitektur

```
Browser (React SPA)
   │  tRPC (HTTP + superjson), cookie sesi JWT
   ▼
Express server (Node.js, ESM)
   ├── /api/trpc/*        → router tRPC (server/routers.ts)
   ├── /api/health        → health check Railway
   ├── /uploads/*         → berkas unggahan (volume /data/uploads)
   └── static client      → hasil build Vite
   │
   ├── MySQL (Drizzle ORM, 26 migrasi)
   ├── OpenRouter API (model AI untuk OCR, narasi, asisten)
   └── Volume disk: dokumen, foto survei, logo, PDF
```

Kode dibagi menjadi tiga folder utama:
- `client/`: frontend.
- `server/`: backend.
- `shared/`: logika yang dipakai keduanya, misalnya aturan skor, kebijakan BPRS, format Excel BPRS, dan alur kerja.

## Frontend

| Area | Teknologi | Catatan |
|---|---|---|
| Framework UI | React 19.2 | SPA, komponen fungsi dan hooks |
| Build tool | Vite 7 | `@vitejs/plugin-react` |
| Bahasa | TypeScript 5.9 | mode strict, path alias `@/` dan `@shared/` |
| Styling | Tailwind CSS 4.1 | token warna di `client/src/index.css` (navy, gold, ivory, royal); varian `pointer-coarse:` untuk target sentuh 44px |
| Komponen | shadcn/ui di atas Radix UI | dialog, select, tabs, switch, tooltip, dan lain-lain di `client/src/components/ui` |
| Ikon | lucide-react | |
| Routing | wouter 3 | rute di `client/src/App.tsx`, dilindungi `ProtectedRoute` |
| Data fetching | tRPC v11 + TanStack React Query 5 | tipe API end-to-end dari server |
| Form | state React biasa (sebagian react-hook-form + zod) | validasi per kolom |
| Grafik | Recharts 2 | dashboard tren dan kinerja analis |
| Notifikasi | sonner | toast |
| Animasi | framer-motion, tw-animate-css | |
| Tanggal | date-fns 4 | |
| Tema | hanya terang | mode gelap dihapus secara sengaja |

## Backend

| Area | Teknologi | Catatan |
|---|---|---|
| Runtime | Node.js (ESM) | dibundel `esbuild` menjadi `dist/index.js` |
| HTTP server | Express 4 | |
| API | tRPC 11 + superjson | `errorFormatter` dengan pesan Bahasa Indonesia |
| Validasi | zod 4 | locale Indonesia (`z.locales.id()`) |
| ORM | Drizzle ORM 0.44 + drizzle-kit | skema di `drizzle/schema.ts`, migrasi SQL di `drizzle/` |
| Database | MySQL (`mysql2`) | 11 tabel (lihat di bawah) |
| Autentikasi | email dan password (hash), sesi JWT di cookie (`jose`) | |
| 2FA | TOTP RFC 6238 buatan sendiri (`server/twoFactor.ts`) | rahasia dienkripsi AES-GCM; QR lewat `qrcode`; wajib untuk admin, checker, SuperAdmin |
| PDF | pdfkit | laporan penilaian (`server/pdfReport.ts`) |
| Excel | JSZip + penambal XML sendiri (`server/xlsxPatch.ts`) | mengisi template Excel BPRS tanpa merusak dropdown dan rumus |
| Unggahan | disk lokal (`UPLOAD_DIR`, default `/data/uploads`) | KTP, NPWP, NIB, foto survei, logo |
| Penyimpanan objek | AWS SDK S3 (`server/storage.ts`) | tersedia di kode, belum dipakai alur utama |

### Tabel database

| Tabel | Isi |
|---|---|
| `organizations` | BPRS (multi-tenant), status pendaftaran, branding |
| `users` | pengguna, peran (maker, checker, admin), status aktif, 2FA |
| `applications` | pengajuan pembiayaan, data nasabah, keuangan, akad, profil format BPRS (JSON) |
| `assessments` | hasil skor SSCI, klasifikasi, pemeriksaan data, peninjauan pejabat |
| `documentFiles` | dokumen legal yang diunggah dan status verifikasinya |
| `surveyPhotos` | foto survei lapangan dan hasil analisis AI |
| `applicationComments` | catatan internal per pengajuan |
| `customerRequests` | permintaan nasabah (pembaruan data, peninjauan ulang) |
| `creditPolicies` | kebijakan kredit per BPRS |
| `notifications` | notifikasi per pengguna |
| `auditLogs` | jejak audit seluruh aksi penting |

## AI

| Fitur | Penyedia dan model | Catatan |
|---|---|---|
| OCR KTP, baca dokumen, baca rekening koran | OpenRouter, `openai/gpt-6-luna` | gambar dikirim ke penyedia AI |
| Narasi rekomendasi, konsistensi data, kesesuaian syariah, ringkasan komite, draf narasi BPRS, penjelasan selisih skor | OpenRouter, `openai/gpt-6-luna` | nama dan NIK tidak dikirim dalam teks |
| Analisis foto survei | OpenRouter, `openai/gpt-6-luna` | |
| Rujukan syariah | teks fatwa DSN-MUI di `knowledge_base/` | Murabahah, Ijarah, Mudharabah, Qardh, dan lain-lain |

AI hanya alat bantu. Skor SSCI dan skor format BPRS dihitung dengan aturan deterministik, dan setiap fitur AI punya cadangan berbasis aturan bila layanan AI tidak tersedia.

## Pengujian dan kualitas

| Area | Teknologi |
|---|---|
| Unit dan integrasi | Vitest 2 (22 berkas tes, 125 tes) |
| Typecheck | `tsc --noEmit` |
| Format | Prettier |
| Uji tampilan (manual) | Playwright + Chromium dengan data tiruan |
| Verifikasi rumus Excel | LibreOffice Calc (headless) untuk menghitung ulang template BPRS |

## Deploy dan operasional

| Area | Detail |
|---|---|
| Hosting | Railway, region Singapura (`asia-southeast1`), builder Railpack |
| Build | `pnpm build` (Vite untuk client, esbuild untuk server) |
| Pra-deploy | `pnpm db:migrate` (migrasi Drizzle) |
| Start | `pnpm start` (`NODE_ENV=production node dist/index.js`) |
| Health check | `GET /api/health` |
| Package manager | pnpm 10 |
| Alur rilis | push ke `main`, lalu Railway build dan deploy otomatis |

### Variabel lingkungan utama

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | koneksi MySQL |
| `JWT_SECRET` | penandatangan sesi |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` | layanan AI; jika kosong, fitur AI memakai cadangan aturan |
| `PILOT_ADMIN_EMAIL`, `PILOT_ADMIN_PASSWORD` | akun admin awal |
| `SUPERADMIN_EMAILS` | daftar SuperAdmin platform |
| `ENFORCE_TWO_FACTOR` | `false` untuk mematikan wajib 2FA (demo) |
| `RESET_PILOT_ADMIN_PASSWORD`, `RESET_PILOT_ADMIN_2FA` | pemulihan darurat akun admin awal |
| `UPLOAD_DIR` | lokasi berkas unggahan (default `/data/uploads`) |
| `VITE_DEMO_MODE` | `false` untuk menyembunyikan tombol "Isi contoh data" |

## Lain-lain di repositori

| Folder | Keterangan |
|---|---|
| `templates/bprs/` | template Excel BPRS yang sudah dibersihkan (Fluktuatif UMKM, Fix Income) |
| `knowledge_base/` | teks fatwa DSN-MUI untuk pemeriksaan syariah |
| `docs/tata-kelola/` | manual book, matriks RACI, pelindungan data, kebijakan AI |
| `scripts/` | skrip pembuat template Excel bersih |
| `mobile/` | aplikasi Expo/React Native terpisah ("AKADIFY"), **bukan bagian dari SSCI** dan tidak terhubung ke server SSCI |
