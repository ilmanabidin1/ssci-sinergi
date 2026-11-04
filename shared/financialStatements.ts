import { z } from "zod";

/**
 * Laporan keuangan badan hukum (PT/CV/Koperasi) mengikuti workbook
 * ANALISA_KEUANGAN milik BPRS mitra: neraca dan laba rugi dua periode
 * (tahun lalu dan periode berjalan), rasio keuangan dengan benchmark bank,
 * pertumbuhan, dan kebutuhan modal kerja (siklus kas). Workbook hanya berisi
 * rasio, tanpa skor.
 */

// ---------------------------------------------------------------------------
// Struktur isian
// ---------------------------------------------------------------------------

export const NERACA_AKTIVA_LANCAR = [
  { key: "kas", label: "Kas" },
  { key: "bank", label: "Bank" },
  { key: "piutang", label: "Piutang" },
  { key: "persediaan", label: "Persediaan" },
] as const;
export const NERACA_AKTIVA_TETAP = [
  { key: "tanahBangunan", label: "Tanah & bangunan" },
  { key: "kendaraan", label: "Kendaraan" },
  { key: "peralatan", label: "Peralatan kantor" },
  { key: "asetLain", label: "Aset tetap lain-lain" },
] as const;
export const NERACA_KEWAJIBAN = [
  { key: "hutangJangkaPendek", label: "Hutang jangka pendek" },
  { key: "hutangJangkaPanjang", label: "Hutang jangka panjang" },
] as const;
export const NERACA_MODAL = [
  { key: "modalDisetor", label: "Modal disetor" },
  { key: "modalLain", label: "Modal lain (tambahan modal, cadangan)" },
  { key: "saldoLabaLalu", label: "Saldo laba tahun lalu" },
  { key: "labaBerjalan", label: "Laba tahun berjalan" },
] as const;
export const LABA_RUGI_FIELDS = [
  { key: "penjualan", label: "Penjualan per tahun" },
  { key: "hpp", label: "Harga pokok penjualan (HPP) per tahun" },
  { key: "biayaPenjualan", label: "Biaya penjualan / marketing" },
  { key: "biayaOperasional", label: "Biaya operasional usaha" },
  { key: "biayaBank", label: "Biaya bank" },
  { key: "biayaPajak", label: "Biaya pajak" },
  { key: "biayaLainnya", label: "Biaya lainnya" },
] as const;

/** Pos yang boleh bernilai negatif (akumulasi rugi atau rugi tahun berjalan). */
export const SIGNED_KEYS = ["saldoLabaLalu", "labaBerjalan"] as const;

const NERACA_KEYS = [...NERACA_AKTIVA_LANCAR, ...NERACA_AKTIVA_TETAP, ...NERACA_KEWAJIBAN, ...NERACA_MODAL].map(f => f.key);
const LR_KEYS = LABA_RUGI_FIELDS.map(f => f.key);

export type NeracaKey = (typeof NERACA_KEYS)[number];
export type LabaRugiKey = (typeof LR_KEYS)[number];
export type Neraca = Partial<Record<NeracaKey, number>>;
export type LabaRugi = Partial<Record<LabaRugiKey, number>>;

const MAX_AMOUNT = 1e15;
const amount = z.number().finite().min(0, "Nilai tidak boleh negatif").max(MAX_AMOUNT);
const signedAmount = z.number().finite().min(-MAX_AMOUNT).max(MAX_AMOUNT);

const neracaSchema = z.object(
  Object.fromEntries(NERACA_KEYS.map(key => [key, ((SIGNED_KEYS as readonly string[]).includes(key) ? signedAmount : amount).optional()])) as Record<NeracaKey, z.ZodOptional<z.ZodNumber>>,
).strict();
const labaRugiSchema = z.object(
  Object.fromEntries(LR_KEYS.map(key => [key, amount.optional()])) as Record<LabaRugiKey, z.ZodOptional<z.ZodNumber>>,
).strict();

