import { DailySalesCalculator, ReviewTrackHint } from "@/components/DailySalesCalculator";
import { buildDemoScenario, demoAkadFields, type DemoScenario } from "@shared/demoData";
import { AiDocumentReader } from "@/components/AiDocumentReader";
import { AppHeader } from "@/components/AppHeader";
import { ChoiceCards } from "@/components/ChoiceCards";
import { useConfirm } from "@/components/ConfirmDialog";
import { RupiahInput } from "@/components/RupiahInput";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Check, CheckCircle2, Download, HelpCircle, Loader2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { determineReviewTrack, TRACK_REQUIREMENTS } from "@shared/reviewTrack";
import { BPRS_OPTIONS, BPRS_TEMPLATE_LABELS, type BprsProfile } from "@shared/bprsTemplate";
import {
  BPRS_PRODUCT_SEGMENTS,
  BPRS_SEGMENT_DETAILS,
  type BprsProductSegment,
} from "@shared/bprsPolicy";

const DRAFT_KEY = "ssci-new-application-draft-v4";
const DRAFT_VERSION = 4;
/** Tombol "Isi contoh data" dapat dimatikan di produksi dengan VITE_DEMO_MODE=false. */
const SHOW_DEMO = import.meta.env.VITE_DEMO_MODE !== "false";
const steps = ["Nasabah & usaha", "Keuangan & akad", "Dokumen & syariah", "Periksa & kirim"];
const STEP_DESCRIPTIONS = [
  "Segmen produk, identitas nasabah, dan usaha",
  "Angka keuangan, kebutuhan pembiayaan, dan ceklist akad",
  "Kelengkapan dokumen, kepatuhan syariah, dan tata kelola",
  "Periksa ringkasan sebelum mengirim",
];
const DEMO_STEPS: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: false };
const INFO_PANEL = "border-border bg-muted text-navy-900";
const AKAD_LABELS: Record<string, string> = {
  murabahah: "Murabahah",
  mudharabah: "Mudharabah",
  qardh: "Al-Qardh",
  multijasa: "Ijarah Multijasa",
};
const DOC_STATUS_OPTIONS: Array<[Document["status"], string]> = [["pending", "Pending"], ["complete", "Lengkap"], ["verified", "Terverifikasi"], ["missing", "Tidak Ada"]];
const HISTORY_STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Menunggu penilaian", tone: "bg-amber-50 text-amber-900" },
  assessed: { label: "Dinilai", tone: "bg-muted text-navy-900" },
  approved: { label: "Disetujui", tone: "bg-emerald-50 text-emerald-800" },
  rejected: { label: "Ditolak", tone: "bg-red-50 text-red-800" },
  cancelled: { label: "Dibatalkan", tone: "bg-slate-100 text-slate-700" },
};
type Document = { type: string; status: "pending" | "complete" | "verified" | "missing"; notes: string };
type Values = Record<string, any> & { legalDocuments: Document[]; productSegment: BprsProductSegment };
type SavedDraft = { version: number; values: Values; step: number; savedAt?: number };
type ExtractKtpResult = { customerName?: string | null; customerId?: string | null; address?: string | null };
type ExtractKtpMutation = {
  useMutation: (options: {
    onSuccess: (data: ExtractKtpResult) => void;
    onError: (error: unknown) => void;
  }) => { isPending: boolean; mutate: (input: { imageBase64: string; contentType: "image/jpeg" | "image/png" }) => void };
};
const initial: Values = {
  productSegment: "umkm",
  isRelatedParty: "no",
  relatedPartyRelation: "",
  incomeSourceType: "non_fixed",
  customerName: "",
  customerId: "",
  businessName: "",
  businessType: "",
  businessAge: "",
  address: "",
  phone: "",
  email: "",
  monthlyRevenue: "",
  monthlyExpenses: "",
  existingDebt: "",
  collateralValue: "",
  requestedAmount: "",
  financingTenor: "",
  marginRate: "",
  loanPurpose: "",
  businessShariaCompliant: "",
  shariaComplianceNotes: "",
  financingAkad: "murabahah",
  qardhAdminFee: "",
  qardhPurpose: "",
  multijasaServiceCategory: "",
  multijasaAkadType: "",
  multijasaServiceProvider: "",
  multijasaSourceObject: "",
  multijasaServiceCost: "",
  multijasaDownPayment: "",
  multijasaUjrahAmount: "",
  murabahahType: "",
  murabahahSupplierName: "",
  murabahahObject: "",
  murabahahPriceKnown: "",
  murabahahMarginDisclosed: "",
  murabahahDownPayment: "",
  murabahahWakalah: "",
  murabahahDpsReviewed: "",
  murabahahAcquisitionPrice: "",
  murabahahDirectCost: "",
  murabahahSupplierDiscount: "",
  murabahahDownPaymentAmount: "",
  murabahahWakalahConfirmedAt: "",
  murabahahInvoiceNumber: "",
  murabahahQabdhVerifiedAt: "",
  murabahahSignedAt: "",
  murabahahTaazirToWelfare: "yes",
  murabahahNotes: "",
  mudharabahType: "",
  mudharabahCapitalValue: "",
  mudharabahCapitalForm: "",
  mudharabahBusinessPurpose: "",
  mudharabahProfitSharingMethod: "",
  mudharabahBankNisbah: "",
  mudharabahCustomerNisbah: "",
  mudharabahPbh: "",
  mudharabahRbh: "",
  mudharabahCollateral: "",
  mudharabahGuarantor: "",
  mudharabahTaazirToWelfare: "yes",
  mudharabahSignedAt: "",
  mudharabahNotes: "",
  environmentalPractices: "",
  socialImpact: "",
  governanceQuality: "",
  bprsProfile: {},
  legalDocuments: [
    { type: "KTP", status: "pending", notes: "" },
    { type: "NPWP", status: "pending", notes: "" },
    { type: "NIB", status: "pending", notes: "" },
  ],
};

type ErrorsApi = { errors: Record<string, string>; clearError: (name: string) => void };
const ErrorsContext = createContext<ErrorsApi>({ errors: {}, clearError: () => {} });

const describedBy = (name: string, error?: string, help?: ReactNode) =>
  [help ? `${name}-help` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;

/** Teks bantuan dan pesan error yang terhubung ke kolom lewat aria-describedby. */
function FieldHint({ name, error, help }: { name: string; error?: string; help?: ReactNode }) {
  return <>
    {help && <p id={`${name}-help`} className="text-xs text-muted-foreground">{help}</p>}
    {error && <p id={`${name}-error`} className="flex items-center gap-1 text-sm font-medium text-destructive"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
  </>;
}

const isRequiredLabel = (label: string) => label.trim().endsWith("*");

function Field({ name, label, values, setValues, help, sanitize, ...props }: { name: string; label: string; values: Values; setValues: React.Dispatch<React.SetStateAction<Values>>; help?: ReactNode; sanitize?: (value: string) => string; [key: string]: unknown }) {
  const { errors, clearError } = useContext(ErrorsContext);
  const error = errors[name];
  const Component = props.rows ? Textarea : Input;
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Component
        id={name}
        name={name}
        value={String(values[name] ?? "")}
        aria-invalid={error ? true : undefined}
        aria-required={isRequiredLabel(label) || undefined}
        aria-describedby={describedBy(name, error, help)}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const next = sanitize ? sanitize(e.target.value) : e.target.value;
          setValues(v => ({ ...v, [name]: next }));
          if (error) clearError(name);
        }}
        {...props}
      />
      <FieldHint name={name} error={error} help={help} />
    </div>
  );
}

function CurrencyField({ name, label, values, setValues, help }: { name: string; label: string; values: Values; setValues: React.Dispatch<React.SetStateAction<Values>>; help?: ReactNode }) {
  const { errors, clearError } = useContext(ErrorsContext);
  const error = errors[name];
  const raw = String(values[name] ?? "").replace(/[^\d.]/g, "");
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <RupiahInput
        id={name}
        name={name}
        value={raw === "" ? undefined : raw}
        placeholder="0"
        aria-invalid={error ? true : undefined}
        aria-required={isRequiredLabel(label) || undefined}
        aria-describedby={describedBy(name, error, help)}
        onValueChange={n => {
          setValues(v => ({ ...v, [name]: n === undefined ? "" : String(n) }));
          if (error) clearError(name);
        }}
      />
      <FieldHint name={name} error={error} help={help} />
    </div>
  );
}

function SelectField({ name, label, value, onChange, options, placeholder = "Pilih", disabled, help }: { name: string; label: string; value: string | undefined; onChange: (value: string) => void; options: Array<[string, string]>; placeholder?: string; disabled?: boolean; help?: ReactNode }) {
  const { errors, clearError } = useContext(ErrorsContext);
  const error = errors[name];
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Select value={value ?? ""} disabled={disabled} onValueChange={next => { onChange(next); if (error) clearError(name); }}>
        <SelectTrigger id={name} className="w-full min-w-0" aria-invalid={error ? true : undefined} aria-required={isRequiredLabel(label) || undefined} aria-describedby={describedBy(name, error, help)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)]">
          {options.map(([optionValue, text]) => <SelectItem key={optionValue} value={optionValue}>{text}</SelectItem>)}
        </SelectContent>
      </Select>
      <FieldHint name={name} error={error} help={help} />
    </div>
  );
}

/** Fokus dan gulir ke kolom bermasalah yang paling atas di halaman. */
function focusFirstInvalid(keys: string[]) {
  const elements = keys.map(key => document.getElementById(key)).filter((el): el is HTMLElement => !!el);
  elements.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const first = elements[0];
  if (!first) return;
  first.scrollIntoView({ behavior: "smooth", block: "center" });
  first.focus({ preventScroll: true });
}

const hasValue = (value: unknown) => String(value ?? "").trim() !== "";

/** Kolom yang sudah diisi pengguna (bukan nilai bawaan formulir). */
function isUserFilled(key: string, current: Values): boolean {
  const value = current[key];
  if (key === "legalDocuments") return (value as Document[] | undefined)?.some(d => d.status !== "pending" || d.notes.trim()) ?? false;
  if (key === "bprsProfile") return Object.keys(compactProfile(value) ?? {}).length > 0;
  if (!hasValue(value)) return false;
  return String(value) !== String(initial[key] ?? "");
}

