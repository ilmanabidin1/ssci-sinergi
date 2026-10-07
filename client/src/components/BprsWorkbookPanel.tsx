import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BPRS_OPTIONS, BPRS_TEMPLATE_LABELS, MAX_STATEMENT_ROWS, type BprsOptionKey, type BprsProfile, type BprsTemplateKind } from "@shared/bprsTemplate";
import { AlertTriangle, CheckCircle2, FileScan, FileSpreadsheet, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SelectField = { key: keyof BprsProfile & BprsOptionKey; label: string };
type TextField = { key: keyof BprsProfile; label: string; type?: "text" | "date" | "number"; placeholder?: string };

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
  { key: "gajiBulanan", label: "Gaji bulanan / THP (Rp)", type: "number" },
  { key: "uangLembur", label: "Uang lembur (Rp)", type: "number" },
  { key: "pendapatanTetapLain", label: "Pendapatan tetap lainnya (Rp)", type: "number" },
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

export function BprsWorkbookPanel({ applicationId, canEdit, ssciScore }: {
  applicationId: number;
  canEdit: boolean;
  ssciScore: { totalScore: number; classification: string } | null;
}) {
  const utils = trpc.useUtils();
  const query = trpc.bprsWorkbook.get.useQuery({ applicationId });
  const [profile, setProfile] = useState<BprsProfile>({});
  const [dirty, setDirty] = useState(false);
  const [statementFiles, setStatementFiles] = useState<File[]>([]);
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

  const save = trpc.bprsWorkbook.save.useMutation({
    onSuccess: result => {
      toast.success(result.collateralUpdated ? "Isian tersimpan. Nilai agunan pengajuan diperbarui dari rincian agunan." : "Isian format BPRS tersimpan");
      setDirty(false);
      utils.bprsWorkbook.get.invalidate({ applicationId });
      utils.applications.workflow.invalidate({ applicationId });
      utils.assessments.getWithApplication.invalidate({ applicationId });
    },
    onError: e => toast.error(e.message),
  });
  const exportExcel = trpc.bprsWorkbook.exportExcel.useMutation({
    onSuccess: data => downloadBase64(data.base64, data.filename),
    onError: e => toast.error(e.message),
  });
  const readStatement = trpc.bprsWorkbook.readStatement.useMutation({ onError: e => toast.error(e.message) });
  const draftNarrative = trpc.bprsWorkbook.draftNarrative.useMutation({
    onSuccess: data => {
      setProfile(p => ({ ...p, latarBelakang: data.latarBelakang, pengalamanUsaha: data.pengalamanUsaha, indikatorReputasi: data.indikatorReputasi }));
      setDirty(true);
      toast.success("Draf narasi dibuat. Periksa dan sunting sebelum disimpan.");
    },
    onError: e => toast.error(e.message),
  });
  const compareScores = trpc.bprsWorkbook.compareScores.useMutation({ onError: e => toast.error(e.message) });

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

  const handleSave = () => {
    const tooMany = statementText.some(m => parseAmounts(m.credits).length > MAX_STATEMENT_ROWS || parseAmounts(m.debits).length > MAX_STATEMENT_ROWS);
    if (tooMany) toast.warning(`Template BPRS menampung ${MAX_STATEMENT_ROWS} transaksi per kolom. Kelebihannya tidak disimpan; gabungkan per hari.`);
    save.mutate({ applicationId, profile: buildProfileForSave() });
  };

  const handleExport = () => {
    if (dirty) return toast.warning("Simpan isian terlebih dahulu agar file Excel memakai data terbaru.");
    exportExcel.mutate({ applicationId });
  };

  const handleReadStatement = async () => {
    if (statementFiles.length === 0) return toast.error("Pilih foto halaman rekening koran terlebih dahulu.");
    try {
      const pages = await Promise.all(statementFiles.map(async f => ({ imageBase64: await readAsBase64(f), contentType: f.type as "image/jpeg" | "image/png" })));
      readStatement.mutate({ applicationId, pages });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File tidak dapat dibaca.");
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

  const renderSelect = ({ key, label }: SelectField) => (
    <div key={key} className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={key === "template" ? template : (profile[key] as string | undefined) ?? ""} onValueChange={v => update(key, v as never)} disabled={!editable}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
        <SelectContent>
          {BPRS_OPTIONS[key].map(option => <SelectItem key={option} value={option}>{optionLabel(key, option)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const renderText = ({ key, label, type = "text" }: TextField) => (
    <div key={key} className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={(profile[key] as string | number | undefined) ?? ""}
        disabled={!editable}
        onChange={e => update(key, (type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value || undefined) as never)}
      />
    </div>
  );

  const score = query.data?.score;
  const checks = query.data?.checks ?? [];
  const template: BprsTemplateKind = (profile.template as BprsTemplateKind | undefined) ?? query.data?.defaultTemplate ?? "fluktuatif";
  const isFix = template === "fix_income";
  const templateChanged = query.data != null && template !== query.data.template;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300"><FileSpreadsheet className="h-5 w-5" /></span>
            <div>
              <CardTitle className="text-xl">Format Excel BPRS</CardTitle>
              <CardDescription>
                Mengisi otomatis file "{BPRS_TEMPLATE_LABELS[template]}" yang biasa dipakai BPRS. Data SSCI langsung dipakai; isian di bawah melengkapi kolom yang hanya ada di format BPRS. Rumus, dropdown, dan rating di Excel tetap berjalan seperti biasa.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button variant="outline" onClick={handleSave} disabled={save.isPending || !dirty}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan isian
              </Button>
            )}
            <Button onClick={handleExport} disabled={exportExcel.isPending || query.isLoading}>
              {exportExcel.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}Unduh Excel BPRS
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat isian...</p>}
        {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}

        {score && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimasi skor format BPRS</p>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skor SSCI</p>
              {ssciScore ? (
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-semibold text-navy-900">{ssciScore.totalScore.toFixed(2)}</span>
                  <Badge variant="secondary">{ssciScore.classification}</Badge>
                </div>
              ) : <p className="mt-1 text-sm text-muted-foreground">Belum dinilai.</p>}
              <Button variant="outline" size="sm" className="mt-3" onClick={() => compareScores.mutate({ applicationId })} disabled={compareScores.isPending}>
                {compareScores.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Jelaskan perbedaan skor
              </Button>
              {compareScores.data && (
                <p className="mt-3 rounded-lg bg-ivory p-3 text-sm leading-relaxed">
                  {compareScores.data.explanation}
                  <span className="mt-1 block text-xs text-muted-foreground">{compareScores.data.source === "ai" ? "Disusun AI dari rincian skor, catatan pendukung." : "Disusun dari aturan."}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {checks.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Periksa sebelum mengunduh</p>
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
          <p className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />Tidak ada isian yang saling bertentangan.</p>
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
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="identitas">Identitas</TabsTrigger>
            <TabsTrigger value="usaha">{isFix ? "Pekerjaan & gaji" : "Tempat tinggal & usaha"}</TabsTrigger>
            <TabsTrigger value="bank">Bank & pembiayaan</TabsTrigger>
            <TabsTrigger value="rekening">Rekening koran</TabsTrigger>
            <TabsTrigger value="agunan">Agunan & mitigasi</TabsTrigger>
            <TabsTrigger value="narasi">Narasi</TabsTrigger>
            <TabsTrigger value="poin">Rincian poin</TabsTrigger>
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
                {renderText({ key: "kas", label: "Kas saat ini (Rp)", type: "number" })}
                {renderText({ key: "biayaRumahTangga", label: "Biaya rumah tangga per bulan (Rp)", type: "number" })}
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
                <p className="flex items-center gap-2 text-sm font-semibold"><FileScan className="h-4 w-4" />Baca rekening koran dengan AI</p>
                <p className="text-xs text-muted-foreground">Unggah foto halaman rekening koran (JPG atau PNG, maksimal 6 halaman, 5 MB per halaman). Hasil baca harus diperiksa sebelum dipakai.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    className="max-w-sm"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      const bad = files.find(f => !(f.type === "image/jpeg" || f.type === "image/png") || f.size > 5 * 1024 * 1024);
                      if (bad || files.length > 6) {
                        toast.error("Gunakan maksimal 6 file JPG/PNG dengan ukuran maksimal 5 MB per file.");
                        e.target.value = "";
                        return setStatementFiles([]);
                      }
                      readStatement.reset();
                      setStatementFiles(files);
                    }}
                  />
                  <Button variant="outline" onClick={handleReadStatement} disabled={readStatement.isPending || statementFiles.length === 0}>
                    {readStatement.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Baca
                  </Button>
                </div>
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
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(["bank", "nomorRekening"] as const).map(key => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{key === "bank" ? "Bank" : "Nomor rekening"}</Label>
                  <Input
                    value={profile.rekeningKoran?.[key] ?? ""}
                    disabled={!editable}
                    onChange={e => update("rekeningKoran", { ...profile.rekeningKoran, months: profile.rekeningKoran?.months ?? [], [key]: e.target.value || undefined })}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs">Saldo awal (Rp)</Label>
                <Input
                  type="number"
                  value={profile.rekeningKoran?.saldoAwal ?? ""}
                  disabled={!editable}
                  onChange={e => update("rekeningKoran", { ...profile.rekeningKoran, months: profile.rekeningKoran?.months ?? [], saldoAwal: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bulan pertama</Label>
                <Input
                  type="month"
                  value={profile.rekeningKoran?.bulanPertama ?? ""}
                  disabled={!editable}
                  onChange={e => update("rekeningKoran", { ...profile.rekeningKoran, months: profile.rekeningKoran?.months ?? [], bulanPertama: e.target.value || undefined })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {statementText.map((month, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">Bulan {i + 1}</p>
                  {(["credits", "debits"] as const).map(side => (
                    <div key={side} className="space-y-1">
                      <Label className="text-xs">{side === "credits" ? "Mutasi kredit (uang masuk)" : "Mutasi debet (uang keluar)"}, satu nominal per baris</Label>
                      <Textarea
                        rows={5}
                        value={month[side]}
                        disabled={!editable}
                        onChange={e => {
                          const next = [...statementText];
                          next[i] = { ...next[i]!, [side]: e.target.value };
                          setStatementText(next);
                          setDirty(true);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">{parseAmounts(month[side]).length} transaksi, {rp(parseAmounts(month[side]).reduce((a, b) => a + b, 0))}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="agunan" className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">{MITIGASI_SELECT.map(renderSelect)}</div>
            <CollateralRows
              title="Agunan tanah/bangunan"
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
                { key: "nilaiPasar", label: "Nilai pasar (Rp)", number: true },
                { key: "persen", label: "Agunan % (0-1)", number: true },
                { key: "pengikatan", label: "Pengikatan", options: BPRS_OPTIONS.pengikatanTanah },
                { key: "lokasi", label: "Lokasi" },
              ]}
            />
            <CollateralRows
              title="Agunan kendaraan"
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
                { key: "nilaiPasar", label: "Nilai pasar (Rp)", number: true },
                { key: "persen", label: "Agunan % (0-1)", number: true },
              ]}
            />
            <p className="text-xs text-muted-foreground">Jika rincian agunan dikosongkan, nilai agunan dari data SSCI dicatat di baris pertama tabel tanah/bangunan.</p>
          </TabsContent>

          <TabsContent value="narasi" className="mt-4 space-y-4">
            {editable && (
              <Button variant="outline" onClick={() => draftNarrative.mutate({ applicationId, profile: buildProfileForSave() })} disabled={draftNarrative.isPending}>
                {draftNarrative.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Buat draf narasi dengan AI
              </Button>
            )}
            <p className="text-xs text-muted-foreground">AI hanya menyusun draf dari data pengajuan tanpa nama dan NIK. AO tetap memeriksa dan menyunting isinya.</p>
            {([
              ["latarBelakang", "Latar belakang nasabah"],
              ["pengalamanUsaha", isFix ? "Pengalaman bekerja nasabah" : "Pengalaman usaha nasabah"],
              ["indikatorReputasi", "Indikator reputasi"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Textarea rows={4} value={profile[key] ?? ""} disabled={!editable} onChange={e => update(key, e.target.value || undefined)} />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="poin" className="mt-4">
            {score && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="p-2">Kriteria</th><th className="p-2">Jawaban</th><th className="p-2 text-right">Poin</th><th className="p-2 text-right">Maks</th></tr>
                  </thead>
                  <tbody>
                    {score.criteria.map(c => (
                      <tr key={c.key} className="border-t border-border">
                        <td className="p-2">{c.label}</td>
                        <td className="p-2 text-muted-foreground">{c.answer?.trim() ?? <span className="text-amber-700">belum diisi</span>}</td>
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
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

type CollateralField = { key: string; label: string; number?: boolean; options?: readonly string[] };

function CollateralRows<T extends Record<string, unknown>>({ title, rows, max, editable, onChange, fields, blank }: {
  title: string;
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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {editable && rows.length < max && (
          <Button variant="outline" size="sm" onClick={() => onChange([...rows, { ...blank } as T])}><Plus className="mr-1 h-4 w-4" />Tambah</Button>
        )}
      </div>
      {rows.length === 0 && <p className="text-xs text-muted-foreground">Belum ada.</p>}
      {rows.map((row, index) => (
        <div key={index} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-3 lg:grid-cols-5">
          {fields.map(field => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs">{field.label}</Label>
              {field.options ? (
                <Select value={(row[field.key] as string | undefined) ?? ""} onValueChange={v => set(index, field.key, v)} disabled={!editable}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.number ? "number" : "text"}
                  step={field.key === "persen" ? "0.05" : undefined}
                  value={(row[field.key] as string | number | undefined) ?? ""}
                  disabled={!editable}
                  onChange={e => set(index, field.key, field.number ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value || undefined)}
                />
              )}
            </div>
          ))}
          {editable && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 className="mr-1 h-4 w-4" />Hapus</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