export const financialPeriodSchema = z.object({
  /** Label periode seperti di Excel, misalnya "PER-DESEMBER 2025". */
  label: z.string().trim().max(60).optional(),
  neraca: neracaSchema.default({}),
  labaRugi: labaRugiSchema.default({}),
}).strict();

export const financialStatementsSchema = z.object({
  previous: financialPeriodSchema,
  current: financialPeriodSchema,
  /** Proyeksi pertumbuhan penjualan (%) untuk Keb Modal-B (sel E33). */
  expectedSalesGrowth: z.number().finite().min(-100).max(1000).optional(),
  /** Jumlah hari periode (Keb Modal-B sel I14), bawaan 365. */
  periodDays: z.number().int().min(1).max(366).optional(),
}).strict();

export type FinancialPeriod = z.infer<typeof financialPeriodSchema>;
export type FinancialStatements = z.infer<typeof financialStatementsSchema>;

export const BENTUK_BADAN_USAHA = ["PT", "CV", "Koperasi", "Yayasan", "Firma"] as const;
export type BentukBadanUsaha = (typeof BENTUK_BADAN_USAHA)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const companyProfileSchema = z.object({
  bentuk: z.enum(BENTUK_BADAN_USAHA).optional(),
  nib: z.string().trim().regex(/^\d{13}$/, "NIB harus 13 digit angka").optional(),
  aktaPendirianNomor: optionalText(100),
  aktaPendirianTanggal: isoDate.optional(),
  aktaPerubahanNomor: optionalText(100),
  aktaPerubahanTanggal: isoDate.optional(),
  skKemenkumham: optionalText(100),
  tanggalBerdiri: isoDate.optional(),
  jumlahKaryawan: z.number().int().min(0).max(1_000_000).optional(),
  direktur: z.object({
    nama: optionalText(255),
    jabatan: optionalText(100),
    nik: z.string().trim().regex(/^\d{16}$/, "NIK direktur harus 16 digit angka").optional(),
    hp: optionalText(30),
  }).strict().optional(),
  pemegangSaham: z.array(z.object({
    nama: z.string().trim().min(1).max(255),
    porsi: z.number().finite().min(0).max(100).optional(),
  }).strict()).max(10).optional(),
  financials: financialStatementsSchema.optional(),
}).strict();

export type CompanyProfile = z.infer<typeof companyProfileSchema>;

export const BENTUK_LABELS: Record<BentukBadanUsaha, string> = {
  PT: "Perseroan Terbatas (PT)",
  CV: "Persekutuan Komanditer (CV)",
  Koperasi: "Koperasi",
  Yayasan: "Yayasan",
  Firma: "Firma",
};

/** NPWP badan: 15 digit (format lama) atau 16 digit (format baru). Tanda baca diabaikan. */
export function isValidNpwp(value: string | null | undefined): boolean {
  const digits = String(value ?? "").replace(/[.\-\s]/g, "");
  return /^\d{15}$|^\d{16}$/.test(digits);
}

export function normalizeNpwp(value: string): string {
  return value.replace(/\D/g, "");
}

/** Lama berdiri dalam bulan penuh, minimal 1. */
export function monthsSince(isoDateValue: string | undefined, today = new Date()): number | null {
  if (!isoDateValue || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateValue)) return null;
  const [y, m, d] = isoDateValue.split("-").map(Number) as [number, number, number];
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
  if (today.getDate() < d) months -= 1;
  return months < 0 ? null : Math.max(1, months);
}

// ---------------------------------------------------------------------------
// Perhitungan (sama dengan rumus workbook)
// ---------------------------------------------------------------------------

const n = (value: number | undefined) => (Number.isFinite(value) ? Number(value) : 0);
const sumOf = (source: Record<string, number | undefined>, keys: readonly { key: string }[]) => keys.reduce((total, f) => total + n(source[f.key]), 0);
const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

