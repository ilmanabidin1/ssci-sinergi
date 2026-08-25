import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, HelpCircle, Loader2, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const DRAFT_KEY = "ssci-new-application-draft-v2";
const steps = ["Nasabah", "Usaha & keuangan", "Akad Murabahah", "Legal & syariah", "ESG & tinjauan"];
type Document = { type: "KTP" | "NPWP" | "NIB"; status: "pending" | "complete" | "verified" | "missing"; notes: string };
type Values = Record<string, any> & { legalDocuments: Document[] };
type ExtractKtpResult = { customerName?: string | null; customerId?: string | null; address?: string | null };
type ExtractKtpMutation = {
  useMutation: (options: {
    onSuccess: (data: ExtractKtpResult) => void;
    onError: (error: { message: string }) => void;
  }) => { isPending: boolean; mutate: (input: { imageBase64: string; contentType: "image/jpeg" | "image/png" }) => void };
};
const initial: Values = { customerName: "", customerId: "", businessName: "", businessType: "", businessAge: "", address: "", phone: "", email: "", monthlyRevenue: "", monthlyExpenses: "", existingDebt: "", collateralValue: "", requestedAmount: "", financingTenor: "", marginRate: "", loanPurpose: "", businessShariaCompliant: "", shariaComplianceNotes: "", murabahahSupplierName: "", murabahahObject: "", murabahahPriceKnown: "", murabahahMarginDisclosed: "", murabahahDownPayment: "", murabahahWakalah: "", murabahahDpsReviewed: "", murabahahNotes: "", environmentalPractices: "", socialImpact: "", governanceQuality: "", legalDocuments: [{ type: "KTP", status: "pending", notes: "" }, { type: "NPWP", status: "pending", notes: "" }, { type: "NIB", status: "pending", notes: "" }] };

const demoFirstNames = ["Andi", "Budi", "Citra", "Dewi", "Eko", "Fitri", "Gunawan", "Hendra", "Indah", "Joko", "Kartika", "Lestari", "Mulyadi", "Nurhayati", "Rahmat", "Siti", "Teguh", "Wulan", "Yudi", "Zainal"];
const demoLastNames = ["Pratama", "Wijaya", "Santoso", "Kurniawan", "Hidayat", "Nugroho", "Saputra", "Maulana", "Rahmawati", "Suryani", "Firmansyah", "Wibowo", "Hakim", "Ramadhani", "Setiawan", "Anggraini", "Prasetyo", "Utami", "Susanti", "Lestari"];
const demoStreets = ["Jl. Merdeka", "Jl. Sudirman", "Jl. Ahmad Yani", "Jl. Gatot Subroto", "Jl. Diponegoro", "Jl. Soekarno-Hatta", "Jl. Pahlawan", "Jl. Veteran", "Jl. Kebon Kawung", "Jl. Asia Afrika"];
const demoKecamatan = ["Cibeunying", "Coblong", "Astanaanyar", "Tegallega", "Lengkong", "Cicendo", "Bojongloa", "Kiaracondong", "Batununggal", "Regol"];
const demoCities = ["Bandung", "Bekasi", "Depok", "Bogor", "Semarang", "Surabaya", "Medan", "Makassar", "Yogyakarta", "Palembang", "Tangerang", "Malang"];
const demoProvinces = ["Jawa Barat", "Banten", "Jawa Tengah", "Jawa Timur", "DI Yogyakarta", "Sumatera Utara", "Sulawesi Selatan", "Sumatera Selatan"];
const demoBusinessNames = ["Toko Sembako", "Bengkel Motor", "Warung Makan", "Laundry", "Konveksi", "Toko Elektronik", "Jasa Pengiriman", "Katering", "Toko Pakaian", "Perbengkelan", "Toko Pertanian", "Fotokopi", "Butik", "Toko Bangunan", "Usaha Ayam Potong", "Toko Kelontong"];
const demoBusinessTypes = ["Perdagangan", "Jasa", "Manufaktur", "Kuliner", "Retail", "Transportasi", "Pertanian"];
const demoLoanPurposes = ["Modal kerja untuk pengembangan usaha", "Pembelian stok barang dagangan", "Penambahan peralatan usaha", "Perluasan tempat usaha", "Penambahan armada pengiriman", "Pembelian bahan baku produksi", "Renovasi tempat usaha", "Penambahan mesin produksi"];
const demoShariaNotes = ["Usaha tidak mengandung unsur riba, gharar, atau maysir dan sesuai fatwa DSN-MUI.", "Seluruh transaksi dicatat secara syariah tanpa bunga dan telah dikaji oleh pihak internal."];
const demoEnvironmental = ["Menggunakan kemasan ramah lingkungan dan mengurangi limbah kemasan.", "Menerapkan pengelolaan limbah dan hemat energi pada operasional harian."];
const demoSocial = ["Mempekerjakan tenaga kerja dari sekitar lingkungan usaha.", "Memberdayakan masyarakat lokal melalui kemitraan usaha dan pemasok lokal."];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const nik = () => {
  const prefix = pick(["3273", "3171", "3271", "3507", "3674", "1271", "1371", "7371", "3402", "3301"]);
  const date = `${String(randInt(1, 28)).padStart(2, "0")}${String(randInt(1, 12)).padStart(2, "0")}${randInt(1950, 2003)}`;
  const serial = String(randInt(1, 999999)).padStart(6, "0");
  return prefix + date + serial;
};
const phone = () => `08${String(randInt(100000000, 999999999))}`;
const roundTo = (value: number, step = 100000) => Math.round(value / step) * step;

