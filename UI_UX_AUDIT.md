# Audit UI/UX SSCI Sinergi

Tanggal audit: 17 Oktober 2026. Basis kode: commit `a8599f0` (branch `main`).
Sifat: **audit baca saja**. Tidak ada kode aplikasi yang diubah. Semua perbaikan di bawah adalah usulan yang menunggu persetujuan.

## 1. Ringkasan eksekutif

| Tingkat | Jumlah | Arti |
|---|---|---|
| Critical | 17 | Memblokir tugas, menyebabkan data hilang atau keputusan keliru, atau gesekan tinggi di alur inti |
| Major | 69 | Masalah nyata pada kegunaan, responsivitas, atau aksesibilitas |
| Minor | 39 | Polesan visual dan perbaikan cepat |
| **Total** | **125** | |

Lima tema utama yang muncul berulang di banyak file:

1. **Dialog bawaan browser untuk aksi penting.** `window.prompt` dan `window.confirm` dipakai untuk keputusan Setujui/Tolak, menolak dokumen, membatalkan pengajuan, dan menghapus data. Dialog ini tanpa ringkasan konteks, mudah salah klik, dan buruk di ponsel. Padahal komponen `AlertDialog` sudah tersedia di `client/src/components/ui/alert-dialog.tsx`, hanya belum dipakai.
2. **Data hilang tanpa disadari.** Contohnya: draft formulir tertimpa saat halaman dibuka, isian Format BPRS hilang saat pindah tab, warna branding tereset saat menyimpan, dan "Isi contoh data" menimpa data asli.
3. **Pesan error mentah.** Server tidak memiliki `errorFormatter`, dan banyak halaman menempel `error.message` langsung ke toast. Akibatnya pengguna bisa melihat JSON validasi zod atau teks bahasa Inggris.
4. **Target sentuh di bawah 44px secara sistemik.** Ukuran bawaan primitif UI: `Button` 36px, `size="sm"` 32px, `Input` 40px, tautan navigasi atas 28px, dan Switch sekitar 18px. Memperbaiki primitif sekali (tingkat token) langsung memperbaiki ratusan elemen.
5. **Warna hex tertanam dan palet campur.** Kelas seperti `bg-[#eef2f8]` dan `text-[#7d8fae]` bercampur dengan palet `gray`, `slate`, dan token `navy`, ditambah teks 10 sampai 11px dan emas di atas putih yang kontrasnya rendah. Mode gelap ada di CSS, tetapi tidak dapat diaktifkan, dan halaman tidak siap untuk itu.

## 2. Stack dan cakupan

- **Stack:** React 19 + Vite, Tailwind CSS v4 (token di `client/src/index.css`: navy, gold, ivory, royal), shadcn/ui di atas Radix (`client/src/components/ui/*`), routing `wouter`, data `tRPC` + React Query, notifikasi `sonner`.
- **Perjalanan pengguna inti:**
  - Analis (maker): membuat pengajuan, unggah dokumen dan survei, menilai, mengisi format Excel BPRS.
  - Komite (checker): meninjau dan memutuskan.
  - Admin: mengelola tim, pengaturan, dan audit.
  - SuperAdmin: konsol platform.
  - Nasabah: melacak pengajuan dari ponsel.
- **Cakupan audit:** 17 halaman, 21 komponen, dan primitif UI.
- **Pembagian area:**
  - **A:** detail pengajuan dan panel kerja.
  - **B:** formulir, autentikasi, dan halaman publik.
  - **C:** dashboard, halaman admin, shell aplikasi, dan primitif UI.
- **Metode:**
  - Membaca seluruh file baris per baris.
  - Pengukuran nyata di browser Chromium pada viewport 375x812 dengan emulasi sentuh dan data tiruan (lihat lampiran). Di lebar 375px tidak ada halaman yang menggulir horizontal; masalah responsif yang ditemukan bersifat lokal (dropdown, grid tetap, baris tab).

## 3. Prioritas perbaikan yang diusulkan

1. **Gelombang 1 (data dan keputusan, sekitar 1 sampai 2 hari):** semua temuan Critical.
   - Dialog keputusan komite yang layak, dan tombol Setujui dikunci selama syarat jalur belum terpenuhi.
   - Draft formulir yang benar-benar bisa dipulihkan.
   - State Format BPRS tidak hilang saat pindah tab.
   - Konfirmasi sebelum aksi destruktif.
   - Pratinjau dokumen untuk checker.
   - Perbaikan warna branding dan form profil.
2. **Gelombang 2 (fondasi, sekitar 1 hari):**
   - `errorFormatter` di server plus helper pesan error di klien.
   - Ukuran minimum 44px di primitif `Button`, `Input`, `SelectTrigger`, `Switch`, dan `TabsTrigger`.
   - Guard autentikasi global.
   - ErrorBoundary berbahasa Indonesia.
3. **Gelombang 3:** temuan Major lainnya, terutama aksesibilitas label dan fokus, input Rupiah berformat, dan responsivitas tab dan dropdown di ponsel.
4. **Gelombang 4:** temuan Minor dan konsolidasi token warna.

Setiap temuan di bawah memuat lokasi (file dan baris), dampak bagi pengguna, dan usulan perbaikan konkret. Kode `A`, `B`, dan `C` menunjukkan area asal temuan.


## 4. Critical (Blocker / High Friction)

### K-01. Keputusan checker (Setujui/Tolak) memakai `window.prompt`

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability, Interaction states
- Lokasi: `client/src/pages/ApplicationDetail.tsx` L225-231 (fungsi `decide`), L336-348 (tombol)
- Masalah: Keputusan pembiayaan final, aksi paling penting di aplikasi, diambil lewat `window.prompt` satu baris tanpa gaya. Tidak ada ringkasan apa yang diputuskan (nama nasabah, plafon, klasifikasi), tidak ada langkah konfirmasi, dan menekan OK dengan isian kosong membatalkan secara diam-diam tanpa pesan. Catatan panjang (sampai 2000 karakter di server L1045) diketik di kotak satu baris. Di Safari iOS dan beberapa WebView, prompt bisa diblokir atau ditampilkan sebagai sheet kecil yang menutupi konteks.
- Dampak: Checker komite mengetik alasan penolakan formal di kotak sempit tanpa bisa melihat data, rawan salah klik Setujui vs Tolak (keduanya bersebelahan, L336-348), dan jika catatan kosong mereka mengira keputusan tersimpan padahal tidak.
- Perbaikan: Ganti dengan `AlertDialog` yang berisi ringkasan dan `Textarea` berlabel.
```tsx
const [decision, setDecision] = useState<"approved"|"rejected"|null>(null);
const [decisionNotes, setDecisionNotes] = useState("");
<AlertDialog open={!!decision} onOpenChange={o => !o && setDecision(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{decision === "approved" ? "Setujui pembiayaan" : "Tolak pembiayaan"} {application.customerName}?</AlertDialogTitle>
      <AlertDialogDescription>Plafon Rp {Number(application.requestedAmount).toLocaleString("id-ID")}, klasifikasi {assessment?.overrideClassification ?? assessment?.classification}. Keputusan tidak dapat diubah.</AlertDialogDescription>
    </AlertDialogHeader>
    <Label htmlFor="decision-notes">{decision === "approved" ? "Catatan persetujuan" : "Alasan penolakan"}</Label>
    <Textarea id="decision-notes" rows={4} value={decisionNotes} onChange={e => setDecisionNotes(e.target.value)} />
    <AlertDialogFooter>
      <AlertDialogCancel>Kembali</AlertDialogCancel>
      <Button variant={decision === "rejected" ? "destructive" : "default"} disabled={!decisionNotes.trim() || decideMutation.isPending}
        onClick={() => decideMutation.mutate({ applicationId, decision: decision!, notes: decisionNotes.trim() })}>
        {decideMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan keputusan
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```
Tutup dialog hanya di `onSuccess`, agar catatan tidak hilang bila gagal.

### K-02. Tombol "Setujui" tetap aktif walau syarat persetujuan (exit gate) belum terpenuhi

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states, Usability
- Lokasi: `ApplicationDetail.tsx` L343-348 (tombol Setujui hanya `disabled={decideMutation.isPending}`), L400 (ExitGatePanel hanya di tab Ringkasan); `HumanReview.tsx` L226-229 (`ExitGatePanel` mengembalikan `null` saat loading/error), L244; server `routers.ts` L1057-1060 menolak.
- Masalah: UI menyatakan "Persetujuan baru dapat diberikan setelah semua syarat terpenuhi" (HumanReview L244), tetapi tombol Setujui tetap dapat ditekan. Checker mengetik catatan di prompt, lalu server menolak dan catatan hilang. Panel syarat hanya tampil di tab Ringkasan; dari tab lain tombol di header tetap terlihat. Saat query gate loading atau error, panel tidak muncul sama sekali sehingga checker tidak tahu syarat apa yang kurang.
- Dampak: Checker membuang waktu dan mengulang mengetik alasan; kesan sistem tidak konsisten di alur keputusan inti.
- Perbaikan: Angkat query `exitGate` ke halaman, nonaktifkan tombol dan jelaskan alasannya.
```tsx
const gate = trpc.applications.exitGate.useQuery({ applicationId }, { enabled: application?.status === "assessed" });
<Button disabled={decideMutation.isPending || !gate.data?.passed} aria-describedby="gate-hint" onClick={() => setDecision("approved")}>Setujui</Button>
{gate.data && !gate.data.passed && <p id="gate-hint" className="text-xs text-amber-800">Belum bisa disetujui: {gate.data.items.filter(i => !i.ok).map(i => i.label).join(", ")}</p>}
```
Di `ExitGatePanel`, tampilkan skeleton saat `query.isLoading` dan pesan error berbahasa Indonesia saat `query.isError`, bukan `null`.

### K-03. Checker memverifikasi dokumen tanpa bisa membuka dokumennya

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability (blok tugas)
- Lokasi: `ApplicationDetail.tsx` L632-664, khususnya L638-645 (hanya `document.originalName` sebagai teks) dan L655-660 (tombol Verifikasi/Tolak)
- Masalah: Daftar dokumen hanya menampilkan nama file dan status. Tidak ada tautan pratinjau atau unduh ke file (padahal server menyajikan `/uploads` di `server/_core/index.ts` L46 dan foto survey sudah memakai `/uploads/${photo.storedName}` di L708). Tombol "Verifikasi" langsung menandai terverifikasi tanpa konfirmasi.
- Dampak: Checker harus memverifikasi KTP/NPWP/NIB tanpa melihat isinya, atau mencari file di luar aplikasi. Ini memblokir tugas verifikasi yang benar dan berisiko verifikasi palsu yang masuk ke jejak audit.
- Perbaikan:
```tsx
<a href={`/uploads/${document.storedName}`} target="_blank" rel="noopener noreferrer"
   className="inline-flex min-h-11 items-center gap-1 font-medium text-royal-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded break-all">
  <FileText className="h-4 w-4 shrink-0" />{document.originalName}<span className="sr-only"> (buka di tab baru)</span>
</a>
```
Idealnya tampilkan pratinjau di `Dialog` (iframe untuk PDF, `img` untuk JPG/PNG) dengan tombol Verifikasi/Tolak di footer dialog, sehingga keputusan diambil sambil melihat dokumen.

### K-04. Isian Format Excel BPRS yang belum disimpan hilang saat pindah tab

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states (kehilangan data)
- Lokasi: `ApplicationDetail.tsx` L862-870 (`BprsWorkbookPanel` di dalam `TabsContent value="bprs"`); `BprsWorkbookPanel.tsx` L144-149 (state `profile`, `statementText`, `dirty` lokal di komponen); `tabs.tsx` L51-61 (Radix `TabsContent` tanpa `forceMount` meng-unmount konten tab tidak aktif)
- Masalah: Semua isian (puluhan select, teks, mutasi rekening koran, rincian agunan, draf narasi AI) disimpan di state lokal panel. Saat analis klik tab "Data & Dokumen" atau tombol aksi di `WorkflowStatus` (yang memanggil `chooseTab`), panel di-unmount dan seluruh isian `dirty` lenyap tanpa peringatan. Hal sama terjadi pada hasil `readStatement` (hasil baca AI rekening koran) dan draf narasi AI. Tidak ada guard `beforeunload` juga.
- Dampak: Maker yang mengisi 30 menit form BPRS lalu mengecek dokumen kehilangan semua pekerjaan. Hasil AI berbayar dan lambat harus diulang.
- Perbaikan: (1) Pertahankan konten tab: `<TabsContent value="bprs" forceMount className="data-[state=inactive]:hidden">`. (2) Tambahkan guard perpindahan:
```tsx
useEffect(() => {
  if (!dirty) return;
  const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
  window.addEventListener("beforeunload", h);
  return () => window.removeEventListener("beforeunload", h);
}, [dirty]);
```
(3) Tampilkan indikator "Ada perubahan belum disimpan" dekat tombol Simpan, dan buat tombol Simpan `sticky bottom-0` di mobile.

### K-05. Hasil Asisten AI, peninjauan, dan uji sensitivitas hilang saat pindah tab

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states
- Lokasi: `AiAssessmentAssistant.tsx` L58-60 (hasil disimpan di state `useMutation`), L61 (`started` ref); `ApplicationDetail.tsx` L617-621 dan L855-859 (asisten di dua tab berbeda), L833-851; `HumanReview.tsx` L24 (`enabled` sensitivitas), L132-133 (draf alasan override)
- Masalah: Karena konten tab di-unmount, hasil tiga pemeriksaan AI (konsistensi, syariah, ringkasan komite) yang dijalankan otomatis setelah penilaian (`autoRun`) hilang begitu analis pindah tab. Draf alasan peninjauan klasifikasi (minimal 20 karakter) di OverridePanel juga hilang. Uji sensitivitas kembali ke tombol awal.
- Dampak: Checker yang sedang membaca ringkasan komite, lalu membuka tab Data untuk mencocokkan angka, harus menjalankan AI lagi (biaya dan waktu tunggu) dan kehilangan alasan yang sudah ditulis.
- Perbaikan: Simpan hasil AI di cache query (ubah ke `useQuery` dengan `enabled` manual dan `staleTime: Infinity`, atau `utils.aiAssist.x.setData`), atau gunakan `forceMount` pada `TabsContent` "ringkasan" dan "penilaian" dengan `data-[state=inactive]:hidden`. Untuk draf teks, angkat state ke halaman atau simpan di `sessionStorage` per `applicationId`.

### K-06. Pembatalan pengajuan: dua dialog browser berantai dengan logika batal yang menyesatkan

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability (aksi destruktif)
- Lokasi: `ApplicationDetail.tsx` L241-246 (`handleCancel`), L358-362 (tombol)
- Masalah: Klik "Batalkan pengajuan" memunculkan `window.prompt` alasan; menekan "Cancel" pada prompt (niat pengguna: mundur) tidak menghentikan alur, tetapi lanjut ke `window.confirm`. Dua dialog native berturut-turut, teks "batalkan" muncul di tombol, di judul, dan di tombol browser "Cancel", sehingga makna "batal membatalkan" ambigu. Tombol merah destruktif juga diletakkan sejajar dengan tombol primer "Lakukan Penilaian SSCI" (L351-362) dengan bobot visual sama.
- Dampak: Maker bisa membatalkan pengajuan nasabah secara tidak sengaja (tidak dapat dipulihkan), atau bingung apakah sudah batal.
- Perbaikan: Satu `AlertDialog` dengan textarea alasan opsional, tombol "Kembali" dan tombol destruktif "Ya, batalkan pengajuan". Pindahkan pemicu ke menu sekunder (misal `DropdownMenu` "Aksi lain") atau `variant="ghost" className="text-destructive"` agar tidak bersaing dengan CTA utama.

### K-07. Draft tersimpan tertimpa data kosong sebelum pengguna sempat memulihkannya

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (draft/autosave)
- Lokasi: `client/src/pages/NewApplication.tsx:240-242`
- Masalah: Efek di baris 240 hanya menandai `hasDraft`, lalu efek di baris 241 langsung berjalan pada mount dan menulis `{ values: initial, step: 0 }` ke `DRAFT_KEY`. Saat pengguna menekan "Pulihkan draft", fungsi `restore` (baris 242) membaca localStorage yang sudah berisi form kosong. Setiap ketikan sebelum menekan tombol juga menimpa draft lama.
- Dampak: Analis yang browsernya tertutup di tengah pengisian 4 langkah melihat banner "Draft tersimpan ditemukan", menekan "Pulihkan draft", dan mendapati semua isian hilang. Data hilang permanen tanpa pesan apa pun.
- Perbaikan: Baca draft sekali ke ref sebelum autosave aktif, dan tunda autosave sampai pengguna memutuskan.
```tsx
const savedDraftRef = useRef<{ version: number; values: Values; step: number } | null>(null);
const [draftDecided, setDraftDecided] = useState(false);
useEffect(() => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) { savedDraftRef.current = JSON.parse(raw); setHasDraft(true); } else setDraftDecided(true);
  } catch { setDraftDecided(true); }
}, []);
useEffect(() => {
  if (!draftDecided) return; // jangan timpa draft lama sebelum ada keputusan
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, values, step })); } catch {}
}, [values, step, draftDecided]);
const restore = () => { const saved = savedDraftRef.current; /* pakai saved, bukan localStorage */ ...; setDraftDecided(true); toast.success("Draft dipulihkan"); };
```

### K-08. Tombol "Mulai ulang" menghapus draft tanpa konfirmasi

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (konfirmasi aksi destruktif)
- Lokasi: `client/src/pages/NewApplication.tsx:243`, `:623`
- Masalah: `reset()` langsung memanggil `localStorage.removeItem(DRAFT_KEY)` dan mengosongkan form. Tombolnya `variant="ghost" size="sm"` (32px) diletakkan bersebelahan dengan "Pulihkan draft" dengan jarak `gap-2` (8px).
- Dampak: Salah ketuk di tablet atau ponsel menghapus seluruh draft pengajuan nasabah tanpa jalan kembali.
- Perbaikan: Bungkus dengan `AlertDialog` dan gunakan gaya destruktif.
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild><Button type="button" size="sm" variant="ghost" className="text-destructive">Buang draft</Button></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Buang draft tersimpan?</AlertDialogTitle>
    <AlertDialogDescription>Semua isian draft akan dihapus dan tidak dapat dipulihkan.</AlertDialogDescription>
    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={reset}>Ya, buang</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### K-09. "Isi contoh data" menimpa data nasabah asli tanpa konfirmasi atau undo

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (aksi salah/kehilangan data)
- Lokasi: `client/src/pages/NewApplication.tsx:266-278`, `:622`, `:625`
- Masalah: `fillAllDemo` dan `fillDemo` melakukan spread data acak di atas `current` sehingga nama, NIK, telepon, angka keuangan, dan status dokumen yang sudah diisi analis diganti data fiktif. Tombol `variant="outline"` tampil di header halaman dan di setiap kartu langkah untuk semua pengguna produksi, sejajar dengan judul. Autosave (baris 241) langsung menyimpan hasil timpaan ke draft.
- Dampak: Analis yang mengira tombol ini "contoh pengisian" kehilangan data asli, dan jika tidak teliti dapat mengirim pengajuan berisi data campuran asli dan fiktif ke komite.
- Perbaikan: Tampilkan hanya di mode demo (`import.meta.env.VITE_DEMO_MODE === "true"` atau peran khusus), isi hanya kolom kosong, dan minta konfirmasi bila ada kolom terisi.
```tsx
const fillDemo = (step: number) => setValues(current => {
  const slice = demoSlice(scenarioFor(current, step === 0), current, part);
  const onlyEmpty = Object.fromEntries(Object.entries(slice).filter(([k]) => !String(current[k] ?? "").trim()));
  return { ...current, ...onlyEmpty } as Values;
});
{isDemoMode && <Button ...>Isi contoh data</Button>}
```