export type PeriodTotals = {
  aktivaLancar: number;
  aktivaTetap: number;
  totalAset: number;
  totalKewajiban: number;
  modal: number;
  totalPasiva: number;
  /** Selisih neraca (Excel K20/K43), seharusnya 0. */
  selisih: number;
  labaKotor: number;
  totalBiaya: number;
  /** Seluruh beban: HPP ditambah biaya usaha. */
  totalBeban: number;
  labaBersih: number;
};

export function periodTotals(period: FinancialPeriod | undefined): PeriodTotals {
  const neraca = (period?.neraca ?? {}) as Record<string, number | undefined>;
  const lr = (period?.labaRugi ?? {}) as Record<string, number | undefined>;
  const aktivaLancar = sumOf(neraca, NERACA_AKTIVA_LANCAR);
  const aktivaTetap = sumOf(neraca, NERACA_AKTIVA_TETAP);
  const totalKewajiban = sumOf(neraca, NERACA_KEWAJIBAN);
  const modal = sumOf(neraca, NERACA_MODAL);
  const totalAset = aktivaLancar + aktivaTetap;
  const totalPasiva = totalKewajiban + modal;
  const labaKotor = n(lr.penjualan) - n(lr.hpp);
  const totalBiaya = n(lr.biayaPenjualan) + n(lr.biayaOperasional) + n(lr.biayaBank) + n(lr.biayaPajak) + n(lr.biayaLainnya);
  return {
    aktivaLancar,
    aktivaTetap,
    totalAset,
    totalKewajiban,
    modal,
    totalPasiva,
    selisih: totalAset - totalPasiva,
    labaKotor,
    totalBiaya,
    totalBeban: n(lr.hpp) + totalBiaya,
    labaBersih: labaKotor - totalBiaya,
  };
}

export function isPeriodEmpty(period: FinancialPeriod | undefined): boolean {
  const values = [...Object.values(period?.neraca ?? {}), ...Object.values(period?.labaRugi ?? {})];
  return !values.some(v => Number.isFinite(v) && v !== 0);
}

export type RatioKey = "currentRatio" | "quickRatio" | "cashRatio" | "der" | "dar" | "equityMultiplier" | "npm" | "roa" | "roe" | "bopo";

export type RatioDefinition = {
  key: RatioKey;
  label: string;
  formula: string;
  /** Benchmark bank; tanpa benchmark berarti hanya informasi. */
  benchmark?: { op: ">=" | ">" | "<" | "<="; value: number };
  /** Ditampilkan dalam persen (true) atau kali (false). */
  percent: boolean;
};

export const RATIO_DEFINITIONS: RatioDefinition[] = [
  { key: "currentRatio", label: "Current ratio", formula: "Aktiva lancar / hutang jangka pendek", benchmark: { op: ">=", value: 150 }, percent: true },
  { key: "quickRatio", label: "Quick ratio", formula: "(Aktiva lancar - persediaan) / hutang jangka pendek", benchmark: { op: ">=", value: 100 }, percent: true },
  { key: "cashRatio", label: "Cash ratio", formula: "(Kas + bank) / hutang jangka pendek", benchmark: { op: ">=", value: 50 }, percent: true },
  { key: "der", label: "Debt to equity ratio (DER)", formula: "Total kewajiban / modal", benchmark: { op: "<", value: 70 }, percent: true },
  { key: "dar", label: "Debt to asset ratio (DAR)", formula: "Total kewajiban / total aset", benchmark: { op: "<", value: 70 }, percent: true },
  { key: "equityMultiplier", label: "Equity multiplier", formula: "Total aset / modal", percent: false },
  { key: "npm", label: "Net profit margin (NPM)", formula: "Laba bersih / penjualan", percent: true },
  { key: "roa", label: "Return on assets (ROA)", formula: "Laba bersih / total aset", benchmark: { op: ">", value: 1.45 }, percent: true },
  { key: "roe", label: "Return on equity (ROE)", formula: "Laba bersih / modal", benchmark: { op: ">", value: 23 }, percent: true },
  { key: "bopo", label: "BOPO", formula: "(HPP + seluruh biaya) / penjualan", benchmark: { op: "<=", value: 83 }, percent: true },
];