const demoCustomer = (): Partial<Values> => {
  const first = pick(demoFirstNames);
  const last = pick(demoLastNames);
  const name = `${first} ${last}`;
  return {
    customerName: name,
    customerId: nik(),
    phone: phone(),
    email: `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 99)}@gmail.com`,
    address: `${pick(demoStreets)} No. ${randInt(1, 120)}, Kec. ${pick(demoKecamatan)}, Kota ${pick(demoCities)}, ${pick(demoProvinces)}`,
  };
};
const demoBusiness = (): Partial<Values> => {
  const revenue = randInt(15, 80) * 1000000;
  const expenses = roundTo(revenue * randInt(52, 72) / 100, 100000);
  const installment = randInt(0, 4) * 500000;
  const requested = roundTo(revenue * randInt(200, 360) / 100, 100000);
  const collateral = roundTo(requested * randInt(125, 180) / 100, 500000);
  return {
    businessName: `${pick(demoBusinessNames)} ${pick(["Sejahtera", "Berkah", "Maju", "Jaya", "Abadi", "Mandiri", "Berseri", "Utama"])}`,
    businessType: pick(demoBusinessTypes),
    businessAge: String(randInt(18, 120)),
    monthlyRevenue: String(revenue),
    monthlyExpenses: String(expenses),
    existingDebt: String(installment),
    collateralValue: String(collateral),
    requestedAmount: String(requested),
    financingTenor: String(pick([12, 24, 36, 48])),
    marginRate: String(pick([8, 10, 11, 12, 13])),
    loanPurpose: pick(demoLoanPurposes),
  };
};
const murabahahOptions = (): string => pick(["yes", "yes", "no", "tidak_relevan", "tidak_relevan"]);
const demoMurabahah = (): Partial<Values> => ({
  murabahahSupplierName: murabahahOptions(), murabahahObject: murabahahOptions(), murabahahPriceKnown: murabahahOptions(),
  murabahahMarginDisclosed: murabahahOptions(), murabahahDownPayment: murabahahOptions(), murabahahWakalah: murabahahOptions(),
  murabahahDpsReviewed: murabahahOptions(),
  murabahahNotes: pick(["Pengadaan telah disetujui oleh DPS.", "Pemasok telah diidentifikasi dan margin telah dihitung."]),
});
const demoLegal = (): Partial<Values> => ({
  legalDocuments: initial.legalDocuments.map(doc => ({ ...doc, status: pick(["complete", "verified", "verified"]) as Document["status"] })),
  businessShariaCompliant: pick(["yes", "yes", "partial"]) as "yes" | "partial",
  shariaComplianceNotes: pick(demoShariaNotes),
});
const demoEsg = (): Partial<Values> => ({
  environmentalPractices: pick(demoEnvironmental),
  socialImpact: pick(demoSocial),
  governanceQuality: pick(["excellent", "good", "good", "fair"]) as "excellent" | "good" | "fair",
});

