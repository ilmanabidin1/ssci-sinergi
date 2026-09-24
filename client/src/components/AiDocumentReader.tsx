import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Check, FileScan, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

type DocType = "slip_gaji" | "mutasi_rekening" | "nib" | "npwp";

const DOC_OPTIONS: Array<[DocType, string]> = [
  ["slip_gaji", "Slip gaji"],
  ["mutasi_rekening", "Mutasi rekening"],
  ["nib", "NIB"],
  ["npwp", "NPWP"],
];


const toNumber = (value: unknown) => {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export function AiDocumentReader<V extends Record<string, any>>({ values, setValues }: { values: V; setValues: React.Dispatch<React.SetStateAction<V>> }) {
  const [docType, setDocType] = useState<DocType>("slip_gaji");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<string[]>([]);
  const extract = trpc.aiAssist.extractDocument.useMutation({
    onError: e => setError(e.message),
  });
  const result = extract.data;

  const selectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0] ?? null;
    setError("");
    extract.reset();
    setApplied([]);
    if (f && !(f.type === "image/jpeg" || f.type === "image/png")) {
      setError("File harus berformat JPG atau PNG.");
      event.target.value = "";
      return;
    }
    if (f && f.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5 MB.");
      event.target.value = "";
      return;
    }
    setFile(f);
  };

  const process = () => {
    if (!file) return setError("Pilih file dokumen terlebih dahulu.");
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      extract.mutate({
        documentType: docType,
        imageBase64: data.slice(data.indexOf(",") + 1),
        contentType: file.type as "image/jpeg" | "image/png",
        declared: {
          customerName: values.customerName || undefined,
          businessName: values.businessName || undefined,
          monthlyRevenue: toNumber(values.monthlyRevenue),
          monthlyExpenses: toNumber(values.monthlyExpenses),
          existingDebt: toNumber(values.existingDebt) ?? 0,
        },
      });
    };
    reader.onerror = () => setError("File tidak dapat dibaca.");
    setError("");
    setApplied([]);
    reader.readAsDataURL(file);
  };

  const suggestions: Array<{ key: string; label: string; value: number | string; display: string }> = [];
  if (result) {
    if (result.monthlyIncome !== null) suggestions.push({ key: "monthlyRevenue", label: "Pendapatan bulanan", value: result.monthlyIncome, display: rp(result.monthlyIncome) });
    if (result.monthlyExpenses !== null) suggestions.push({ key: "monthlyExpenses", label: "Pengeluaran bulanan", value: result.monthlyExpenses, display: rp(result.monthlyExpenses) });
    if (result.existingInstallment !== null) suggestions.push({ key: "existingDebt", label: "Angsuran existing", value: result.existingInstallment, display: rp(result.existingInstallment) });
    if (result.businessName && !values.businessName) suggestions.push({ key: "businessName", label: "Nama usaha", value: result.businessName, display: result.businessName });
  }

  const apply = (key: string, value: number | string) => {
    setValues(v => ({ ...v, [key]: String(value) }));
    setApplied(a => [...a, key]);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gold-400/40 bg-gradient-to-br from-gold-50 to-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300"><FileScan className="h-4 w-4" /></span>
        <div>
          <h3 className="font-semibold text-navy-900">Baca dokumen pendukung dengan AI</h3>
          <p className="text-sm text-muted-foreground">Unggah foto slip gaji, mutasi rekening, NIB, atau NPWP. AI mengusulkan angka dan membandingkannya dengan data yang Anda isi. Usulan hanya dipakai jika Anda menekan "Pakai".</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={docType} onValueChange={v => { setDocType(v as DocType); extract.reset(); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{DOC_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="file" accept="image/jpeg,image/png" onChange={selectFile} className="max-w-xs" />
        <Button type="button" onClick={process} disabled={extract.isPending || !file}>
          {extract.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Baca dokumen
        </Button>
      </div>
      {error && <p className="flex items-center gap-1.5 text-sm text-red-600"><AlertTriangle className="h-4 w-4" />{error}</p>}
      {result && (
        <div className="space-y-3 rounded-xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{[result.holderName && `Pemilik: ${result.holderName}`, result.documentNumber && `No. dokumen: ${result.documentNumber}`, result.periodCovered && `Periode: ${result.periodCovered}`].filter(Boolean).join("  |  ") || "Data identitas tidak terbaca"}</span>
            <span className="rounded-full bg-[#eef2f8] px-2 py-0.5 font-semibold text-navy-900">Keyakinan {Math.round(result.confidence * 100)}%</span>
          </div>
          {suggestions.length > 0 ? (
            <ul className="divide-y divide-border/70">
              {suggestions.map(s => (
                <li key={s.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold text-navy-900">{s.display}</span>
                    {applied.includes(s.key)
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" />Dipakai</span>
                      : <Button type="button" size="sm" variant="outline" onClick={() => apply(s.key, s.value)}>Pakai</Button>}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Tidak ada angka keuangan yang terbaca dari dokumen ini.</p>}
          {result.mismatches.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" />Perbedaan dengan data yang diisi</p>
              <ul className="list-disc space-y-0.5 pl-5">{result.mismatches.map(m => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          {result.warnings.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">{result.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
          <p className="text-xs text-muted-foreground">Hasil baca AI wajib diverifikasi dengan dokumen asli sebelum pengajuan dikirim.</p>
        </div>
      )}
    </div>
  );
}
