import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const DRAFT_KEY = "ssci-new-application-draft-v1";
const steps = ["Nasabah", "Usaha & keuangan", "Legal & syariah", "ESG & tinjauan"];
type Document = { type: "KTP" | "NPWP" | "NIB"; status: "pending" | "complete" | "verified" | "missing"; notes: string };
type Values = Record<string, any> & { legalDocuments: Document[] };
type ExtractKtpResult = { customerName?: string | null; customerId?: string | null; address?: string | null };
type ExtractKtpMutation = {
  useMutation: (options: {
    onSuccess: (data: ExtractKtpResult) => void;
    onError: (error: { message: string }) => void;
  }) => { isPending: boolean; mutate: (input: { imageBase64: string; contentType: "image/jpeg" | "image/png" }) => void };
};
const initial: Values = { customerName: "", customerId: "", businessName: "", businessType: "", businessAge: "", address: "", phone: "", email: "", monthlyRevenue: "", monthlyExpenses: "", existingDebt: "", collateralValue: "", requestedAmount: "", financingTenor: "", marginRate: "", loanPurpose: "", businessShariaCompliant: "", shariaComplianceNotes: "", environmentalPractices: "", socialImpact: "", governanceQuality: "", legalDocuments: [{ type: "KTP", status: "pending", notes: "" }, { type: "NPWP", status: "pending", notes: "" }, { type: "NIB", status: "pending", notes: "" }] };

function Field({ name, label, values, setValues, ...props }: { name: string; label: string; values: Values; setValues: React.Dispatch<React.SetStateAction<Values>>; [key: string]: unknown }) {
  const Component = props.rows ? Textarea : Input;
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Component id={name} name={name} value={String(values[name] || "")} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues(v => ({ ...v, [name]: e.target.value }))} {...props} /></div>;
}