function Field({ name, label, values, setValues, ...props }: { name: string; label: string; values: Values; setValues: React.Dispatch<React.SetStateAction<Values>>; [key: string]: unknown }) {
  const Component = props.rows ? Textarea : Input;
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Component id={name} name={name} value={String(values[name] || "")} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues(v => ({ ...v, [name]: e.target.value }))} {...props} /></div>;
}

function CurrencyField({ name, label, values, setValues }: { name: string; label: string; values: Values; setValues: React.Dispatch<React.SetStateAction<Values>> }) {
  const raw = String(values[name] || "").replace(/[^\d]/g, "");
  const display = raw ? Number(raw).toLocaleString("id-ID") : "";
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        inputMode="numeric"
        value={display}
        placeholder="0"
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 15);
          setValues(v => ({ ...v, [name]: digits }));
        }}
      />
    </div>
  );
}

export default function NewApplication() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [values, setValues] = useState<Values>(initial);
  const [step, setStep] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
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

  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<{ customerName: string; customerId: string; businessName: string; status: string; latestAssessmentScore: number | null; latestAssessmentClassification: string | null; date: Date } | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const query = values.customerId || values.customerName;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query && query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        setDebouncedQuery(query.trim());
        setHistoryVisible(true);
      }, 500);
    } else {
      setDebouncedQuery("");
      setHistoryVisible(false);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [values.customerId, values.customerName]);

  const historyQuery = trpc.applications.searchCustomerHistory.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0, staleTime: 30_000 }
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setHistoryVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fillFromHistory = (item: typeof selectedHistory) => {
    if (!item) return;
    setValues(current => ({
      ...current,
      customerName: item.customerName,
      customerId: item.customerId,
      businessName: item.businessName,
    }));
    setSelectedHistory(null);
    setHistoryVisible(false);
    setDebouncedQuery("");
  };

  useEffect(() => { try { const saved = localStorage.getItem(DRAFT_KEY); if (saved) setHasDraft(true); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, values, step })); } catch {} }, [values, step]);
  const restore = () => { try { const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || ""); if (saved.version === 2) { setValues({ ...initial, ...saved.values }); setStep(Math.min(saved.step || 0, 4)); setHasDraft(false); } } catch { toast.error("Draft tidak dapat dipulihkan"); } };
  const reset = () => { localStorage.removeItem(DRAFT_KEY); setValues(initial); setStep(0); setHasDraft(false); };
  const fillDemo = (demoStep: number) => setValues(current => ({ ...current, ...(demoStep === 0 ? demoCustomer() : demoStep === 1 ? demoBusiness() : demoStep === 2 ? demoMurabahah() : demoStep === 3 ? demoLegal() : demoEsg()) } as Values));
  const fillAllDemo = () => setValues(current => ({ ...current, ...demoCustomer(), ...demoBusiness(), ...demoMurabahah(), ...demoLegal(), ...demoEsg() } as Values));
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
  const required: Record<number, string[]> = { 0: ["customerName", "customerId", "phone", "address"], 1: ["businessName", "businessType", "businessAge", "monthlyRevenue", "monthlyExpenses", "existingDebt", "collateralValue", "requestedAmount", "financingTenor", "marginRate", "loanPurpose"], 2: [], 3: ["businessShariaCompliant"], 4: ["governanceQuality"] };
  const next = () => { const missing = required[step].filter(key => !String(values[key] || "").trim()); if (missing.length) { toast.error("Lengkapi semua kolom wajib sebelum melanjutkan"); document.getElementById(missing[0])?.focus(); return; } setStep(s => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); const missing = required[4].filter(key => !values[key]?.trim()); if (missing.length) return; createMutation.mutate({ customerName: values.customerName, customerId: values.customerId, businessName: values.businessName, businessType: values.businessType, businessAge: parseInt(values.businessAge), address: values.address, phone: values.phone, email: values.email || undefined, monthlyRevenue: values.monthlyRevenue, monthlyExpenses: values.monthlyExpenses, existingDebt: values.existingDebt, collateralValue: values.collateralValue, requestedAmount: values.requestedAmount, financingTenor: parseInt(values.financingTenor), marginRate: parseFloat(values.marginRate), loanPurpose: values.loanPurpose, legalDocuments: values.legalDocuments, businessShariaCompliant: values.businessShariaCompliant as "yes" | "no" | "partial", shariaComplianceNotes: values.shariaComplianceNotes || undefined, murabahahSupplierName: values.murabahahSupplierName || undefined, murabahahObject: values.murabahahObject || undefined, murabahahPriceKnown: values.murabahahPriceKnown || undefined, murabahahMarginDisclosed: values.murabahahMarginDisclosed || undefined, murabahahDownPayment: values.murabahahDownPayment || undefined, murabahahWakalah: values.murabahahWakalah || undefined, murabahahDpsReviewed: values.murabahahDpsReviewed || undefined, murabahahNotes: values.murabahahNotes || undefined, environmentalPractices: values.environmentalPractices || undefined, socialImpact: values.socialImpact || undefined, governanceQuality: values.governanceQuality as "excellent" | "good" | "fair" | "poor" }); };
  const murabahahField = (name: string, label: string) => <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Select value={values[name]} onValueChange={value => setValues(v => ({ ...v, [name]: value }))}><SelectTrigger id={name}><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="yes">Ya</SelectItem><SelectItem value="no">Tidak</SelectItem><SelectItem value="tidak_relevan">Tidak Relevan</SelectItem></SelectContent></Select></div>;
  const murabahahInfo = <Alert className="border-blue-300 bg-blue-50 text-blue-950"><HelpCircle className="h-4 w-4" /><AlertTitle>Panduan Akad Murabahah</AlertTitle><AlertDescription className="text-blue-900">Ceklist ini mengacu pada Fatwa DSN-MUI No. 04/DSN-MUI/IV/2000 tentang Murabahah. Akad Murabahah adalah akad jual beli di mana bank bertindak sebagai penjual dan nasabah sebagai pembeli, dengan margin keuntungan yang disepakati. Pengisian ceklist ini bersifat opsional.</AlertDescription></Alert>;
  const murabahahStep = <>{murabahahInfo}<div className="grid gap-4 md:grid-cols-2">{murabahahField("murabahahSupplierName", "Nama pemasok disebutkan")}{murabahahField("murabahahObject", "Objek murabahah jelas")}{murabahahField("murabahahPriceKnown", "Harga pokok diketahui")}{murabahahField("murabahahMarginDisclosed", "Margin diungkapkan")}{murabahahField("murabahahDownPayment", "Uang muka disepakati")}{murabahahField("murabahahWakalah", "Wakalah diberikan")}{murabahahField("murabahahDpsReviewed", "Telah ditelaah oleh DPS")}</div><Field name="murabahahNotes" label="Catatan Akad Murabahah (Opsional)" values={values} setValues={setValues} rows={3} /></>;
  const select = (name: string, label: string, options: [string, string][]) => <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Select value={values[name]} onValueChange={value => setValues(v => ({ ...v, [name]: value }))}><SelectTrigger id={name}><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{options.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></div>;
  return <div className="min-h-screen bg-gray-50"><nav className="border-b bg-white"><div className="container flex items-center justify-between py-4"><Button variant="ghost" size="sm" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link></Button><div className="flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /><b className="text-xl text-primary">SSCI</b></div><ProfileMenu /></div></nav>
      <main className="container max-w-4xl py-6 sm:py-8"><div className="mb-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold text-gray-900">Aplikasi Pembiayaan Baru</h1><p className="mt-2 text-gray-600">Lengkapi data nasabah untuk penilaian kelayakan pembiayaan</p></div><Button type="button" variant="outline" onClick={fillAllDemo}>Isi contoh data</Button></div><p className="mt-3 text-xs text-muted-foreground">Mengisi contoh data acak untuk pengujian alur. Data tetap dapat Anda periksa sebelum dikirim.</p></div>
      {hasDraft && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><span>Draft tersimpan ditemukan.</span><span className="flex gap-2"><Button type="button" size="sm" onClick={restore}>Pulihkan draft</Button><Button type="button" size="sm" variant="ghost" onClick={reset}>Mulai ulang</Button></span></div>}
      <div className="mb-6"><div className="mb-2 flex justify-between text-sm font-medium"><span>Langkah {step + 1} dari 5</span><span>{steps[step]}</span></div><div className="flex gap-1">{steps.map((label, i) => <div key={label} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`} aria-label={label} />)}</div></div>
        <form onSubmit={submit}><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{steps[step]}</CardTitle>                  <CardDescription>{step === 0 ? "Data identitas dan kontak nasabah" : step === 1 ? "Detail usaha dan kebutuhan pembiayaan" : step === 2 ? "Ceklist akad Murabahah sesuai fatwa DSN-MUI" : step === 3 ? "Kelengkapan dokumen dan kepatuhan syariah" : "Dampak usaha dan pemeriksaan akhir"}</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={() => fillDemo(step)}>Isi contoh data</Button></div></CardHeader><CardContent className="space-y-4">
                   {step === 0 && <><div className="grid gap-4 md:grid-cols-2"><Field name="customerName" label="Nama Lengkap *" values={values} setValues={setValues} required /><Field name="customerId" label="NIK / ID Nasabah *" values={values} setValues={setValues} required /><Field name="phone" label="Nomor Telepon *" values={values} setValues={setValues} type="tel" required /><Field name="email" label="Email (Opsional)" values={values} setValues={setValues} type="email" /></div>{historyVisible && historyQuery.data && historyQuery.data.length > 0 && <div ref={searchRef} className="relative"><div className="absolute z-10 w-full rounded-lg border border-slate-200 bg-white shadow-lg"><div className="p-2 text-xs font-medium text-muted-foreground">Riwayat pengajuan nasabah</div><div className="max-h-64 overflow-y-auto">{selectedHistory ? <div className="border-t p-3"><p className="text-sm font-medium">Lanjutkan pengajuan untuk nasabah ini?</p><p className="mt-1 text-sm text-muted-foreground">{selectedHistory.customerName} - {selectedHistory.businessName}</p><div className="mt-2 flex gap-2"><Button type="button" size="sm" onClick={() => fillFromHistory(selectedHistory)}>Ya, lanjutkan</Button><Button type="button" size="sm" variant="outline" onClick={() => setSelectedHistory(null)}>Batal</Button></div></div> : historyQuery.data.map(item => <button key={item.customerId + item.date} type="button" className="flex w-full items-center gap-3 border-t px-3 py-2 text-left hover:bg-slate-50" onClick={() => setSelectedHistory({ customerName: item.customerName, customerId: item.customerId, businessName: item.businessName, status: item.status, latestAssessmentScore: item.latestAssessmentScore, latestAssessmentClassification: item.latestAssessmentClassification, date: item.date })}><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{item.customerName}</div><div className="text-xs text-muted-foreground truncate">{item.businessName}</div></div><div className="text-right"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${item.status === "approved" ? "bg-green-100 text-green-800" : item.status === "rejected" ? "bg-red-100 text-red-800" : item.status === "assessed" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>{item.status === "approved" ? "Disetujui" : item.status === "rejected" ? "Ditolak" : item.status === "assessed" ? "Dinilai" : "Pending"}</span>{item.latestAssessmentScore !== null && <div className="mt-0.5 text-xs text-muted-foreground">Skor: {item.latestAssessmentScore} {item.latestAssessmentClassification ? `(${item.latestAssessmentClassification})` : ""}</div>}</div></button>)}</div>{historyQuery.isFetching && <div className="border-t p-2 text-center text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Mencari...</div>}</div></div>}<Field name="address" label="Alamat Lengkap *" values={values} setValues={setValues} rows={3} required /><div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div><h3 className="font-medium">Isi data dari foto KTP</h3><p className="text-sm text-muted-foreground">JPG atau PNG, maksimal 5 MB. File hanya dikirim saat Anda menekan tombol proses dan tidak disimpan dalam draft.</p></div><div className="flex flex-wrap items-center gap-3"><Input type="file" accept="image/jpeg,image/png" onChange={selectKtpFile} className="max-w-md bg-white" /><Button type="button" variant="outline" onClick={processKtp} disabled={extractKtpMutation.isPending}>{extractKtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Proses OCR KTP</Button></div>{ktpFile && <p className="text-xs text-muted-foreground">File dipilih: {ktpFile.name}</p>}{ktpError && <p className="flex items-center gap-1 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{ktpError}</p>}{ktpProcessed && <Alert className="border-green-200 bg-green-50 text-green-900"><CheckCircle2 /><AlertTitle>Data OCR berhasil diisi</AlertTitle><AlertDescription className="text-green-800">Hasil OCR wajib diverifikasi secara manual sebelum aplikasi dikirimkan.</AlertDescription></Alert>}</div></>}
         {step === 1 && <><div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">Import data keuangan dari CSV</h3><p className="text-sm text-muted-foreground">Gunakan 1 sampai 12 baris bulanan dengan kolom month, revenue, expenses, existingInstallment.</p></div><Button type="button" variant="ghost" size="sm" onClick={downloadFinancialTemplate}><Download className="mr-2 h-4 w-4" />Unduh template CSV</Button></div><div className="flex flex-wrap items-center gap-3"><Input type="file" accept=".csv,text/csv" onChange={selectFinancialFile} className="max-w-md bg-white" /><Button type="button" variant="outline" onClick={importFinancialFile} disabled={importFinancialMutation.isPending}>{importFinancialMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import data CSV</Button></div>{financialFile && <p className="text-xs text-muted-foreground">File dipilih: {financialFile.name}</p>}{financialError && <p className="text-sm text-red-600">{financialError}</p>}</div><div className="grid gap-4 md:grid-cols-2"><Field name="businessName" label="Nama Usaha *" values={values} setValues={setValues} required /><Field name="businessType" label="Jenis Usaha *" values={values} setValues={setValues} required /><Field name="businessAge" label="Lama Usaha (bulan) *" values={values} setValues={setValues} type="number" min="1" required /><CurrencyField name="monthlyRevenue" label="Pendapatan Bulanan (Rp) *" values={values} setValues={setValues} /><CurrencyField name="monthlyExpenses" label="Pengeluaran Bulanan (Rp) *" values={values} setValues={setValues} /><CurrencyField name="existingDebt" label="Total Angsuran Existing per Bulan (Rp) *" values={values} setValues={setValues} /><CurrencyField name="collateralValue" label="Nilai Agunan (Rp) *" values={values} setValues={setValues} /><CurrencyField name="requestedAmount" label="Jumlah Pembiayaan (Rp) *" values={values} setValues={setValues} /><Field name="financingTenor" label="Tenor Pembiayaan (bulan) *" values={values} setValues={setValues} type="number" min="1" required /><Field name="marginRate" label="Total Margin Akad (%) *" values={values} setValues={setValues} type="number" min="0" max="100" step="0.01" required /></div><Field name="loanPurpose" label="Tujuan Pembiayaan *" values={values} setValues={setValues} rows={3} required /></>}
        {step === 2 && murabahahStep}
        {step === 3 && <><div className="space-y-4"><div className="font-medium">Dokumen Legal</div>{values.legalDocuments.map((doc, i) => <div key={doc.type} className="grid items-end gap-3 md:grid-cols-3"><Input value={doc.type} disabled /><Select value={doc.status} onValueChange={status => setValues(v => ({ ...v, legalDocuments: v.legalDocuments.map((d, n) => n === i ? { ...d, status: status as Document["status"] } : d) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["pending", "Pending"], ["complete", "Lengkap"], ["verified", "Terverifikasi"], ["missing", "Tidak Ada"]].map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select><Input placeholder="Catatan (opsional)" value={doc.notes} onChange={e => setValues(v => ({ ...v, legalDocuments: v.legalDocuments.map((d, n) => n === i ? { ...d, notes: e.target.value } : d) }))} /></div>)}</div>{select("businessShariaCompliant", "Kepatuhan Bisnis *", [["yes", "Ya, Sepenuhnya"], ["partial", "Sebagian"], ["no", "Tidak"]])}<Field name="shariaComplianceNotes" label="Catatan (Opsional)" values={values} setValues={setValues} rows={3} /></>}
        {step === 4 && <><Field name="environmentalPractices" label="Praktik Lingkungan (Opsional)" values={values} setValues={setValues} rows={2} /><Field name="socialImpact" label="Dampak Sosial (Opsional)" values={values} setValues={setValues} rows={2} />{select("governanceQuality", "Tata Kelola *", [["excellent", "Sangat Baik"], ["good", "Baik"], ["fair", "Cukup"], ["poor", "Kurang"]])}<p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Periksa kembali data sebelum mengirimkan aplikasi. Draft tersimpan otomatis di perangkat ini.</p></>}
             </CardContent></Card><div className="mt-6 flex gap-3">{step > 0 && <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>Kembali</Button>}{step < 4 ? <Button type="button" className="ml-auto" onClick={next}>Lanjutkan</Button> : <Button type="submit" className="ml-auto" disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim Aplikasi</Button>}</div></form>
    </main></div>;
}