### K-10. Validasi hanya lewat toast generik, tanpa pesan per kolom, dan langkah akhir tidak menunjuk kolom yang kurang

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (validation feedback), Accessibility
- Lokasi: `client/src/pages/NewApplication.tsx:350-365`, `:114-116`, `:119-137`
- Masalah: `next()` hanya menampilkan toast "Lengkapi semua kolom wajib sebelum melanjutkan" lalu fokus ke kolom pertama. Tidak ada `aria-invalid`, tidak ada teks error di bawah kolom, dan kolom lain yang juga kosong tidak ditandai. Di `submit()` (baris 360-364) pengguna dipindah ke langkah yang kurang tanpa fokus maupun penanda kolom. `CurrencyField` tidak meneruskan `required`/`aria-required`. Tidak ada validasi format (NIK 16 digit, lama usaha > 0, tenor > 0).
- Dampak: Pada langkah 2 dengan 8 kolom wajib, analis harus menebak kolom mana yang masih kosong setelah toast hilang dalam beberapa detik. Pengguna pembaca layar tidak mendapat informasi kolom mana yang bermasalah.
- Perbaikan: Simpan state `errors`, tandai semua kolom kosong, tampilkan pesan inline, dan fokus kolom pertama juga pada submit akhir.
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});
const validate = (i: number) => Object.fromEntries(required[i].filter(k => !String(values[k] ?? "").trim()).map(k => [k, "Wajib diisi"]));
// di Field / CurrencyField:
<Input id={name} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} aria-required={required} ... />
{error && <p id={`${name}-error`} className="text-sm text-destructive">{error}</p>}
// di submit: setStep(missingIndex); requestAnimationFrame(() => document.getElementById(firstMissingKey)?.focus());
```

### K-11. Pilihan Multijasa menampilkan nilai default yang sebenarnya tidak tersimpan

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (data salah)
- Lokasi: `client/src/pages/NewApplication.tsx:558`, `:572`, `:396-397`
- Masalah: `Select value={values.multijasaServiceCategory || "pendidikan"}` dan `value={values.multijasaAkadType || "ijarah"}` menampilkan "Pendidikan" dan "Ijarah Multijasa" seolah terpilih, padahal `values.multijasaServiceCategory`/`multijasaAkadType` tidak pernah ada di `initial` (baris 45-112). Saat dikirim, baris 396-397 mengirim `undefined`.
- Dampak: Analis melihat kategori dan konstruksi akad sudah terisi lalu melanjutkan, tetapi pengajuan tersimpan tanpa kategori jasa dan jenis akad. Komite dan dokumen akad menerima data yang tidak sama dengan yang dilihat analis.
- Perbaikan: Masukkan default ke state, bukan hanya ke tampilan.
```tsx
// initial
multijasaServiceCategory: "", multijasaAkadType: "",
// saat memilih akad multijasa (baris 610)
onClick={() => setValues(v => ({ ...v, financingAkad: "multijasa", multijasaAkadType: v.multijasaAkadType || "ijarah" }))}
// Select tanpa fallback palsu
<Select value={values.multijasaServiceCategory} ...><SelectValue placeholder="Pilih kategori jasa" />
```

### K-12. Kalkulator omzet harian salah membaca angka berformat ribuan Indonesia

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (format mata uang), Interaction (data salah)
- Lokasi: `client/src/components/DailySalesCalculator.tsx:8`, `:37`, `:40`, `:48-54`
- Masalah: `num()` mempertahankan titik (`/[^\d.]/g`), sehingga input "800.000" (format umum Indonesia) dibaca `Number("800.000") = 800`. Input tidak diformat otomatis seperti `CurrencyField`, dan placeholder "800000" tidak mencegah pengguna mengetik titik.
- Dampak: Pendapatan bulanan terhitung Rp 20.800 alih-alih Rp 20.800.000. Jika analis menekan "Pakai angka ini" tanpa teliti, kapasitas bayar nasabah dinilai jauh lebih rendah dan skor kelayakan menjadi salah.
- Perbaikan: Gunakan parser hanya digit dan tampilan berformat seperti `CurrencyField`.
```tsx
const num = (value: string) => Number(value.replace(/[^\d]/g, "")) || 0;
<Input id="calc-daily" inputMode="numeric" value={dailySales ? Number(dailySales).toLocaleString("id-ID") : ""}
  onChange={e => setDailySales(e.target.value.replace(/[^\d]/g, ""))} placeholder="800.000" />
```
Untuk persen (`calc-cogs`), batasi `0-100` dan tampilkan sufiks "%".

### K-13. Pelacakan publik diam saja saat 4 digit NIK belum lengkap

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (validasi), Responsiveness (keyboard ponsel)
- Lokasi: `client/src/pages/TrackApplication.tsx:24-31`, `:121-129`
- Masalah: `handleSearch` langsung `return` jika `nikLast4.trim().length !== 4` tanpa pesan. Atribut `required` hanya mencegah kosong, bukan 1 sampai 3 digit. Input tidak memakai `inputMode="numeric"`/`pattern`, jadi keyboard huruf muncul di ponsel dan huruf diterima.
- Dampak: Nasabah di ponsel mengetik "458" atau "45a1", menekan "Lacak Status Pengajuan", dan tidak terjadi apa pun. Nasabah mengira sistem rusak dan menelepon kantor BPRS.
- Perbaikan:
```tsx
const [formError, setFormError] = useState("");
<Input id="nik4" inputMode="numeric" pattern="\d{4}" autoComplete="off" maxLength={4}
  value={nikLast4} onChange={e => setNikLast4(e.target.value.replace(/\D/g, ""))}
  aria-invalid={!!formError} aria-describedby="nik4-error" />
{formError && <p id="nik4-error" role="alert" className="text-sm text-destructive">{formError}</p>}
// handleSearch: if (nikLast4.length !== 4) { setFormError("Masukkan tepat 4 digit terakhir NIK."); return; }
```

### K-14. Simpan branding selalu menimpa warna utama organisasi dengan default

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states (kehilangan data)
- Lokasi: `client/src/pages/Settings.tsx` baris 20, 47, 175, 242-250
- Masalah: `primaryColor` diinisialisasi `useState(DEFAULT_PRIMARY_COLOR)` (`#14213d`) dan tidak pernah disinkronkan dengan `settingsQuery.data.primaryColor` (padahal `getSettings` mengembalikan seluruh baris organisasi, termasuk `primaryColor`). Baris 175 selalu mengirim `primaryColor` ke server.
- Dampak: Admin yang hanya mengganti alamat atau telepon lalu menekan "Simpan branding" tanpa sadar mengembalikan warna brand BPRS ke navy default. Color picker juga menampilkan warna yang salah sejak halaman dibuka, sehingga admin tidak tahu warna sebenarnya.
- Perbaikan:
```tsx
useEffect(() => {
  if (settingsQuery.data?.primaryColor) setPrimaryColor(settingsQuery.data.primaryColor);
}, [settingsQuery.data?.primaryColor]);
```

### K-15. Dua ikon tong sampah identik berdampingan untuk aksi berbeda (hapus penilaian vs hapus permanen pengajuan)

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states, Accessibility
- Lokasi: `client/src/pages/Dashboard.tsx` baris 128-140, 660-682
- Masalah: Untuk admin, setiap baris queue menampilkan dua tombol `Trash2` ukuran 32x32 px yang berdampingan. Perbedaannya hanya warna ikon (abu vs merah) dan atribut `title` (tidak muncul di layar sentuh, tidak dibacakan konsisten oleh screen reader karena tidak ada `aria-label`). Konfirmasi memakai `window.confirm` (teks bawaan browser, tombol "OK/Cancel" berbahasa Inggris, tidak ada penekanan visual bahwa aksi tidak bisa dibatalkan). Tombol juga tidak di-`disabled` saat `deleteAssessment.isPending` / `hardDelete.isPending`, sehingga klik ganda memicu dua mutasi.
- Dampak: Admin yang ingin menghapus penilaian (aksi yang bisa diulang) berisiko salah tekan dan menghapus permanen pengajuan beserta seluruh dokumen nasabah. Ini kehilangan data yang tidak bisa dipulihkan pada alur inti.
- Perbaikan: Pindahkan aksi ke `DropdownMenu` "Aksi lain" dengan label teks, dan pakai `AlertDialog` dengan konfirmasi ketik nama nasabah untuk hapus permanen:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="icon" variant="ghost" className="size-11" aria-label={`Aksi lain untuk ${item.customerName}`}><MoreHorizontal /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onSelect={() => setConfirm({ type: "reset", item })}>Hapus penilaian</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ type: "hard", item })}>Hapus permanen pengajuan</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
// AlertDialogAction: disabled={hardDelete.isPending || typedName !== item.customerName}
```

### K-16. Menonaktifkan anggota tim terjadi seketika lewat satu ketukan Switch tanpa konfirmasi

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/Team.tsx` baris 81-83, 258-265
- Masalah: `onCheckedChange` langsung memanggil `setUserActive.mutate`. Tidak ada konfirmasi, tidak ada undo. Switch berukuran 18x32 px (`switch.tsx` baris 14) dan diletakkan di samping tombol "Reset 2FA", sehingga mudah tersentuh tidak sengaja saat scroll di ponsel.
- Dampak: Admin dapat mengunci analis atau komite dari sistem di tengah proses penilaian/keputusan tanpa sadar. Pengguna yang dinonaktifkan langsung kehilangan akses.
- Perbaikan: Saat `checked === false`, buka `AlertDialog` ("Nonaktifkan {nama}? Anggota tidak dapat masuk sampai diaktifkan kembali.") dan baru mutate pada konfirmasi. Untuk aktivasi kembali boleh langsung, tetapi beri toast dengan tombol "Urungkan":
```tsx
toast.success("Anggota dinonaktifkan", { action: { label: "Urungkan", onClick: () => setUserActive.mutate({ userId, active: true }) } });
```

### K-17. Form Profil Operator bisa mengosongkan jabatan dan telepon setelah refresh halaman

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states (kehilangan data)
- Lokasi: `client/src/pages/Settings.tsx` baris 41, 391-405, 179-187
- Masalah: Input memakai `defaultValue={user?.name ?? ""}` dan sejenisnya. Saat halaman `/pengaturan` dibuka langsung (refresh atau tautan), `auth.me` masih loading sehingga `user` bernilai `null` pada render pertama; input tak terkontrol tidak akan diperbarui ketika `user` tiba. Form tidak menunggu `loading`.
- Dampak: Pengguna melihat field jabatan dan telepon kosong, mengisi nama lalu menyimpan; `position` dan `phone` terkirim sebagai `null` (baris 184-185) dan data profil terhapus di server.
- Perbaikan: Render form hanya setelah `user` tersedia dan beri `key` agar remount:
```tsx
const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
{loading || !user ? <Skeleton className="h-40" /> : (
  <form key={user.id} ...>...</form>
)}
```


## 5. Major (Usability / Responsiveness)

### M-01. Penolakan dokumen memakai `window.prompt`; satu mutasi mengunci semua baris

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability, Interaction states
- Lokasi: `ApplicationDetail.tsx` L186-190, L657-658
- Masalah: Alasan penolakan dokumen (yang akan dilihat maker dan dicatat audit) diketik di prompt native. `disabled={verifyMutation.isPending}` mengunci tombol di semua baris dokumen tanpa indikator baris mana yang sedang diproses. Tidak ada spinner.
- Dampak: Checker tidak tahu apakah klik berhasil; di HP prompt menutupi layar dan sering tertutup tanpa sengaja.
- Perbaikan: Dialog dengan `Textarea` berlabel "Alasan penolakan dokumen {documentType}"; lacak `verifyMutation.variables?.id === document.id` untuk spinner per baris.

### M-02. Tombol unggah `asChild` + `disabled` tidak benar-benar nonaktif; risiko unggah ganda

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states
- Lokasi: `ApplicationDetail.tsx` L649-654 (dokumen), L684-692 (foto survey)
- Masalah: `<Button asChild disabled>` merender `<span>`; atribut `disabled` tidak berlaku pada span, dan `<label>` pembungkus tetap membuka pemilih file saat mutasi berjalan. Untuk dokumen tidak ada spinner atau teks "Mengunggah..." sama sekali, dan `uploadMutation.isPending` dibagi semua baris.
- Dampak: Analis di jaringan lambat mengklik ulang, file terunggah dua kali, dan tidak tahu baris mana yang sedang diproses.
- Perbaikan: Pakai tombol nyata yang memicu input via ref:
```tsx
const inputRef = useRef<HTMLInputElement>(null);
<Button type="button" variant="outline" disabled={isUploadingThis} onClick={() => inputRef.current?.click()} aria-label={`Unggah dokumen ${documentType}`}>
  {isUploadingThis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{isUploadingThis ? "Mengunggah..." : document ? "Ganti file" : "Unggah"}
</Button>
<input ref={inputRef} type="file" hidden accept="application/pdf,image/jpeg,image/png" onChange={...} />
```
dengan `isUploadingThis = uploadMutation.isPending && uploadMutation.variables?.documentType === documentType`.

### M-03. Input file `sr-only` di dalam label: fokus keyboard tidak terlihat dan nama aksesibel generik

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Accessibility & keyboard
- Lokasi: `ApplicationDetail.tsx` L653, L691
- Masalah: Input `sr-only` tetap dapat difokus dengan Tab, tetapi ring fokus muncul pada elemen tak terlihat; span visual tidak mendapat `focus-visible`. Semua input dokumen bernama "Unggah" tanpa menyebut jenis dokumen.
- Dampak: Pengguna keyboard tidak tahu posisi fokus; pembaca layar membacakan "Unggah, pilih file" berulang untuk KTP, NPWP, NIB.
- Perbaikan: Pola tombol + `ref` pada M2, atau tambahkan `className="peer sr-only"` pada input dan `peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50` pada elemen visual (input harus diletakkan sebelum span), plus `aria-label={`Unggah dokumen ${documentType}`}`.

### M-04. Mengunggah ulang dokumen terverifikasi tanpa konfirmasi

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability
- Lokasi: `ApplicationDetail.tsx` L649-654 (tombol Unggah selalu tampil), L633 (baris memakai dokumen terbaru)
- Masalah: Tombol "Unggah" tetap tersedia untuk dokumen berstatus "Terverifikasi". Unggahan baru membuat record `uploaded` (server `routers.ts` L1217) dan karena daftar diurutkan terbaru (`db.ts` L907), status terverifikasi langsung tergantikan tanpa peringatan.
- Dampak: Maker tidak sengaja membatalkan verifikasi checker dan pengajuan mundur di kelengkapan, tanpa memahami sebabnya.
- Perbaikan: Ubah label menjadi "Ganti file" bila dokumen ada, dan untuk status `verified` tampilkan `AlertDialog`: "Dokumen ini sudah diverifikasi. Mengganti file akan membutuhkan verifikasi ulang oleh checker. Lanjutkan?".

### M-05. Pesan error server mentah ditampilkan ke pengguna (sering berbahasa Inggris atau JSON zod)

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states
- Lokasi: `ApplicationDetail.tsx` L77, L87, L96, L136, L154, L163, L195, L212, L222, L238; `HumanReview.tsx` L45, L141; `CustomerRequestsPanel.tsx` L23; `BprsWorkbookPanel.tsx` L169, L173, L175, L182, L184, L305; `AiAssessmentAssistant.tsx` L104, L139, L171
- Masalah: Semua `onError` memakai `error.message` apa adanya. Tanpa `errorFormatter` di server, error validasi zod tampil sebagai JSON (`[{"code":"too_small",...}]`), error jaringan sebagai "Failed to fetch", dan beberapa pesan server memang Inggris ("Rejection reason is required", "Document not found", `routers.ts` L1222-1224).
- Dampak: Analis BPRS yang tidak terbiasa istilah teknis tidak tahu tindakan apa yang harus diambil; kepercayaan terhadap sistem turun.
- Perbaikan: Buat helper tunggal dan pakai di semua `onError`:
```ts
export function pesanError(err: { message: string; data?: { code?: string; zodError?: unknown } | null }, konteks: string) {
  if (err.data?.zodError) return `${konteks}: isian belum valid, periksa kembali kolom yang ditandai.`;
  if (/fetch|network/i.test(err.message)) return `${konteks}: koneksi terputus. Coba lagi.`;
  if (err.data?.code === "FORBIDDEN") return `${konteks}: Anda tidak memiliki akses untuk aksi ini.`;
  return /[a-z]{3,} (is|not|required)/i.test(err.message) ? `${konteks}. Coba lagi atau hubungi admin.` : `${konteks}: ${err.message}`;
}
```
Lengkapi dengan `errorFormatter` di server yang menerjemahkan zod issue ke Bahasa Indonesia.

### M-06. Unduh laporan PDF tanpa status loading dan rawan klik ganda

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states
- Lokasi: `ApplicationDetail.tsx` L248-272 (`handleExportPDF` tidak memakai state), L322-325, L585-587
- Masalah: Pembuatan PDF di server (termasuk lembar disposisi komite) bisa lama, tetapi tombol tidak dinonaktifkan dan tanpa spinner. Pesan gagal generik tanpa sebab.
- Dampak: Checker mengklik berkali kali menjelang rapat komite, memicu beberapa generasi PDF dan beberapa unduhan, atau mengira tombol rusak.
- Perbaikan: Pakai `useMutation` (`trpc.assessments.exportReport.useMutation`) dan `disabled={exportReport.isPending}` dengan `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` serta teks "Menyiapkan PDF...". Pakai satu fungsi untuk kedua tombol.

### M-07. State error dan "tidak ditemukan" disamakan, tanpa navigasi kembali

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states
- Lokasi: `ApplicationDetail.tsx` L29-32, L274-284
- Masalah: `isError` tidak ditangani; error jaringan, `FORBIDDEN` (pengajuan organisasi lain) dan ID tidak valid semuanya tampil sebagai "Aplikasi tidak ditemukan" di layar kosong tanpa `AppHeader` dan tanpa tautan ke daftar. Spinner loading juga tanpa header dan tanpa teks/`role="status"`.
- Dampak: Pengguna terjebak di halaman kosong, tidak bisa membedakan "coba lagi" dari "pengajuan memang tidak ada".
- Perbaikan:
```tsx
if (isError) return (<div className="min-h-screen bg-ivory"><AppHeader /><main className="container py-16 text-center">
  <p className="font-semibold text-navy-900">Pengajuan tidak dapat dimuat.</p>
  <div className="mt-4 flex justify-center gap-2"><Button onClick={() => refetch()}>Coba lagi</Button><Button variant="outline" asChild><Link href="/dashboard">Kembali ke daftar</Link></Button></div>
</main></div>);
```
Untuk loading: render `AppHeader` plus skeleton kartu, dan `<div role="status" aria-live="polite"><Loader2 .../><span className="sr-only">Memuat pengajuan</span></div>`.