export default function NewApplication() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [values, setValues] = useState<Values>(initial);
  const [step, setStep] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpConsent, setKtpConsent] = useState(false);
  const [ktpError, setKtpError] = useState("");
  const [ktpProcessed, setKtpProcessed] = useState(false);
  const [financialFile, setFinancialFile] = useState<File | null>(null);
  const [financialError, setFinancialError] = useState("");
  const importFinancialMutation = trpc.applications.importFinancialCsv.useMutation({
    onSuccess: data => {
      setValues(current => ({ ...current, monthlyRevenue: String(data.monthlyRevenue), monthlyExpenses: String(data.monthlyExpenses), existingDebt: String(data.existingInstallment) }));
      setFinancialError("");
      setFinancialFile(null);
      toast.success(`${data.rowCount} bulan berhasil diimpor`);
    },
    onError: error => setFinancialError(`Import CSV gagal: ${error.message}`),
  });
  const createMutation = trpc.applications.create.useMutation({ onSuccess: data => { localStorage.removeItem(DRAFT_KEY); toast.success("Aplikasi pembiayaan berhasil dibuat"); setLocation(`/applications/${data.id}`); }, onError: error => toast.error(`Gagal membuat aplikasi: ${error.message}`) });
  const extractKtpMutation = (trpc.applications as unknown as { extractKtp: ExtractKtpMutation }).extractKtp.useMutation({
    onSuccess: data => {
      setValues(current => ({
        ...current,
        ...(data.customerName ? { customerName: data.customerName } : {}),
        ...(data.customerId ? { customerId: data.customerId } : {}),
        ...(data.address ? { address: data.address } : {}),
      }));
      setKtpError("");
      setKtpProcessed(true);
      setKtpFile(null);
    },
    onError: error => setKtpError(`OCR KTP gagal diproses: ${error.message}`),
  });

  useEffect(() => { try { const saved = localStorage.getItem(DRAFT_KEY); if (saved) setHasDraft(true); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, values, step })); } catch {} }, [values, step]);
  const restore = () => { try { const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || ""); if (saved.version === 1) { setValues({ ...initial, ...saved.values }); setStep(Math.min(saved.step || 0, 3)); setHasDraft(false); } } catch { toast.error("Draft tidak dapat dipulihkan"); } };
  const reset = () => { localStorage.removeItem(DRAFT_KEY); setValues(initial); setStep(0); setHasDraft(false); };
  const selectKtpFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setKtpProcessed(false);
    setKtpError("");
    if (!file) {
      setKtpFile(null);
      return;
    }
    if (!(file.type === "image/jpeg" || file.type === "image/png")) {
      setKtpFile(null);
      setKtpError("File KTP harus berformat JPG atau PNG.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setKtpFile(null);
      setKtpError("Ukuran file KTP maksimal 5 MB.");
      event.target.value = "";
      return;
    }
    setKtpFile(file);
  };
  const processKtp = () => {
    if (!ktpFile) {
      setKtpError("Pilih file KTP terlebih dahulu.");
      return;
    }
    if (!ktpConsent) {
      setKtpError("Centang persetujuan privasi sebelum memproses KTP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
       extractKtpMutation.mutate({ imageBase64: base64, contentType: ktpFile.type as "image/jpeg" | "image/png" });
    };
    reader.onerror = () => setKtpError("File KTP tidak dapat dibaca.");
    setKtpError("");
    reader.readAsDataURL(ktpFile);
  };
  const selectFinancialFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFinancialError("");
    if (file && file.size > 1024 * 1024) {
      setFinancialFile(null);
      setFinancialError("Ukuran CSV maksimal 1 MB.");
      event.target.value = "";
      return;
    }
    setFinancialFile(file);
  };
  const importFinancialFile = () => {
    if (!financialFile) {
      setFinancialError("Pilih file CSV terlebih dahulu.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      importFinancialMutation.mutate({ data: result.slice(result.indexOf(",") + 1) });
    };
    reader.onerror = () => setFinancialError("File CSV tidak dapat dibaca.");
    setFinancialError("");
    reader.readAsDataURL(financialFile);
  };
  const downloadFinancialTemplate = () => {
    const blob = new Blob(["month,revenue,expenses,existingInstallment\n1,25000000,15000000,2000000\n2,27500000,16000000,2000000\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-data-keuangan.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const required: Record<number, string[]> = { 0: ["customerName", "customerId", "phone", "address"], 1: ["businessName", "businessType", "businessAge", "monthlyRevenue", "monthlyExpenses", "existingDebt", "collateralValue", "requestedAmount", "financingTenor", "marginRate", "loanPurpose"], 2: ["businessShariaCompliant"], 3: ["governanceQuality"] };
  const next = () => { const missing = required[step].filter(key => !String(values[key] || "").trim()); if (missing.length) { toast.error("Lengkapi semua kolom wajib sebelum melanjutkan"); document.getElementById(missing[0])?.focus(); return; } setStep(s => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); const missing = required[3].filter(key => !values[key]?.trim()); if (missing.length) return; createMutation.mutate({ customerName: values.customerName, customerId: values.customerId, businessName: values.businessName, businessType: values.businessType, businessAge: parseInt(values.businessAge), address: values.address, phone: values.phone, email: values.email || undefined, monthlyRevenue: values.monthlyRevenue, monthlyExpenses: values.monthlyExpenses, existingDebt: values.existingDebt, collateralValue: values.collateralValue, requestedAmount: values.requestedAmount, financingTenor: parseInt(values.financingTenor), marginRate: parseFloat(values.marginRate), loanPurpose: values.loanPurpose, legalDocuments: values.legalDocuments, businessShariaCompliant: values.businessShariaCompliant as "yes" | "no" | "partial", shariaComplianceNotes: values.shariaComplianceNotes || undefined, environmentalPractices: values.environmentalPractices || undefined, socialImpact: values.socialImpact || undefined, governanceQuality: values.governanceQuality as "excellent" | "good" | "fair" | "poor" }); };
  const select = (name: string, label: string, options: [string, string][]) => <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Select value={values[name]} onValueChange={value => setValues(v => ({ ...v, [name]: value }))}><SelectTrigger id={name}><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{options.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></div>;
  return <div className="min-h-screen bg-gray-50"><nav className="border-b bg-white"><div className="container flex items-center justify-between py-4"><Button variant="ghost" size="sm" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link></Button><div className="flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /><b className="text-xl text-primary">SSCI</b></div><span className="text-sm text-gray-600">{user?.name || ""}</span></div></nav>
      <main className="container max-w-4xl py-6 sm:py-8"><div className="mb-6"><div><h1 className="text-3xl font-bold text-gray-900">Aplikasi Pembiayaan Baru</h1><p className="mt-2 text-gray-600">Lengkapi data nasabah untuk penilaian kelayakan pembiayaan</p></div></div>
      {hasDraft && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><span>Draft tersimpan ditemukan.</span><span className="flex gap-2"><Button type="button" size="sm" onClick={restore}>Pulihkan draft</Button><Button type="button" size="sm" variant="ghost" onClick={reset}>Mulai ulang</Button></span></div>}
      <div className="mb-6"><div className="mb-2 flex justify-between text-sm font-medium"><span>Langkah {step + 1} dari 4</span><span>{steps[step]}</span></div><div className="flex gap-1">{steps.map((label, i) => <div key={label} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`} aria-label={label} />)}</div></div>
        <form onSubmit={submit}><Card><CardHeader><div><CardTitle>{steps[step]}</CardTitle><CardDescription>{step === 0 ? "Data identitas dan kontak nasabah" : step === 1 ? "Detail usaha dan kebutuhan pembiayaan" : step === 2 ? "Kelengkapan dokumen dan kepatuhan syariah" : "Dampak usaha dan pemeriksaan akhir"}</CardDescription></div></CardHeader><CardContent className="space-y-4">
         {step === 0 && <><div className="grid gap-4 md:grid-cols-2"><Field name="customerName" label="Nama Lengkap *" values={values} setValues={setValues} required /><Field name="customerId" label="NIK / ID Nasabah *" values={values} setValues={setValues} required /><Field name="phone" label="Nomor Telepon *" values={values} setValues={setValues} type="tel" required /><Field name="email" label="Email (Opsional)" values={values} setValues={setValues} type="email" /></div><Field name="address" label="Alamat Lengkap *" values={values} setValues={setValues} rows={3} required /><div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div><h3 className="font-medium">Isi data dari foto KTP</h3><p className="text-sm text-muted-foreground">JPG atau PNG, maksimal 5 MB. File hanya dikirim saat Anda menekan tombol proses dan tidak disimpan dalam draft.</p></div><Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-950"><Shield /><AlertTitle>Peringatan privasi</AlertTitle><AlertDescription className="text-amber-900">Foto KTP berisi data pribadi. Pastikan Anda berwenang mengunggahnya dan setujui pemrosesan untuk OCR sebelum melanjutkan.</AlertDescription></Alert><div className="flex items-start gap-2"><Checkbox id="ktp-consent" checked={ktpConsent} onCheckedChange={checked => setKtpConsent(checked === true)} /><Label htmlFor="ktp-consent" className="cursor-pointer text-sm leading-5">Saya menyetujui pemrosesan foto KTP untuk mengisi data identitas.</Label></div><div className="flex flex-wrap items-center gap-3"><Input type="file" accept="image/jpeg,image/png" onChange={selectKtpFile} className="max-w-md bg-white" /><Button type="button" variant="outline" onClick={processKtp} disabled={extractKtpMutation.isPending}>{extractKtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Proses OCR KTP</Button></div>{ktpFile && <p className="text-xs text-muted-foreground">File dipilih: {ktpFile.name}</p>}{ktpError && <p className="flex items-center gap-1 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{ktpError}</p>}{ktpProcessed && <Alert className="border-green-200 bg-green-50 text-green-900"><CheckCircle2 /><AlertTitle>Data OCR berhasil diisi</AlertTitle><AlertDescription className="text-green-800">Hasil OCR wajib diverifikasi secara manual sebelum aplikasi dikirimkan.</AlertDescription></Alert>}</div></>}
         {step === 1 && <><div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">Import data keuangan dari CSV</h3><p className="text-sm text-muted-foreground">Gunakan 1 sampai 12 baris bulanan dengan kolom month, revenue, expenses, existingInstallment.</p></div><Button type="button" variant="ghost" size="sm" onClick={downloadFinancialTemplate}><Download className="mr-2 h-4 w-4" />Unduh template CSV</Button></div><Alert className="border-amber-300 bg-amber-50 text-amber-950"><Shield /><AlertTitle>Pemberitahuan privasi</AlertTitle><AlertDescription className="text-amber-900">File hanya diproses sementara untuk menghitung rata-rata dan tidak disimpan sebagai file atau di draft.</AlertDescription></Alert><div className="flex flex-wrap items-center gap-3"><Input type="file" accept=".csv,text/csv" onChange={selectFinancialFile} className="max-w-md bg-white" /><Button type="button" variant="outline" onClick={importFinancialFile} disabled={importFinancialMutation.isPending}>{importFinancialMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import data CSV</Button></div>{financialFile && <p className="text-xs text-muted-foreground">File dipilih: {financialFile.name}</p>}{financialError && <p className="text-sm text-red-600">{financialError}</p>}</div><div className="grid gap-4 md:grid-cols-2"><Field name="businessName" label="Nama Usaha *" values={values} setValues={setValues} required /><Field name="businessType" label="Jenis Usaha *" values={values} setValues={setValues} required /><Field name="businessAge" label="Lama Usaha (bulan) *" values={values} setValues={setValues} type="number" min="1" required /><Field name="monthlyRevenue" label="Pendapatan Bulanan (Rp) *" values={values} setValues={setValues} type="number" min="0" required /><Field name="monthlyExpenses" label="Pengeluaran Bulanan (Rp) *" values={values} setValues={setValues} type="number" min="0" required /><Field name="existingDebt" label="Total Angsuran Existing per Bulan (Rp) *" values={values} setValues={setValues} type="number" min="0" required /><Field name="collateralValue" label="Nilai Agunan (Rp) *" values={values} setValues={setValues} type="number" min="0" required /><Field name="requestedAmount" label="Jumlah Pembiayaan (Rp) *" values={values} setValues={setValues} type="number" min="1" required /><Field name="financingTenor" label="Tenor Pembiayaan (bulan) *" values={values} setValues={setValues} type="number" min="1" required /><Field name="marginRate" label="Total Margin Akad (%) *" values={values} setValues={setValues} type="number" min="0" max="100" step="0.01" required /></div><Field name="loanPurpose" label="Tujuan Pembiayaan *" values={values} setValues={setValues} rows={3} required /></>}
        {step === 2 && <><div className="space-y-4"><div className="font-medium">Dokumen Legal</div>{values.legalDocuments.map((doc, i) => <div key={doc.type} className="grid items-end gap-3 md:grid-cols-3"><Input value={doc.type} disabled /><Select value={doc.status} onValueChange={status => setValues(v => ({ ...v, legalDocuments: v.legalDocuments.map((d, n) => n === i ? { ...d, status: status as Document["status"] } : d) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["pending", "Pending"], ["complete", "Lengkap"], ["verified", "Terverifikasi"], ["missing", "Tidak Ada"]].map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select><Input placeholder="Catatan (opsional)" value={doc.notes} onChange={e => setValues(v => ({ ...v, legalDocuments: v.legalDocuments.map((d, n) => n === i ? { ...d, notes: e.target.value } : d) }))} /></div>)}</div>{select("businessShariaCompliant", "Kepatuhan Bisnis *", [["yes", "Ya, Sepenuhnya"], ["partial", "Sebagian"], ["no", "Tidak"]])}<Field name="shariaComplianceNotes" label="Catatan (Opsional)" values={values} setValues={setValues} rows={3} /></>}
        {step === 3 && <><Field name="environmentalPractices" label="Praktik Lingkungan (Opsional)" values={values} setValues={setValues} rows={2} /><Field name="socialImpact" label="Dampak Sosial (Opsional)" values={values} setValues={setValues} rows={2} />{select("governanceQuality", "Tata Kelola *", [["excellent", "Sangat Baik"], ["good", "Baik"], ["fair", "Cukup"], ["poor", "Kurang"]])}<p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Periksa kembali data sebelum mengirimkan aplikasi. Draft tersimpan otomatis di perangkat ini.</p></>}
      </CardContent></Card><div className="mt-6 flex gap-3">{step > 0 && <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>Kembali</Button>}{step < 3 ? <Button type="button" className="ml-auto" onClick={next}>Lanjutkan</Button> : <Button type="submit" className="ml-auto" disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim Aplikasi</Button>}</div></form>
    </main></div>;
}