export type RatioStatus = "memenuhi" | "tidak_memenuhi" | "info" | "tidak_dapat_dihitung";
export type RatioResult = RatioDefinition & { value: number | null; status: RatioStatus };

function ratioValues(period: FinancialPeriod | undefined): Record<RatioKey, number | null> {
  const neraca = period?.neraca ?? {};
  const lr = period?.labaRugi ?? {};
  const t = periodTotals(period);
  const hjp = n(neraca.hutangJangkaPendek);
  const pct = (value: number | null) => (value === null ? null : value * 100);
  return {
    currentRatio: pct(ratio(t.aktivaLancar, hjp)),
    quickRatio: pct(ratio(t.aktivaLancar - n(neraca.persediaan), hjp)),
    cashRatio: pct(ratio(n(neraca.kas) + n(neraca.bank), hjp)),
    der: pct(ratio(t.totalKewajiban, t.modal)),
    dar: pct(ratio(t.totalKewajiban, t.totalAset)),
    equityMultiplier: ratio(t.totalAset, t.modal),
    npm: pct(ratio(t.labaBersih, n(lr.penjualan))),
    roa: pct(ratio(t.labaBersih, t.totalAset)),
    roe: pct(ratio(t.labaBersih, t.modal)),
    bopo: pct(ratio(t.totalBeban, n(lr.penjualan))),
  };
}

function statusFor(def: RatioDefinition, value: number | null): RatioStatus {
  if (value === null) return "tidak_dapat_dihitung";
  if (!def.benchmark) return "info";
  const { op, value: limit } = def.benchmark;
  const ok = op === ">=" ? value >= limit : op === ">" ? value > limit : op === "<" ? value < limit : value <= limit;
  return ok ? "memenuhi" : "tidak_memenuhi";
}

export function computeRatios(period: FinancialPeriod | undefined): RatioResult[] {
  const values = ratioValues(period);
  return RATIO_DEFINITIONS.map(def => ({ ...def, value: values[def.key], status: statusFor(def, values[def.key]) }));
}

export function benchmarkText(def: RatioDefinition): string {
  if (!def.benchmark) return "-";
  const op = def.benchmark.op === ">=" ? "≥" : def.benchmark.op === "<=" ? "≤" : def.benchmark.op;
  return `${op} ${String(def.benchmark.value).replace(".", ",")}%`;
}

export type GrowthResult = { aset: number | null; penjualan: number | null; labaBersih: number | null; rataRata: number | null };

/** Pertumbuhan periode berjalan terhadap tahun lalu dalam persen (sheet Pertumbuhan). */
export function computeGrowth(fs: Pick<FinancialStatements, "previous" | "current">): GrowthResult {
  const prev = periodTotals(fs.previous);
  const cur = periodTotals(fs.current);
  const growth = (from: number, to: number) => (from > 0 ? ((to - from) / from) * 100 : from < 0 ? ((to - from) / Math.abs(from)) * 100 : null);
  const aset = growth(prev.totalAset, cur.totalAset);
  const penjualan = growth(n(fs.previous?.labaRugi?.penjualan), n(fs.current?.labaRugi?.penjualan));
  const labaBersih = growth(prev.labaBersih, cur.labaBersih);
  const parts = [aset, penjualan, labaBersih].filter((v): v is number => v !== null);
  return { aset, penjualan, labaBersih, rataRata: parts.length === 3 ? (parts[0]! + parts[1]! + parts[2]!) / 3 : null };
}