### M-08. Status "dibatalkan" tidak ditampilkan dan data alur tidak diperbarui setelah pembatalan

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states
- Lokasi: `ApplicationDetail.tsx` L233-239 (`cancelMutation.onSuccess` hanya invalidasi `getWithApplication`), L388-398 (kartu keputusan hanya untuk approved/rejected)
- Masalah: Setelah dibatalkan, `applications.workflow` dan `listActivity` tidak di-invalidate, sehingga WorkflowStatus masih menyuruh "Lengkapi dokumen". Tidak ada banner status "Dibatalkan" beserta alasan.
- Dampak: Maker mengira pembatalan gagal lalu mencoba lagi, atau checker lain melanjutkan pengajuan yang sudah batal.
- Perbaikan: Tambahkan `await utils.applications.workflow.invalidate({ applicationId }); await activityQuery.refetch();` dan kartu `{application.status === "cancelled" && <Card className="mb-6 border-rose-200 bg-rose-50">...Pengajuan dibatalkan...</Card>}`. Hal serupa: `decideMutation` dan `assessMutation` (L198-223) juga tidak menyegarkan `activityQuery` dan `commentsQuery`.

### M-09. Hapus foto survey: tombol ikon 28px, tanpa `aria-label`, memakai `window.confirm`

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Touch ergonomics, Accessibility, Usability
- Lokasi: `ApplicationDetail.tsx` L99-102, L712-721
- Masalah: Tombol `h-7 w-7` (28px) di pojok foto, hanya `title` (tidak terbaca konsisten oleh pembaca layar dan tidak muncul di layar sentuh). Konfirmasi via `window.confirm`. `disabled={deletePhotoMutation.isPending}` mengunci semua foto tanpa spinner.
- Dampak: Surveyor di lapangan dengan HP mudah salah ketuk (target kecil di atas gambar yang juga bisa diketuk), dan pengguna pembaca layar hanya mendengar "tombol".
- Perbaikan: `className="absolute right-2 top-2 size-11"` dengan `aria-label={`Hapus foto ${photo.caption ?? ""}`}`, konfirmasi lewat `AlertDialog`, dan spinner per foto berdasarkan `deletePhotoMutation.variables?.photoId === photo.id`.

### M-10. Label status foto "Terverifikasi" untuk hasil analisis AI menyesatkan

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability
- Lokasi: `ApplicationDetail.tsx` L726-728 (bandingkan dengan `statusLabels` dokumen L293)
- Masalah: Foto berstatus `analyzed` diberi label "Terverifikasi", istilah yang sama dengan verifikasi dokumen oleh checker. Padahal itu hanya hasil analisis AI.
- Dampak: Checker bisa mengira foto lokasi usaha sudah diverifikasi manusia, mempengaruhi keputusan pembiayaan.
- Perbaikan: `{photo.status === "uploaded" ? "Belum dianalisis" : photo.status === "analyzed" ? "Dianalisis AI" : "Analisis gagal"}`.

### M-11. Target sentuh di bawah 44px di seluruh alur

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Touch ergonomics
- Lokasi: `button.tsx` L24-25 (default 36px, sm 32px); pemakaian `size="sm"`: `ApplicationDetail.tsx` L657-658, L731-742, L585 (`h-7`, 28px); `BprsWorkbookPanel.tsx` L332, L455, L629, L656; `CustomerRequestsPanel.tsx` L40; tombol teks `ApplicationDetail.tsx` L764-771; `WorkflowStatus.tsx` L61; `tabs.tsx` L43 (trigger `py-1`, sekitar 28px saat `TabsList` diberi `h-auto`)
- Masalah: Hampir semua kontrol aksi berada di 28 sampai 36px. Verifikasi dan Tolak dokumen (sm, 32px) bersebelahan dengan jarak `gap-2` (8px).
- Dampak: Analis yang memakai tablet saat kunjungan nasabah salah tekan "Tolak" padahal ingin "Verifikasi".
- Perbaikan: Di layar sentuh naikkan tinggi minimum secara global di `buttonVariants`: tambahkan `pointer-coarse:min-h-11` pada base class, dan `pointer-coarse:size-11` untuk ukuran icon. Untuk Verifikasi/Tolak gunakan ukuran default dan `gap-3`. Untuk `TabsTrigger` tambahkan `min-h-10 pointer-coarse:min-h-11`.

### M-12. TabsList berbentuk pil `rounded-full` yang membungkus ke beberapa baris di mobile

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Responsiveness, Visual consistency
- Lokasi: `ApplicationDetail.tsx` L375-381 (5 tab, `h-auto w-full flex-wrap`); `BprsWorkbookPanel.tsx` L380-388 (7 tab); `AiAssessmentAssistant.tsx` L91-95; `tabs.tsx` L27 (`rounded-full`)
- Masalah: Pada lebar 360px, 5 tab utama dan 7 tab BPRS membungkus menjadi 2 sampai 3 baris di dalam kapsul `rounded-full`, menghasilkan bentuk lonjong janggal dan trigger dengan `flex-1` berukuran tidak sama. Tab aktif sulit dikenali posisinya.
- Dampak: Maker di HP sulit menemukan tab "Rekening koran" atau "Agunan", menambah beban navigasi.
- Perbaikan: Jadikan baris gulir horizontal:
```tsx
<TabsList className="mb-6 flex h-auto w-full justify-start overflow-x-auto rounded-xl [scrollbar-width:none] sm:flex-wrap">
  <TabsTrigger className="flex-none min-h-10" ...>
```
Atau di bawah `sm` ganti dengan `Select` berlabel "Bagian" untuk 7 tab BPRS.

### M-13. Label tidak terhubung ke kontrol (tanpa `htmlFor`/`id`)

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Accessibility
- Lokasi: `BprsWorkbookPanel.tsx` L250-252 (`renderSelect`), L262-268 (`renderText`), L463-468, L472-478, L481-487, L496-507, L571-572, L637-650; `HumanReview.tsx` L183-185; `CustomerRequestsPanel.tsx` L33-38 (Textarea tanpa label, hanya placeholder); `ApplicationDetail.tsx` L882-888 (textarea catatan tanpa label)
- Masalah: Puluhan field BPRS memakai `<Label>` tanpa `htmlFor` dan input tanpa `id`, sehingga klik label tidak memfokuskan input dan pembaca layar membacakan "edit teks" tanpa nama. Textarea tanggapan nasabah dan catatan hanya mengandalkan placeholder yang hilang saat mengetik.
- Dampak: Pengguna pembaca layar tidak bisa mengisi form BPRS; pengguna biasa kehilangan konteks saat placeholder hilang.
- Perbaikan:
```tsx
const renderText = ({ key, label, type = "text" }: TextField) => {
  const id = `bprs-${key}`;
  return (<div key={key} className="space-y-1.5"><Label htmlFor={id} className="text-xs">{label}</Label><Input id={id} ... /></div>);
};
// Select: <SelectTrigger id={id} className="w-full"> dengan <Label htmlFor={id}>
// CollateralRows: id={`${title}-${index}-${field.key}`}
```
Untuk CustomerRequests: `<Label htmlFor={`resolve-${id}`}>Tanggapan untuk nasabah</Label>`.

### M-14. Input nominal Rupiah memakai `type="number"` tanpa pemisah ribuan

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability
- Lokasi: `BprsWorkbookPanel.tsx` L80-82, L404-405, L412, L473-478, L529-531, L547, L551 (`CollateralRows` L644-649)
- Masalah: Gaji, kas, saldo awal, nilai pasar agunan diketik sebagai angka mentah (contoh 150000000) tanpa format; `type="number"` menerima "e", berubah nilai saat roda mouse digulir di atasnya, dan menampilkan spinner kecil.
- Dampak: AO salah ketik satu nol (Rp 15 juta vs Rp 150 juta) tanpa menyadarinya, langsung memengaruhi skor BPRS dan nilai agunan pengajuan (L163 "Nilai agunan pengajuan diperbarui").
- Perbaikan: `type="text" inputMode="numeric"`, format tampilan dengan `Number(v).toLocaleString("id-ID")`, simpan angka mentah, dan tampilkan pratinjau di bawah: `<p className="text-xs text-muted-foreground">{rp(value)}</p>`.

### M-15. Hapus baris agunan langsung tanpa konfirmasi atau undo

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability (aksi destruktif)
- Lokasi: `BprsWorkbookPanel.tsx` L654-658
- Masalah: Tombol ghost "Hapus" menghapus seluruh baris agunan (9 field) seketika. Tombol berada di sel terakhir grid, berdekatan dengan input.
- Dampak: AO kehilangan rincian sertifikat/BPKB yang sudah diketik dengan satu klik keliru.
- Perbaikan: Toast dengan undo: simpan baris yang dihapus lalu `toast("Baris agunan dihapus", { action: { label: "Urungkan", onClick: () => onChange(prev) } })`. Beri `aria-label={`Hapus ${title} baris ${index + 1}`}` dan `className="text-destructive"`.

### M-16. Mode baca BPRS untuk checker memakai field `disabled` dengan opasitas 50%

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Visual consistency, Accessibility (kontras)
- Lokasi: `BprsWorkbookPanel.tsx` L251, L266, L466, L476, L485, L500, L572, L639, L648; `input.tsx` L57 (`disabled:opacity-50`)
- Masalah: Checker meninjau data BPRS dalam puluhan input non-aktif yang dipudarkan 50%, sehingga teks abu-abu di atas putih jatuh di bawah rasio kontras 4.5:1, dan `disabled` tidak dapat difokus atau disalin oleh pembaca layar.
- Dampak: Komite kesulitan membaca isian yang menjadi dasar skor pembanding.
- Perbaikan: Saat `!editable`, render tampilan baca: `<dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm font-medium text-navy-900">{value || "-"}</dd></dl>`, atau gunakan `readOnly` dengan `read-only:bg-ivory read-only:opacity-100`.

### M-17. Panel Permintaan Nasabah hilang diam diam saat loading atau error

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states
- Lokasi: `CustomerRequestsPanel.tsx` L51-53
- Masalah: `if (requests.length === 0) return null` juga berlaku saat query masih loading atau gagal. Permintaan peninjauan ulang dari nasabah tidak muncul dan tidak ada tanda kegagalan.
- Dampak: Analis tidak menindaklanjuti keluhan nasabah karena tidak pernah melihatnya; nasabah di halaman Lacak Pengajuan menunggu tanpa tanggapan.
- Perbaikan: `if (query.isError) return <p role="alert" className="text-sm text-rose-700">Permintaan nasabah tidak dapat dimuat. <button onClick={() => query.refetch()} className="underline">Coba lagi</button></p>;` dan hanya return `null` saat `query.isSuccess && requests.length === 0`.

### M-18. Tombol "Batalkan peninjauan" berbagi textarea alasan dan tanpa konfirmasi

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability
- Lokasi: `HumanReview.tsx` L189-199, L201-216
- Masalah: Untuk membatalkan override, checker harus mengisi textarea berlabel "Alasan peninjauan" (dengan contoh alasan menaikkan klasifikasi), lalu menekan tombol outline yang sejajar dengan "Simpan hasil peninjauan". Tidak jelas alasan itu untuk aksi mana, dan pembatalan langsung terkirim tanpa konfirmasi. Tombol simpan nonaktif tanpa umpan balik jumlah karakter.
- Dampak: Checker bisa menyimpan alasan pembatalan sebagai alasan override atau sebaliknya, menghasilkan catatan audit yang salah.
- Perbaikan: Pisahkan aksi pembatalan ke `AlertDialog` dengan textarea sendiri "Alasan membatalkan peninjauan". Tambahkan penghitung: `<p className="text-xs text-muted-foreground" aria-live="polite">{reason.trim().length}/20 karakter minimum</p>`.

### M-19. Uji sensitivitas: perubahan klasifikasi hanya ditandai warna dan atribut `title`

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Accessibility (color-only)
- Lokasi: `HumanReview.tsx` L17-21, L73-78, L95
- Masalah: Sel yang mengubah klasifikasi hanya dibedakan dengan latar merah dan ring; klasifikasi hasil hanya ada di `title` yang tidak muncul di layar sentuh dan tidak dibaca andal oleh pembaca layar.
- Dampak: Checker buta warna atau di tablet tidak dapat mengetahui skenario mana yang membalik klasifikasi, padahal itu inti uji.
- Perbaikan: Tambahkan penanda teks dan ikon: `{flipped && <AlertTriangle className="ml-1 inline h-3 w-3" aria-hidden />}<span className="sr-only">{flipped ? `, klasifikasi berubah menjadi ${point.classification}` : ""}</span>`, dan tampilkan klasifikasi singkat di bawah angka untuk sel yang berubah.

### M-20. Warna hard-coded hex dan palet campuran gray/slate/navy/amber

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Visual consistency
- Lokasi: `ApplicationDetail.tsx` L427 (`bg-[#7d8fae]`), L434 (`bg-[#e6ebf3]`), L465, L581, L810, L982 (`bg-[#eef2f8]`), L581, L1016 (`border-[#cfd8e8]`), L810 (`border-[#e1e8f4]`), L1035-1036 (stop gradient hex); `WorkflowStatus.tsx` L33, L54; `DataChecks.tsx` L22; `AiAssessmentAssistant.tsx` L11, L108; palet campuran: `text-gray-600/500/700/800` (ApplicationDetail L318, L448, L457, L491-503, L639, L646), `slate-*` (L513-579, L881, L912), `navy-*`, `orange-600` (L454) vs `amber-*` (L480-507)
- Masalah: Nilai `#eef2f8` diulang 8 kali tanpa token; tiga keluarga abu-abu (gray, slate, muted-foreground) dipakai berdampingan dalam satu kartu. Ikon risiko memakai orange sementara peringatan lain amber.
- Dampak: Tampilan terasa tidak rapi bagi pengguna institusional, dan perubahan tema (mode gelap di `index.css` L111) tidak menjangkau warna hex sehingga panel tetap terang.
- Perbaikan: Definisikan token di `index.css` `@theme`: `--color-navy-50: #eef2f8; --color-navy-100: #e6ebf3; --color-navy-200: #cfd8e8; --color-navy-400: #7d8fae;`, lalu ganti `bg-[#eef2f8]` menjadi `bg-navy-50`, dst. Ganti semua `text-gray-*`/`text-slate-*` dengan `text-muted-foreground` atau `text-navy-900`, dan `text-orange-600` dengan `text-amber-600`.