export default function NewApplication() {
  usePageTitle("Pengajuan Baru");
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { confirm } = useConfirm();
  const [values, setValues] = useState<Values>(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorSummary, setErrorSummary] = useState("");
  const [financeMethod, setFinanceMethod] = useState<FinanceMethod>("manual");
  const isFastTrack = determineReviewTrack({ requestedAmount: values.requestedAmount || 0, isRelatedParty: values.isRelatedParty }) === "ringkas";
  const [hasDraft, setHasDraft] = useState(false);
  const [draftDecided, setDraftDecided] = useState(false);
  const savedDraftRef = useRef<SavedDraft | null>(null);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpError, setKtpError] = useState("");
  const [ktpProcessed, setKtpProcessed] = useState(false);
  const ktpInputRef = useRef<HTMLInputElement | null>(null);
  const [financialFile, setFinancialFile] = useState<File | null>(null);
  const [financialError, setFinancialError] = useState("");
  const financialInputRef = useRef<HTMLInputElement | null>(null);

  const clearError = (name: string) => setErrors(current => {
    if (!current[name]) return current;
    const { [name]: _removed, ...rest } = current;
    if (!Object.keys(rest).length) setErrorSummary("");
    return rest;
  });

  const goTo = (target: number, scroll = true) => {
    setStep(target);
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const importFinancialMutation = trpc.applications.importFinancialCsv.useMutation({
    onSuccess: data => {
      setValues(current => ({ ...current, monthlyRevenue: String(data.monthlyRevenue), monthlyExpenses: String(data.monthlyExpenses), existingDebt: String(data.existingInstallment) }));
      setFinancialError("");
      setFinancialFile(null);
      if (financialInputRef.current) financialInputRef.current.value = "";
      toast.success(`${data.rowCount} bulan berhasil diimpor`);
    },
    onError: error => setFinancialError(`Import CSV gagal: ${errorMessage(error, "file tidak dapat diproses.")}`),
  });
  const createMutation = trpc.applications.create.useMutation({
    onSuccess: data => {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      toast.success("Aplikasi pembiayaan berhasil dibuat");
      setLocation(`/applications/${data.id}`);
    },
    onError: error => {
      const serverErrors = fieldErrors(error);
      const keys = Object.keys(serverErrors);
      if (keys.length) {
        setErrors(serverErrors);
        setErrorSummary(`Ada ${keys.length} kolom yang perlu diperbaiki.`);
        const target = [0, 1, 2].find(i => keys.some(key => requiredFor(i).includes(key) || OPTIONAL_KEYS[i]?.includes(key)));
        if (target !== undefined) {
          goTo(target, false);
          window.setTimeout(() => focusFirstInvalid(keys), 80);
        }
      }
      toast.error(errorMessage(error, "Gagal membuat aplikasi. Coba lagi beberapa saat."));
    },
  });
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
      if (ktpInputRef.current) ktpInputRef.current.value = "";
    },
    onError: error => setKtpError(`OCR KTP gagal diproses: ${errorMessage(error, "coba lagi dengan foto yang lebih jelas.")}`),
  });

  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [historyVisible, setHistoryVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipHistoryRef = useRef(false);
  const historyAnchorRef = useRef<HTMLDivElement | null>(null);
  const historyInputRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const query = values.customerId || values.customerName;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
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
  const historyItems = historyQuery.data ?? [];
  const historyOpen = historyVisible && historyItems.length > 0;

  const hasMurabahahNumbers = ["murabahahAcquisitionPrice", "murabahahDirectCost", "murabahahSupplierDiscount", "murabahahDownPaymentAmount"].some(key => String(values[key] || "") !== "");
  const murabahahPreviewQuery = trpc.applications.murabahahPreview.useQuery(
    {
      requestedAmount: String(values.requestedAmount || ""),
      acquisitionPrice: String(values.murabahahAcquisitionPrice || "") || null,
      directCost: String(values.murabahahDirectCost || "") || null,
      supplierDiscount: String(values.murabahahSupplierDiscount || "") || null,
      downPaymentAmount: String(values.murabahahDownPaymentAmount || "") || null,
      marginRate: String(values.marginRate || "") || null,
    },
    { enabled: Boolean(values.requestedAmount) && hasMurabahahNumbers, staleTime: 30_000 }
  );

  const chooseHistory = async (item: (typeof historyItems)[number]) => {
    setHistoryVisible(false);
    const ok = await confirm({
      title: "Isi dari riwayat nasabah?",
      description: `${item.customerName} - ${item.businessName}. Nama, NIK, dan nama usaha akan diisi dari pengajuan sebelumnya.`,
      confirmLabel: "Ya, isi data",
    });
    if (!ok) return;
    skipHistoryRef.current = true;
    setValues(current => ({ ...current, customerName: item.customerName, customerId: item.customerId, businessName: item.businessName }));
    setDebouncedQuery("");
    ["customerName", "customerId", "businessName"].forEach(clearError);
  };

  const historyListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? Math.min(index + 1, buttons.length - 1) : index - 1;
    if (next < 0) historyInputRef.current?.focus();
    else buttons[next]?.focus();
  };
  const historyFieldProps = {
    role: "combobox",
    "aria-autocomplete": "list",
    "aria-expanded": historyOpen,
    "aria-controls": historyOpen ? "history-list" : undefined,
    onFocus: (event: React.FocusEvent<HTMLElement>) => { historyInputRef.current = event.currentTarget; },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "ArrowDown" && historyOpen) {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>("#history-list button")?.focus();
      }
    },
  };

  // Draft dibaca sekali ke ref. Autosave baru aktif setelah pengguna memilih
  // memulihkan atau membuang draft, supaya draft lama tidak tertimpa.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const saved = raw ? (JSON.parse(raw) as SavedDraft) : null;
      if (saved && saved.version === DRAFT_VERSION && saved.values) {
        savedDraftRef.current = saved;
        setHasDraft(true);
        return;
      }
    } catch {}
    setDraftDecided(true);
  }, []);
  useEffect(() => {
    if (!draftDecided) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, values, step, savedAt: Date.now() })); } catch {}
  }, [values, step, draftDecided]);
  const restore = () => {
    const saved = savedDraftRef.current;
    if (!saved) {
      toast.error("Draft tidak dapat dipulihkan");
      return;
    }
    setValues({ ...initial, ...saved.values });
    setStep(Math.min(saved.step || 0, steps.length - 1));
    setErrors({});
    setErrorSummary("");
    setHasDraft(false);
    setDraftDecided(true);
    toast.success("Draft dipulihkan");
  };
  const discardDraft = async () => {
    const ok = await confirm({
      title: "Buang draft tersimpan?",
      description: "Semua isian draft akan dihapus dari perangkat ini dan tidak dapat dipulihkan.",
      confirmLabel: "Ya, buang draft",
      destructive: true,
    });
    if (!ok) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    savedDraftRef.current = null;
    setHasDraft(false);
    setDraftDecided(true);
  };
  const draftSavedAt = savedDraftRef.current?.savedAt
    ? new Date(savedDraftRef.current.savedAt).toLocaleString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : null;

  // Satu skenario dipakai bersama oleh tombol contoh di setiap langkah, sehingga
  // identitas, usaha, keuangan, dan akad saling konsisten.
  const scenarioRef = useRef<DemoScenario | null>(null);
  const scenarioFor = (current: Values, fresh = false) => {
    if (fresh || !scenarioRef.current) {
      scenarioRef.current = buildDemoScenario({ segment: current.productSegment, incomeSourceType: current.incomeSourceType });
    }
    return scenarioRef.current;
  };
  const demoSlice = (scenario: DemoScenario, current: Values, part: "nasabah" | "keuangan" | "dokumen"): Partial<Values> => {
    if (part === "nasabah") {
      return { ...scenario.customer, ...scenario.business, incomeSourceType: scenario.incomeSourceType, isRelatedParty: "no", bprsProfile: scenario.profile };
    }
    if (part === "keuangan") {
      return { ...scenario.finance, ...demoAkadFields(scenario, current.financingAkad) };
    }
    return {
      ...scenario.legal,
      ...scenario.esg,
      legalDocuments: current.legalDocuments.map(doc => ({ ...doc, status: "complete" as const, notes: "" })),
    };
  };
  /** Mengisi data contoh; meminta konfirmasi bila ada isian pengguna yang akan tertimpa, dan bisa diurungkan. */
  const applyDemo = async (build: (current: Values) => Values) => {
    const previous = values;
    const next = build(previous);
    const overwritten = Object.keys(next).filter(key => isUserFilled(key, previous) && JSON.stringify(next[key]) !== JSON.stringify(previous[key]));
    if (overwritten.length) {
      const ok = await confirm({
        title: "Timpa isian dengan data contoh?",
        description: `${overwritten.length} kolom yang sudah Anda isi akan diganti data contoh fiktif. Jangan gunakan data contoh untuk pengajuan nasabah sungguhan.`,
        confirmLabel: "Timpa dengan contoh",
        destructive: true,
      });
      if (!ok) return;
    }
    setValues(next);
    setErrors({});
    setErrorSummary("");
    toast.success("Data contoh diisi", { action: { label: "Urungkan", onClick: () => setValues(previous) } });
  };
  const fillDemo = (target: number) => applyDemo(current => {
    const scenario = scenarioFor(current, target === 0);
    const part = target === 0 ? "nasabah" : target === 1 ? "keuangan" : "dokumen";
    return { ...current, ...demoSlice(scenario, current, part) } as Values;
  });
  const fillAllDemo = () => applyDemo(current => {
    const scenario = scenarioFor(current, true);
    const merged = { ...current, ...demoSlice(scenario, current, "nasabah") } as Values;
    return { ...merged, ...demoSlice(scenario, merged, "keuangan"), ...demoSlice(scenario, merged, "dokumen") } as Values;
  });
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

  /** Daftar kolom wajib per langkah, mengikuti akad dan status pihak terkait yang dipilih (urutan sesuai tampilan). */
  function requiredFor(i: number, v: Values = values): string[] {
    if (i === 0) return ["customerName", "customerId", "phone", ...(v.isRelatedParty === "yes" ? ["relatedPartyRelation"] : []), "address", "businessName", "businessType", "businessAge"];
    if (i === 1) return [
      "monthlyRevenue", "monthlyExpenses", "existingDebt", "collateralValue", "requestedAmount", "financingTenor", "marginRate", "loanPurpose",
      ...(v.financingAkad === "qardh" ? ["qardhPurpose"] : []),
      ...(v.financingAkad === "multijasa" ? ["multijasaServiceCategory", "multijasaAkadType", "multijasaServiceProvider", "multijasaSourceObject", "multijasaServiceCost", "multijasaUjrahAmount"] : []),
    ];
    if (i === 2) return ["businessShariaCompliant", "governanceQuality"];
    return [];
  }
  const validateStep = (i: number, v: Values = values): Record<string, string> => {
    const found: Record<string, string> = {};
    for (const key of requiredFor(i, v)) if (!hasValue(v[key])) found[key] = "Wajib diisi.";
    const filled = (key: string) => !found[key] && hasValue(v[key]);
    if (i === 0) {
      if (filled("customerId") && !/^\d{16}$/.test(String(v.customerId).trim())) found.customerId = "NIK harus 16 digit angka.";
      if (filled("phone") && !/^\+?\d{9,15}$/.test(String(v.phone).replace(/[\s-]/g, ""))) found.phone = "Nomor telepon tidak valid. Contoh: 081234567890.";
      if (hasValue(v.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v.email).trim())) found.email = "Format email tidak valid. Contoh: nama@contoh.com.";
      if (filled("businessAge") && !(Number.isInteger(Number(v.businessAge)) && Number(v.businessAge) >= 1)) found.businessAge = "Lama usaha minimal 1 bulan.";
    }
    if (i === 1) {
      if (filled("requestedAmount") && !(Number(v.requestedAmount) > 0)) found.requestedAmount = "Jumlah pembiayaan harus lebih dari 0.";
      if (filled("financingTenor") && !(Number.isInteger(Number(v.financingTenor)) && Number(v.financingTenor) >= 1)) found.financingTenor = "Tenor minimal 1 bulan.";
      if (filled("marginRate") && !(Number(v.marginRate) >= 0 && Number(v.marginRate) <= 100)) found.marginRate = "Margin harus antara 0 sampai 100%.";
      if (v.financingAkad === "mudharabah" && hasValue(v.mudharabahBankNisbah) && hasValue(v.mudharabahCustomerNisbah) && Number(v.mudharabahBankNisbah) + Number(v.mudharabahCustomerNisbah) !== 100) {
        found.mudharabahCustomerNisbah = "Total nisbah bank dan nasabah harus 100%.";
      }
    }
    return found;
  };
  const reportErrors = (found: Record<string, string>) => {
    const count = Object.keys(found).length;
    setErrors(found);
    setErrorSummary(`Ada ${count} kolom yang perlu dilengkapi atau diperbaiki. Kolom tersebut ditandai merah di bawah.`);
  };
  const next = () => {
    const found = validateStep(step);
    if (Object.keys(found).length) {
      reportErrors(found);
      focusFirstInvalid(Object.keys(found));
      return;
    }
    setErrors({});
    setErrorSummary("");
    goTo(step + 1);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < steps.length - 1) return next();
    for (const i of [0, 1, 2]) {
      const found = validateStep(i);
      if (Object.keys(found).length) {
        reportErrors(found);
        toast.error(`Masih ada isian yang perlu diperbaiki di langkah "${steps[i]}"`);
        goTo(i, false);
        window.setTimeout(() => focusFirstInvalid(Object.keys(found)), 80);
        return;
      }
    }
    const bprsProfile = compactProfile(values.bprsProfile);
    createMutation.mutate({
      customerName: values.customerName,
      customerId: values.customerId,
      businessName: values.businessName,
      businessType: values.businessType,
      businessAge: parseInt(values.businessAge),
      address: values.address,
      phone: values.phone,
      email: values.email || undefined,
      monthlyRevenue: values.monthlyRevenue,
      monthlyExpenses: values.monthlyExpenses,
      existingDebt: values.existingDebt,
      collateralValue: values.collateralValue,
      requestedAmount: values.requestedAmount,
      financingTenor: parseInt(values.financingTenor),
      marginRate: parseFloat(values.marginRate),
      loanPurpose: values.loanPurpose,
      legalDocuments: values.legalDocuments,
      financialDataSource: values.financialDataSource || undefined,
      financialDataNote: values.financialDataNote || undefined,
      businessShariaCompliant: values.businessShariaCompliant as "yes" | "no" | "partial",
      shariaComplianceNotes: values.shariaComplianceNotes || undefined,
      financingAkad: (["murabahah", "mudharabah", "qardh", "multijasa"] as const).find(a => a === values.financingAkad) ?? "murabahah",
      bprsProfile,
      isRelatedParty: values.isRelatedParty as "yes" | "no",
      relatedPartyRelation: values.relatedPartyRelation || undefined,
      incomeSourceType: values.incomeSourceType as "fixed" | "non_fixed" | "joint_income",
      qardhAdminFee: values.qardhAdminFee ? String(values.qardhAdminFee) : undefined,
      qardhPurpose: values.qardhPurpose || undefined,
      multijasaAkadType: values.multijasaAkadType || undefined,
      multijasaServiceCategory: values.multijasaServiceCategory || undefined,
      multijasaServiceProvider: values.multijasaServiceProvider || undefined,
      multijasaSourceObject: values.multijasaSourceObject || undefined,
      multijasaServiceCost: values.multijasaServiceCost ? String(values.multijasaServiceCost) : undefined,
      multijasaDownPayment: values.multijasaDownPayment ? String(values.multijasaDownPayment) : undefined,
      multijasaUjrahAmount: values.multijasaUjrahAmount ? String(values.multijasaUjrahAmount) : undefined,
      multijasaWakalah: values.multijasaWakalah || undefined,
      multijasaDpsReviewed: values.multijasaDpsReviewed || undefined,
      multijasaTaazirToWelfare: values.multijasaTaazirToWelfare || undefined,
      multijasaNotes: values.multijasaNotes || undefined,
      mudharabahType: values.mudharabahType || undefined,
      mudharabahCapitalValue: values.mudharabahCapitalValue ? String(values.mudharabahCapitalValue) : undefined,
      mudharabahCapitalForm: values.mudharabahCapitalForm || undefined,
      mudharabahBusinessPurpose: values.mudharabahBusinessPurpose || undefined,
      mudharabahProfitSharingMethod: values.mudharabahProfitSharingMethod || undefined,
      mudharabahBankNisbah: values.mudharabahBankNisbah ? String(values.mudharabahBankNisbah) : undefined,
      mudharabahCustomerNisbah: values.mudharabahCustomerNisbah ? String(values.mudharabahCustomerNisbah) : undefined,
      mudharabahPbh: values.mudharabahPbh ? String(values.mudharabahPbh) : undefined,
      mudharabahRbh: values.mudharabahRbh ? String(values.mudharabahRbh) : undefined,
      mudharabahCollateral: values.mudharabahCollateral || undefined,
      mudharabahGuarantor: values.mudharabahGuarantor || undefined,
      mudharabahTaazirToWelfare: values.mudharabahTaazirToWelfare || undefined,
      mudharabahSignedAt: values.mudharabahSignedAt ? new Date(values.mudharabahSignedAt) : undefined,
      mudharabahNotes: values.mudharabahNotes || undefined,
      murabahahType: values.murabahahType || undefined,
      murabahahSupplierName: values.murabahahSupplierName || undefined,
      murabahahObject: values.murabahahObject || undefined,
      murabahahPriceKnown: values.murabahahPriceKnown || undefined,
      murabahahMarginDisclosed: values.murabahahMarginDisclosed || undefined,
      murabahahDownPayment: values.murabahahDownPayment || undefined,
      murabahahWakalah: values.murabahahWakalah || undefined,
      murabahahDpsReviewed: values.murabahahDpsReviewed || undefined,
      murabahahAcquisitionPrice: values.murabahahAcquisitionPrice ? String(values.murabahahAcquisitionPrice) : undefined,
      murabahahDirectCost: values.murabahahDirectCost ? String(values.murabahahDirectCost) : undefined,
      murabahahSupplierDiscount: values.murabahahSupplierDiscount ? String(values.murabahahSupplierDiscount) : undefined,
      murabahahDownPaymentAmount: values.murabahahDownPaymentAmount ? String(values.murabahahDownPaymentAmount) : undefined,
      murabahahMarginAmount: values.murabahahMarginAmount ? String(values.murabahahMarginAmount) : undefined,
      murabahahInvoiceNumber: values.murabahahInvoiceNumber || undefined,
      murabahahWakalahConfirmedAt: values.murabahahWakalahConfirmedAt ? new Date(values.murabahahWakalahConfirmedAt) : undefined,
      murabahahQabdhVerifiedAt: values.murabahahQabdhVerifiedAt ? new Date(values.murabahahQabdhVerifiedAt) : undefined,
      murabahahSignedAt: values.murabahahSignedAt ? new Date(values.murabahahSignedAt) : undefined,
      murabahahTaazirToWelfare: values.murabahahTaazirToWelfare || undefined,
      murabahahNotes: values.murabahahNotes || undefined,
      environmentalPractices: values.environmentalPractices || undefined,
      socialImpact: values.socialImpact || undefined,
      governanceQuality: values.governanceQuality,
    });
  };

  const selectSegment = (segKey: BprsProductSegment) => {
    if (values.productSegment === segKey) return;
    const seg = BPRS_SEGMENT_DETAILS[segKey];
    const lost = values.legalDocuments.filter(d => !seg.requiredDocuments.includes(d.type) && (d.status !== "pending" || d.notes.trim()));
    setValues(v => ({
      ...v,
      productSegment: segKey,
      // Status dan catatan dokumen yang jenisnya sama tetap dipertahankan.
      legalDocuments: seg.requiredDocuments.map(type => v.legalDocuments.find(d => d.type === type) ?? { type, status: "pending" as const, notes: "" }),
    }));
    if (lost.length) toast.info(`Daftar dokumen disesuaikan untuk segmen ${seg.label}. Catatan untuk ${lost.map(d => d.type).join(", ")} tidak dipakai di segmen ini.`);
  };
  const selectAkad = (akad: string) => setValues(v => {
    if (v.financingAkad === akad) return v;
    const nextValues: Values = { ...v, financingAkad: akad };
    if (akad === "qardh") {
      // Margin sebelumnya disimpan agar kembali saat akad diganti lagi.
      nextValues.prevMarginRate = v.marginRate;
      nextValues.marginRate = "0";
    } else if (v.financingAkad === "qardh") {
      nextValues.marginRate = v.prevMarginRate ?? "";
    }
    if (akad === "multijasa" && !v.multijasaAkadType) nextValues.multijasaAkadType = "ijarah";
    return nextValues;
  });

  const murabahahInfo = <Alert className={INFO_PANEL}><HelpCircle className="h-4 w-4" /><AlertTitle>Panduan Akad Murabahah</AlertTitle><AlertDescription className="text-navy-900">Form ini mengacu pada OJK Pedoman Produk Murabahah dan Fatwa DSN-MUI No. 04/DSN-MUI/IV/2000. Akad Murabahah adalah akad jual beli di mana bank bertindak sebagai penjual dan nasabah sebagai pembeli, dengan margin keuntungan yang disepakati. Seluruh kolom di bagian ini bersifat opsional.</AlertDescription></Alert>;
  const setField = (name: string) => (value: string) => setValues(v => ({ ...v, [name]: value }));
  const yesNo = (name: string, label: string, extra?: { disabled?: boolean; forceValue?: string }) => <SelectField name={name} label={label} value={extra?.forceValue ?? values[name]} disabled={extra?.disabled} onChange={setField(name)} options={[["yes", "Ya"], ["no", "Tidak"]]} />;
  const section = (title: string, children: React.ReactNode) => <div className="space-y-4 rounded-lg border border-border bg-ivory p-4"><h3 className="font-medium text-navy-900">{title}</h3>{children}</div>;
  const isPersonal = values.murabahahType === "personal";
  const fmt = (n: number) => Number(n || 0).toLocaleString("id-ID");
  const previewData = murabahahPreviewQuery.data;
  const murabahahPreviewPanel = <div role="status" aria-live="polite" className="rounded-lg border border-border bg-muted p-4"><div className="mb-2 text-sm font-medium text-navy-900">Perhitungan Piutang Murabahah</div>{murabahahPreviewQuery.isLoading ? <div className="flex items-center gap-2 text-sm text-navy-900"><Loader2 className="h-4 w-4 animate-spin" />Menghitung...</div> : previewData ? <><dl className="grid gap-2 text-sm sm:grid-cols-2"><div className="flex justify-between gap-3 border-b border-border pb-1"><dt className="text-navy-900">Harga perolehan</dt><dd className="font-medium text-navy-900">Rp {fmt(previewData.hargaPerolehan)}</dd></div><div className="flex justify-between gap-3 border-b border-border pb-1"><dt className="text-navy-900">Pokok pembiayaan</dt><dd className="font-medium text-navy-900">Rp {fmt(previewData.pokokPembiayaan)}</dd></div><div className="flex justify-between gap-3 border-b border-border pb-1"><dt className="text-navy-900">Margin nominal</dt><dd className="font-medium text-navy-900">{previewData.marginNominal != null ? `Rp ${fmt(previewData.marginNominal)}` : "-"}</dd></div><div className="flex justify-between gap-3"><dt className="font-semibold text-navy-900">Piutang Murabahah</dt><dd className="font-semibold text-navy-900">Rp {fmt(previewData.piutangMurabahah)}</dd></div></dl><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-navy-900">Tipe disarankan: <span className="rounded-full bg-navy-900 px-2 py-0.5 font-medium text-white">{previewData.suggestedType === "ultra_mikro" ? "Ultra Mikro (≤20jt)" : "Standard"}</span></div>{(previewData.wakalahForbidden || isPersonal) && <Alert className="mt-3 border-amber-300 bg-amber-50 text-amber-950"><AlertCircle className="h-4 w-4" /><AlertTitle>Perhatian</AlertTitle><AlertDescription className="text-amber-900">{(previewData.wakalahForbidden ? "Berdasarkan tipe akad, wakalah TIDAK boleh diberikan kepada nasabah. " : "")}{isPersonal ? "Personal Financing: bank TIDAK boleh memberi wakalah kepada nasabah; aset harus mudah dijual kembali." : ""}</AlertDescription></Alert>}</> : <p className="text-sm text-navy-900">Lengkapi harga pokok, biaya langsung, diskon pemasok, atau uang muka untuk menghitung Piutang Murabahah secara otomatis.</p>}</div>;
  const murabahahStep = <>
    {murabahahInfo}
    {section("1. Jenis & Objek Akad", <>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField name="murabahahType" label="Jenis Akad Murabahah" value={values.murabahahType} placeholder="Pilih jenis akad" onChange={value => setValues(v => ({ ...v, murabahahType: value, ...(value === "personal" ? { murabahahWakalah: "no" } : {}) }))} options={[["standard", "Standard"], ["ultra_mikro", "Ultra Mikro (≤20jt)"], ["personal", "Personal Financing (≤20jt)"]]} />
        <Field name="murabahahSupplierName" label="Nama Pemasok" values={values} setValues={setValues} placeholder="Nama pemasok / penjual" />
        <Field name="murabahahObject" label="Objek / Barang Akad" values={values} setValues={setValues} placeholder="Uraian objek murabahah" />
        {yesNo("murabahahPriceKnown", "Harga Pokok Diketahui Nasabah")}
        {yesNo("murabahahMarginDisclosed", "Margin Diungkapkan ke Nasabah")}
        {yesNo("murabahahDpsReviewed", "Telah Ditelaah oleh DPS")}
      </div>
      {values.murabahahType === "personal" && <Alert className="border-amber-300 bg-amber-50 text-amber-950"><AlertCircle className="h-4 w-4" /><AlertTitle>Personal Financing</AlertTitle><AlertDescription className="text-amber-900">Aset harus mudah dijual kembali; bank TIDAK boleh memberi wakalah kepada nasabah.</AlertDescription></Alert>}
      {(values.murabahahType === "ultra_mikro" || values.murabahahType === "personal") && <Alert className={INFO_PANEL}><AlertCircle className="h-4 w-4" /><AlertTitle>Ultra Mikro / Akad Mu'allag</AlertTitle><AlertDescription className="text-navy-900">Akad efektif setelah nasabah melaporkan bukti pembelian (maks 15 hari).</AlertDescription></Alert>}
    </>)}
    {section("2. Rincian Harga & Margin", <>
      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyField name="murabahahAcquisitionPrice" label="Harga Pokok" values={values} setValues={setValues} />
        <CurrencyField name="murabahahDirectCost" label="Biaya Langsung" values={values} setValues={setValues} />
        <CurrencyField name="murabahahSupplierDiscount" label="Diskon Pemasok" values={values} setValues={setValues} />
        <CurrencyField name="murabahahDownPaymentAmount" label="Uang Muka" values={values} setValues={setValues} />
      </div>
      <p className="text-xs text-muted-foreground">Margin dipakai dari kolom <span className="font-medium">Total Margin Akad (%)</span> di atas (sekarang: {values.marginRate ? `${values.marginRate}%` : "belum diisi"}).</p>
      {murabahahPreviewPanel}
    </>)}
    {section("3. Sequencing (Wakalah → Qabdh → Akad)", <>
      <p className="text-xs text-muted-foreground">Urutan: 1) Wa'd &amp; Wakalah 2) Pembelian &amp; Qabdh 3) Konfirmasi bukti 4) Akad Murabahah.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {yesNo("murabahahWakalah", "Wakalah Diberikan", { disabled: isPersonal, forceValue: isPersonal ? "no" : undefined })}
        <Field name="murabahahWakalahConfirmedAt" label="Tanggal Konfirmasi Wakalah & Wa'd" values={values} setValues={setValues} type="date" />
        <Field name="murabahahInvoiceNumber" label="No. Invoice / Bukti Pembelian" values={values} setValues={setValues} placeholder="INV-0000" />
        <Field name="murabahahQabdhVerifiedAt" label="Tanggal Verifikasi Penerimaan Barang / Qabdh" values={values} setValues={setValues} type="date" />
        <Field name="murabahahSignedAt" label="Tanggal Penandatanganan Akad Murabahah" values={values} setValues={setValues} type="date" />
      </div>
    </>)}
    {section("4. Sanksi", <>
      {yesNo("murabahahTaazirToWelfare", "Denda (Ta'zir) Dialokasikan ke Dana Kebajikan")}
      <p className="text-xs text-muted-foreground">Denda keterlambatan (ta'zir) dialokasikan ke Dana Kebajikan, bukan pendapatan bank.</p>
    </>)}
    <Field name="murabahahNotes" label="Catatan Akad Murabahah (Opsional)" values={values} setValues={setValues} rows={3} />
  </>;
  const select = (name: string, label: string, options: [string, string][]) => <SelectField name={name} label={label} value={values[name]} onChange={setField(name)} options={options} />;
  const bagihasilRatio = () => { const r = Number(values.mudharabahRbh || 0); const p = Number(values.mudharabahPbh || 0); return p > 0 ? (r / p) * 100 : null; };
  const nisbahTotal = hasValue(values.mudharabahBankNisbah) && hasValue(values.mudharabahCustomerNisbah) ? Number(values.mudharabahBankNisbah) + Number(values.mudharabahCustomerNisbah) : null;
  // Mengisi otomatis pasangan nisbah agar totalnya 100%.
  const setNisbah = (name: "mudharabahBankNisbah" | "mudharabahCustomerNisbah", raw: string) => {
    const value = raw.replace(/[^\d.]/g, "");
    const pair = name === "mudharabahBankNisbah" ? "mudharabahCustomerNisbah" : "mudharabahBankNisbah";
    const n = Number(value);
    setValues(v => ({ ...v, [name]: value, ...(value !== "" && n >= 0 && n <= 100 ? { [pair]: String(Math.round((100 - n) * 100) / 100) } : {}) }));
    clearError("mudharabahCustomerNisbah");
  };
  const mudharabahStep = <>
    <Alert className={INFO_PANEL}><HelpCircle className="h-4 w-4" /><AlertTitle>Panduan Akad Mudharabah</AlertTitle><AlertDescription className="text-navy-900">Akad Mudharabah mengacu pada Fatwa DSN-MUI No. 07/DSN-MUI/IV/2000 tentang Pembiayaan Mudharabah. Bank menyediakan 100% modal; keuntungan dibagi berdasarkan nisbah yang disepakati; kerugian finansial ditanggung bank kecuali karena kelalaian nasabah (ta'addi/taqshir/mukhalafah). Seluruh kolom di bagian ini bersifat opsional.</AlertDescription></Alert>
    {section("1. Jenis & Prinsip", <>
      <div className="grid gap-4 md:grid-cols-2">
        {select("mudharabahType", "Jenis Mudharabah", [["muthlaqah", "Muthlaqah (tanpa batasan)"], ["muqayyadah", "Muqayyadah (ada batasan)"]])}
        {select("mudharabahCapitalForm", "Bentuk Modal", [["uang", "Uang"], ["aset", "Aset"], ["kombinasi", "Kombinasi"]])}
        <CurrencyField name="mudharabahCapitalValue" label="Nilai Modal / Modal Kerja" values={values} setValues={setValues} />
      </div>
      <Field name="mudharabahBusinessPurpose" label="Tujuan Usaha / Penggunaan Modal" values={values} setValues={setValues} rows={3} placeholder="Uraian tujuan usaha yang dibiayai" />
      <p className="rounded-md bg-muted p-3 text-xs text-navy-900">Bank menyediakan 100% modal; keuntungan dibagi nisbah; kerugian finansial ditanggung bank kecuali karena kelalaian nasabah (ta'addi/taqshir/mukhalafah).</p>
    </>)}
    {section("2. Bagi Hasil", <>
      <div className="grid gap-4 md:grid-cols-2">
        {select("mudharabahProfitSharingMethod", "Metode Bagi Hasil", [["profit_sharing", "Profit Sharing"], ["net_revenue", "Net Revenue"]])}
        <div className="hidden md:block" />
        <div className="space-y-2">
          <Label htmlFor="mudharabahBankNisbah">Nisbah Bank (%)</Label>
          <Input id="mudharabahBankNisbah" name="mudharabahBankNisbah" inputMode="decimal" value={String(values.mudharabahBankNisbah ?? "")} onChange={e => setNisbah("mudharabahBankNisbah", e.target.value)} placeholder="cth: 60" aria-describedby="nisbah-help" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mudharabahCustomerNisbah">Nisbah Nasabah (%)</Label>
          <Input id="mudharabahCustomerNisbah" name="mudharabahCustomerNisbah" inputMode="decimal" value={String(values.mudharabahCustomerNisbah ?? "")} onChange={e => setNisbah("mudharabahCustomerNisbah", e.target.value)} placeholder="cth: 40" aria-invalid={errors.mudharabahCustomerNisbah ? true : undefined} aria-describedby={`nisbah-help${errors.mudharabahCustomerNisbah ? " mudharabahCustomerNisbah-error" : ""}`} />
          <FieldHint name="mudharabahCustomerNisbah" error={errors.mudharabahCustomerNisbah} />
        </div>
        <p id="nisbah-help" role="status" aria-live="polite" className={`text-xs md:col-span-2 ${nisbahTotal !== null && nisbahTotal !== 100 ? "font-medium text-amber-800" : "text-muted-foreground"}`}>
          {nisbahTotal === null ? "Isi salah satu nisbah, pasangannya terisi otomatis agar total 100%." : nisbahTotal === 100 ? "Total nisbah 100%." : `Total nisbah ${nisbahTotal}%, harus 100%.`}
        </p>
        <CurrencyField name="mudharabahPbh" label="Proyeksi Bagi Hasil (PBH)" values={values} setValues={setValues} />
        <CurrencyField name="mudharabahRbh" label="Realisasi Bagi Hasil (RBH)" values={values} setValues={setValues} />
      </div>
      <p role="status" aria-live="polite" className="rounded-md bg-muted p-3 text-xs text-muted-foreground">{bagihasilRatio() != null ? <>Rasio realisasi/proyeksi: <span className={bagihasilRatio()! >= 80 ? "font-medium text-emerald-700" : "font-medium text-amber-800"}>{bagihasilRatio()!.toFixed(0)}%</span>, {bagihasilRatio()! >= 80 ? "Lancar" : "Perlu perhatian"} (RBH/PBH ≥ 80% = Lancar).</> : "Isi PBH dan RBH untuk melihat rasio (RBH/PBH ≥ 80% = Lancar)."}</p>
      <p className="text-xs text-muted-foreground">Nisbah dapat berjenjang berdasarkan capaian keuntungan.</p>
    </>)}
    {section("3. Mitigasi & Sanksi", <>
      <div className="grid gap-4 md:grid-cols-2">
        {yesNo("mudharabahCollateral", "Ada Jaminan")}
        {yesNo("mudharabahGuarantor", "Ada Penjamin (Pihak Ketiga)")}
        {yesNo("mudharabahTaazirToWelfare", "Denda (Ta'zir) Dialokasikan ke Dana Kebajikan")}
        <Field name="mudharabahSignedAt" label="Tanggal Penandatanganan Akad Mudharabah" values={values} setValues={setValues} type="date" />
      </div>
      <p className="text-xs text-muted-foreground">Jaminan hanya untuk ta'addi/taqshir/ingkar, bukan untuk kerugian alami usaha. Penjamin (kafil) adalah pihak ketiga yang menjamin pengembalian.</p>
      <p className="text-xs text-muted-foreground">Denda keterlambatan (ta'zir) dialokasikan ke Dana Kebajikan, bukan pendapatan bank.</p>
    </>)}
    <Field name="mudharabahNotes" label="Catatan Akad Mudharabah (Opsional)" values={values} setValues={setValues} rows={3} />
  </>;
  const qardhStep = <>
    <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
      <HelpCircle className="h-4 w-4" />
      <AlertTitle>Ketentuan Akad Al-Qardh (Fatwa DSN-MUI & Pedoman KPB BPRS)</AlertTitle>
      <AlertDescription className="text-emerald-900">
        Pembiayaan Qardh adalah pinjaman dana kebajikan/talangan di mana nasabah wajib mengembalikan pokok yang diterimanya tanpa imbalan/keuntungan bagi bank. BPRS hanya diperkenankan membebankan biaya administrasi riil (nominal tetap, bukan persentase).
      </AlertDescription>
    </Alert>
    {section("1. Rincian Fasilitas Al-Qardh", <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="qardhPurpose" label="Tujuan Pinjaman Qardh *" values={values} setValues={setValues} placeholder="Contoh: Dana talangan haji/umrah, talangan pendidikan, atau talangan darurat" />
        <CurrencyField name="qardhAdminFee" label="Biaya Administrasi Riil (Nominal)" values={values} setValues={setValues} />
      </div>
      <p className="text-xs text-muted-foreground">
        Margin p.a. otomatis dinolkan (0%). Biaya administrasi dibebankan secara nominal riil dan tidak dikaitkan dengan jangka waktu atau besaran pinjaman.
      </p>
    </>)}
  </>;
  const multijasaStep = <>
    <Alert className={INFO_PANEL}>
      <HelpCircle className="h-4 w-4" />
      <AlertTitle>Ketentuan Pembiayaan Multijasa (Fatwa DSN-MUI No. 44 & Pedoman OJK)</AlertTitle>
      <AlertDescription className="text-navy-900">
        Pembiayaan Multijasa menggunakan akad Ijarah (sewa manfaat jasa) atau Kafalah bil Ujrah (penjaminan). Bank menyewa manfaat jasa dari penyedia jasa atau menunjuk nasabah sebagai wakil, lalu menyewakannya kembali kepada nasabah dengan imbalan ujrah dalam nominal tetap.
      </AlertDescription>
    </Alert>
    {section("1. Objek & Penyedia Jasa (Service Provider)", <>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField name="multijasaServiceCategory" label="Kategori Manfaat Jasa *" value={values.multijasaServiceCategory} placeholder="Pilih kategori jasa" onChange={setField("multijasaServiceCategory")} options={[
          ["pendidikan", "Pendidikan (Uang Kuliah / Sekolah / Kursus)"],
          ["umrah_haji", "Ibadah Umrah / Porsi Haji Khusus"],
          ["kesehatan", "Kesehatan / Tindakan Medis Rumah Sakit"],
          ["tenaga_kerja_renovasi", "Jasa Tenaga Kerja / Renovasi Bangunan"],
          ["sewa_properti", "Sewa Tempat Usaha / Gedung / Properti"],
          ["lainnya", "Jasa Halal Lainnya"],
        ]} />
        <SelectField name="multijasaAkadType" label="Pilihan Konstruksi Akad *" value={values.multijasaAkadType} placeholder="Pilih akad" onChange={setField("multijasaAkadType")} options={[
          ["ijarah", "Ijarah Multijasa (Sewa Ulang Manfaat Jasa)"],
          ["kafalah_bil_ujrah", "Kafalah bil Ujrah (Penjaminan Jasa)"],
        ]} />
        <Field name="multijasaServiceProvider" label="Nama Lembaga / Penyedia Jasa *" values={values} setValues={setValues} placeholder="Contoh: Universitas Islam Bandung / Travel Umrah / RS Hermina" />
        <Field name="multijasaSourceObject" label="Rincian / Spesifikasi Manfaat Jasa *" values={values} setValues={setValues} placeholder="Contoh: SPP & Biaya Kuliah Semester 1-4 / Paket Umrah Reguler 12 Hari" />
      </div>
      <p className="text-xs text-muted-foreground">
        Objek jasa harus halal, dapat dispesifikasikan secara jelas, dan belum dibayar lunas oleh nasabah ke pihak penyedia jasa.
      </p>
    </>)}
    {section("2. Perhitungan Nilai Jasa & Ujrah (Nominal Tetap)", <>
      <div className="grid gap-4 md:grid-cols-3">
        <CurrencyField name="multijasaServiceCost" label="Nilai Perolehan Jasa *" values={values} setValues={setValues} />
        <CurrencyField name="multijasaDownPayment" label="Uang Muka / Hamish Jiddiyyah" values={values} setValues={setValues} />
        <CurrencyField name="multijasaUjrahAmount" label="Imbalan Ujrah Bank (Nominal) *" values={values} setValues={setValues} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {yesNo("multijasaWakalah", "Gunakan Akad Wakalah Pembelian Jasa")}
        {yesNo("multijasaDpsReviewed", "Kesesuaian Ditelaah oleh DPS")}
        {yesNo("multijasaTaazirToWelfare", "Denda (Ta'zir) ke Dana Kebajikan")}
      </div>
      <p className="text-xs text-muted-foreground">
        Besaran ujrah wajib disepakati di awal akad dan dinyatakan dalam bentuk nominal tetap, bukan persentase berfluktuasi (Fatwa DSN-MUI No. 44 Diktum Pertama angka 5).
      </p>
    </>)}
    <Field name="multijasaNotes" label="Catatan Tambahan Akad Multijasa (Opsional)" values={values} setValues={setValues} rows={3} />
  </>;
  const akadStep = <>
    {section("Jenis Akad Pembiayaan", <>
      <ChoiceCards
        label="Jenis akad pembiayaan"
        value={values.financingAkad}
        onChange={selectAkad}
        className="grid gap-3 sm:grid-cols-2"
        options={[
          { value: "murabahah", title: "Murabahah", description: "Jual beli barang dengan margin" },
          { value: "mudharabah", title: "Mudharabah", description: "Kemitraan bagi hasil usaha" },
          { value: "qardh", title: "Al-Qardh", description: "Pinjaman kebajikan / talangan (tanpa margin)" },
          { value: "multijasa", title: "Ijarah Multijasa", description: "Sewa manfaat jasa (pendidikan, umrah, renovasi)" },
        ]}
      />
    </>)}
    {values.financingAkad === "mudharabah"
      ? mudharabahStep
      : values.financingAkad === "qardh"
      ? qardhStep
      : values.financingAkad === "multijasa"
      ? multijasaStep
      : murabahahStep}
  </>;
  const segmentDetail = BPRS_SEGMENT_DETAILS[values.productSegment];
  const incomeHelp = values.incomeSourceType === "fixed"
    ? "Wajib slip gaji & rekening koran. Batas angsuran maksimal 40% dari take home pay, diverifikasi melalui slip gaji & mutasi bank."
    : values.incomeSourceType === "joint_income"
    ? "Wajib persetujuan pasangan. Batas angsuran maksimal 40% gabungan suami-istri, dengan bukti penghasilan kedua pihak."
    : "Wajib buku kas / mutasi usaha. Batas angsuran maksimal 40% dari rata-rata laba bersih usaha, diverifikasi melalui catatan penjualan/kas.";

  return <ErrorsContext.Provider value={{ errors, clearError }}><div className="min-h-screen bg-ivory"><AppHeader />
      <main className="container max-w-4xl py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h1 className="font-serif text-3xl font-medium text-navy-900 sm:text-4xl">Aplikasi Pembiayaan Baru</h1><p className="mt-2 text-muted-foreground">Lengkapi data nasabah untuk penilaian kelayakan pembiayaan. Kolom bertanda * wajib diisi.</p></div>
            {SHOW_DEMO && <Button type="button" variant="outline" onClick={() => void fillAllDemo()}>Isi contoh data</Button>}
          </div>
          {SHOW_DEMO && <p className="mt-3 text-xs text-muted-foreground">Untuk uji coba: mengisi data contoh acak (fiktif). Isian yang sudah ada hanya ditimpa setelah Anda konfirmasi, dan dapat diurungkan.</p>}
        </div>
      {hasDraft && <div role="region" aria-label="Draft tersimpan" className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm ${INFO_PANEL}`}><span><strong>Draft tersimpan ditemukan{draftSavedAt ? ` (${draftSavedAt})` : ""}.</strong> Pulihkan untuk melanjutkan, atau buang untuk mulai dari awal. Isian baru belum disimpan otomatis sampai Anda memilih.</span><span className="flex flex-wrap gap-3"><Button type="button" className="h-11" onClick={restore}>Pulihkan draft</Button><Button type="button" variant="ghost" className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void discardDraft()}>Buang draft</Button></span></div>}
      <nav aria-label="Langkah pengisian" className="mb-8 rounded-2xl border border-border bg-white p-5 shadow-premium"><div className="mb-4 flex flex-wrap justify-between gap-2 text-xs font-bold uppercase tracking-[.16em] text-muted-foreground"><span>Langkah {step + 1} dari {steps.length}</span><span className="text-navy-900">{steps[step]}</span></div><ol className="flex items-center">{steps.map((label, i) => <li key={label} className="flex flex-1 items-center last:flex-none" aria-current={i === step ? "step" : undefined}><button type="button" disabled={i >= step} onClick={() => goTo(i)} title={label} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-gold-400/60 pointer-coarse:h-11 pointer-coarse:w-11 disabled:cursor-default ${i < step ? "bg-navy-900 text-gold-300 hover:bg-navy-800" : i === step ? "bg-gold-400 text-navy-900 ring-4 ring-gold-400/25" : "border border-border bg-ivory text-muted-foreground"}`}><span aria-hidden="true">{i < step ? <Check className="h-4 w-4" /> : i + 1}</span><span className="sr-only">Langkah {i + 1}: {label}{i < step ? " (selesai, buka untuk mengubah)" : i === step ? " (sedang diisi)" : " (belum)"}</span></button>{i < steps.length - 1 && <span aria-hidden="true" className={`mx-1.5 h-0.5 flex-1 rounded-full ${i < step ? "bg-navy-900" : "bg-border"}`} />}</li>)}</ol></nav>
        <form onSubmit={submit} noValidate><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle as="h2">{steps[step]}</CardTitle><CardDescription>{STEP_DESCRIPTIONS[step]}</CardDescription></div>{SHOW_DEMO && DEMO_STEPS[step] && <Button type="button" variant="outline" size="sm" onClick={() => void fillDemo(step)}>Isi contoh langkah ini</Button>}</div></CardHeader><CardContent className="space-y-4">
          {errorSummary && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorSummary}</div>}
          {step === 0 && <>
            {section("Segmen produk", <div className="space-y-4">
              <ChoiceCards
                label="Segmen produk"
                value={values.productSegment}
                onChange={selectSegment}
                className="grid gap-3 sm:grid-cols-2"
                options={BPRS_PRODUCT_SEGMENTS.map(segKey => {
                  const seg = BPRS_SEGMENT_DETAILS[segKey];
                  return {
                    value: segKey,
                    title: seg.label,
                    description: seg.description,
                    extra: <span className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded bg-muted px-2 py-0.5 font-medium text-navy-900">Maks DSR: {seg.defaultMaxDsr}%</span><span className="rounded bg-muted px-2 py-0.5 font-medium text-navy-900">{seg.requiredDocuments.length} Dokumen Wajib</span></span>,
                  };
                })}
              />
              <div className={`rounded-lg border p-4 text-sm ${INFO_PANEL}`}>
                <div className="mb-1 font-semibold text-navy-900">Ketentuan Jaminan & Dokumen untuk Segmen: {segmentDetail?.label}</div>
                <p>{segmentDetail?.collateralNotes}</p>
              </div>
            </div>)}
            {section("Identitas nasabah", <>
              <div className="grid gap-4 md:grid-cols-2">
                <Popover open={historyOpen} onOpenChange={setHistoryVisible}>
                  <PopoverAnchor asChild>
                    <div ref={historyAnchorRef} className="grid gap-4 md:col-span-2 md:grid-cols-2">
                      <Field name="customerName" label="Nama Lengkap *" values={values} setValues={setValues} autoComplete="off" {...historyFieldProps} />
                      <Field name="customerId" label="NIK *" values={values} setValues={setValues} inputMode="numeric" maxLength={16} pattern="\d{16}" autoComplete="off" placeholder="16 digit angka" sanitize={(v: string) => v.replace(/\D/g, "").slice(0, 16)} help={`${String(values.customerId ?? "").length}/16 digit`} {...historyFieldProps} />
                    </div>
                  </PopoverAnchor>
                  <PopoverContent
                    align="start"
                    className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0"
                    onOpenAutoFocus={e => e.preventDefault()}
                    onCloseAutoFocus={e => e.preventDefault()}
                    onEscapeKeyDown={() => historyInputRef.current?.focus()}
                    onInteractOutside={e => { if (historyAnchorRef.current?.contains(e.target as Node)) e.preventDefault(); }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border p-2 text-xs font-medium text-muted-foreground"><span>Riwayat pengajuan nasabah</span><span>Panah bawah untuk memilih, Esc untuk menutup</span></div>
                    <ul id="history-list" aria-label="Riwayat pengajuan nasabah" className="max-h-64 overflow-y-auto" onKeyDown={historyListKeyDown}>
                      {historyItems.map(item => {
                        const status = HISTORY_STATUS_LABELS[item.status] ?? HISTORY_STATUS_LABELS.pending!;
                        return <li key={item.customerId + String(item.date)}><button type="button" className="flex w-full items-center gap-3 border-t border-border px-3 py-2 text-left outline-none first:border-t-0 hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400" onClick={() => void chooseHistory(item)}><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-navy-900">{item.customerName}</span><span className="block truncate text-xs text-muted-foreground">{item.businessName}</span></span><span className="text-right"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.tone}`}>{status.label}</span>{item.latestAssessmentScore !== null && <span className="mt-0.5 block text-xs text-muted-foreground">Skor: {item.latestAssessmentScore} {item.latestAssessmentClassification ? `(${item.latestAssessmentClassification})` : ""}</span>}</span></button></li>;
                      })}
                    </ul>
                    {historyQuery.isFetching && <div className="border-t border-border p-2 text-center text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Mencari...</div>}
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground md:col-span-2" aria-live="polite">
                  {debouncedQuery && historyQuery.isFetching ? "Mencari riwayat nasabah..." : debouncedQuery && historyQuery.isSuccess && historyItems.length === 0 ? "Belum ada riwayat pengajuan untuk nasabah ini." : debouncedQuery && historyItems.length > 0 && !historyVisible ? `${historyItems.length} riwayat pengajuan ditemukan.` : ""}
                  {debouncedQuery && historyItems.length > 0 && !historyVisible && <button type="button" className="ml-2 font-semibold text-navy-900 underline underline-offset-4" onClick={() => setHistoryVisible(true)}>Lihat riwayat</button>}
                </p>
                <Field name="phone" label="Nomor Telepon *" values={values} setValues={setValues} type="tel" inputMode="tel" autoComplete="off" maxLength={20} placeholder="08xxxxxxxxxx" />
                <Field name="email" label="Email (Opsional)" values={values} setValues={setValues} type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="nama@contoh.com" />
              </div>
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-950">Status Keterkaitan dengan BPRS (Pihak Terkait)</div>
                <div className="grid gap-4 md:grid-cols-2">
                  {yesNo("isRelatedParty", "Apakah Nasabah Termasuk Pihak Terkait BPRS?")}
                  {values.isRelatedParty === "yes" && (
                    <Field name="relatedPartyRelation" label="Hubungan / Jabatan Pihak Terkait *" values={values} setValues={setValues} placeholder="Contoh: Direksi / Komisaris / Anak Kandung Pemegang Saham" />
                  )}
                </div>
                {values.isRelatedParty === "yes" && (
                  <p className="text-xs text-amber-900">
                    Sesuai KPB BPRS, pembiayaan pihak terkait wajib memperoleh persetujuan Direktur Bisnis dan minimal 1 orang Dewan Komisaris serta diperhitungkan dalam BMPD Pihak Terkait (maksimal 10% modal).
                  </p>
                )}
              </div>
              <Field name="address" label="Alamat Lengkap *" values={values} setValues={setValues} rows={3} autoComplete="off" />
              <div className="space-y-3 rounded-lg border border-border bg-ivory p-4">
                <div><h3 className="font-medium text-navy-900">Isi data dari foto KTP</h3><p id="ktp-help" className="text-sm text-muted-foreground">JPG atau PNG, maksimal 5 MB. File hanya dikirim saat Anda menekan tombol proses dan tidak disimpan dalam draft.</p></div>
                <div className="flex flex-wrap items-center gap-3">
                  <Label htmlFor="ktp-file" className="sr-only">Foto KTP nasabah</Label>
                  <Input ref={ktpInputRef} id="ktp-file" type="file" accept="image/jpeg,image/png" onChange={selectKtpFile} aria-describedby={`ktp-help${ktpError ? " ktp-error" : ""}`} aria-invalid={ktpError ? true : undefined} className="max-w-md bg-white" />
                  <Button type="button" variant="outline" onClick={processKtp} disabled={extractKtpMutation.isPending || !ktpFile}>{extractKtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Proses OCR KTP</Button>
                </div>
                {ktpFile && <p className="text-xs text-muted-foreground">File dipilih: {ktpFile.name}</p>}
                {ktpError && <p id="ktp-error" role="alert" className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{ktpError}</p>}
                {ktpProcessed && <Alert role="status" className="border-green-200 bg-green-50 text-green-900"><CheckCircle2 /><AlertTitle>Data OCR berhasil diisi</AlertTitle><AlertDescription className="text-green-800">Hasil OCR wajib diverifikasi secara manual sebelum aplikasi dikirimkan.</AlertDescription></Alert>}
              </div>
            </>)}
            {section("Usaha dan sumber penghasilan", <>
              <div className="grid gap-4 md:grid-cols-3">
                <Field name="businessName" label="Nama Usaha *" values={values} setValues={setValues} />
                <Field name="businessType" label="Jenis Usaha *" values={values} setValues={setValues} />
                <Field name="businessAge" label="Lama Usaha (bulan) *" values={values} setValues={setValues} inputMode="numeric" sanitize={(v: string) => v.replace(/\D/g, "").slice(0, 4)} placeholder="cth: 24" />
              </div>
              <SelectField
                name="incomeSourceType"
                label="Sumber Pembayaran Utama (Analisa Kapasitas KPB BPRS) *"
                value={values.incomeSourceType}
                placeholder="Pilih sumber pembayaran"
                onChange={setField("incomeSourceType")}
                options={[["fixed", "Penghasilan tetap (gaji)"], ["non_fixed", "Penghasilan tidak tetap (usaha)"], ["joint_income", "Penghasilan bersama (suami-istri)"]]}
                help={incomeHelp}
              />
            </>)}
            {section("Profil nasabah untuk format BPRS (opsional, dapat dilengkapi nanti)", <ProfileQuickFields values={values} setValues={setValues} />)}
          </>}
          {step === 1 && <>
            <FinanceSourceChooser method={financeMethod} setMethod={setFinanceMethod} />
            {financeMethod === "harian" && <DailySalesCalculator setValues={setValues} defaultOpen />}
            {financeMethod === "dokumen" && <AiDocumentReader values={values} setValues={setValues} />}
            {financeMethod === "csv" && <div className="space-y-3 rounded-lg border border-border bg-ivory p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium text-navy-900">Import data keuangan dari CSV</h3><p id="financial-help" className="text-sm text-muted-foreground">Gunakan 1 sampai 12 baris bulanan dengan kolom month, revenue, expenses, existingInstallment. Maksimal 1 MB.</p></div><Button type="button" variant="ghost" size="sm" onClick={downloadFinancialTemplate}><Download className="mr-2 h-4 w-4" />Unduh template CSV</Button></div><div className="flex flex-wrap items-center gap-3"><Label htmlFor="financial-file" className="sr-only">File CSV data keuangan bulanan</Label><Input ref={financialInputRef} id="financial-file" type="file" accept=".csv,text/csv" onChange={selectFinancialFile} aria-describedby={`financial-help${financialError ? " financial-error" : ""}`} aria-invalid={financialError ? true : undefined} className="max-w-md bg-white" /><Button type="button" variant="outline" onClick={importFinancialFile} disabled={importFinancialMutation.isPending || !financialFile}>{importFinancialMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import data CSV</Button></div>{financialFile && <p className="text-xs text-muted-foreground">File dipilih: {financialFile.name}</p>}{financialError && <p id="financial-error" role="alert" className="text-sm text-destructive">{financialError}</p>}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <CurrencyField name="monthlyRevenue" label="Pendapatan Bulanan *" values={values} setValues={setValues} />
              <CurrencyField name="monthlyExpenses" label="Pengeluaran Bulanan *" values={values} setValues={setValues} />
              <CurrencyField name="existingDebt" label="Total Angsuran Existing per Bulan *" values={values} setValues={setValues} help="Isi 0 jika nasabah tidak punya angsuran lain." />
              <CurrencyField name="collateralValue" label="Nilai Agunan *" values={values} setValues={setValues} help="Isi 0 jika tanpa agunan." />
              <CurrencyField name="requestedAmount" label="Jumlah Pembiayaan *" values={values} setValues={setValues} />
              <Field name="financingTenor" label="Tenor Pembiayaan (bulan) *" values={values} setValues={setValues} inputMode="numeric" sanitize={(v: string) => v.replace(/\D/g, "").slice(0, 3)} placeholder="cth: 12" />
              <Field name="marginRate" label="Total Margin Akad (%) *" values={values} setValues={setValues} type="number" min="0" max="100" step="0.01" inputMode="decimal" disabled={values.financingAkad === "qardh"} help={values.financingAkad === "qardh" ? "Otomatis 0% untuk akad Al-Qardh. Margin sebelumnya kembali bila akad diganti." : undefined} />
            </div>
            <Field name="loanPurpose" label="Tujuan Pembiayaan *" values={values} setValues={setValues} rows={3} />
            <ReviewTrackHint requestedAmount={values.requestedAmount} isRelatedParty={values.isRelatedParty} />
            {values.financialDataNote && <p className="rounded-lg bg-ivory p-3 text-xs text-muted-foreground"><strong className="text-navy-900">Sumber angka keuangan:</strong> {values.financialDataNote}</p>}
            <div className="space-y-4 border-t border-border pt-4"><h3 className="font-medium text-navy-900">Akad pembiayaan</h3>{akadStep}</div>
          </>}
          {step === 2 && <>
            <Alert className={INFO_PANEL}><HelpCircle className="h-4 w-4" /><AlertTitle>Dokumen diunggah setelah pengajuan dikirim</AlertTitle><AlertDescription className="text-navy-900">Status dokumen di bawah hanya catatan awal. Setelah dokumen diunggah di halaman detail dan diverifikasi checker, statusnya diperbarui otomatis saat penilaian.</AlertDescription></Alert>
            <div className="space-y-3">
              <h3 className="font-medium text-navy-900">Dokumen Persyaratan ({segmentDetail?.label})</h3>
              {values.legalDocuments.map((doc, i) => (
                <fieldset key={doc.type} className="grid items-center gap-3 rounded-lg border border-border bg-white p-3 md:grid-cols-[160px_1fr_1fr]">
                  <legend className="sr-only">Dokumen {doc.type}</legend>
                  <span className="text-sm font-semibold text-navy-900" aria-hidden="true">{doc.type}</span>
                  <Select value={doc.status} onValueChange={status => setValues(v => ({ ...v, legalDocuments: v.legalDocuments.map((d, n) => n === i ? { ...d, status: status as Document["status"] } : d) }))}>
                    <SelectTrigger id={`doc-${i}-status`} aria-label={`Status dokumen ${doc.type}`} className="w-full min-w-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_STATUS_OPTIONS.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input aria-label={`Catatan dokumen ${doc.type} (opsional)`} placeholder="Catatan (opsional)" value={doc.notes} onChange={e => setValues(v => ({ ...v, legalDocuments: v.legalDocuments.map((d, n) => n === i ? { ...d, notes: e.target.value } : d) }))} />
                </fieldset>
              ))}
            </div>
            {select("businessShariaCompliant", "Kepatuhan Bisnis *", [["yes", "Ya, Sepenuhnya"], ["partial", "Sebagian"], ["no", "Tidak"]])}
            <Field name="shariaComplianceNotes" label="Catatan (Opsional)" values={values} setValues={setValues} rows={3} />
            {select("governanceQuality", "Tata Kelola *", [["excellent", "Sangat Baik"], ["good", "Baik"], ["fair", "Cukup"], ["poor", "Kurang"]])}
            {isFastTrack ? (
              <details className="rounded-lg border border-border bg-ivory p-4"><summary className="cursor-pointer text-sm font-medium text-navy-900">Isian tambahan ESG (opsional untuk jalur ringkas)</summary><div className="mt-3 space-y-4"><Field name="environmentalPractices" label="Praktik Lingkungan (Opsional)" values={values} setValues={setValues} rows={2} /><Field name="socialImpact" label="Dampak Sosial (Opsional)" values={values} setValues={setValues} rows={2} /></div></details>
            ) : <><Field name="environmentalPractices" label="Praktik Lingkungan (Opsional)" values={values} setValues={setValues} rows={2} /><Field name="socialImpact" label="Dampak Sosial (Opsional)" values={values} setValues={setValues} rows={2} /></>}
          </>}
          {step === 3 && <ReviewSummary values={values} isFastTrack={isFastTrack} onEdit={i => goTo(i)} />}
        </CardContent></Card>
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex gap-3 border-t border-border bg-ivory/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          {step > 0 && <Button type="button" variant="outline" className="h-11 min-w-11 px-5" onClick={() => goTo(step - 1)}>Kembali</Button>}
          {step < steps.length - 1
            ? <Button key="next" type="button" className="ml-auto h-11 px-6" onClick={next}>Lanjutkan</Button>
            : <Button key="submit" type="submit" className="ml-auto h-11 px-6" disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim Aplikasi</Button>}
        </div></form>
    </main></div></ErrorsContext.Provider>;
}

/** Kolom opsional per langkah, dipakai untuk memetakan error dari server ke langkah yang tepat. */
const OPTIONAL_KEYS: Record<number, string[]> = {
  0: ["email", "relatedPartyRelation", "incomeSourceType", "bprsProfile"],
  1: ["qardhPurpose", "qardhAdminFee", "mudharabahBankNisbah", "mudharabahCustomerNisbah", "multijasaServiceCategory", "multijasaAkadType", "multijasaServiceProvider", "multijasaSourceObject", "multijasaServiceCost", "multijasaUjrahAmount", "murabahahAcquisitionPrice", "murabahahDirectCost", "murabahahSupplierDiscount", "murabahahDownPaymentAmount"],
  2: ["legalDocuments", "shariaComplianceNotes", "environmentalPractices", "socialImpact"],
};

type FinanceMethod = "manual" | "harian" | "dokumen" | "csv";

const FINANCE_METHODS: Array<{ key: FinanceMethod; title: string; detail: string }> = [
  { key: "manual", title: "Isi langsung", detail: "Ada laporan keuangan atau angka sudah diketahui" },
  { key: "harian", title: "Dari omzet harian", detail: "Usaha mikro tanpa laporan keuangan" },
  { key: "dokumen", title: "Baca dokumen (AI)", detail: "Slip gaji, mutasi rekening, NIB, NPWP" },
  { key: "csv", title: "Import CSV", detail: "Data bulanan dari spreadsheet" },
];

/** Satu pilihan sumber angka; hanya alat yang dipilih yang ditampilkan. */
function FinanceSourceChooser({ method, setMethod }: { method: FinanceMethod; setMethod: (m: FinanceMethod) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-navy-900">Dari mana angka keuangan diperoleh?</p>
      <ChoiceCards
        label="Dari mana angka keuangan diperoleh?"
        value={method}
        onChange={setMethod}
        size="sm"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        options={FINANCE_METHODS.map(option => ({ value: option.key, title: option.title, description: option.detail }))}
      />
    </div>
  );
}

type ProfileSelect = { key: keyof BprsProfile; label: string; options: readonly string[] };

/**
 * Isian profil yang dipakai format Excel BPRS, ditanyakan sekali di formulir
 * sehingga tidak perlu diisi ulang di halaman detail.
 */
function ProfileQuickFields({ values, setValues }: { values: Values; setValues: React.Dispatch<React.SetStateAction<Values>> }) {
  const profile = (values.bprsProfile ?? {}) as BprsProfile;
  const fixed = values.incomeSourceType === "fixed";
  const set = (key: keyof BprsProfile, value: unknown) =>
    setValues(v => ({ ...v, bprsProfile: { ...(v.bprsProfile ?? {}), [key]: value === "" ? undefined : value } }));
  const selects: ProfileSelect[] = [
    { key: "jenisKelamin", label: "Jenis kelamin", options: BPRS_OPTIONS.jenisKelamin },
    { key: "statusPerkawinan", label: "Status perkawinan", options: BPRS_OPTIONS.statusPerkawinan },
    { key: "tanggungan", label: "Jumlah tanggungan", options: BPRS_OPTIONS.tanggungan },
    fixed
      ? { key: "pendidikanFix", label: "Pendidikan terakhir", options: BPRS_OPTIONS.pendidikanFix }
      : { key: "pendidikan", label: "Pendidikan terakhir", options: BPRS_OPTIONS.pendidikan },
    { key: "statusTempatTinggal", label: "Status tempat tinggal", options: BPRS_OPTIONS.statusTempatTinggal },
    ...(fixed
      ? [{ key: "statusKaryawan" as const, label: "Status karyawan", options: BPRS_OPTIONS.statusKaryawan }]
      : [{ key: "lamaMenetap" as const, label: "Lama menetap", options: BPRS_OPTIONS.lamaMenetap }]),
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Dipakai untuk mengisi otomatis Excel "{BPRS_TEMPLATE_LABELS[fixed ? "fix_income" : "fluktuatif"]}". Isian lain (reputasi, SLIK, rekening koran, rincian agunan) dilengkapi di tab Format Excel BPRS.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="profile-tanggalLahir">Tanggal lahir</Label>
          <Input id="profile-tanggalLahir" type="date" value={profile.tanggalLahir ?? ""} onChange={e => set("tanggalLahir", e.target.value)} />
        </div>
        {selects.map(field => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`profile-${field.key}`}>{field.label}</Label>
            <Select value={(profile[field.key] as string | undefined) ?? ""} onValueChange={value => set(field.key, value)}>
              <SelectTrigger id={`profile-${field.key}`} className="w-full min-w-0"><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">{field.options.map(option => <SelectItem key={option} value={option}>{option.trim()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function compactProfile(profile: unknown): BprsProfile | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  const entries = Object.entries(profile as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? (Object.fromEntries(entries) as BprsProfile) : undefined;
}

const rupiah = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && String(value ?? "") !== "" ? `Rp ${n.toLocaleString("id-ID")}` : "-";
};
const yesNoLabel = (value: unknown) => (value === "yes" ? "Ya" : value === "no" ? "Tidak" : "-");
const INCOME_LABELS: Record<string, string> = { fixed: "Penghasilan tetap (gaji)", non_fixed: "Penghasilan tidak tetap (usaha)", joint_income: "Penghasilan bersama (suami-istri)" };
const DOC_STATUS_LABELS: Record<string, string> = Object.fromEntries(DOC_STATUS_OPTIONS);
const MULTIJASA_CATEGORY_LABELS: Record<string, string> = { pendidikan: "Pendidikan", umrah_haji: "Umrah / haji khusus", kesehatan: "Kesehatan", tenaga_kerja_renovasi: "Tenaga kerja / renovasi", sewa_properti: "Sewa properti", lainnya: "Jasa halal lainnya" };

/** Rincian akad yang terisi, sesuai akad yang dipilih. */
function akadRows(values: Values): Array<[string, string]> {
  const rows: Array<[string, string | false]> = [];
  if (values.financingAkad === "murabahah") {
    rows.push(
      ["Jenis murabahah", values.murabahahType === "ultra_mikro" ? "Ultra Mikro" : values.murabahahType === "personal" ? "Personal Financing" : values.murabahahType === "standard" ? "Standard" : false],
      ["Objek akad", values.murabahahObject || false],
      ["Pemasok", values.murabahahSupplierName || false],
      ["Harga pokok", hasValue(values.murabahahAcquisitionPrice) && rupiah(values.murabahahAcquisitionPrice)],
      ["Uang muka", hasValue(values.murabahahDownPaymentAmount) && rupiah(values.murabahahDownPaymentAmount)],
      ["Wakalah diberikan", hasValue(values.murabahahWakalah) && yesNoLabel(values.murabahahWakalah)],
    );
  } else if (values.financingAkad === "mudharabah") {
    rows.push(
      ["Jenis mudharabah", values.mudharabahType === "muthlaqah" ? "Muthlaqah" : values.mudharabahType === "muqayyadah" ? "Muqayyadah" : false],
      ["Nilai modal", hasValue(values.mudharabahCapitalValue) && rupiah(values.mudharabahCapitalValue)],
      ["Nisbah bank / nasabah", (hasValue(values.mudharabahBankNisbah) || hasValue(values.mudharabahCustomerNisbah)) && `${values.mudharabahBankNisbah || "-"}% / ${values.mudharabahCustomerNisbah || "-"}%`],
      ["Proyeksi bagi hasil", hasValue(values.mudharabahPbh) && rupiah(values.mudharabahPbh)],
    );
  } else if (values.financingAkad === "qardh") {
    rows.push(
      ["Tujuan pinjaman", values.qardhPurpose || "-"],
      ["Biaya administrasi", rupiah(values.qardhAdminFee)],
    );
  } else if (values.financingAkad === "multijasa") {
    rows.push(
      ["Kategori jasa", MULTIJASA_CATEGORY_LABELS[values.multijasaServiceCategory] ?? "-"],
      ["Konstruksi akad", values.multijasaAkadType === "kafalah_bil_ujrah" ? "Kafalah bil Ujrah" : values.multijasaAkadType === "ijarah" ? "Ijarah Multijasa" : "-"],
      ["Penyedia jasa", values.multijasaServiceProvider || "-"],
      ["Nilai jasa / ujrah", `${rupiah(values.multijasaServiceCost)} / ${rupiah(values.multijasaUjrahAmount)}`],
    );
  }
  return rows.filter((row): row is [string, string] => row[1] !== false);
}

/** Ringkasan sebelum kirim, dengan tautan kembali ke langkah terkait. */
function ReviewSummary({ values, isFastTrack, onEdit }: { values: Values; isFastTrack: boolean; onEdit: (step: number) => void }) {
  const nik = String(values.customerId ?? "");
  const track = TRACK_REQUIREMENTS[isFastTrack ? "ringkas" : "lengkap"];
  const groups: Array<{ step: number; title: string; rows: Array<[string, string]> }> = [
    {
      step: 0,
      title: "Nasabah & usaha",
      rows: [
        ["Segmen produk", BPRS_SEGMENT_DETAILS[values.productSegment]?.label ?? "-"],
        ["Nama", values.customerName || "-"],
        ["NIK", nik.length >= 8 ? `${nik.slice(0, 4)}${"*".repeat(nik.length - 8)}${nik.slice(-4)}` : nik || "-"],
        ["Telepon", values.phone || "-"],
        ["Pihak terkait", values.isRelatedParty === "yes" ? `Ya (${values.relatedPartyRelation || "-"})` : "Tidak"],
        ["Usaha", `${values.businessName || "-"} (${values.businessType || "-"}), ${values.businessAge || "-"} bulan`],
        ["Sumber pembayaran", INCOME_LABELS[values.incomeSourceType] ?? "-"],
        ["Profil format BPRS", `${Object.keys(compactProfile(values.bprsProfile) ?? {}).length} isian terisi`],
      ],
    },
    {
      step: 1,
      title: "Keuangan & akad",
      rows: [
        ["Pendapatan / pengeluaran per bulan", `${rupiah(values.monthlyRevenue)} / ${rupiah(values.monthlyExpenses)}`],
        ["Angsuran existing per bulan", rupiah(values.existingDebt)],
        ["Plafon, tenor, margin", `${rupiah(values.requestedAmount)}, ${values.financingTenor || "-"} bulan, ${values.marginRate || "-"}%`],
        ["Agunan", rupiah(values.collateralValue)],
        ["Akad", AKAD_LABELS[values.financingAkad] ?? "-"],
        ...akadRows(values),
      ],
    },
    {
      step: 2,
      title: "Dokumen & syariah",
      rows: [
        ["Dokumen persyaratan", (values.legalDocuments ?? []).map((d: Document) => `${d.type} (${DOC_STATUS_LABELS[d.status] ?? d.status})`).join(", ") || "-"],
        ["Kepatuhan syariah usaha", values.businessShariaCompliant === "yes" ? "Ya, sepenuhnya" : values.businessShariaCompliant === "partial" ? "Sebagian" : values.businessShariaCompliant === "no" ? "Tidak" : "-"],
      ],
    },
  ];
  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-3 text-sm ${isFastTrack ? "border-emerald-200 bg-emerald-50 text-emerald-900" : INFO_PANEL}`}>
        {isFastTrack ? "Jalur ringkas" : "Jalur lengkap"}: setelah dikirim, unggah dan verifikasi {track.verifiedDocuments.join(", ")}
        {track.minSurveyPhotos > 0 ? ` serta minimal ${track.minSurveyPhotos} foto survei` : ""} sebelum diputuskan.
      </div>
      {groups.map(group => (
        <div key={group.step} className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-medium text-navy-900">{group.title}</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(group.step)} aria-label={`Ubah ${group.title}`}>Ubah</Button>
          </div>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[minmax(0,220px)_1fr]">
            {group.rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Draft tersimpan otomatis di perangkat ini sampai pengajuan dikirim.</p>
    </div>
  );
}