export type WorkingCapitalResult = {
  periodDays: number;
  hariPiutang: number | null;
  hariPersediaan: number | null;
  hariHutang: number | null;
  /** Siklus kas (cash to cash cycle) dalam hari. */
  siklusKas: number | null;
  /** Pertumbuhan penjualan yang dipakai (%). */
  pertumbuhan: number | null;
  sumberPertumbuhan: "proyeksi" | "historis" | "tidak_ada";
  proyeksiPenjualan: number;
  kebutuhanModalKerja: number | null;
  /** Modal kerja bersih yang sudah ada: aktiva lancar - hutang jangka pendek. */
  modalKerjaTersedia: number;
};

/**
 * Kebutuhan modal kerja (Keb Modal-A/B): siklus kas = hari piutang + hari
 * persediaan - hari hutang; kebutuhan = siklus x proyeksi penjualan / hari periode.
 */
export function computeWorkingCapital(fs: FinancialStatements): WorkingCapitalResult {
  const days = fs.periodDays && fs.periodDays > 0 ? fs.periodDays : 365;
  const neraca = fs.current?.neraca ?? {};
  const lr = fs.current?.labaRugi ?? {};
  const penjualan = n(lr.penjualan);
  const hpp = n(lr.hpp);
  const hariPiutang = penjualan > 0 ? (n(neraca.piutang) / penjualan) * days : null;
  const hariPersediaan = hpp > 0 ? (n(neraca.persediaan) / hpp) * days : null;
  const hariHutang = hpp > 0 ? (n(neraca.hutangJangkaPendek) / hpp) * days : null;
  const siklusKas = hariPiutang !== null && hariPersediaan !== null && hariHutang !== null ? hariPiutang + hariPersediaan - hariHutang : null;
  const historis = computeGrowth(fs).penjualan;
  const proyeksi = Number.isFinite(fs.expectedSalesGrowth) ? Number(fs.expectedSalesGrowth) : null;
  const pertumbuhan = proyeksi ?? historis;
  const proyeksiPenjualan = penjualan * (1 + (pertumbuhan ?? 0) / 100);
  const t = periodTotals(fs.current);
  return {
    periodDays: days,
    hariPiutang,
    hariPersediaan,
    hariHutang,
    siklusKas,
    pertumbuhan,
    sumberPertumbuhan: proyeksi !== null ? "proyeksi" : historis !== null ? "historis" : "tidak_ada",
    proyeksiPenjualan,
    kebutuhanModalKerja: siklusKas === null ? null : Math.max(0, (siklusKas * proyeksiPenjualan) / days),
    modalKerjaTersedia: t.aktivaLancar - n(neraca.hutangJangkaPendek),
  };
}

/** Angka bulanan untuk penilaian SSCI, diturunkan dari laba rugi periode berjalan (setahun). */
export function monthlyFiguresFromStatements(fs: Pick<FinancialStatements, "current"> | undefined): { monthlyRevenue: number; monthlyExpenses: number } {
  const t = periodTotals(fs?.current);
  return {
    monthlyRevenue: Math.round(n(fs?.current?.labaRugi?.penjualan) / 12),
    monthlyExpenses: Math.round(t.totalBeban / 12),
  };
}

// ---------------------------------------------------------------------------
// Pemeriksaan data
// ---------------------------------------------------------------------------

export type FinancialCheck = { severity: "tinggi" | "sedang" | "rendah"; field: string; message: string };

const rp = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
/** Toleransi pembulatan saat membandingkan total neraca. */
const BALANCE_TOLERANCE = 1_000;