### M-21. Teks emas dan teks kecil berkontras rendah

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Visual consistency (kontras), Accessibility
- Lokasi: `ApplicationDetail.tsx` L314 (`text-gold-500` #d99e2b di `bg-gold-50` #fdf6e7, sekitar 2.1:1), L506 (`text-amber-600` di `bg-amber-50`, sekitar 3:1 pada `text-xs`), L1021 (`text-[11px] text-royal-600/70` di `bg-[#eef2f8]`); `AiAssessmentAssistant.tsx` L152 (`text-gold-500` di `bg-ivory`, rujukan fatwa), L180 (`text-gold-500` judul "Pertanyaan untuk komite"); `WorkflowStatus.tsx` L43 (ikon gold-500 di gold-50)
- Masalah: Nomor tiket, rujukan fatwa DSN-MUI, dan judul pertanyaan komite tampil di bawah ambang WCAG AA 4.5:1.
- Dampak: Nasabah yang menyebutkan nomor tiket ke CS dan checker yang membaca rujukan fatwa di ruang rapat terang kesulitan membacanya.
- Perbaikan: Gunakan warna emas gelap untuk teks: tambahkan token `--color-gold-700: #8a5a0b` (sudah dipakai di `.score-warning`, `index.css` L212) dan ganti `text-gold-500` menjadi `text-gold-700`; `text-amber-600` menjadi `text-amber-800`; `text-royal-600/70` menjadi `text-navy-800`.

### M-22. Ukuran huruf 10 sampai 11px untuk informasi penting

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Visual consistency (tipografi), Accessibility
- Lokasi: `ApplicationDetail.tsx` L412 (info override checker), L544 (persyaratan persetujuan bawahan), L1021; `DataChecks.tsx` L30, L32 (tingkat keparahan dan sumber temuan); `AiAssessmentAssistant.tsx` L118, L122; `HumanReview.tsx` L62
- Masalah: Label keparahan "tinggi/sedang/rendah", sumber "AI/Aturan", dan catatan kewenangan memutus ditulis 10 sampai 11px, di luar skala Tailwind dan kadang dengan `opacity-70`.
- Dampak: Informasi yang menentukan bobot temuan (tinggi vs rendah) mudah terlewat, terutama oleh komite berusia lanjut.
- Perbaikan: Minimum `text-xs` (12px) tanpa `opacity-70`; untuk badge keparahan pakai komponen `Badge` dengan `text-xs font-semibold`.

### M-23. SelectTrigger tidak selebar kolom dan opsi panjang memicu scroll horizontal di ponsel

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Responsiveness, Visual consistency
- Lokasi: `client/src/components/ui/select.tsx:38` (`w-fit whitespace-nowrap`); pemakaian tanpa `w-full` di `client/src/pages/NewApplication.tsx:446`, `:456`, `:492`, `:559`, `:573`, `:693`, `:722`, `:800`
- Masalah: Semua trigger di formulir mengikuti lebar isi, sedangkan `Input` di sebelahnya `w-full`. Opsi `incomeSourceType` (baris 695-697) sepanjang sekitar 80 karakter dengan `whitespace-nowrap`, sehingga trigger dapat melebihi lebar layar 360px.
- Dampak: Grid formulir terlihat bergerigi (select pendek di samping input penuh), dan di ponsel halaman bisa bergeser horizontal setelah memilih sumber penghasilan.
- Perbaikan: Tambahkan `className="w-full"` pada semua `SelectTrigger` di form (atau ubah default di `select.tsx` menjadi `w-full`), dan persingkat label opsi; pindahkan keterangan "Wajib Slip Gaji ..." ke teks bantuan di bawah (sudah ada di baris 700-706).
```tsx
<SelectTrigger id={name} className="w-full min-w-0"><SelectValue placeholder="Pilih" /></SelectTrigger>
<SelectItem value="fixed">Penghasilan tetap (gaji)</SelectItem>
```

### M-24. Kartu pilihan segmen, akad, dan sumber angka tidak punya status terpilih bagi pembaca layar dan tanpa fokus terlihat

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Accessibility & keyboard
- Lokasi: `client/src/pages/NewApplication.tsx:607-610`, `:633-653`, `:748-756`
- Masalah: `<button>` mentah dengan kelas kustom tanpa `aria-pressed` atau pola `radiogroup`, dan tanpa kelas `focus-visible:*`. Status terpilih hanya dari warna border/latar (`border-primary bg-primary/10`).
- Dampak: Pengguna keyboard tidak melihat kartu mana yang sedang difokus (outline bawaan bisa hilang oleh reset Tailwind pada beberapa browser), dan pembaca layar hanya membaca "Murabahah, tombol" tanpa tahu mana yang aktif.
- Perbaikan: Gunakan `role="radiogroup"` + `role="radio"` + `aria-checked`, atau minimal `aria-pressed`, dan tambahkan ring fokus.
```tsx
<div role="radiogroup" aria-label="Jenis akad pembiayaan" className="grid gap-3 sm:grid-cols-2">
  <button type="button" role="radio" aria-checked={active}
    className="... outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400/50 focus-visible:border-gold-400">
```
Sebaiknya ekstrak menjadi satu komponen `ChoiceCard` agar empat varian (baris 607-610) tidak berulang.

### M-25. Baris dokumen persyaratan tanpa label untuk select status dan catatan

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Accessibility & keyboard
- Lokasi: `client/src/pages/NewApplication.tsx:722`
- Masalah: Setiap baris berisi `<Input value={doc.type} disabled />`, `<SelectTrigger>` tanpa `id`/`aria-label`, dan `<Input placeholder="Catatan (opsional)">` tanpa label. Jenis dokumen ditampilkan sebagai input disabled (`opacity-50`), sehingga kontras teks nama dokumen turun.
- Dampak: Pembaca layar mengumumkan "combobox, Pending" berulang tanpa tahu dokumen mana; analis berpenglihatan rendah sulit membaca nama dokumen yang pudar.
- Perbaikan:
```tsx
<fieldset key={doc.type} className="grid items-end gap-3 md:grid-cols-[160px_1fr_1fr]">
  <legend className="sr-only">Dokumen {doc.type}</legend>
  <span className="text-sm font-medium text-navy-900">{doc.type}</span>
  <SelectTrigger id={`doc-${i}-status`} aria-label={`Status ${doc.type}`} className="w-full">...
  <Input aria-label={`Catatan ${doc.type}`} ... />
</fieldset>
```

### M-26. Input file dan pemilih jenis dokumen tidak berlabel

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Accessibility & keyboard
- Lokasi: `client/src/pages/NewApplication.tsx:689` (input file KTP), `:715` (input file CSV); `client/src/components/AiDocumentReader.tsx:107-111`
- Masalah: `<Input type="file">` dan `<SelectTrigger className="w-44">` tidak punya `<Label htmlFor>` atau `aria-label`. Judul `h3` di atasnya tidak terhubung secara programatik.
- Dampak: Pembaca layar membaca "Choose file, button" tanpa konteks KTP, CSV, atau dokumen AI; pengguna tidak tahu file apa yang diminta.
- Perbaikan:
```tsx
<Label htmlFor="ktp-file" className="sr-only">Foto KTP (JPG/PNG, maks 5 MB)</Label>
<Input id="ktp-file" type="file" accept="image/jpeg,image/png" aria-describedby="ktp-help" ... />
// AiDocumentReader
<SelectTrigger aria-label="Jenis dokumen" className="w-full sm:w-44">
```

### M-27. Kolom NIK, telepon, dan email tanpa inputMode, autocomplete, dan batas panjang

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (input types), Responsiveness (keyboard virtual)
- Lokasi: `client/src/pages/NewApplication.tsx:675`
- Masalah: `customerId` adalah input teks bebas tanpa `inputMode="numeric"`, `maxLength={16}`, atau `pattern`. `phone` bertipe `tel` tetapi tanpa `autoComplete="tel"` dan tanpa contoh format. Tidak ada validasi 16 digit, padahal ringkasan (baris 829) mengasumsikan NIK cukup panjang untuk di-mask.
- Dampak: Analis di tablet mendapat keyboard huruf untuk NIK, dan NIK 15 atau 17 digit lolos ke komite; masking di ringkasan bisa menampilkan digit yang tumpang tindih untuk ID pendek.
- Perbaikan:
```tsx
<Field name="customerId" label="NIK *" inputMode="numeric" maxLength={16} pattern="\d{16}" autoComplete="off" placeholder="16 digit" ... />
<Field name="phone" label="Nomor Telepon *" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" ... />
<Field name="email" label="Email (Opsional)" type="email" autoComplete="email" ... />
```
Tambahkan aturan `customerId: v => /^\d{16}$/.test(v) || "NIK harus 16 digit"` pada validasi B-04.

### M-28. Dropdown riwayat nasabah muncul jauh dari kolom yang diketik dan tidak dapat dioperasikan dengan keyboard

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability, Accessibility & keyboard
- Lokasi: `client/src/pages/NewApplication.tsx:184-197`, `:217-225`, `:689`
- Masalah: Popover riwayat dirender setelah kotak "Status Keterkaitan" (setelah grid nama/NIK/telepon/email), memakai `absolute` sehingga menutupi kolom Alamat. Tidak ada `role="listbox"`, `aria-expanded` pada input, navigasi panah, atau Escape; penutupan hanya lewat `mousedown` di luar. Label status menggabungkan semua status selain approved/rejected/assessed menjadi "Pending". Tidak ada state kosong ("Tidak ada riwayat").
- Dampak: Saat analis mengetik NIK, daftar muncul di tempat yang tidak terduga dan menutupi alamat; pengguna keyboard terjebak dan tidak bisa menutup popover tanpa mouse. Pengguna sentuh tidak memicu `mousedown` secara konsisten pada beberapa browser.
- Perbaikan: Pindahkan popover tepat di bawah kolom NIK dengan `Popover`/`Command` dari shadcn, dukung Escape, dan pakai `pointerdown`.
```tsx
<Popover open={historyVisible} onOpenChange={setHistoryVisible}>
  <PopoverAnchor asChild><div><Field name="customerId" ... aria-expanded={historyVisible} aria-controls="history-list" /></div></PopoverAnchor>
  <PopoverContent onOpenAutoFocus={e => e.preventDefault()} className="w-[--radix-popover-trigger-width] p-0">
    <Command><CommandList id="history-list">...</CommandList></Command>
  </PopoverContent>
</Popover>
```

### M-29. Ganti segmen produk diam-diam menghapus status dan catatan dokumen

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (kehilangan data)
- Lokasi: `client/src/pages/NewApplication.tsx:636-646`
- Masalah: Klik kartu segmen selalu mengganti `legalDocuments` dengan daftar baru berstatus `pending`, termasuk saat mengklik segmen yang sama atau setelah kembali dari langkah 3.
- Dampak: Analis yang sudah menandai KTP "Terverifikasi" dan menulis catatan, lalu kembali ke langkah 1 dan mengklik ulang kartu, kehilangan semua status dokumen tanpa pemberitahuan.
- Perbaikan: Abaikan klik pada segmen aktif dan pertahankan status dokumen yang jenisnya sama.
```tsx
onClick={() => {
  if (active) return;
  setValues(v => ({ ...v, productSegment: segKey,
    legalDocuments: seg.requiredDocuments.map(type => v.legalDocuments.find(d => d.type === type) ?? { type, status: "pending", notes: "" }) }));
  toast.info(`Daftar dokumen disesuaikan untuk segmen ${seg.label}`);
}}
```

### M-30. Tanda bintang wajib di form akad tidak ditegakkan dan bertentangan dengan panduan

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (required markers), Interaction (validasi)
- Lokasi: `client/src/pages/NewApplication.tsx:538`, `:557`, `:571`, `:580-581`, `:589`, `:591`, `:681`; daftar wajib di `:350-355`; panduan "Seluruh kolom bersifat opsional" di `:445`, `:495`
- Masalah: Label "Tujuan Pinjaman Qardh *", "Nilai Perolehan Jasa (Rp) *", "Imbalan Ujrah Bank *", "Hubungan / Jabatan Pihak Terkait *" bertanda wajib, tetapi tidak ada di `required` sehingga form tetap lolos saat kosong. Akad murabahah/mudharabah justru dinyatakan opsional seluruhnya.
- Dampak: Analis tidak tahu mana yang benar-benar wajib; pengajuan Qardh atau pihak terkait bisa terkirim tanpa tujuan pinjaman atau hubungan pihak terkait, yang menurut teks KPB baris 686 wajib persetujuan khusus.
- Perbaikan: Bangun daftar wajib secara dinamis.
```tsx
const requiredFor = (i: number) => i !== 1 && i !== 0 ? required[i] : [
  ...required[i],
  ...(i === 0 && values.isRelatedParty === "yes" ? ["relatedPartyRelation"] : []),
  ...(i === 1 && values.financingAkad === "qardh" ? ["qardhPurpose"] : []),
  ...(i === 1 && values.financingAkad === "multijasa" ? ["multijasaServiceCategory", "multijasaAkadType", "multijasaServiceProvider", "multijasaSourceObject", "multijasaServiceCost", "multijasaUjrahAmount"] : []),
];
```

### M-31. Memilih Al-Qardh menimpa margin menjadi 0 dan tidak dikembalikan saat ganti akad

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (kehilangan data)
- Lokasi: `client/src/pages/NewApplication.tsx:609`, `:717`, `:542`
- Masalah: Klik kartu Al-Qardh mengatur `marginRate: "0"`. Bila analis lalu kembali ke Murabahah, margin tetap 0. Kolom "Total Margin Akad (%)" di baris 717 tetap dapat diubah saat akad Qardh, padahal teks baris 542 menyatakan margin otomatis 0%.
- Dampak: Margin yang sudah diketik (misal 12%) hilang tanpa pemberitahuan; pengajuan Murabahah dapat terkirim dengan margin 0% dan perhitungan piutang salah.
- Perbaikan: Simpan margin sebelumnya dan kunci kolom saat Qardh.
```tsx
onClick={() => setValues(v => ({ ...v, financingAkad: "qardh", prevMarginRate: v.marginRate, marginRate: "0" }))}
// akad lain
onClick={() => setValues(v => ({ ...v, financingAkad: "murabahah", marginRate: v.financingAkad === "qardh" ? (v.prevMarginRate ?? "") : v.marginRate }))}
<Field name="marginRate" ... disabled={values.financingAkad === "qardh"} />
```

### M-32. Nisbah bank dan nasabah tidak diperiksa harus berjumlah 100%

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (validasi)
- Lokasi: `client/src/pages/NewApplication.tsx:508-509`
- Masalah: Dua input `type="number"` independen tanpa pengecekan total. Tidak ada umpan balik saat 60 + 50.
- Dampak: Akad mudharabah dengan nisbah 110% atau 80% dapat dikirim ke komite, memaksa perbaikan manual di tahap berikutnya.
- Perbaikan: Isi otomatis pasangan nisbah dan tampilkan peringatan.
```tsx
onChange={e => { const b = e.target.value; setValues(v => ({ ...v, mudharabahBankNisbah: b, mudharabahCustomerNisbah: b === "" ? "" : String(100 - Number(b)) })); }}
{total !== 100 && <p role="alert" className="text-sm text-amber-700">Total nisbah {total}%, harus 100%.</p>}
```

### M-33. Ringkasan akhir menampilkan syarat dokumen yang salah dan kode akad mentah

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (cognitive load), Interaction (informasi salah)
- Lokasi: `client/src/pages/NewApplication.tsx:843`, `:858-860`
- Masalah: Baris 860 selalu menyebut "unggah KTP, NPWP, NIB" padahal dokumen bergantung segmen (`BPRS_SEGMENT_DETAILS[...].requiredDocuments`) dan `ReviewTrackHint` sudah memakai `TRACK_REQUIREMENTS`. Akad ditampilkan sebagai `murabahah`/`multijasa` huruf kecil. Rincian akad (harga pokok, nisbah, ujrah) tidak muncul di ringkasan.
- Dampak: Analis yang memeriksa sebelum kirim tidak dapat memverifikasi isi akad, dan diberi daftar dokumen yang tidak sesuai segmen (misal segmen pegawai yang butuh slip gaji).
- Perbaikan: Gunakan sumber data yang sama dan label manusiawi.
```tsx
const AKAD_LABELS = { murabahah: "Murabahah", mudharabah: "Mudharabah", qardh: "Al-Qardh", multijasa: "Ijarah Multijasa" };
["Akad", AKAD_LABELS[values.financingAkad] ?? "-"],
// syarat: TRACK_REQUIREMENTS[track].verifiedDocuments.join(", ")
```
Tambahkan grup "Rincian akad" berisi field yang terisi sesuai akad.

### M-34. Target sentuh di bawah 44px pada tombol navigasi utama dan aksi penting

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Responsiveness & touch ergonomics
- Lokasi: `client/src/pages/NewApplication.tsx:623` (Pulihkan/Mulai ulang `size="sm"`, 32px), `:625` (Isi contoh data `sm`), `:728` (Kembali, Lanjutkan, Kirim Aplikasi `h-9`, 36px), `:866` (Ubah `sm`); `client/src/components/AiDocumentReader.tsx:133` (Pakai `sm`); `client/src/components/DailySalesCalculator.tsx:45-47`; `client/src/pages/Login.tsx:67-73` (teks `text-xs` tanpa padding)
- Masalah: Ukuran default `button.tsx:24-25` di bawah rekomendasi 44x44px, dan tombol "Kembali" serta "Lanjutkan" berada di ujung form panjang tanpa sticky bar.
- Dampak: Di tablet lapangan atau ponsel, salah ketuk antara "Kembali" dan aksi lain sering terjadi; tautan "Kembali ke email dan password" sulit diketuk.
- Perbaikan: Pakai `h-11` untuk aksi utama dan bar aksi lengket di ponsel.
```tsx
<div className="sticky bottom-0 -mx-4 mt-6 flex gap-3 border-t bg-ivory/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
  <Button className="h-11 min-w-[44px] px-5" ...>Kembali</Button>
  <Button className="ml-auto h-11 px-6" ...>Lanjutkan</Button>
</div>
// Login: className="inline-flex min-h-11 items-center px-1 text-sm ..."
```

### M-35. Pesan error mentah dari server ditampilkan langsung

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states (error messages)
- Lokasi: `client/src/pages/NewApplication.tsx:160`, `:162`, `:175`; `client/src/pages/Login.tsx:33`; `client/src/pages/Register.tsx:22`; `client/src/components/TwoFactorSettings.tsx:19`, `:28`, `:37`; `client/src/components/AiDocumentReader.tsx:30`; `client/src/components/CustomerTracking.tsx:92`; `client/src/pages/TrackApplication.tsx:142-146`
- Masalah: Semua handler memakai `error.message` apa adanya. Untuk error validasi Zod di tRPC, `message` berupa string JSON array issue (contoh `[{"code":"too_small",...}]`); untuk gangguan jaringan berupa "Failed to fetch". Error pelacakan juga tidak memiliki `role="alert"`.
- Dampak: Nasabah di halaman publik atau analis melihat teks teknis berbahasa Inggris yang tidak menjelaskan apa yang harus dilakukan; error di toast hilang sebelum sempat dibaca.
- Perbaikan: Buat helper pemetaan pesan dan gunakan di semua `onError`.
```ts
export function friendlyError(err: TRPCClientErrorLike<AppRouter>, fallback: string) {
  if (err.data?.zodError) return "Ada isian yang belum sesuai. Periksa kembali kolom bertanda merah.";
  if (err.message === "Failed to fetch") return "Koneksi terputus. Periksa internet Anda lalu coba lagi.";
  if (err.data?.code === "NOT_FOUND") return "Pengajuan tidak ditemukan. Periksa nomor tiket dan 4 digit NIK.";
  return err.message?.startsWith("[") ? fallback : err.message;
}
```
Di `TrackApplication.tsx:143` tambahkan `role="alert"` dan tautan bantuan "Hubungi Account Officer BPRS Anda".

### M-36. Login tanpa error inline, tanpa toggle tampilkan password, dan tanpa jalur lupa password

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (password visibility), Interaction (error), Accessibility
- Lokasi: `client/src/pages/Login.tsx:33`, `:89-101`, `:114-119`
- Masalah: Gagal login hanya muncul sebagai toast; password tidak bisa ditampilkan; tidak ada tautan "Lupa password" atau petunjuk menghubungi admin (tidak ditemukan rute lupa password di `client/src`).
- Dampak: Analis yang salah ketik di ponsel tidak bisa memeriksa password; pengguna yang lupa password berhenti di halaman ini tanpa arah.
- Perbaikan:
```tsx
const [showPw, setShowPw] = useState(false);
<div className="relative">
  <Input id="password" type={showPw ? "text" : "password"} aria-invalid={!!loginError} aria-describedby="login-error" className="h-11 pr-11" ... />
  <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPw}
    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg focus-visible:ring-[3px] focus-visible:ring-gold-400/50">
    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>
{loginError && <p id="login-error" role="alert" className="text-sm text-destructive">{loginError}</p>}
<p className="text-sm text-muted-foreground">Lupa password? Hubungi administrator BPRS Anda.</p>
```

### M-37. Slug organisasi harus dikarang sendiri tanpa bantuan dan tanpa validasi pola

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (form friction)
- Lokasi: `client/src/pages/Register.tsx:11-16`, `:34-35`
- Masalah: Pengguna diminta mengisi "Slug organisasi" (istilah teknis) secara manual, tanpa `pattern`, tanpa pembuatan otomatis dari nama BPRS, dan tanpa pratinjau. Kesalahan format baru diketahui dari toast server.
- Dampak: Direktur BPRS yang tidak paham istilah "slug" bingung atau mengetik "BPRS Amanah Sejahtera" dengan spasi, lalu gagal tanpa petunjuk jelas.
- Perbaikan: Turunkan otomatis dari nama dan tampilkan sebagai kolom yang dapat diedit.
```tsx
const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [slugTouched, setSlugTouched] = useState(false);
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
<Input id="organizationSlug" value={slugTouched ? slug : slugify(name)} pattern="[a-z0-9-]+" onChange={e => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
<p className="text-xs text-muted-foreground">Alamat singkat organisasi Anda: ssci.id/{slugTouched ? slug : slugify(name) || "bprs-anda"}</p>
```
Ganti label menjadi "Kode singkat organisasi".

### M-38. Penyiapan 2FA tidak menyediakan tombol salin, tautan otpauth, maupun kode cadangan

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability, Responsiveness (pengguna ponsel)
- Lokasi: `client/src/components/TwoFactorSettings.tsx:80-87`, `:95-98`; `client/src/components/TwoFactorGate.tsx:24-34`
- Masalah: Rahasia ditampilkan sebagai `<code>` yang harus diketik manual; tidak ada tombol "Salin" atau tautan `otpauth://` untuk membuka aplikasi authenticator di perangkat yang sama. Tidak ada kode pemulihan setelah aktif. Input kode tidak `autoFocus`.
- Dampak: Checker atau admin yang membuka portal dari ponsel tidak dapat memindai QR di layar ponsel yang sama dan harus menyalin 32 karakter acak secara manual. Bila ponsel hilang, akun terkunci tanpa jalur pemulihan selain admin.
- Perbaikan:
```tsx
<div className="flex items-center gap-2">
  <code className="flex-1 break-all ...">{setup.data.secret}</code>
  <Button type="button" variant="outline" size="icon" aria-label="Salin kode rahasia" onClick={() => { navigator.clipboard.writeText(setup.data.secret); toast.success("Kode disalin"); }}><Copy /></Button>
</div>
<Button asChild variant="link" className="sm:hidden"><a href={setup.data.otpauthUrl}>Buka di aplikasi authenticator</a></Button>
<Input id="tfa-enable-code" autoFocus ... />
```
Tampilkan kode cadangan sekali pakai setelah `enable` sukses.

### M-39. Timeline pelacakan tidak menandai tahap yang sedang berjalan

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (cognitive load), Accessibility
- Lokasi: `client/src/pages/TrackApplication.tsx:36-66`, `:190-236`
- Masalah: `isActive` dihitung tetapi tidak pernah dipakai saat render. Tahap belum selesai dan tahap berjalan sama-sama abu-abu dengan ikon jam (`bg-slate-300`, `text-gray-400`). Langkah 2 dan 3 memakai kondisi `isActive` yang identik (baris 49 dan 56). Saat ditolak, tahap 4 tetap berdeskripsi "Persetujuan pembiayaan dan persiapan akad resmi" (baris 61). Tidak ada `<ol>` maupun `aria-current="step"`.
- Dampak: Nasabah tidak bisa menjawab "berkas saya sedang di mana" dari tampilan; pengguna pembaca layar mendengar daftar tanpa status.
- Perbaikan:
```tsx
<ol className="relative space-y-4 ...">
  <li aria-current={step.isActive ? "step" : undefined} className="relative flex items-start gap-3">
    <div className={isRejected ? "bg-rose-600 ..." : isCompleted ? "bg-emerald-600 ..." : step.isActive ? "bg-gold-400 text-navy-900 ring-4 ring-gold-400/25 animate-pulse" : "bg-slate-300"} />
    ...{step.isActive && <span className="rounded bg-gold-50 px-2 py-0.5 text-xs font-semibold text-navy-900">Sedang diproses</span>}
```
Perbaiki kondisi langkah 2 menjadi `app?.status === "pending" && !!app?.assessedAt` atau sesuai alur, dan ganti deskripsi tahap 4 saat ditolak.

### M-40. Hasil pelacakan tidak digulir atau diumumkan setelah pencarian di ponsel

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Responsiveness, Accessibility (live region)
- Lokasi: `client/src/pages/TrackApplication.tsx:142-149`
- Masalah: Hasil dan error dirender di bawah kartu form tanpa `aria-live`, tanpa `scrollIntoView`, dan tanpa fokus. Di layar 360x640 dengan keyboard virtual terbuka, kartu form sendiri sudah memenuhi layar.
- Dampak: Nasabah menekan "Lacak" dan tidak melihat perubahan apa pun di layar, lalu menekan berulang kali; pengguna pembaca layar tidak tahu ada hasil.
- Perbaikan:
```tsx
const resultRef = useRef<HTMLDivElement>(null);
useEffect(() => { if (app || trackQuery.isError) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [app, trackQuery.isError]);
<div ref={resultRef} tabIndex={-1} aria-live="polite" className="scroll-mt-4 outline-none">...</div>
```
Tutup keyboard dengan `(document.activeElement as HTMLElement)?.blur()` di `handleSearch`.

### M-41. Halaman Tentang SSCI memakai grid tetap 3 dan 2 kolom di ponsel

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Responsiveness
- Lokasi: `client/src/pages/AboutSSCI.tsx:239`, `:341`, `:386`, `:279`, `:284-287`, `:292`, `:265-269`
- Masalah: `grid grid-cols-3` (kartu bobot dengan `text-4xl font-black`), `grid grid-cols-2` (klasifikasi skor dengan judul `text-lg` plus badge `font-mono`), dan `px-8` pada header dan isi pilar tanpa breakpoint. Judul pilar dan badge di baris 284-287 dalam `flex` tanpa `flex-wrap`. Label di bawah bar proporsi (265-269) memakai `justify-between` yang tidak sejajar dengan lebar segmen.
- Dampak: Di layar 360px, setiap kartu bobot hanya sekitar 95px sehingga "Indeks Keuangan Berkelanjutan" terpotong per kata; kartu klasifikasi berisi badge "65 - <80" yang menabrak label; padding 32px menyisakan sekitar 260px untuk teks hukum.
- Perbaikan: `grid-cols-1 sm:grid-cols-3`, `grid-cols-1 sm:grid-cols-2`, `px-5 sm:px-8`, `flex flex-wrap items-center gap-2` pada judul pilar, dan letakkan label di dalam segmen bar atau dalam legenda vertikal di ponsel.

### M-42. Kontras rendah pada teks sekunder dan aksen emas

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Visual consistency, Accessibility (kontras)
- Lokasi: `client/src/pages/Home.tsx:138` (`text-[#8e9cb4]` di `bg-white`), `:107`, `:129` (`#8e9cb4` di navy); `client/src/pages/AboutSSCI.tsx:369`, `:371` (`text-royal-600` di `bg-gray-800`), `:265`, `:403` (`text-gray-400` di latar terang); `client/src/pages/NewApplication.tsx:624` (`text-gold-500` `text-xs` di putih); `client/src/pages/Login.tsx:149` (`text-[10px] text-gold-500` di `bg-gold-50`); `client/src/pages/TrackApplication.tsx:221` (`text-gray-400` judul tahap)
- Masalah: `#8e9cb4` di putih sekitar 2,7:1, `gray-400` di ivory sekitar 2,5:1, biru royal di abu gelap di bawah 3:1, emas pada teks 10 sampai 12px di bawah 4,5:1.
- Dampak: Judul tahap yang belum selesai di halaman pelacakan, nama langkah formulir, dan rumus SSCI sulit dibaca di luar ruangan atau oleh pengguna berpenglihatan rendah.
- Perbaikan: Gunakan token `text-muted-foreground` (atau `text-slate-600`) untuk teks sekunder di latar terang, `text-sky-300` atau `text-gold-300` untuk kode di latar gelap, dan `text-navy-900` untuk label kecil di atas emas muda. Contoh: `className="text-xs font-semibold text-navy-900"` untuk nama langkah di baris 624.

### M-43. Halaman admin menampilkan "Akses ditolak" sesaat untuk admin yang sah

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/Team.tsx` baris 23-24, 85-95; `client/src/pages/AuditLog.tsx` baris 25-26, 48-58; `client/src/pages/Platform.tsx` baris 15-17, 35-36
- Masalah: `isAdmin`/`allowed` dihitung dari `user?.role` tanpa memeriksa `loading`. Selama `auth.me` belum selesai, `user` bernilai `null` sehingga UI langsung merender "Akses ditolak" / "Halaman ini khusus SuperAdmin platform".
- Dampak: Admin melihat pesan penolakan berkedip setiap kali refresh, menimbulkan kebingungan apakah perannya dicabut. Di koneksi lambat pesan bertahan beberapa detik.
- Perbaikan: `const { user, loading } = useAuth(...); if (loading) return <PageShell><main className="container py-16"><Skeleton className="h-48" /></main></PageShell>;` sebelum cek peran.

### M-44. Tidak ada guard autentikasi atau loading global di level router

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/App.tsx` baris 26-48; `client/src/pages/Dashboard.tsx` baris 72, 85-101; `client/src/_core/hooks/useAuth.ts` baris 62-77
- Masalah: Setiap halaman memanggil `useAuth({ redirectOnUnauthenticated: true })` sendiri, sementara konten (header, kartu statistik bernilai 0, tombol ekspor) langsung dirender. Dashboard menembakkan 7 query sebelum status login diketahui. Redirect dilakukan via `window.location.href` setelah render.
- Dampak: Pengguna yang sesinya habis melihat dashboard kosong berisi angka "0" dan "Rp 0" lalu terlempar ke login; ini terlihat seperti data hilang. Query yang gagal juga membanjiri console.
- Perbaikan: Buat `ProtectedRoute` yang menampilkan `DashboardLayoutSkeleton` (sudah ada di `components/DashboardLayoutSkeleton.tsx`) selama `loading`, dan bungkus semua rute internal:
```tsx
function Protected({ children, role }: { children: ReactNode; role?: "admin" }) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  if (loading || !user) return <DashboardLayoutSkeleton />;
  if (role && user.role !== role) return <AccessDenied />;
  return <>{children}</>;
}
```

### M-45. ErrorBoundary menampilkan stack trace mentah dan teks bahasa Inggris

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/components/ErrorBoundary.tsx` baris 34-40, 51
- Masalah: Pengguna akhir (analis BPRS) melihat "An unexpected error occurred.", `error.stack` lengkap dan tombol "Reload Page". Tidak ada `componentDidCatch` untuk logging, tidak ada jalan kembali ke dashboard.
- Dampak: Pengguna non-teknis panik dan tidak tahu harus berbuat apa; jalur file internal terekspos ke pengguna bank.
- Perbaikan: Tampilkan pesan Indonesia, sembunyikan stack kecuali `import.meta.env.DEV`, sediakan dua aksi:
```tsx
<h1 className="font-serif text-2xl text-navy-900">Terjadi kendala pada halaman ini</h1>
<p className="text-muted-foreground">Data Anda yang sudah tersimpan aman. Muat ulang halaman atau kembali ke dashboard.</p>
{import.meta.env.DEV && <pre>{this.state.error?.stack}</pre>}
<Button onClick={() => location.reload()}>Muat ulang</Button>
<Button variant="outline" asChild><a href="/dashboard">Ke dashboard</a></Button>
```

### M-46. Pesan error server mentah ditempel langsung ke toast di seluruh halaman

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/Dashboard.tsx` baris 116, 125, 184, 229; `client/src/pages/Team.tsx` baris 50, 58, 66; `client/src/pages/Settings.tsx` baris 54, 62, 70, 98, 150; `client/src/pages/Notifications.tsx` baris 26; `client/src/pages/Platform.tsx` baris 27, 38
- Masalah: Pola `toast.error(\`Gagal ...: ${error.message}\`)` meneruskan pesan apa pun dari server, termasuk pesan validasi Zod dalam bentuk JSON array berbahasa Inggris, "Failed to fetch", atau kode internal. Platform.tsx baris 38 bahkan melakukan `.replace("TWO_FACTOR_REQUIRED: ", "")` secara manual, tanda bahwa kode error bocor ke UI.
- Dampak: Admin yang salah mengisi email anggota tim melihat teks seperti `[{"code":"invalid_string","validation":"email"...}]`, tidak paham apa yang harus diperbaiki.
- Perbaikan: Buat helper `toUserMessage(error)` di `lib/errors.ts` yang memetakan `error.data?.code` (`BAD_REQUEST`, `FORBIDDEN`, `CONFLICT`, `zodError`) ke kalimat Indonesia, dan pakai `toast.error("Gagal menambahkan anggota", { description: toUserMessage(error) })`.

### M-47. State error tidak ditangani di beberapa list sehingga terlihat seperti "data kosong"

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/AssessmentHistory.tsx` baris 18-20, 103-109; `client/src/pages/Notifications.tsx` baris 16, 58-69; `client/src/pages/Dashboard.tsx` baris 441-447, 473-479; `client/src/pages/Platform.tsx` baris 53-54, 109-124; `client/src/pages/Team.tsx` baris 205-212
- Masalah: Hanya `isLoading` yang dicek. Jika query gagal, kondisi jatuh ke cabang kosong: "Tidak ada data aplikasi pembiayaan", "Belum ada notifikasi", "Belum ada data tren", "Belum ada anggota tim. Tambahkan anggota pertama...". Platform: tabel log tidak punya loading maupun empty state sama sekali; daftar organisasi tidak punya empty state.
- Dampak: Analis menyimpulkan tidak ada pengajuan padahal server sedang bermasalah; admin bisa membuat akun duplikat karena mengira tim kosong.
- Perbaikan: Tambahkan cabang `isError` yang konsisten dengan Dashboard baris 602-609 (ikon, pesan, tombol "Coba lagi"), lalu ekstrak menjadi komponen `<QueryState query={q} empty="..." />` untuk dipakai ulang.

### M-48. Export SLIK/Export Semua menampilkan "Tidak ada data" saat sebenarnya request gagal

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/Dashboard.tsx` baris 173-186, 193-199
- Masalah: `query.refetch()` milik React Query tidak melempar error (mengembalikan `{ data, error }`), sehingga blok `catch` tidak pernah tereksekusi. Saat gagal, `result.data` undefined dan kode menampilkan "Tidak ada data pengajuan untuk diekspor."
- Dampak: Komite yang perlu mengirim laporan SLIK mengira tidak ada data dan tidak mengirim laporan, padahal masalahnya jaringan/izin.
- Perbaikan:
```ts
const result = await exportSlikQuery.refetch();
if (result.isError) { toast.error("Gagal mengekspor SLIK", { description: toUserMessage(result.error) }); return; }
```
Atau ganti ke `utils.applications.exportSlik.fetch()` yang melempar error.

### M-49. Cakupan filter tidak jelas: filter tanggal di bawah, tetapi memengaruhi kartu di atas; ekspor tidak konsisten dengan filter

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability & cognitive load
- Lokasi: `client/src/pages/Dashboard.tsx` baris 78-93, 142, 188-191, 503-539, 580-592
- Masalah: Filter tanggal ditempatkan di bagian queue (baris 503), jauh di bawah kartu "Ringkasan status/keuangan" yang ikut berubah (statsQuery baris 90-93). Filter analis ada di header queue tetapi juga mengubah statistik. Export SLIK (baris 142) mengabaikan semua filter, Export Semua (baris 188-191) hanya mengikuti tanggal, bukan status/analis. Teks bantu baris 538 hanya menyebut "queue dan ringkasan status".
- Dampak: Kepala bagian mengubah tanggal di bawah, tidak melihat angka di atas berubah (di luar layar), lalu membaca statistik yang keliru; file ekspor berisi data yang berbeda dari yang terlihat di tabel.
- Perbaikan: Pindahkan seluruh filter (tanggal, status, analis) ke satu toolbar sticky di bawah page header, tampilkan chip ringkas filter aktif ("Periode: 1-31 Okt · Analis: Budi"), dan beri label tombol yang eksplisit: "Ekspor SLIK (semua data)" vs "Ekspor sesuai filter", sertakan semua filter ke `bulkExport`.

### M-50. Kartu ringkasan status tampak dapat diklik, tetapi hanya ikon 28 px yang berupa tautan dan semuanya menuju halaman tanpa filter

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability, Accessibility, Touch ergonomics
- Lokasi: `client/src/pages/Dashboard.tsx` baris 233-266, 322-339; `client/src/index.css` baris 244-251
- Masalah: Kartu memakai `hover-lift` (naik 4 px dan border emas) seolah seluruh kartu interaktif, namun yang dapat diklik hanya tombol ikon `h-7 w-7` tanpa `aria-label`. Keempat kartu memiliki `to: "/assessments"` yang sama tanpa query status, sehingga "Ditolak" membuka daftar semua status.
- Dampak: Pengguna mengklik badan kartu dan tidak terjadi apa-apa; screen reader membaca empat tautan tanpa nama; setelah navigasi pengguna harus memfilter ulang secara manual.
- Perbaikan: Jadikan seluruh kartu sebuah `Link` dan teruskan status:
```tsx
<Link to={`/assessments?status=${key}`} className="block rounded-xl focus-visible:ring-[3px] focus-visible:ring-navy-900/40" aria-label={`${label}: ${value} pengajuan`}>
  <Card className="hover-lift ...">...</Card>
</Link>
```
dan baca `status` dari URL di AssessmentHistory.

### M-51. Campuran bahasa Inggris dan Indonesia pada label inti

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability & cognitive load, Visual consistency
- Lokasi: `client/src/pages/Dashboard.tsx` baris 297 ("Operational center"), 313 ("Refresh"), 543 ("Queue pengajuan"), 563 ("Export Semua"), 617 ("Customer", "Business", "Amount", "Status", "Score / classification", "Date"); `client/src/pages/Notifications.tsx` baris 47 ("Inbox"); `client/src/pages/AuditLog.tsx` baris 66 ("Audit Log"); `client/src/components/ui/dialog.tsx` baris 140 (sr-only "Close")
- Masalah: Header tabel queue sepenuhnya berbahasa Inggris, sementara tabel lain (Customers baris 140-145) berbahasa Indonesia.
- Dampak: Analis BPRS di daerah yang tidak fasih bahasa Inggris perlu menebak arti kolom; kesan produk tidak konsisten di depan regulator/komite.
- Perbaikan: Ganti menjadi `["Nasabah", "Usaha", "Plafon diajukan", "Status", "Skor / klasifikasi", "Tanggal", "Aksi"]`, "Pusat operasional", "Muat ulang", "Antrean pengajuan", "Ekspor semua", "Kotak masuk", "Log audit", dan sr-only "Tutup". Kolom terakhir sebaiknya diberi `<span className="sr-only">Aksi</span>` alih-alih string kosong.

### M-52. Pencarian Riwayat memicu query setiap ketikan dan mengganti daftar dengan spinner

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/AssessmentHistory.tsx` baris 15, 18-20, 53-54, 72-76
- Masalah: `search` langsung menjadi bagian query key tanpa debounce. Tiap karakter membuat key baru sehingga `isLoading` kembali `true` dan seluruh daftar diganti spinner (baris 72).
- Dampak: Saat mengetik "Siti Aminah", daftar berkedip 11 kali dan fokus visual hilang; server menerima 11 request.
- Perbaikan:
```ts
const debounced = useDebouncedValue(search, 300);
const { data, isLoading, isFetching } = trpc.applications.list.useQuery({ search: debounced, ... }, { placeholderData: keepPreviousData });
```
Tampilkan indikator kecil `isFetching` di dalam input, bukan spinner penuh.

### M-53. Kartu riwayat tidak responsif di layar sempit

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Responsiveness
- Lokasi: `client/src/pages/AssessmentHistory.tsx` baris 81-99
- Masalah: `flex justify-between items-start` tanpa `flex-col` di mobile; baris nama + badge (baris 84) tidak `flex-wrap`; tombol "Lihat Detail" (`whitespace-nowrap`) memakan ~110 px. Padding `p-6` menambah tekanan.
- Dampak: Di ponsel 360 px, nama nasabah panjang terpotong atau badge terdorong keluar, teks usaha menyempit menjadi 2-3 kata per baris.
- Perbaikan: `<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">`, `<div className="flex flex-wrap items-center gap-2">`, `CardContent className="p-4 sm:p-6"`, tombol `className="w-full sm:w-auto"`.

### M-54. Format uang tanpa locale di Riwayat

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Visual consistency, Usability
- Lokasi: `client/src/pages/AssessmentHistory.tsx` baris 90
- Masalah: `Number(app.requestedAmount).toLocaleString()` mengikuti locale browser. Di Chrome berbahasa Inggris hasilnya "Rp 50,000,000" sementara Dashboard baris 69 memakai `id-ID` ("Rp 50.000.000").
- Dampak: Pada aplikasi keuangan, pemisah koma vs titik dapat dibaca sebagai desimal dan menimbulkan salah tafsir nominal pembiayaan.
- Perbaikan: Pakai helper bersama `formatMoney` dari `lib/format.ts`: `new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)`.

### M-55. Input pencarian hanya mengandalkan placeholder, tanpa label

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Accessibility
- Lokasi: `client/src/pages/AssessmentHistory.tsx` baris 51-56; `client/src/pages/Customers.tsx` baris 93-98
- Masalah: Tidak ada `<Label>`, `aria-label`, atau `type="search"`. Placeholder hilang saat mengetik.
- Dampak: Screen reader membaca "edit text" tanpa konteks; pengguna lansia lupa kriteria pencarian setelah mulai mengetik.
- Perbaikan: `<Input type="search" aria-label="Cari nasabah, NIK, atau nama usaha" ... />` atau `<Label htmlFor="q" className="sr-only">`.

### M-56. Tombol "Coba lagi" di Master Nasabah justru memunculkan toast error

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/Customers.tsx` baris 47-69
- Masalah: `onClick` memanggil `refetch()` dan langsung `toast.error("Gagal memuat data nasabah")` tanpa menunggu hasil. State error juga mengganti seluruh halaman termasuk form pencarian; tombol berupa `<button>` polos berukuran teks `text-sm` (target sentuh ~20 px) tanpa gaya fokus.
- Dampak: Pengguna menekan "Coba lagi", data berhasil dimuat, tetapi tetap melihat toast "Gagal" sehingga ragu akan kebenaran data. Jika error disebabkan kata kunci tertentu, pengguna tidak bisa mengubah pencarian.
- Perbaikan: Hapus `toast.error` dari onClick, render error di dalam Card daftar (bukan full-page), dan pakai `<Button variant="outline" onClick={() => refetch()} disabled={isFetching}>Coba lagi</Button>`.

### M-57. Master Nasabah adalah jalan buntu: baris tidak bisa dibuka

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability & cognitive load
- Lokasi: `client/src/pages/Customers.tsx` baris 149-170
- Masalah: Tabel menampilkan "Total Pengajuan" dan "Skor Terakhir" tetapi tidak ada tautan ke pengajuan nasabah atau aksi "Ajukan pembiayaan baru untuk nasabah ini". Skor ditampilkan dengan satu warna badge untuk semua nilai (baris 161), padahal kelas `.score-excellent/good/warning/poor` sudah tersedia di `index.css` baris 203-217.
- Dampak: Analis yang menemukan nasabah repeat order harus menyalin nama lalu mencari ulang di Riwayat; skor 35 dan 90 tampak sama sehingga risiko tidak terbaca sekilas.
- Perbaikan: Jadikan nama nasabah `Link` ke `/assessments?search=${customerId}` dan tambahkan kolom Aksi "Pengajuan baru"; pakai kelas skor sesuai klasifikasi plus teks klasifikasi (bukan warna saja).

### M-58. Header Notifikasi bertabrakan di layar sempit dan tidak ada tandai-dibaca per item

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Responsiveness, Usability
- Lokasi: `client/src/pages/Notifications.tsx` baris 34-43, 100-109
- Masalah: Wrapper `flex items-end justify-between` tanpa `flex-wrap`/`flex-col`; judul `text-3xl` dan tombol "Tandai semua dibaca" (`whitespace-nowrap`) berebut lebar 360 px. Mengklik notifikasi tidak menandainya dibaca; satu-satunya opsi adalah "tandai semua". Hover `bg-slate-50` pada `Link` (baris 103) tidak menutupi padding `li`, sehingga area hover tidak sejajar dengan baris.
- Dampak: Di ponsel, deskripsi terjepit menjadi kolom sempit; badge "Baru" tetap muncul setelah pengguna membuka pengajuan sehingga indikator unread kehilangan arti.
- Perbaikan: `className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"`; panggil `markRead.mutate({ ids: [item.id] })` di `onClick` Link; pindahkan padding ke Link: `<li><Link className="block px-6 py-4 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">`.

### M-59. Audit Log menampilkan kode mentah dan ID pengguna, bukan nama

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability & cognitive load
- Lokasi: `client/src/pages/AuditLog.tsx` baris 126-127, 140
- Masalah: Kolom Aksi menampilkan `entry.action` ("create", "delete") padahal filter di baris 15-22 sudah memakai label Indonesia; kolom Tipe Entitas menampilkan "application"; kolom Aktor hanya "User #12".
- Dampak: Admin yang menginvestigasi siapa menghapus pengajuan harus mencocokkan ID secara manual ke daftar tim; audit untuk pemeriksa OJK/DPS menjadi sulit dibaca.
- Perbaikan: Petakan `actionOptions` ke label (`actionLabel[entry.action] ?? entry.action`), terjemahkan `entityType` ("application" → "Pengajuan"), dan sertakan `actorName` dari server (seperti Platform.tsx baris 118 sudah lakukan). Beri Badge berwarna per aksi dengan teks (hapus = merah).

### M-60. Kebijakan password tidak konsisten: admin dapat membuat password 6 karakter, padahal ganti password mewajibkan 8

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability, Interaction
- Lokasi: `client/src/pages/Team.tsx` baris 141, 147-148; `client/src/pages/Settings.tsx` baris 159-162, 463, 466
- Masalah: Form Tambah Anggota mengizinkan minimal 6 karakter; halaman Pengaturan menolak password baru di bawah 8.
- Dampak: Anggota baru mendapat password lemah dan kemudian bingung ketika tidak bisa memakai pola yang sama saat ganti password; inkonsistensi melemahkan kepercayaan pada keamanan sistem bank.
- Perbaikan: Satukan konstanta `MIN_PASSWORD_LENGTH = 8` di `shared/const.ts`, gunakan di kedua form dan teks bantu "Minimal 8 karakter".

### M-61. Label tidak terhubung ke kontrol (Select Peran, LabelWithInfo, Switch status)

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Accessibility
- Lokasi: `client/src/pages/Team.tsx` baris 174-178, 261-265; `client/src/pages/Settings.tsx` baris 22-38 (khususnya 25 dan 29), 319-333, 337-351, 355-368; `client/src/pages/Platform.tsx` baris 100
- Masalah: `<Label>Peran</Label>` tanpa `htmlFor` dan `SelectTrigger` tanpa `id`. `LabelWithInfo` merender `<Label>` tanpa `htmlFor`, sehingga input DSCR/LTV/Plafon tidak punya nama aksesibel. Ikon `Info` dijadikan `TooltipTrigger` padahal SVG tidak dapat difokus, sehingga penjelasan DSCR/LTV tidak dapat diakses dengan keyboard atau sentuhan. Switch status anggota tidak punya `aria-label`. SelectTrigger filter BPRS di Platform tanpa `aria-label`.
- Dampak: Pengguna screen reader mendengar "spin button 1.25" tanpa tahu itu DSCR; pengguna ponsel tidak dapat membuka tooltip definisi rasio risiko yang krusial.
- Perbaikan:
```tsx
function LabelWithInfo({ htmlFor, label, info }) {
  return (<div className="flex items-center gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    <Tooltip><TooltipTrigger asChild>
      <button type="button" className="inline-flex size-6 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-navy-900/40" aria-label={`Penjelasan ${label}`}><Info className="size-3.5" /></button>
    </TooltipTrigger><TooltipContent>{info}</TooltipContent></Tooltip>
  </div>);
}
// Team: <Label htmlFor="role">Peran</Label><SelectTrigger id="role">
// <Switch aria-label={`Status aktif ${entry.name}`} />
```
Lebih baik lagi untuk sentuhan: tampilkan `info` sebagai teks bantu di bawah input (pola `text-xs text-muted-foreground`), bukan tooltip.

### M-62. Switch status tetap aktif untuk akun admin sendiri dan semua switch terkunci saat satu diproses

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/Team.tsx` baris 244, 261-265
- Masalah: Tombol Reset 2FA sudah menyembunyikan diri untuk `entry.id === user?.id` (baris 244), tetapi Switch tidak. Server menolak dengan "Tidak dapat menonaktifkan akun sendiri" (server/routers.ts baris 409-411), sehingga admin hanya tahu setelah error. `disabled={setUserActive.isPending}` mengunci semua baris sekaligus tanpa indikator baris mana yang diproses.
- Dampak: Admin mencoba dan gagal, lalu melihat semua switch berkedip disabled tanpa tahu apa yang terjadi.
- Perbaikan: `disabled={entry.id === user?.id || (setUserActive.isPending && setUserActive.variables?.userId === entry.id)}` dan tampilkan teks "Akun Anda" pada baris admin sendiri.

### M-63. Navigasi utama: status aktif tidak bekerja di sub-rute, menu admin tersembunyi, tanpa aria-current

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability & cognitive load, Accessibility
- Lokasi: `client/src/components/AppHeader.tsx` baris 8-14, 32, 37, 52, 57; `client/src/components/ProfileMenu.tsx` baris 33-74
- Masalah: `active = location === href` sehingga di `/applications/123` tidak ada menu aktif. Halaman kerja admin (Kelola tim, Audit Log, Konsol SuperAdmin) dan Pengaturan hanya ada di dropdown profil, sedangkan nav utama memuat halaman marketing "Tentang SSCI". Tidak ada `aria-current="page"`. Di dropdown, "Profil & akun" dan "Pengaturan BPRS" menuju URL yang sama (`/pengaturan`), "Pengaturan BPRS" juga tampil untuk maker/checker yang tidak punya akses branding, dan "Nasabah" menduplikasi nav utama.
- Dampak: Admin baru tidak menemukan menu Kelola Tim; pengguna kehilangan orientasi saat berada di detail pengajuan; maker mengklik "Pengaturan BPRS" dan hanya mendapat form profil.
- Perbaikan: `const active = href === "/dashboard" ? location === href : location.startsWith(href.replace("/new", ""));` tambahkan `aria-current={active ? "page" : undefined}`; susun nav berbasis peran (admin: + "Tim", "Audit"); pindahkan "Tentang SSCI" ke dropdown/footer; di dropdown sisakan satu item "Pengaturan" dan tampilkan "Pengaturan BPRS" hanya untuk admin (dengan anchor `#branding`).

### M-64. Target sentuh di bawah 44x44 px pada kontrol utama

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Responsiveness & touch ergonomics
- Lokasi: `client/src/components/ui/button.tsx` baris 24-29 (default h-9 = 36 px, sm h-8 = 32 px, icon size-9 = 36 px); `client/src/components/ui/switch.tsx` baris 14 (`h-[1.15rem] w-8`, kira-kira 18x32 px); `client/src/components/AppHeader.tsx` baris 57 (nav mobile `px-3 py-1.5 text-xs`, kira-kira 28 px); `client/src/components/NotificationBell.tsx` baris 17; `client/src/pages/Dashboard.tsx` baris 329, 663-665, 674-676; `client/src/pages/AuditLog.tsx` baris 151-168
- Masalah: Hampir semua aksi memakai ukuran di bawah rekomendasi 44 px (WCAG 2.5.5 / pedoman Apple/Material 44-48 px).
- Dampak: Analis lapangan yang memakai ponsel/tablet sering salah ketuk, terutama pada ikon hapus berdampingan dan switch nonaktifkan anggota.
- Perbaikan: Di `button.tsx` tambahkan responsive size: `default: "h-11 px-4 sm:h-9"`, `sm: "h-10 px-3 sm:h-8"`, `icon: "size-11 sm:size-9"`. Switch: bungkus dengan area `p-3 -m-3` atau `h-6 w-11`. Nav mobile: `py-2.5 text-sm min-h-11`.

### M-65. Trigger menu profil tanpa nama aksesibel di ponsel

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Accessibility
- Lokasi: `client/src/components/ProfileMenu.tsx` baris 21-25
- Masalah: Di bawah 640 px, `<span className="hidden sm:inline">` hilang sehingga tombol hanya berisi dua ikon tanpa `aria-label`.
- Dampak: Pengguna screen reader di ponsel mendengar "button" tanpa keterangan dan tidak tahu itu menu akun/keluar.
- Perbaikan: `<Button variant="ghost" className="gap-2 px-2" aria-label={`Menu akun ${user?.name ?? ""}`}>` dan tambahkan `aria-hidden` pada ikon. Untuk lonceng, sertakan jumlah: `aria-label={count ? `Notifikasi, ${count} belum dibaca` : "Notifikasi"}`.

### M-66. Kontras rendah pada eyebrow emas, heading seksi, fokus ring, dan teks sekunder

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Visual consistency, Accessibility
- Lokasi: `client/src/pages/Dashboard.tsx` baris 297 (`text-gold-500` #d99e2b pada ivory, kira-kira 2,2:1), 320/345/364/433 (`text-slate-400` #94a3b8 pada #f7f8fb, kira-kira 2,5:1), 632, 649; `client/src/components/AppHeader.tsx` baris 87; `client/src/pages/AssessmentHistory.tsx` baris 92 (`text-gray-400`); `client/src/pages/Notifications.tsx` baris 96; `client/src/index.css` baris 88 dan 134 (`--ring: #efb84b` dengan `outline-ring/50`); `client/src/components/ui/button.tsx` baris 8 (`focus-visible:ring-ring/50`); `client/src/components/ui/input.tsx` baris 58 (`ring-gold-400/25`)
- Masalah: Teks informatif (heading seksi, tanggal, jenis usaha) di bawah rasio 4,5:1. Fokus ring emas 50% di atas putih/ivory sekitar 1,4:1, gagal syarat non-text contrast 3:1 (WCAG 1.4.11 / 2.4.7).
- Dampak: Pengguna di ruang kantor terang atau dengan penglihatan menurun tidak dapat membaca label seksi dan tanggal pengajuan; pengguna keyboard kehilangan posisi fokus.
- Perbaikan: Eyebrow `text-[#8a5a0b]` (token baru `--color-gold-700`), heading seksi dan teks sekunder `text-slate-600`/`text-muted-foreground`, tanggal minimal `text-slate-500`. Fokus: `--ring: #14213d` pada light mode (tetap emas untuk header gelap) dan `focus-visible:ring-2 focus-visible:ring-offset-2`.

### M-67. Zoom dinonaktifkan di viewport

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Accessibility, Responsiveness
- Lokasi: `client/index.html` baris 6-8
- Masalah: `maximum-scale=1` mencegah pinch-zoom di sebagian browser (Android Chrome, beberapa WebView).
- Dampak: Pengguna dengan penglihatan rendah tidak dapat memperbesar tabel angka pembiayaan; melanggar WCAG 1.4.4.
- Perbaikan: `<meta name="viewport" content="width=device-width, initial-scale=1" />`. Masalah auto-zoom iOS pada input sudah ditangani `text-base md:text-sm` di `input.tsx` baris 57.

### M-68. Judul dokumen sama di semua halaman dan tidak ada skip link

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Accessibility, Usability
- Lokasi: `client/index.html` baris 9; `client/src/App.tsx` baris 26-48; `client/src/components/AppHeader.tsx` baris 23-66
- Masalah: Tidak ada `document.title` per rute (hasil grep kosong), semua tab bernama "SSCI - Sistem Pendukung Penilaian...". Tidak ada tautan "Lewati ke konten utama" dan elemen `<main>` di halaman tidak memiliki `id`, padahal header sticky berisi 5-8 tautan sebelum konten.
- Dampak: Analis yang membuka beberapa pengajuan di tab berbeda tidak bisa membedakan tab; pengguna keyboard harus menekan Tab berkali-kali di setiap halaman; screen reader tidak mengumumkan perpindahan halaman di SPA.
- Perbaikan: Hook `usePageTitle("Dashboard operasional")` yang menyetel `document.title = \`${t} · SSCI\``; di AppHeader tambahkan sebagai elemen pertama:
```tsx
<a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-full focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-navy-900">Lewati ke konten utama</a>
```
dan `<main id="konten" tabIndex={-1}>` di setiap halaman (idealnya via `PageShell`).

### M-69. Sesi berakhir tanpa peringatan yang bisa ditindaklanjuti dan berisiko menghilangkan isian form

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/App.tsx` baris 51; `client/src/hooks/useSessionTimeout.ts` baris 38-50; `client/src/main.tsx` baris 13-22
- Masalah: Peringatan berupa `toast.warning` biasa tanpa tombol "Tetap masuk"; saat timeout, `toast.error` dipanggil lalu langsung `window.location.href` sehingga toast tidak pernah terlihat. Redirect 401 global di main.tsx juga hard-redirect tanpa menyimpan halaman asal (`getLoginUrl` tidak membawa parameter kembali).
- Dampak: Analis yang sedang membaca dokumen nasabah 15 menit (tanpa menggerakkan mouse) kehilangan isian penilaian dan setelah login mendarat di halaman awal, bukan di pengajuan yang sedang dikerjakan.
- Perbaikan: Ganti peringatan dengan `AlertDialog` hitung mundur ("Sesi akan berakhir dalam 60 detik" + tombol "Tetap masuk" yang memanggil `auth.me.refetch()`), simpan `sessionStorage.setItem("returnTo", location.pathname)` sebelum redirect, dan tampilkan alasan di halaman login via query `?alasan=sesi-habis`.


## 6. Minor (Visual Polish / Quick Wins)

### N-01. m1. Format angka tidak konsisten: `toLocaleString()` tanpa locale

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Visual consistency, Usability
- Lokasi: `ApplicationDetail.tsx` L801, L802, L804, L805 (tanpa `"id-ID"`) vs L803, L814-816 (dengan `"id-ID"`); L490, L494, L498-502, L507 (`toFixed` memakai titik desimal, "target 1.25")
- Masalah: Di browser berlocale en-US, pendapatan tampil "15,000,000" sementara angsuran "15.000.000". Pembaca Indonesia membaca koma sebagai desimal.
- Dampak: Risiko salah baca nominal oleh analis.
- Perbaikan: Gunakan satu helper `const rp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);` dan `n.toLocaleString("id-ID", { maximumFractionDigits: 2 })` untuk rasio. Jaga juga pembagian `financingTenor` 0 di L494.

### N-02. m2. Emoji dan simbol Unicode di UI

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Visual consistency
- Lokasi: `ApplicationDetail.tsx` L532 ("✓", "⚠"), L583 ("📄")
- Masalah: Emoji dirender berbeda per perangkat dan tidak konsisten dengan ikon lucide di bagian lain.
- Perbaikan: Ganti dengan `<CheckCircle className="h-3.5 w-3.5 text-emerald-600" aria-hidden />`, `<AlertCircle ... />`, dan `<FileText ... />`.

### N-03. m3. Baris info PDF lengkap tidak membungkus di mobile

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Responsiveness
- Lokasi: `ApplicationDetail.tsx` L581-588
- Masalah: `flex items-center justify-between` tanpa `flex-wrap`; teks panjang dan tombol `h-7 text-xs` berebut ruang di 360px, tombol terjepit dan teks menjadi kolom sempit. Tombol ini juga duplikat "Unduh Laporan" di header.
- Perbaikan: `className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"`, tombol ukuran default; atau hapus tombol duplikat dan cukup teks informasi.

### N-04. m4. Judul nasabah dan chip tiket tidak membungkus; teks panjang tanpa pemenggalan

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Responsiveness
- Lokasi: `ApplicationDetail.tsx` L312-316 (`flex items-center gap-2` tanpa wrap), L405-414 (judul kartu `text-2xl` dan badge tanpa wrap), L640 (nama file), L775 (email), L776 (alamat)
- Masalah: Nama nasabah panjang (contoh "Hj. Siti Nurhaliza binti Abdurrahman") dengan chip tiket membuat chip terjepit menjadi dua baris; nama file dan email tanpa spasi bisa melampaui lebar kartu di 360px.
- Perbaikan: `className="flex flex-wrap items-center gap-2"` pada L312 dan `whitespace-nowrap` pada chip; `flex flex-wrap gap-3` pada L405; `break-all` pada nama file dan `break-words` pada email/alamat.

### N-05. m5. Header Asisten AI tidak membungkus di mobile

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Responsiveness
- Lokasi: `AiAssessmentAssistant.tsx` L78-87
- Masalah: Ikon, judul plus deskripsi panjang, dan tombol "Jalankan semua" `shrink-0 ml-auto` berada dalam satu baris flex tanpa wrap; di 360px deskripsi terhimpit menjadi kolom sangat sempit.
- Perbaikan: `className="flex flex-wrap items-start gap-3"` dan tombol `className="w-full sm:ml-auto sm:w-auto"`.

### N-06. m6. Hasil async tanpa live region

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Accessibility
- Lokasi: `AiAssessmentAssistant.tsx` L38, L106-128; `HumanReview.tsx` L44-46; `BprsWorkbookPanel.tsx` L304, L335-340, L442-457; `ApplicationDetail.tsx` L762 (NIK terungkap)
- Masalah: Hasil pemeriksaan AI, sensitivitas, penjelasan skor, dan hasil baca rekening koran muncul tanpa pengumuman; pesan error tanpa `role="alert"`.
- Perbaikan: Bungkus area hasil dengan `<div aria-live="polite" aria-busy={running}>`, dan pesan error `<p role="alert" ...>`.

### N-07. m7. Tombol kustom WorkflowStatus dan tombol NIK tanpa gaya fokus

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Accessibility & keyboard
- Lokasi: `WorkflowStatus.tsx` L42, L61; `ApplicationDetail.tsx` L764-771
- Masalah: `<button>` polos tanpa `focus-visible:` ring; hanya hover underline. Tombol "Tampilkan (tercatat di audit)" berukuran teks `text-xs`.
- Perbaikan: Tambahkan `rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50` dan `min-h-11` (atau `py-2`) pada tombol daftar kekurangan; gunakan `<Button variant="link" size="sm">` untuk NIK.

### N-08. m8. Stepper tahap tanpa semantik dan navigasi tab tanpa fokus/gulir

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Accessibility, Usability
- Lokasi: `WorkflowStatus.tsx` L26-39, L42, L61; `ApplicationDetail.tsx` L57-60
- Masalah: Tahap aktif hanya ditandai warna latar; tidak ada `aria-current="step"`. Klik aksi berikutnya mengganti tab tetapi tidak menggulir atau memindah fokus ke konten, sehingga di mobile terasa tidak terjadi apa-apa. Saat query belum selesai komponen return `null` (L18) dan menimbulkan pergeseran layout.
- Perbaikan: `<li aria-current={current ? "step" : undefined}>` plus `<span className="sr-only">{done ? "selesai" : current ? "tahap saat ini" : "belum"}</span>`; di `chooseTab` panggil `document.getElementById("detail-tabs")?.scrollIntoView({ behavior: "smooth" })`; tampilkan skeleton `h-28` saat loading.

### N-09. m9. Bilah progres skor dan cincin skor tanpa informasi aksesibel

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Accessibility
- Lokasi: `ApplicationDetail.tsx` L434-436, L1031-1045; `WorkflowStatus.tsx` L54-56
- Perbaikan: `<div role="progressbar" aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={item.max} aria-label={item.label}>`; pada SVG `aria-hidden="true"` karena angka sudah tampil sebagai teks.

### N-10. m10. Riwayat menampilkan kode teknis dan ID pengguna

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability
- Lokasi: `ApplicationDetail.tsx` L912 (`User #{comment.authorUserId}`), L940 (`activity.action` mentah seperti `NIK_REVEALED`, `CUSTOMER_REQUEST_RESOLVED` dari `server/routers.ts` L562, L1022)
- Masalah: Komite tidak tahu siapa penulis catatan dan membaca kode huruf kapital berbahasa Inggris.
- Perbaikan: Kirim nama penulis dari server, dan peta label: `const ACTION_LABELS: Record<string,string> = { NIK_REVEALED: "NIK ditampilkan", CUSTOMER_REQUEST_RESOLVED: "Permintaan nasabah ditanggapi", ... }` dengan fallback ke kode.

### N-11. m11. Hierarki informasi Ringkasan terlalu padat untuk checker

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Usability (cognitive load), struktur heading
- Lokasi: `ApplicationDetail.tsx` L402-606 (satu kartu berisi skor, kekuatan, risiko, pemeriksaan data, narasi, plafon, kepatuhan KPB, metadata), lalu L617-621 (Asisten AI); heading: `h1` L313 lalu `CardTitle` (div) dan `h3` L881
- Masalah: Checker harus menggulir panjang sebelum melihat semua faktor keputusan; tidak ada struktur heading `h2`, sehingga navigasi heading pembaca layar melompat dari h1 ke h3.
- Perbaikan: Jadikan `CardTitle` `asChild` dengan `<h2>`; pecah kartu menjadi bagian berjudul dan bungkus bagian sekunder (Kesesuaian KPB, metadata, narasi) dengan `Collapsible`/`Accordion` terbuka default hanya untuk skor, risiko, dan syarat persetujuan.

### N-12. m12. Detail kecil interaksi lainnya

- Area: A (Detail pengajuan dan panel kerja)
- Dimensi: Interaction states
- Lokasi: `DataChecks.tsx` L61-64 (tombol nilai nonaktif saat `check.isLoading` tanpa penjelasan, teks tetap "Lakukan Penilaian SSCI" saat proses AI berjalan lama; jika `ruleCheck` error, `blocking` kosong dan penilaian jalan tanpa pemeriksaan), L77-78 (dialog menampilkan juga temuan "rendah" yang tidak memblokir), L89 (tanpa penghitung karakter); `ApplicationDetail.tsx` L744-746 (foto gagal tanpa tombol coba ulang); `HumanReview.tsx` L39, L45 (uji sensitivitas tanpa tombol ulang saat error); `BprsWorkbookPanel.tsx` L577-602 (tab Rincian poin kosong tanpa pesan saat `score` null), L210-213 (ekspor saat dirty hanya toast; lebih baik tawarkan "Simpan dan unduh"), L532 ("Agunan % (0-1)" memaksa analis menulis 0.8 untuk 80%), L421-437 (input file native tak bergaya, berbeda dari pola unggah lain)
- Perbaikan: Teks pending "Menilai... (sekitar 30 detik)"; saat `check.isError` tampilkan dialog peringatan bahwa pemeriksaan otomatis gagal; urutkan temuan tinggi/sedang di atas dan lipat yang rendah; tombol "Analisis ulang" untuk foto gagal; tombol "Coba lagi" memanggil `query.refetch()`; pesan "Simpan isian untuk melihat rincian poin"; input persen 0 sampai 100 dikonversi ke 0-1 saat simpan; gunakan pola tombol unggah yang sama dengan M2.

### N-13. Palet warna hard-coded hex dan campuran gray/slate/navy

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Visual consistency
- Lokasi: `client/src/pages/NewApplication.tsx:445`, `:447`, `:451`, `:464`, `:495`, `:503`, `:547`, `:607-610`, `:623`, `:654`, `:668`, `:689`, `:857`; `client/src/components/DailySalesCalculator.tsx:26`, `:73`; `client/src/components/AiDocumentReader.tsx:122`; `client/src/components/CustomerTracking.tsx:28`; `client/src/components/AuthShell.tsx:40`, `:50`; `client/src/pages/Home.tsx:26`, `:76`, `:102`, `:113`, `:116`, `:158`; `client/src/pages/AboutSSCI.tsx:67-68`, `:105-108`, `:156-157`, `:217`; `client/src/pages/TrackApplication.tsx:154`, `:164-232`, `:247`
- Masalah: `#cfd8e8`, `#eef2f8`, `#e1e8f4`, `#60708c`, `#71809a`, `#8e9cb4`, `#b9c4d8` diulang puluhan kali. Satu kartu memakai `text-gray-900` di atas `bg-slate-50` dengan teks `text-navy-900`; halaman pelacakan mencampur `gray-500/800`, `slate-400`, dan banner `blue-50/blue-900` yang tidak ada di palet navy/emas.
- Dampak: Nuansa biru dan abu sedikit berbeda antar kartu sehingga produk terasa kurang rapi; perubahan tema harus mengedit banyak file.
- Perbaikan: Definisikan token di `index.css` lalu pakai kelas semantik.
```css
@theme { --color-info-bg: #eef2f8; --color-info-border: #cfd8e8; --color-info-strong: #e1e8f4; --color-ink-muted: #60708c; }
```
Lalu `className="border-info-border bg-info-bg text-navy-900"`; ganti `bg-blue-50 border-blue-200 text-blue-900` di `TrackApplication.tsx:247` dengan token yang sama.

### N-14. Warna pilar tidak konsisten antar halaman dan dua pilar tidak dapat dibedakan

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Visual consistency
- Lokasi: `client/src/pages/AboutSSCI.tsx:66-70`, `:104-108`, `:255-262`; `client/src/pages/Home.tsx:23-27`
- Masalah: Di Beranda pilar berwarna royal/emas/abu-biru, di Tentang SSCI emerald/navy/navy. Pilar Syariah dan Legalitas memakai kelas identik (`bg-[#eef2f8]`, `text-royal-600`), dan segmen bar SCI serta LCI sama-sama `bg-navy-900` tanpa pemisah.
- Dampak: Pengguna tidak bisa membedakan SCI dan LCI di bar proporsi; asosiasi warna pilar yang dipelajari di Beranda tidak berlaku di halaman metodologi.
- Perbaikan: Satukan konstanta pilar di `@shared` dengan warna tetap (misal SFI `bg-royal-600`, SCI `bg-gold-400`, LCI `bg-[#7d8fae]` sebagai token) dan beri `divide-x divide-white/40` pada bar.

### N-15. CurrencyField tanpa prefiks Rp dan kursor melompat saat mengedit di tengah angka

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (format mata uang)
- Lokasi: `client/src/pages/NewApplication.tsx:119-137`
- Masalah: Nilai diformat ulang setiap ketikan sehingga posisi kursor pindah ke akhir ketika pengguna menyisipkan digit di tengah. Label memuat "(Rp)" tetapi tidak ada adornment visual; tidak ada `aria-describedby` yang mengeja nilai.
- Dampak: Mengoreksi "15.000.000" menjadi "25.000.000" membutuhkan hapus total; angka panjang mudah salah baca.
- Perbaikan:
```tsx
<div className="relative">
  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">Rp</span>
  <Input className="pl-10 tabular-nums" ... />
</div>
```
Pertahankan posisi kursor dengan menghitung jumlah digit di kiri `selectionStart` lalu `setSelectionRange` setelah render.

### N-16. Stepper tidak dapat diklik, `aria-label` menimpa isi, dan "Kembali" tidak menggulir ke atas

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability (step navigation), Accessibility
- Lokasi: `client/src/pages/NewApplication.tsx:624`, `:728`
- Masalah: `<li aria-label={label}>` menimpa angka dan status langkah, sehingga pembaca layar tidak tahu langkah mana selesai. Langkah selesai tidak dapat diklik untuk kembali. Tombol "Kembali" memanggil `setStep(s => s - 1)` tanpa `scrollTo`, berbeda dengan `next()`.
- Dampak: Analis di langkah 4 harus menekan "Kembali" tiga kali untuk memperbaiki NIK, dan tiap kali tertinggal di bagian bawah halaman.
- Perbaikan:
```tsx
<li aria-current={i === step ? "step" : undefined}>
  <button type="button" disabled={i > step} onClick={() => goTo(i)} className="... focus-visible:ring-[3px] focus-visible:ring-gold-400/50">
    <span className="sr-only">{label}{i < step ? " (selesai)" : ""}</span>...
```
`const goTo = (i: number) => { setStep(i); window.scrollTo({ top: 0, behavior: "smooth" }); };` dan pakai juga untuk "Kembali" dan "Ubah" (baris 866).

### N-17. Panel hasil hitung dan hasil AI tidak diumumkan ke teknologi bantu

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Accessibility (live regions)
- Lokasi: `client/src/pages/NewApplication.tsx:451`, `:513`; `client/src/components/DailySalesCalculator.tsx:42-59`; `client/src/components/AiDocumentReader.tsx:118`; `client/src/components/DailySalesCalculator.tsx:73`
- Masalah: Pratinjau piutang Murabahah, rasio RBH/PBH, estimasi omzet, dan hasil baca AI muncul tanpa `aria-live`/`role="status"`.
- Dampak: Pengguna pembaca layar tidak tahu bahwa perhitungan sudah selesai atau ada perbedaan data.
- Perbaikan: Tambahkan `role="status" aria-live="polite"` pada kontainer panel tersebut dan `role="alert"` pada kotak `mismatches` (`AiDocumentReader.tsx:140`).

### N-18. Tombol pembuka kalkulator omzet tanpa `aria-expanded` dan menambah klik yang tidak perlu

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Accessibility, Usability
- Lokasi: `client/src/components/DailySalesCalculator.tsx:12`, `:24`; `client/src/pages/NewApplication.tsx:713`
- Masalah: Disclosure tidak memiliki `aria-expanded`/`aria-controls`. Selain itu kalkulator dirender tertutup (`useState(false)`) padahal pengguna sudah memilih "Dari omzet harian" di `FinanceSourceChooser`, lalu masih ditanya "Nasabah tidak punya laporan keuangan?". Tombol "Pakai angka ini" tidak memberi konfirmasi setelah diklik.
- Dampak: Satu klik ekstra dan pertanyaan berulang; tidak ada kepastian bahwa angka sudah masuk ke kolom pendapatan.
- Perbaikan: Terima prop `defaultOpen` dan beri `aria-expanded={open} aria-controls="calc-panel"`; setelah apply panggil `toast.success("Pendapatan dan pengeluaran diisi dari estimasi omzet")` atau ubah label tombol menjadi "Sudah dipakai" dengan ikon centang seperti `AiDocumentReader.tsx:132`.

### N-19. Tombol "Pakai" usulan AI menimpa nilai tanpa memperlihatkan nilai lama

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability
- Lokasi: `client/src/components/AiDocumentReader.tsx:84-95`, `:126-135`
- Masalah: Daftar usulan hanya menampilkan nilai AI; nilai yang sudah diisi analis tidak ditampilkan berdampingan, dan tidak ada aksi batal setelah "Dipakai".
- Dampak: Analis menimpa angka yang sudah diverifikasi dengan angka OCR tanpa sadar seberapa besar perbedaannya.
- Perbaikan: Tampilkan `Saat ini: {rp(toNumber(values[s.key]) ?? 0)}` di bawah nilai AI dan simpan nilai lama agar tombol "Batalkan" dapat mengembalikan.

### N-20. Proses OCR KTP tidak konsisten dengan pembaca dokumen AI dan input file tidak dibersihkan

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/NewApplication.tsx:173`, `:689`; bandingkan `client/src/components/AiDocumentReader.tsx:112`
- Masalah: Tombol "Proses OCR KTP" aktif walau belum ada file (hanya menampilkan error setelah diklik), berbeda dengan "Baca dokumen" yang `disabled={!file}`. Setelah sukses, `setKtpFile(null)` tetapi elemen input masih menampilkan nama file lama karena tidak dikosongkan.
- Dampak: Pola interaksi berbeda di dua alat yang mirip, dan pengguna bingung apakah file masih terpilih.
- Perbaikan: `disabled={extractKtpMutation.isPending || !ktpFile}`, simpan ref input lalu `ktpInputRef.current.value = ""` di `onSuccess`.

### N-21. Kolom isian publik tanpa autocomplete, inputMode, dan penghitung karakter

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability, Responsiveness (keyboard virtual)
- Lokasi: `client/src/components/CustomerTracking.tsx:136-150`; `client/src/pages/TrackApplication.tsx:112-118`
- Masalah: Tombol "Kirim permintaan" nonaktif sampai 20 karakter, tetapi tidak ada penghitung sehingga pengguna tidak tahu kenapa tombol mati. Telepon tanpa `inputMode="tel"` dan `autoComplete="tel"`. Nomor tiket tanpa `autoCapitalize="characters"`, `autoCorrect="off"`, `spellCheck={false}`.
- Dampak: Nasabah di ponsel menulis "Data gaji salah" (15 karakter) dan tombol tidak bisa ditekan tanpa penjelasan; autokoreksi mengubah "SSCI-00001" menjadi kata lain.
- Perbaikan:
```tsx
<p className="text-xs text-muted-foreground" aria-live="polite">{message.trim().length}/20 karakter minimal</p>
<Input id="request-phone" type="tel" inputMode="tel" autoComplete="tel" ... />
<Input id="ticket" autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off" ... />
```

### N-22. Detail pengajuan di halaman pelacakan memakai teks 12px dan grid 2 kolom kaku

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Responsiveness, Visual consistency
- Lokasi: `client/src/pages/TrackApplication.tsx:164-181`, `:93`, `:241-258`
- Masalah: Informasi utama (nama, plafon, akad) berada di `text-xs` dalam `grid-cols-2`. Banner status juga `text-xs`. Judul `text-3xl` sepanjang 5 kata memakan 3 baris di 360px.
- Dampak: Nasabah usia lanjut di ponsel harus memperbesar layar untuk membaca plafon dan status, padahal itu informasi terpenting halaman ini.
- Perbaikan: `grid grid-cols-1 gap-3 text-sm sm:grid-cols-2` untuk detail, `text-sm` untuk banner status, dan `text-2xl sm:text-3xl` untuk judul.

### N-23. Tautan "Lacak Pengajuan" tersembunyi di menu ponsel padahal pengguna utamanya nasabah ber-ponsel

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Usability, Responsiveness
- Lokasi: `client/src/pages/Home.tsx:76-81`, `:83-85`, `:103-106`
- Masalah: Di bawah `md` satu-satunya akses ke `/track` ada di dalam hamburger, dan hero hanya menawarkan "Daftar sebagai BPRS" dan "Masuk ke akun".
- Dampak: Nasabah yang diberi tautan beranda oleh AO tidak menemukan cara melacak berkas dan bisa salah masuk ke halaman login.
- Perbaikan: Tambahkan CTA ketiga di hero dan ikon di header ponsel.
```tsx
<Button asChild size="lg" variant="ghost" className="h-12 rounded-full text-gold-300 hover:bg-white/10"><Link href="/track"><FileSearch className="mr-2 h-4 w-4" />Lacak pengajuan saya</Link></Button>
<Button asChild variant="ghost" size="icon" className="size-11 md:hidden" aria-label="Lacak pengajuan"><Link href="/track"><FileSearch /></Link></Button>
```

### N-24. Header Beranda tidak benar-benar lengket karena leluhur `overflow-hidden`

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Responsiveness
- Lokasi: `client/src/pages/Home.tsx:70-71`
- Masalah: Wrapper `div` memakai `overflow-hidden`, yang menjadikannya kontainer scroll sehingga `sticky top-0` pada header tidak menempel terhadap viewport di beberapa browser.
- Dampak: Navigasi hilang saat menggulir halaman landing yang panjang.
- Perbaikan: Ganti `overflow-hidden` menjadi `overflow-x-clip` pada wrapper baris 70.

### N-25. CTA "Mulai Penilaian SSCI" berupa tombol di dalam tautan, dan spinner tanpa label

- Area: B (Formulir, autentikasi, halaman publik)
- Dimensi: Accessibility & keyboard
- Lokasi: `client/src/pages/AboutSSCI.tsx:397-402`; `client/src/pages/Home.tsx:58`
- Masalah: `<Link><Button>` menghasilkan `<a><button>` (elemen interaktif bersarang) sehingga ada dua tab stop dan semantik ganda. Spinner pemuatan Beranda tidak memiliki `role="status"` atau teks tersembunyi.
- Dampak: Pengguna keyboard menekan Tab dua kali untuk satu aksi; pembaca layar tidak mengumumkan bahwa halaman sedang dimuat.
- Perbaikan:
```tsx
<Button asChild size="lg" className="gap-2 px-8"><Link href="/applications/new">Mulai Penilaian SSCI<ChevronRight className="h-5 w-5" /></Link></Button>
<div role="status" aria-label="Memuat"><div className="h-8 w-8 animate-spin ..." /><span className="sr-only">Memuat...</span></div>
```

### N-26. m-01. Tombol Refresh tidak menunjukkan proses saat refetch

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Interaction & system states
- Lokasi: `client/src/pages/Dashboard.tsx` baris 96, 102-108, 311-314
- Masalah: Spinner dan `disabled` hanya mengikuti `isLoading` (load pertama). Klik Refresh berikutnya tidak memberi umpan balik dan dapat diklik berulang.
- Dampak: Pengguna mengira tombol tidak bekerja dan mengklik berkali-kali.
- Perbaikan: `const isRefreshing = queueQuery.isFetching || statsQuery.isFetching;` pakai untuk `disabled` dan `animate-spin`.

### N-27. m-02. Rentang tanggal tidak divalidasi

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability
- Lokasi: `client/src/pages/Dashboard.tsx` baris 507-523
- Masalah: "Dari tanggal" boleh lebih besar dari "Sampai tanggal"; hasilnya hanya "Tidak ada pengajuan pada filter ini."
- Dampak: Pengguna mengira tidak ada data di periode tersebut.
- Perbaikan: `max={toDate || undefined}` pada fromDate dan `min={fromDate || undefined}` pada toDate.

### N-28. m-03. Tabel queue mobile: aksi "Detail" berada di ujung kanan setelah scroll horizontal 820 px

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Responsiveness
- Lokasi: `client/src/pages/Dashboard.tsx` baris 613-614, 629, 655-659
- Masalah: Satu-satunya jalan ke detail ada di kolom terakhir tabel `min-w-[820px]`.
- Dampak: Di ponsel pengguna harus menggeser tabel ke kanan untuk setiap baris.
- Perbaikan: Jadikan nama nasabah tautan (`<Link className="font-semibold text-navy-900 hover:underline">`) dan buat kolom pertama sticky: `className="sticky left-0 bg-card"`; atau render daftar kartu `md:hidden`.

### N-29. m-04. Badge status tidak konsisten antarhalaman

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Visual consistency
- Lokasi: `client/src/pages/Dashboard.tsx` baris 61-67, 636-638; `client/src/pages/AssessmentHistory.tsx` baris 22-31; `client/src/pages/Platform.tsx` baris 59-61
- Masalah: Di Dashboard "Disetujui" = badge navy dan "Menunggu penilaian/keputusan/Dibatalkan" berwarna sama; di Riwayat "Disetujui" = hijau dan "Menunggu keputusan" = biru muda. Platform menggabungkan dua status berbeda menjadi "Menunggu / ditangguhkan".
- Dampak: Pengguna harus mempelajari ulang arti warna di tiap halaman; superadmin tidak bisa membedakan BPRS baru mendaftar dengan BPRS yang ditangguhkan.
- Perbaikan: Buat komponen `<StatusBadge status=... />` tunggal di `components/StatusBadge.tsx` dengan peta warna + ikon (Clock, FileText, CheckCircle2, XCircle) dan pakai di semua halaman; bedakan status organisasi "Menunggu verifikasi" vs "Ditangguhkan" bila data mendukung.

### N-30. m-05. Opsi filter "Dibatalkan" hilang di Riwayat

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability
- Lokasi: `client/src/pages/AssessmentHistory.tsx` baris 16, 58-66
- Masalah: Tipe status mencakup `cancelled` dan badge-nya ada (baris 28), tetapi `SelectItem` tidak menyediakannya.
- Dampak: Pengajuan yang dibatalkan tidak dapat difilter secara khusus.
- Perbaikan: Tambahkan `<SelectItem value="cancelled">Dibatalkan</SelectItem>`, idealnya dari peta `statusLabels` bersama.

### N-31. m-06. Struktur heading tidak berurutan dan CardTitle bukan heading

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Accessibility
- Lokasi: `client/src/components/ui/card.tsx` baris 31-38; `client/src/pages/AssessmentHistory.tsx` baris 39, 85
- Masalah: `CardTitle` dirender sebagai `<div>`, sehingga judul seksi seperti "Queue pengajuan", "Daftar Anggota Tim", "Kebijakan Kredit" tidak muncul di daftar heading. Riwayat melompat dari `h1` ke `h3`.
- Dampak: Pengguna screen reader tidak dapat melompat antarseksi dengan navigasi heading.
- Perbaikan: Dukung `asChild` atau prop `as` di CardTitle (`<CardTitle as="h2">`), dan ubah baris 85 Riwayat menjadi `h2`.

### N-32. m-07. Palet warna campur aduk: gray vs slate vs token, serta hex hard-coded

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Visual consistency
- Lokasi: `client/src/pages/AssessmentHistory.tsx` baris 25, 40, 50, 88, 89, 92, 105 (`text-gray-*`, `bg-[#e1e8f4]`); `client/src/pages/Dashboard.tsx` baris 247, 451, 460, 483, 492; `client/src/pages/Customers.tsx` baris 161; `client/src/pages/Team.tsx` baris 232; `client/src/components/AppHeader.tsx` baris 37, 57 (`text-[#b9c4d8]`); `client/src/pages/NotFound.tsx` baris 14; `client/src/index.css` baris 208, 212
- Masalah: Halaman lain memakai `slate-*` dan `muted-foreground`; Riwayat memakai `gray-*`. Warna grafik Recharts ditulis hex langsung, bukan `var(--chart-1)`.
- Dampak: Abu-abu sedikit berbeda antarhalaman membuat UI terasa tidak rapi; perubahan brand BPRS atau dark mode tidak akan terpropagasi ke grafik.
- Perbaikan: Ganti `gray-*` dengan `text-muted-foreground`/`slate-*`; tambahkan token `--color-navy-50: #e1e8f4` dan `--color-navy-100: #eef2f8`, `--color-navy-200: #b9c4d8`; grafik `stroke="var(--chart-1)" fill="var(--chart-2)"`.

### N-33. m-08. Dark mode tidak dapat dijangkau, tetapi token dan kelas `dark:` tetap dipelihara

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Visual consistency
- Lokasi: `client/src/App.tsx` baris 54; `client/src/contexts/ThemeContext.tsx` baris 22, 45-49; `client/src/index.css` baris 97-130; `client/src/components/ui/tabs.tsx` baris 43
- Masalah: `ThemeProvider` dipasang dengan `switchable` default `false` dan tidak ada toggle selain di `ComponentShowcase`. Seluruh halaman dalam cakupan memakai warna light hard-coded (`bg-ivory`, `bg-white`, `text-navy-900`, `bg-slate-50`, `text-slate-900`) dan tidak satu pun memiliki kelas `dark:`. Di `tabs.tsx` baris 43 ada kelas dark yang saling bertentangan (`dark:data-[state=active]:bg-gold-400` dan `dark:data-[state=active]:bg-input/30`).
- Dampak: Saat ini tidak berdampak pada pengguna, tetapi bila dark mode diaktifkan, kartu akan gelap sementara latar halaman tetap ivory dan teks navy di atas card navy tidak terbaca.
- Perbaikan: Putuskan secara eksplisit: hapus blok `.dark` dan kelas `dark:` yang tidak terpakai, atau migrasikan halaman ke token (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`) sebelum menambahkan toggle.

### N-34. m-09. Toaster mengikuti tema OS, bukan tema aplikasi

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Visual consistency
- Lokasi: `client/src/components/ui/sonner.tsx` baris 1, 5, 9
- Masalah: Memakai `useTheme` dari `next-themes`, padahal aplikasi memakai `ThemeContext` sendiri dan tidak ada provider next-themes. Nilai fallback `"system"` membuat toast berwarna gelap di perangkat dengan OS dark mode, sementara aplikasi selalu terang.
- Dampak: Toast gelap di atas UI terang terlihat seperti bug dan mengganggu konsistensi.
- Perbaikan: `import { useTheme } from "@/contexts/ThemeContext"; const { theme } = useTheme(); <Sonner theme={theme} richColors position="top-center" ... />`.

### N-35. m-10. Kartu Profil Operator menempel ke kartu 2FA (tanpa jarak)

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Visual consistency
- Lokasi: `client/src/pages/Settings.tsx` baris 382, 414, 416
- Masalah: Kartu Branding dan Kebijakan Kredit memakai `mb-6`, tetapi kartu Profil Operator (baris 382) tidak, sehingga langsung bersentuhan dengan `TwoFactorSettings`. Ritme spasi diatur per kartu, bukan di container.
- Dampak: Dua kartu tampak menyatu, pengguna sulit membedakan form yang sedang diisi dan tombol simpan mana yang berlaku.
- Perbaikan: Ubah `<main className="container max-w-3xl space-y-6 py-8">` dan hapus semua `mb-6` per kartu.

### N-36. m-11. Deskripsi Pengaturan menyebut branding untuk pengguna non-admin

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Usability
- Lokasi: `client/src/pages/Settings.tsx` baris 196, 199
- Masalah: Teks "Kelola branding BPRS dan profil operator Anda." tampil untuk maker/checker yang tidak melihat bagian branding.
- Dampak: Maker mencari menu branding yang tidak ada.
- Perbaikan: `{isAdmin ? "Kelola branding, kebijakan kredit, dan profil Anda." : "Kelola profil, 2FA, dan password Anda."}`.

### N-37. m-12. Platform: tab dan wrapper tabel ganda tidak optimal di mobile

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Responsiveness
- Lokasi: `client/src/pages/Platform.tsx` baris 41-44, 108-109; `client/src/components/ui/table.tsx` baris 7-10, 71, 84
- Masalah: `TabsList` `w-fit` dengan trigger `whitespace-nowrap` + ikon ("Organisasi BPRS", "Log audit platform") dapat melebihi 360 px. `div.overflow-x-auto` di Platform menggandakan wrapper yang sudah ada di `Table`. `TableCell` default `whitespace-nowrap` memaksa nama BPRS panjang memanjang tanpa wrap; header `text-[11px]` uppercase sulit dibaca.
- Dampak: Tab terpotong/overflow di ponsel kecil; tabel log memerlukan scroll horizontal panjang.
- Perbaikan: `<TabsList className="w-full sm:w-fit">` dengan label pendek di mobile (`<span className="sm:hidden">Organisasi</span>`); hapus wrapper ganda; `TableHead` `text-xs`; izinkan wrap pada kolom teks: `<TableCell className="whitespace-normal">`.

### N-38. m-13. Utility global `.flex { min-width: 0; min-height: 0 }` dan hover-lift tanpa reduced-motion

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Visual consistency, Accessibility
- Lokasi: `client/src/index.css` baris 182-185, 244-251, 261-267
- Masalah: Mengubah perilaku semua elemen `flex` secara global (anak flex tidak lagi berukuran minimum konten), yang menyulitkan debugging overflow dan dapat memotong konten tanpa disadari. `hover-lift` (translateY -4px) tidak dimatikan pada `prefers-reduced-motion`, hanya `.reveal` yang ditangani.
- Dampak: Teks atau badge dapat menyusut/terpotong secara tak terduga di layout sempit; pengguna sensitif gerakan tetap melihat animasi.
- Perbaikan: Hapus override `.flex` dan pakai `min-w-0` secara lokal; tambahkan `@media (prefers-reduced-motion: reduce) { .hover-lift, .hover-lift:hover { transform: none; transition: none; } }`.

### N-39. m-14. Logo header memakai alt "SSCI" walau menampilkan logo BPRS, dan nama organisasi hilang di mobile

- Area: C (Dashboard, admin, shell, primitif UI)
- Dimensi: Accessibility
- Lokasi: `client/src/components/AppHeader.tsx` baris 26-28
- Masalah: Saat `orgLogo` ada, alt tetap "SSCI"; tautan ke dashboard tidak memiliki label yang menjelaskan tujuan; `orgName` disembunyikan `hidden md:inline`.
- Dampak: Screen reader mengumumkan "SSCI, link" tanpa konteks BPRS; pengguna dengan beberapa akun BPRS tidak melihat organisasi aktif di ponsel.
- Perbaikan: `<Link href="/dashboard" aria-label={`${orgName ?? "SSCI"}: ke dashboard`}>`, `alt={orgLogo ? `Logo ${orgName}` : "SSCI"}`, dan tampilkan nama singkat di mobile `max-w-[40vw] truncate text-sm sm:text-lg`.


## 7. Lampiran: pengukuran target sentuh di viewport 375px

Diukur dengan Chromium (emulasi ponsel, `hasTouch`) pada build produksi dengan data tiruan. Daftar memuat elemen interaktif yang terlihat dengan lebar atau tinggi di bawah 44px (14 elemen pertama per halaman). "Icon button tanpa label" adalah tombol tanpa teks, `aria-label`, atau `title`.

```text
## Home /: 7/11 target < 44px, overflow 0px, icon button tanpa label 0
  - button 40x40 "Buka menu"
  - a 152x20 "Cara kerja"
  - a 152x20 "Metodologi"
  - a 152x20 "Keamanan"
  - a 152x20 "Masuk"
  - a 152x20 "Daftar BPRS"
  - a 152x20 "Lacak pengajuan"

## Track /track: 3/4 target < 44px, overflow 0px, icon button tanpa label 0
  - a 190x32 "Kembali ke Beranda"
  - input 293x40 "Contoh: SSCI-00001 atau 1"
  - input 293x40 "Contoh: 4581"

## Login /login: 3/7 target < 44px, overflow 0px, icon button tanpa label 0
  - a 81x20 "Beranda"
  - a 171x16 "Daftarkan BPRS Anda"
  - button 335x16 "Mode demo"

## Dashboard /dashboard: 29/29 target < 44px, overflow 0px, icon button tanpa label 1
  - a 104x40 "A"
  - a 36x36 "Notifikasi"
  - button 64x36 "button"
  - a 109x28 "Dashboard"
  - a 138x28 "Pengajuan baru"
  - a 92x28 "Riwayat"
  - a 97x28 "Nasabah"
  - a 123x28 "Tentang SSCI"
  - a 198x36 "Mulai penilaian baru"
  - a 159x36 "Riwayat penilaian"
  - button 111x36 "Refresh"
  - a 28x28 "A"
  - a 28x28 "A"
  - a 28x28 "A"

## Detail /applications/1: 27/29 target < 44px, overflow 0px, icon button tanpa label 1
  - a 104x40 "A"
  - a 36x36 "Notifikasi"
  - button 64x36 "button"
  - a 109x28 "Dashboard"
  - a 138x28 "Pengajuan baru"
  - a 92x28 "Riwayat"
  - a 97x28 "Nasabah"
  - a 123x28 "Tentang SSCI"
  - button 165x36 "Unduh Laporan"
  - button 67x36 "Tolak"
  - button 81x36 "Setujui"
  - button 309x16 "Belum ada: KTP, NPWP, NIB"
  - button 309x16 "Minimal 1 foto survei lapangan"
  - button 309x16 "Belum terverifikasi: KTP, NPWP, NIB"

## NewApplication /applications/new: 37/42 target < 44px, overflow 0px, icon button tanpa label 1
  - a 104x40 "A"
  - a 36x36 "Notifikasi"
  - button 64x36 "button"
  - a 109x28 "Dashboard"
  - a 138x28 "Pengajuan baru"
  - a 92x28 "Riwayat"
  - a 97x28 "Nasabah"
  - a 123x28 "Tentang SSCI"
  - button 138x36 "Isi contoh data"
  - button 130x32 "Isi contoh data"
  - input 259x40 "INPUT"
  - input 259x40 "INPUT"
  - input 259x40 "tel"
  - input 259x40 "email"

## Customers /nasabah: 10/10 target < 44px, overflow 0px, icon button tanpa label 1
  - a 104x40 "A"
  - a 36x36 "Notifikasi"
  - button 64x36 "button"
  - a 109x28 "Dashboard"
  - a 138x28 "Pengajuan baru"
  - a 92x28 "Riwayat"
  - a 97x28 "Nasabah"
  - a 123x28 "Tentang SSCI"
  - input 293x40 "Cari berdasarkan nama, ID nasabah, atau "
  - button 60x36 "Cari"

## Team /tim: 19/19 target < 44px, overflow 0px, icon button tanpa label 3
  - a 104x40 "A"
  - a 36x36 "Notifikasi"
  - button 64x36 "button"
  - a 109x28 "Dashboard"
  - a 138x28 "Pengajuan baru"
  - a 92x28 "Riwayat"
  - a 97x28 "Nasabah"
  - a 123x28 "Tentang SSCI"
  - input 293x40 "Nama lengkap"
  - input 293x40 "nama@bank.com"
  - input 293x40 "Minimal 6 karakter"
  - input 293x40 "Analis pembiayaan"
  - input 293x40 "08xxxxxxxxxx"
  - button 293x40 "Maker"

## Settings /pengaturan: 19/19 target < 44px, overflow 0px, icon button tanpa label 1
  - a 104x40 "A"
  - a 36x36 "Notifikasi"
  - button 64x36 "button"
  - a 109x28 "Dashboard"
  - a 138x28 "Pengajuan baru"
  - a 92x28 "Riwayat"
  - a 97x28 "Nasabah"
  - a 123x28 "Tentang SSCI"
  - input 293x40 "INPUT"
  - input 293x40 "INPUT"
  - input 293x40 "tel"
  - button 149x36 "Simpan profil"
  - input 293x40 "password"
  - input 293x40 "INPUT"

## Platform /platform: 11/11 target < 44px, overflow 0px, icon button tanpa label 1
  - a 104x40 "A"
  - a 36x36 "Notifikasi"
  - button 64x36 "button"
  - a 109x28 "Dashboard"
  - a 138x28 "Pengajuan baru"
  - a 92x28 "Riwayat"
  - a 97x28 "Nasabah"
  - a 123x28 "Tentang SSCI"
  - button 167x34 "Organisasi BPRS"
  - button 181x34 "Log audit platform"
  - button 259x32 "Setujui"

## Audit /audit: 9/9 target < 44px, overflow 0px, icon button tanpa label 1
  - a 104x40 "A"
  - a 36x36 "Notifikasi"
  - button 64x36 "button"
  - a 109x28 "Dashboard"
  - a 138x28 "Pengajuan baru"
  - a 92x28 "Riwayat"
  - a 97x28 "Nasabah"
  - a 123x28 "Tentang SSCI"
  - button 293x40 "Filter aksi"
```

Catatan: tombol tanpa label yang muncul di semua halaman yang memakai header adalah pemicu menu profil (`client/src/components/ProfileMenu.tsx`), selebar 64x36px tanpa nama aksesibel.
