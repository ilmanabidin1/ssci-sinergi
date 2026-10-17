import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ConfirmDialog";
import { RupiahInput } from "@/components/RupiahInput";
import { trpc } from "@/lib/trpc";
import { errorMessage } from "@/lib/errors";
import { BPRS_OPTIONS, BPRS_TEMPLATE_LABELS, MAX_STATEMENT_ROWS, type BprsOptionKey, type BprsProfile, type BprsTemplateKind } from "@shared/bprsTemplate";
import { AlertTriangle, CheckCircle2, FileScan, FileSpreadsheet, ImagePlus, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

type SelectField = { key: keyof BprsProfile & BprsOptionKey; label: string };
type TextField = { key: keyof BprsProfile; label: string; type?: "text" | "date" | "number" | "rupiah"; placeholder?: string };

const IDENTITAS_SELECT: SelectField[] = [
  { key: "kantor", label: "Kantor" },
  { key: "kategoriNasabah", label: "Jenis kategori nasabah" },
  { key: "jenisKelamin", label: "Jenis kelamin" },
  { key: "statusPerkawinan", label: "Status perkawinan" },
  { key: "tanggungan", label: "Jumlah tanggungan" },
  { key: "pendidikan", label: "Pendidikan terakhir" },
];
const IDENTITAS_TEXT: TextField[] = [
  { key: "nomorProposal", label: "Nomor register / proposal" },
  { key: "namaAo", label: "Nama AO" },
  { key: "namaReferral", label: "Nama referral (jika Referral)" },
  { key: "tempatLahir", label: "Tempat lahir" },
  { key: "tanggalLahir", label: "Tanggal lahir", type: "date" },
  { key: "desa", label: "Desa/Kelurahan" },
  { key: "kecamatan", label: "Kecamatan" },
  { key: "kabupaten", label: "Kab./Kota" },
  { key: "kodePos", label: "Kode pos" },
  { key: "ibuKandung", label: "Nama gadis ibu kandung" },
  { key: "namaPasangan", label: "Nama pasangan" },
  { key: "ttlPasangan", label: "Tempat/tgl lahir pasangan" },
  { key: "ktpPasangan", label: "No. KTP pasangan" },
  { key: "pekerjaanPasangan", label: "Pekerjaan pasangan" },
  { key: "namaSaudara", label: "Saudara tidak serumah" },
  { key: "hpSaudara", label: "HP saudara" },
];
const USAHA_SELECT: SelectField[] = [
  { key: "statusTempatTinggal", label: "Status tempat tinggal" },
  { key: "lamaMenetap", label: "Lama menetap" },
  { key: "reputasi", label: "Reputasi di tempat tinggal dan usaha" },
  { key: "laporanKeuangan", label: "Jenis laporan keuangan" },
  { key: "sistemPenjualan", label: "Sistem penjualan" },
  { key: "kepemilikanTempatUsaha", label: "Kepemilikan tempat usaha" },
  { key: "lokasiUsaha", label: "Lokasi usaha" },
  { key: "daerahPemasaran", label: "Daerah pemasaran" },
  { key: "tenagaKerja", label: "Jumlah tenaga kerja" },
  { key: "pengelolaanKeuangan", label: "Pengelolaan keuangan" },
  { key: "hutangDagang", label: "Kewajiban / hutang dagang" },
];
const BANK_SELECT: SelectField[] = [
  { key: "hubunganBank", label: "Hubungan dengan perbankan" },
  { key: "riwayatSlik", label: "Riwayat SLIK" },
  { key: "buktiPenggunaanDana", label: "Bukti penggunaan dana sebelumnya" },
  { key: "sektorEkonomi", label: "Sektor ekonomi" },
  { key: "jenisPenggunaan", label: "Jenis penggunaan" },
  { key: "jenisMargin", label: "Jenis margin" },
  { key: "rpcPersen", label: "% RPC dari laba bersih" },
];
const PEKERJAAN_SELECT: SelectField[] = [
  { key: "statusKaryawan", label: "Status karyawan" },
  { key: "bidangPekerjaan", label: "Bidang usaha tempat bekerja" },
  { key: "bonafiditas", label: "Bonafiditas perusahaan" },
  { key: "suratKeteranganBekerja", label: "Surat keterangan bekerja" },
  { key: "slipGaji", label: "Slip gaji" },
  { key: "rekeningGaji", label: "Rekening gaji" },
  { key: "mouInstansi", label: "MoU instansi dengan BPRS" },
  { key: "suratKuasaPotongGaji", label: "Surat kuasa potong gaji" },
  { key: "potonganGaji", label: "Persentase potongan gaji" },
  { key: "statusTempatTinggal", label: "Kepemilikan tempat tinggal" },
  { key: "reputasiFix", label: "Reputasi di tempat kerja dan tempat tinggal" },
];
const PEKERJAAN_TEXT: TextField[] = [
  { key: "gajiBulanan", label: "Gaji bulanan / THP", type: "rupiah" },
  { key: "uangLembur", label: "Uang lembur", type: "rupiah" },
  { key: "pendapatanTetapLain", label: "Pendapatan tetap lainnya", type: "rupiah" },
  { key: "namaInstansi", label: "Nama instansi / perusahaan" },
  { key: "alamatInstansi", label: "Alamat perusahaan" },
  { key: "nomorSk", label: "Nomor SK pengangkatan" },
  { key: "tanggalSk", label: "Tanggal SK" },
];
const MITIGASI_SELECT: SelectField[] = [
  { key: "pengikatan", label: "Mitigasi risiko hukum" },
  { key: "asuransiJiwa", label: "Mitigasi risiko kematian" },
  { key: "asuransiAgunan", label: "Mitigasi risiko agunan" },
];

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const optionLabel = (key: BprsOptionKey, value: string) => {
  if (key === "rpcPersen" || key === "potonganGaji") return `${Math.round(Number(value) * 100)}%`;
  if (key === "template") return BPRS_TEMPLATE_LABELS[value as BprsTemplateKind] ?? value;
  return value.trim();
};

const parseAmounts = (text: string) =>
  text.split(/[\n,;]+/).map(s => Number(s.replace(/[^\d]/g, ""))).filter(n => Number.isFinite(n) && n > 0);

/** Mencegah angka berubah saat roda mouse digulir di atas input number. */
const blurOnWheel = (event: React.WheelEvent<HTMLInputElement>) => event.currentTarget.blur();

function compact(profile: BprsProfile): BprsProfile {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(profile)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out as BprsProfile;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      resolve(data.slice(data.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("File tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
}

function downloadBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Tampilan baca untuk checker: teks penuh kontras, bisa dipilih dan disalin, bukan field nonaktif. */
function ReadOnlyField({ label, value, multiline = false }: { label: string; value: ReactNode; multiline?: boolean }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`min-h-9 break-words rounded-md border border-border bg-ivory px-3 py-2 text-sm font-medium text-navy-900 ${multiline ? "whitespace-pre-line" : ""}`}>
        {empty ? <span className="font-normal text-muted-foreground">-</span> : value}
      </p>
    </div>
  );
}

export function BprsWorkbookPanel({ applicationId, canEdit, ssciScore }: {
  applicationId: number;
  canEdit: boolean;
  ssciScore: { totalScore: number; classification: string } | null;
}) {
  const utils = trpc.useUtils();
  const { confirm } = useConfirm();
  const query = trpc.bprsWorkbook.get.useQuery({ applicationId });
  const [profile, setProfile] = useState<BprsProfile>({});
  const [dirty, setDirty] = useState(false);
  const [statementFiles, setStatementFiles] = useState<File[]>([]);
  const statementInputRef = useRef<HTMLInputElement>(null);
  const [statementText, setStatementText] = useState<Array<{ credits: string; debits: string }>>([
    { credits: "", debits: "" }, { credits: "", debits: "" }, { credits: "", debits: "" },
  ]);

  useEffect(() => {
    if (!query.data || dirty) return;
    const loaded = query.data.profile as BprsProfile;
    setProfile(loaded);
    setStatementText([0, 1, 2].map(i => ({
      credits: (loaded.rekeningKoran?.months[i]?.credits ?? []).join("\n"),
      debits: (loaded.rekeningKoran?.months[i]?.debits ?? []).join("\n"),
    })));
  }, [query.data, dirty]);

  // Peringatkan sebelum menutup atau memuat ulang halaman saat ada isian yang belum disimpan.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const save = trpc.bprsWorkbook.save.useMutation({
    onSuccess: result => {
      toast.success(result.collateralUpdated ? "Isian tersimpan. Nilai agunan pengajuan diperbarui dari rincian agunan." : "Isian format BPRS tersimpan");
      setDirty(false);
      utils.bprsWorkbook.get.invalidate({ applicationId });
      utils.applications.workflow.invalidate({ applicationId });
      utils.assessments.getWithApplication.invalidate({ applicationId });
      utils.applications.listActivity.invalidate({ applicationId });
    },
    onError: e => toast.error(errorMessage(e, "Isian format BPRS gagal disimpan.")),
  });
  const exportExcel = trpc.bprsWorkbook.exportExcel.useMutation({
    onSuccess: data => {
      downloadBase64(data.base64, data.filename);
      utils.applications.listActivity.invalidate({ applicationId });
    },
    onError: e => toast.error(errorMessage(e, "File Excel BPRS gagal dibuat.")),
  });
  const readStatement = trpc.bprsWorkbook.readStatement.useMutation({ onError: e => toast.error(errorMessage(e, "Rekening koran gagal dibaca.")) });
  const draftNarrative = trpc.bprsWorkbook.draftNarrative.useMutation({
    onSuccess: data => {
      setProfile(p => ({ ...p, latarBelakang: data.latarBelakang, pengalamanUsaha: data.pengalamanUsaha, indikatorReputasi: data.indikatorReputasi }));
      setDirty(true);
      toast.success("Draf narasi dibuat. Periksa dan sunting sebelum disimpan.");
    },
    onError: e => toast.error(errorMessage(e, "Draf narasi gagal dibuat.")),
  });
  const compareScores = trpc.bprsWorkbook.compareScores.useMutation({ onError: e => toast.error(errorMessage(e, "Penjelasan skor gagal dibuat.")) });

  const editable = canEdit && (query.data?.editable ?? false);
  const update = <K extends keyof BprsProfile>(key: K, value: BprsProfile[K]) => {
    setProfile(p => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const buildProfileForSave = (): BprsProfile => {
    const months = statementText
      .map(m => ({ credits: parseAmounts(m.credits).slice(0, MAX_STATEMENT_ROWS), debits: parseAmounts(m.debits).slice(0, MAX_STATEMENT_ROWS) }));
    while (months.length > 0 && months[months.length - 1]!.credits.length === 0 && months[months.length - 1]!.debits.length === 0) months.pop();
    const statement = profile.rekeningKoran;
    const hasStatement = months.length > 0 || statement?.bank || statement?.nomorRekening;
    return compact({
      ...profile,
      rekeningKoran: hasStatement ? { ...statement, months } : undefined,
    });
  };

  const saveNow = async () => {
    const tooMany = statementText.some(m => parseAmounts(m.credits).length > MAX_STATEMENT_ROWS || parseAmounts(m.debits).length > MAX_STATEMENT_ROWS);
    if (tooMany) toast.warning(`Template BPRS menampung ${MAX_STATEMENT_ROWS} transaksi per kolom. Kelebihannya tidak disimpan; gabungkan per hari.`);
    await save.mutateAsync({ applicationId, profile: buildProfileForSave() });
  };

  const handleSave = () => {
    if (save.isPending) return;
    saveNow().catch(() => undefined);
  };

  const handleExport = async () => {
    if (exportExcel.isPending || save.isPending) return;
    if (dirty && editable) {
      const ok = await confirm({
        title: "Simpan isian sebelum mengunduh?",
        description: "Ada perubahan yang belum disimpan. File Excel dibuat dari data tersimpan, jadi isian perlu disimpan dulu agar file memakai data terbaru.",
        confirmLabel: "Simpan dan unduh",
        cancelLabel: "Kembali",
      });
      if (!ok) return;
      try {
        await saveNow();
      } catch {
        return;
      }
    }
    exportExcel.mutate({ applicationId });
  };

  const handleReadStatement = async () => {
    if (statementFiles.length === 0) return toast.error("Pilih foto halaman rekening koran terlebih dahulu.");
    if (readStatement.isPending) return;
    try {
      const pages = await Promise.all(statementFiles.map(async f => ({ imageBase64: await readAsBase64(f), contentType: f.type as "image/jpeg" | "image/png" })));
      readStatement.mutate({ applicationId, pages });
    } catch (error) {
      toast.error(errorMessage(error, "File tidak dapat dibaca."));
    }
  };

  const applyStatement = () => {
    const result = readStatement.data;
    if (!result) return;
    setProfile(p => ({
      ...p,
      rekeningKoran: {
        ...p.rekeningKoran,
        bank: result.bank ?? p.rekeningKoran?.bank,
        nomorRekening: result.accountNumber ?? p.rekeningKoran?.nomorRekening,
        saldoAwal: result.openingBalance ?? p.rekeningKoran?.saldoAwal,
        bulanPertama: result.firstMonth ?? p.rekeningKoran?.bulanPertama,
        months: p.rekeningKoran?.months ?? [],
      },
    }));
    setStatementText([0, 1, 2].map(i => ({
      credits: (result.months[i]?.credits ?? []).join("\n"),
      debits: (result.months[i]?.debits ?? []).join("\n"),
    })));
    setDirty(true);
    readStatement.reset();
    toast.success("Hasil baca rekening koran dipakai. Periksa angkanya, lalu simpan.");
  };

  const renderSelect = ({ key, label }: SelectField) => {
    const id = `bprs-${key}`;
    const value = key === "template" ? template : (profile[key] as string | undefined) ?? "";
    if (!editable) return <ReadOnlyField key={key} label={label} value={value ? optionLabel(key, value) : ""} />;
    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">{label}</Label>
        <Select value={value} onValueChange={v => update(key, v as never)}>
          <SelectTrigger id={id} className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
          <SelectContent>
            {BPRS_OPTIONS[key].map(option => <SelectItem key={option} value={option}>{optionLabel(key, option)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderText = ({ key, label, type = "text" }: TextField) => {
    const id = `bprs-${key}`;
    const raw = profile[key] as string | number | undefined;
    if (!editable) return <ReadOnlyField key={key} label={label} value={type === "rupiah" && raw != null && raw !== "" ? rp(Number(raw)) : raw} />;
    if (type === "rupiah") {
      return (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={id} className="text-xs">{label}</Label>
          <RupiahInput id={id} value={raw} onValueChange={v => update(key, v as never)} />
        </div>
      );
    }
    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">{label}</Label>
        <Input
          id={id}
          type={type}
          inputMode={type === "number" ? "numeric" : undefined}
          onWheel={type === "number" ? blurOnWheel : undefined}
          value={raw ?? ""}
          onChange={e => update(key, (type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value || undefined) as never)}
        />
      </div>
    );
  };

  const score = query.data?.score;
  const checks = query.data?.checks ?? [];
  const template: BprsTemplateKind = (profile.template as BprsTemplateKind | undefined) ?? query.data?.defaultTemplate ?? "fluktuatif";
  const isFix = template === "fix_income";
  const templateChanged = query.data != null && template !== query.data.template;
  const updateStatement = (patch: Partial<NonNullable<BprsProfile["rekeningKoran"]>>) =>
    update("rekeningKoran", { ...profile.rekeningKoran, months: profile.rekeningKoran?.months ?? [], ...patch });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 basis-72 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300" aria-hidden="true"><FileSpreadsheet className="h-5 w-5" /></span>
            <div className="min-w-0">
              <CardTitle as="h2" className="text-xl">Format Excel BPRS</CardTitle>
              <CardDescription>
                Mengisi otomatis file "{BPRS_TEMPLATE_LABELS[template]}" yang biasa dipakai BPRS. Data SSCI langsung dipakai; isian di bawah melengkapi kolom yang hanya ada di format BPRS. Rumus, dropdown, dan rating di Excel tetap berjalan seperti biasa.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editable && dirty && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />Ada perubahan belum disimpan
              </span>
            )}
            {editable && (
              <Button variant="outline" onClick={handleSave} disabled={save.isPending || !dirty}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}{save.isPending ? "Menyimpan..." : "Simpan isian"}
              </Button>
            )}
            <Button onClick={handleExport} disabled={exportExcel.isPending || save.isPending || query.isLoading}>
              {exportExcel.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />}{exportExcel.isPending ? "Menyiapkan Excel..." : "Unduh Excel BPRS"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.isLoading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Memuat isian...</p>}
        {query.error && (
          <p role="alert" className="flex flex-wrap items-center gap-x-2 text-sm text-rose-700">
            Isian format BPRS tidak dapat dimuat: {errorMessage(query.error)}
            <Button variant="link" size="sm" className="h-auto px-0 text-rose-700 underline" onClick={() => query.refetch()} disabled={query.isFetching}>Coba lagi</Button>
          </p>
        )}

        {score && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimasi skor format BPRS</h3>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-semibold text-navy-900">{score.score.toFixed(2)}</span>
                <Badge variant="secondary">{score.rating} · {score.ratingLabel}</Badge>
                <Badge variant={score.status === "Layak" ? "default" : "destructive"}>{score.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Dihitung dengan bobot sheet Parameter. Kemampuan bayar {score.rpcAdequate ? "memadai" : "belum memadai (skor dikali 70%)"}: rasio {score.coverageRatio.toFixed(2)} terhadap batas {score.coverageThreshold.toFixed(2)}.
                {" "}Angka ini pembanding untuk staf yang terbiasa dengan Excel BPRS. Skor utama untuk keputusan tetap skor SSCI.
              </p>
              {score.missing.length > 0 && (
                <p className="mt-2 text-xs text-amber-800">{score.missing.length} kriteria belum diisi: {score.missing.join(", ")}.</p>
              )}
            </div>
            <div className="rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skor SSCI</h3>
              {ssciScore ? (
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-semibold text-navy-900">{ssciScore.totalScore.toFixed(2)}</span>
                  <Badge variant="secondary">{ssciScore.classification}</Badge>
                </div>
              ) : <p className="mt-1 text-sm text-muted-foreground">Belum dinilai.</p>}
              <Button variant="outline" size="sm" className="mt-3" onClick={() => compareScores.mutate({ applicationId })} disabled={compareScores.isPending}>
                {compareScores.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />}{compareScores.isPending ? "Menyusun penjelasan..." : "Jelaskan perbedaan skor"}
              </Button>
              <div aria-live="polite">
                {compareScores.data && (
                  <p className="mt-3 rounded-lg bg-ivory p-3 text-sm leading-relaxed">
                    {compareScores.data.explanation}
                    <span className="mt-1 block text-xs text-muted-foreground">{compareScores.data.source === "ai" ? "Disusun AI dari rincian skor, catatan pendukung." : "Disusun dari aturan."}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {checks.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <h3 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Periksa sebelum mengunduh</h3>
            <ul className="space-y-1">
              {checks.map((check, i) => (
                <li key={i} className="flex gap-2">
                  <Badge variant={check.severity === "tinggi" ? "destructive" : "secondary"} className="h-5 shrink-0">{check.severity}</Badge>
                  <span>{check.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {score && checks.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Tidak ada isian yang saling bertentangan.</p>
        )}

        <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-end">
          {renderSelect({ key: "template", label: "Template Excel BPRS" })}
          <p className="text-xs text-muted-foreground">
            Bawaan mengikuti sumber penghasilan pengajuan: penghasilan tetap memakai Fix Income, selain itu Fluktuatif UMKM.
            {templateChanged && " Simpan isian agar estimasi skor dihitung dengan template yang dipilih."}
          </p>
        </div>

        {query.data && (
          <p className="text-xs text-muted-foreground">
            {isFix
              ? <>Diisi otomatis dari SSCI: identitas, alamat, HP, plafon, tenor, margin, akad ({query.data.derived.akad ?? "-"}), tujuan, angsuran existing, dan gaji (dari pendapatan bulanan jika belum diisi).</>
              : <>Diisi otomatis dari SSCI: identitas, alamat, HP, plafon, tenor, margin, akad ({query.data.derived.akad ?? "-"}), tujuan, omzet, biaya usaha, angsuran existing, dan lama usaha ({query.data.derived.lamaUsaha}).</>}
            {!editable && " Isian hanya dapat diubah oleh maker atau admin sebelum pengajuan diputuskan."}
          </p>
        )}

        <Tabs defaultValue="identitas">
          <TabsList className="w-full justify-start" aria-label="Bagian format BPRS">
            <TabsTrigger value="identitas" className="flex-none">Identitas</TabsTrigger>
            <TabsTrigger value="usaha" className="flex-none">{isFix ? "Pekerjaan & gaji" : "Tempat tinggal & usaha"}</TabsTrigger>
            <TabsTrigger value="bank" className="flex-none">Bank & pembiayaan</TabsTrigger>
            <TabsTrigger value="rekening" className="flex-none">Rekening koran</TabsTrigger>
            <TabsTrigger value="agunan" className="flex-none">Agunan & mitigasi</TabsTrigger>
            <TabsTrigger value="narasi" className="flex-none">Narasi</TabsTrigger>
            <TabsTrigger value="poin" className="flex-none">Rincian poin</TabsTrigger>
          </TabsList>

          <TabsContent value="identitas" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {IDENTITAS_SELECT.map(f => (isFix && f.key === "pendidikan" ? { ...f, key: "pendidikanFix" as const } : f)).map(renderSelect)}
            {IDENTITAS_TEXT.map(renderText)}
          </TabsContent>

          <TabsContent value="usaha" className="mt-4 grid gap-4 sm:grid-cols-2">
            {isFix ? (
              <>
                {PEKERJAAN_SELECT.map(renderSelect)}
                {PEKERJAAN_TEXT.map(renderText)}
              </>
            ) : (
              <>
                {USAHA_SELECT.map(renderSelect)}
                {renderText({ key: "kas", label: "Kas saat ini", type: "rupiah" })}
                {renderText({ key: "biayaRumahTangga", label: "Biaya rumah tangga per bulan", type: "rupiah" })}
              </>
            )}
          </TabsContent>

          <TabsContent value="bank" className="mt-4 grid gap-4 sm:grid-cols-2">
            {BANK_SELECT.filter(f => !(isFix && f.key === "rpcPersen")).map(renderSelect)}
            {renderText({ key: "pembiayaanKe", label: "Permohonan pembiayaan ke-", type: "number" })}
          </TabsContent>

          <TabsContent value="rekening" className="mt-4 space-y-4">
            {editable && (
              <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><FileScan className="h-4 w-4" aria-hidden="true" />Baca rekening koran dengan AI</h3>
                <p id="statement-files-hint" className="text-xs text-muted-foreground">Unggah foto halaman rekening koran (JPG atau PNG, maksimal 6 halaman, 5 MB per halaman). Hasil baca harus diperiksa sebelum dipakai.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => statementInputRef.current?.click()} disabled={readStatement.isPending} aria-describedby="statement-files-hint">
                    <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />{statementFiles.length > 0 ? "Ganti foto" : "Pilih foto halaman"}
                  </Button>
                  <input
                    ref={statementInputRef}
                    hidden
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    aria-label="Pilih foto halaman rekening koran"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      const bad = files.find(f => !(f.type === "image/jpeg" || f.type === "image/png") || f.size > 5 * 1024 * 1024);
                      if (bad || files.length > 6) {
                        toast.error("Gunakan maksimal 6 file JPG/PNG dengan ukuran maksimal 5 MB per file.");
                        return setStatementFiles([]);
                      }
                      readStatement.reset();
                      setStatementFiles(files);
                    }}
                  />
                  <Button onClick={handleReadStatement} disabled={readStatement.isPending || statementFiles.length === 0}>
                    {readStatement.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />}{readStatement.isPending ? "Membaca..." : "Baca"}
                  </Button>
                  <span className="min-w-0 break-all text-xs text-muted-foreground" aria-live="polite">
                    {statementFiles.length > 0 ? `${statementFiles.length} foto dipilih: ${statementFiles.map(f => f.name).join(", ")}` : "Belum ada foto dipilih"}
                  </span>
                </div>
                <div aria-live="polite" aria-busy={readStatement.isPending}>
                  {readStatement.data && (
                    <div className="space-y-2 rounded-lg bg-ivory p-3 text-sm">
                      <p>
                        {readStatement.data.bank ?? "Bank tidak terbaca"}, rek. {readStatement.data.accountNumber ?? "-"}, saldo awal {readStatement.data.openingBalance != null ? rp(readStatement.data.openingBalance) : "-"}. Keyakinan {Math.round(readStatement.data.confidence * 100)}%.
                      </p>
                      <ul className="text-xs">
                        {readStatement.data.months.map(m => (
                          <li key={m.month}>
                            {m.month}: {m.credits.length} kredit ({rp(m.credits.reduce((a, b) => a + b, 0))}), {m.debits.length} debit ({rp(m.debits.reduce((a, b) => a + b, 0))})
                          </li>
                        ))}
                      </ul>
                      {readStatement.data.warnings.map((w, i) => <p key={i} className="text-xs text-amber-800">{w}</p>)}
                      <Button size="sm" onClick={applyStatement}>Pakai hasil ini</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {editable ? (
                <>
                  {(["bank", "nomorRekening"] as const).map(key => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`bprs-rk-${key}`} className="text-xs">{key === "bank" ? "Bank" : "Nomor rekening"}</Label>
                      <Input
                        id={`bprs-rk-${key}`}
                        inputMode={key === "nomorRekening" ? "numeric" : undefined}
                        value={profile.rekeningKoran?.[key] ?? ""}
                        onChange={e => updateStatement({ [key]: e.target.value || undefined })}
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label htmlFor="bprs-rk-saldoAwal" className="text-xs">Saldo awal</Label>
                    <RupiahInput
                      id="bprs-rk-saldoAwal"
                      value={profile.rekeningKoran?.saldoAwal}
                      onValueChange={v => updateStatement({ saldoAwal: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bprs-rk-bulanPertama" className="text-xs">Bulan pertama</Label>
                    <Input
                      id="bprs-rk-bulanPertama"
                      type="month"
                      value={profile.rekeningKoran?.bulanPertama ?? ""}
                      onChange={e => updateStatement({ bulanPertama: e.target.value || undefined })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyField label="Bank" value={profile.rekeningKoran?.bank} />
                  <ReadOnlyField label="Nomor rekening" value={profile.rekeningKoran?.nomorRekening} />
                  <ReadOnlyField label="Saldo awal" value={profile.rekeningKoran?.saldoAwal != null ? rp(profile.rekeningKoran.saldoAwal) : ""} />
                  <ReadOnlyField label="Bulan pertama" value={profile.rekeningKoran?.bulanPertama} />
                </>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {statementText.map((month, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                  <h3 className="text-sm font-semibold">Bulan {i + 1}</h3>
                  {(["credits", "debits"] as const).map(side => {
                    const id = `bprs-rk-${i}-${side}`;
                    const label = `${side === "credits" ? "Mutasi kredit (uang masuk)" : "Mutasi debet (uang keluar)"}, satu nominal per baris`;
                    const amounts = parseAmounts(month[side]);
                    return (
                      <div key={side} className="space-y-1">
                        {editable ? (
                          <>
                            <Label htmlFor={id} className="text-xs">{label}</Label>
                            <Textarea
                              id={id}
                              rows={5}
                              inputMode="numeric"
                              aria-describedby={`${id}-sum`}
                              value={month[side]}
                              onChange={e => {
                                const next = [...statementText];
                                next[i] = { ...next[i]!, [side]: e.target.value };
                                setStatementText(next);
                                setDirty(true);
                              }}
                            />
                          </>
                        ) : (
                          <ReadOnlyField label={label} value={amounts.map(rp).join("\n")} multiline />
                        )}
                        <p id={`${id}-sum`} className="text-xs text-muted-foreground">{amounts.length} transaksi, {rp(amounts.reduce((a, b) => a + b, 0))}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="agunan" className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">{MITIGASI_SELECT.map(renderSelect)}</div>
            <CollateralRows
              title="Agunan tanah/bangunan"
              idPrefix="agunan-tanah"
              rows={profile.agunanTanah ?? []}
              max={7}
              editable={editable}
              onChange={rows => update("agunanTanah", rows)}
              blank={{ persen: 1 }}
              fields={[
                { key: "jenisSurat", label: "Jenis surat", options: BPRS_OPTIONS.jenisSuratTanah },
                { key: "nomor", label: "Nomor" },
                { key: "atasNama", label: "Atas nama" },
                { key: "luasTanah", label: "LT (m²)", number: true },
                { key: "luasBangunan", label: "LB (m²)", number: true },
                { key: "nilaiPasar", label: "Nilai pasar", rupiah: true },
                { key: "persen", label: "Porsi agunan (%)", percent: true },
                { key: "pengikatan", label: "Pengikatan", options: BPRS_OPTIONS.pengikatanTanah },
                { key: "lokasi", label: "Lokasi" },
              ]}
            />
            <CollateralRows
              title="Agunan kendaraan"
              idPrefix="agunan-kendaraan"
              rows={profile.agunanKendaraan ?? []}
              max={5}
              editable={editable}
              onChange={rows => update("agunanKendaraan", rows)}
              blank={{ persen: 1 }}
              fields={[
                { key: "merek", label: "Merek" },
                { key: "tipe", label: "Tipe" },
                { key: "tahun", label: "Tahun", number: true },
                { key: "atasNama", label: "Atas nama" },
                { key: "nomorBpkb", label: "No. BPKB" },
                { key: "nopol", label: "Nopol" },
                { key: "nilaiPasar", label: "Nilai pasar", rupiah: true },
                { key: "persen", label: "Porsi agunan (%)", percent: true },
              ]}
            />
            <p className="text-xs text-muted-foreground">Porsi agunan adalah persentase nilai pasar yang diperhitungkan (contoh 80 untuk 80%). Jika rincian agunan dikosongkan, nilai agunan dari data SSCI dicatat di baris pertama tabel tanah/bangunan.</p>
          </TabsContent>

          <TabsContent value="narasi" className="mt-4 space-y-4">
            {editable && (
              <Button variant="outline" onClick={() => draftNarrative.mutate({ applicationId, profile: buildProfileForSave() })} disabled={draftNarrative.isPending}>
                {draftNarrative.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />}{draftNarrative.isPending ? "Menyusun draf..." : "Buat draf narasi dengan AI"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">AI hanya menyusun draf dari data pengajuan tanpa nama dan NIK. AO tetap memeriksa dan menyunting isinya.</p>
            {([
              ["latarBelakang", "Latar belakang nasabah"],
              ["pengalamanUsaha", isFix ? "Pengalaman bekerja nasabah" : "Pengalaman usaha nasabah"],
              ["indikatorReputasi", "Indikator reputasi"],
            ] as const).map(([key, label]) => (
              editable ? (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`bprs-${key}`} className="text-xs">{label}</Label>
                  <Textarea id={`bprs-${key}`} rows={4} value={profile[key] ?? ""} onChange={e => update(key, e.target.value || undefined)} />
                </div>
              ) : (
                <ReadOnlyField key={key} label={label} value={profile[key]} multiline />
              )
            ))}
          </TabsContent>

          <TabsContent value="poin" className="mt-4">
            {score ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Rincian poin format BPRS per kriteria</caption>
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th scope="col" className="p-2">Kriteria</th><th scope="col" className="p-2">Jawaban</th><th scope="col" className="p-2 text-right">Poin</th><th scope="col" className="p-2 text-right">Maks</th></tr>
                  </thead>
                  <tbody>
                    {score.criteria.map(c => (
                      <tr key={c.key} className="border-t border-border">
                        <td className="p-2">{c.label}</td>
                        <td className="p-2 text-muted-foreground">{c.answer?.trim() ?? <span className="text-amber-800">belum diisi</span>}</td>
                        <td className="p-2 text-right tabular-nums">{c.points.toFixed(2)}</td>
                        <td className="p-2 text-right tabular-nums text-muted-foreground">{c.maxPoints}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border font-semibold">
                      <td className="p-2" colSpan={2}>Jumlah{score.rpcAdequate ? "" : " (sebelum dikali 70%)"}</td>
                      <td className="p-2 text-right tabular-nums">{score.subtotal.toFixed(2)}</td>
                      <td className="p-2" />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {query.isLoading ? "Memuat rincian poin..." : editable ? "Rincian poin muncul setelah isian disimpan." : "Rincian poin belum tersedia karena isian format BPRS belum diisi."}
              </p>
            )}
          </TabsContent>
        </Tabs>

        {editable && dirty && (
          <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-border bg-white/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />Ada perubahan belum disimpan
            </span>
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}{save.isPending ? "Menyimpan..." : "Simpan isian"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CollateralField = { key: string; label: string; number?: boolean; rupiah?: boolean; percent?: boolean; options?: readonly string[] };

function CollateralRows<T extends Record<string, unknown>>({ title, idPrefix, rows, max, editable, onChange, fields, blank }: {
  title: string;
  idPrefix: string;
  rows: T[];
  max: number;
  editable: boolean;
  onChange: (rows: T[]) => void;
  fields: CollateralField[];
  blank: Partial<T>;
}) {
  const set = (index: number, key: string, value: unknown) => {
    const next = rows.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    onChange(next);
  };
  const remove = (index: number) => {
    const previous = rows;
    onChange(rows.filter((_, i) => i !== index));
    toast(`${title} baris ${index + 1} dihapus`, {
      action: { label: "Urungkan", onClick: () => onChange(previous) },
    });
  };
  const display = (field: CollateralField, value: unknown) => {
    if (value === undefined || value === null || value === "") return "";
    if (field.rupiah) return rp(Number(value));
    if (field.percent) return `${Math.round(Number(value) * 100)}%`;
    return String(value);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {editable && rows.length < max && (
          <Button variant="outline" size="sm" onClick={() => onChange([...rows, { ...blank } as T])}><Plus className="mr-1 h-4 w-4" aria-hidden="true" />Tambah</Button>
        )}
      </div>
      {rows.length === 0 && <p className="text-xs text-muted-foreground">Belum ada.</p>}
      {rows.map((row, index) => (
        <div key={index} role="group" aria-label={`${title} baris ${index + 1}`} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-3 lg:grid-cols-5">
          {fields.map(field => {
            const id = `${idPrefix}-${index}-${field.key}`;
            const value = row[field.key];
            if (!editable) return <ReadOnlyField key={field.key} label={field.label} value={display(field, value)} />;
            return (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={id} className="text-xs">{field.label}</Label>
                {field.options ? (
                  <Select value={(value as string | undefined) ?? ""} onValueChange={v => set(index, field.key, v)}>
                    <SelectTrigger id={id} className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>{field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : field.rupiah ? (
                  <RupiahInput id={id} value={value as number | undefined} onValueChange={v => set(index, field.key, v)} />
                ) : field.percent ? (
                  // Disimpan sebagai pecahan 0-1 (format template), ditampilkan sebagai 0-100%.
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={5}
                    onWheel={blurOnWheel}
                    value={value === undefined || value === null ? "" : Math.round(Number(value) * 1000) / 10}
                    onChange={e => {
                      if (e.target.value === "") return set(index, field.key, undefined);
                      const pct = Math.min(100, Math.max(0, Number(e.target.value)));
                      set(index, field.key, Number.isFinite(pct) ? pct / 100 : undefined);
                    }}
                  />
                ) : (
                  <Input
                    id={id}
                    type={field.number ? "number" : "text"}
                    inputMode={field.number ? "numeric" : undefined}
                    onWheel={field.number ? blurOnWheel : undefined}
                    value={(value as string | number | undefined) ?? ""}
                    onChange={e => set(index, field.key, field.number ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value || undefined)}
                  />
                )}
              </div>
            );
          })}
          {editable && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Hapus ${title} baris ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />Hapus
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