export function financialChecks(fs: FinancialStatements | undefined | null): FinancialCheck[] {
  const checks: FinancialCheck[] = [];
  if (!fs) {
    checks.push({ severity: "tinggi", field: "Laporan keuangan", message: "Neraca dan laba rugi badan usaha belum diisi." });
    return checks;
  }
  const periods: Array<["previous" | "current", string]> = [["previous", "tahun lalu"], ["current", "periode berjalan"]];
  for (const [key, label] of periods) {
    const period = fs[key];
    if (isPeriodEmpty(period)) {
      checks.push({ severity: key === "current" ? "tinggi" : "sedang", field: "Periode data", message: `Laporan keuangan ${label} belum diisi.` });
      continue;
    }
    const t = periodTotals(period);
    if (!(n(period.labaRugi?.penjualan) > 0)) {
      checks.push({ severity: "tinggi", field: "Laba rugi", message: `Penjualan ${label} kosong atau nol.` });
    }
    if (Math.abs(t.selisih) > BALANCE_TOLERANCE) {
      checks.push({ severity: "tinggi", field: "Neraca", message: `Neraca ${label} tidak seimbang: total aset ${rp(t.totalAset)}, kewajiban + modal ${rp(t.totalPasiva)} (selisih ${rp(t.selisih)}).` });
    }
    if (t.modal < 0) {
      checks.push({ severity: "tinggi", field: "Modal", message: `Ekuitas ${label} negatif (${rp(t.modal)}).` });
    }
    const labaNeraca = period.neraca?.labaBerjalan;
    if (Number.isFinite(labaNeraca) && n(period.labaRugi?.penjualan) > 0 && Math.abs(n(labaNeraca) - t.labaBersih) > BALANCE_TOLERANCE) {
      checks.push({ severity: "rendah", field: "Laba berjalan", message: `Laba tahun berjalan di neraca ${label} (${rp(n(labaNeraca))}) berbeda dengan laba bersih laba rugi (${rp(t.labaBersih)}).` });
    }
  }
  if (!isPeriodEmpty(fs.current)) {
    const ratios = computeRatios(fs.current);
    const cr = ratios.find(r => r.key === "currentRatio")!;
    if (cr.value !== null && cr.value < 100) {
      checks.push({ severity: "sedang", field: "Likuiditas", message: `Current ratio ${cr.value.toFixed(0)}% di bawah 100%: aktiva lancar tidak menutup hutang jangka pendek.` });
    }
    const der = ratios.find(r => r.key === "der")!;
    if (der.value !== null && der.status === "tidak_memenuhi") {
      checks.push({ severity: "sedang", field: "Solvabilitas", message: `DER ${der.value.toFixed(0)}% di atas benchmark bank (${benchmarkText(der)}).` });
    }
    const t = periodTotals(fs.current);
    if (n(fs.current.labaRugi?.penjualan) > 0 && t.labaBersih < 0) {
      checks.push({ severity: "sedang", field: "Profitabilitas", message: `Periode berjalan rugi bersih ${rp(-t.labaBersih)}.` });
    }
  }
  return checks;
}

/** Ringkasan isian yang belum lengkap untuk bilah kelengkapan alur kerja. */
export function missingFinancialItems(fs: FinancialStatements | undefined | null): string[] {
  if (!fs) return ["Neraca & laba rugi tahun lalu", "Neraca & laba rugi periode berjalan"];
  const missing: string[] = [];
  if (isPeriodEmpty(fs.previous)) missing.push("Neraca & laba rugi tahun lalu");
  if (isPeriodEmpty(fs.current)) missing.push("Neraca & laba rugi periode berjalan");
  for (const [key, label] of [["previous", "tahun lalu"], ["current", "periode berjalan"]] as const) {
    if (isPeriodEmpty(fs[key])) continue;
    if (Math.abs(periodTotals(fs[key]).selisih) > BALANCE_TOLERANCE) missing.push(`Neraca ${label} belum seimbang`);
  }
  return missing;
}

export function emptyStatements(today = new Date()): FinancialStatements {
  const year = today.getFullYear();
  return {
    previous: { label: `PER-DESEMBER ${year - 2}`, neraca: {}, labaRugi: {} },
    current: { label: `PER-DESEMBER ${year - 1}`, neraca: {}, labaRugi: {} },
    periodDays: 365,
  };
}
