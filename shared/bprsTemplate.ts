import { z } from "zod";

/**
 * Format Excel "Skoring Fluktuatif Income UMKM" yang dipakai BPRS mitra.
 * Teks opsi harus sama persis dengan isi sheet Parameter, karena Excel
 * mencarinya dengan VLOOKUP exact match (termasuk spasi di depan " 1 - 2 Orang").
 */
export const BPRS_OPTIONS = {
  kantor: ["PUSAT", "CABANG"],
  kategoriNasabah: ["Walk In Customer", "Solisitasi", "Referral"],
  jenisKelamin: ["Pria", "Wanita"],
  statusPerkawinan: ["Menikah", "Lajang", "Cerai"],
  tanggungan: ["> 5 Orang", "3 - 5 Orang", " 1 - 2 Orang", "Tidak Mempunyai Tanggungan"],
  pendidikan: ["SD", "SMP", "SMA", "Dip./S1-S3"],
  statusTempatTinggal: ["Sewa", "Lain-lain (Menumpang)", "Angsuran", "Milik sendiri"],
  lamaMenetap: ["0 - 2 tahun", "> 2 - 5 tahun", "> 5 - 8 tahun", "> 8 tahun"],
  reputasi: ["Tidak baik", "Tidak dikenal", "Dikenal namum kurang bersosialisasi", "Dikenal memiliki reputasi baik"],
  laporanKeuangan: ["Proforma", "Inhouse & Proforma", "Inhouse", "Audit & Inhouse", "Audit"],
  lamaUsaha: ["=1 tahun", ">1 - 5 tahun", ">5 - 10 tahun", ">10 tahun"],
  sistemPenjualan: ["Konsinyasi & Bagi Hasil", "Non Tunai", "Non Tunai & Tunai", "Tunai"],
  kepemilikanTempatUsaha: ["Lain-lain", "Sewa", "Angsuran", "Milik sendiri"],
  lokasiUsaha: ["Lain-lain", "Berpindah", "Mangkal/Non Permanen", "Menetap/Permanen"],
  daerahPemasaran: ["Ekspor", "Kabupaten/Kotamadya", "Kelurahan/Kecamatan", "Nasional", "Regional/Provinsi", "Sekitar Lokasi Usaha"],
  tenagaKerja: ["<= 2 Orang", ">2 sd. 5 Orang", ">5 sd. 10 Orang", "> 10 Orang"],
  pengelolaanKeuangan: [
    "Tidak terdapat pencatatan dan pemisahan pengelolaan keuangan usaha",
    "Terdapat pencatatan usaha namun tidak ada pemisahan dengan keuangan lainnya",
    "Terdapat pemisahan dan pencatatan keuangan dilakukan sederhana namun belum memiliki laporan keuangan sendiri",
    "Terdapat pemisahan dan memiliki pencatatan yang baik serta mampu membuat laporan keuangan sendiri",
  ],
  hutangDagang: [
    "Lebih besar dari Pembiayaan yang dimohon",
    "Sampai dengan 50 % dari Pembiayaan yang dimohon",
    "Sampai dengan 25 % dari Pembiayaan yang dimohon",
    "Tidak ada/sebagian kecil dari Pembiayaan yang dimohon",
  ],
  hubunganBank: ["Belum Pernah", "Nasabah/debitur bank < 1 tahun", "Nasabah/debitur bank 1 - 3 tahun", "Nasabah/debitur bank > 3 tahun"],
  riwayatSlik: [
    "Terdapat Kol 3,4 dan 5 di 12 bulan terakhir",
    "Terdapat Kol 2 di 12 bulan terakhir",
    "Belum memiliki kredit/Pembiayaan",
    "Tidak pernah terlambat 12 bulan terakhir",
  ],
  buktiPenggunaanDana: ["Ada", "Tidak Ada"],
  sektorEkonomi: ["Perdagangan", "Pertanian", "Jasa", "Industri", "Lainnya"],
  jenisPenggunaan: ["Modal Kerja", "Investasi", "Konsumtif"],
  jenisMargin: ["Flat", "Efektif"],
  rpcPersen: ["0.7", "0.75", "0.8"],
  pengikatan: ["Tidak Pengikatan Notaril", "Pengikatan Notaril"],
  asuransiAgunan: ["Tidak Diasuransikan", "Asuransi Kerugian Syariah"],
  asuransiJiwa: ["Tidak Diasuransikan", "Asuransi Jiwa Syariah"],
  jenisSuratTanah: [
    "Sertipikat Hak Milik",
    "Sertipikat Hak Guna Bangunan",
    "Sertipikat Rusun/Apartemen",
    "Sertipikat Hak Guna Usaha",
    "Akta Jual Beli",
    "Akta Hibah",
    "SIPTB",
  ],
  pengikatanTanah: ["APHT", "SKMHT&APHT", "SKMHT", "Legalisasi", "Warmeking", "Di Bawah Tangan"],
  pengikatanKendaraan: ["Fidusia", "Legalisasi", "Warmeking", "Di Bawah Tangan"],
} as const;

export type BprsOptionKey = keyof typeof BPRS_OPTIONS;

const opt = <K extends BprsOptionKey>(key: K) =>
  z.enum(BPRS_OPTIONS[key] as unknown as [string, ...string[]]).optional();

const text = (max = 255) => z.string().trim().max(max).optional();
const money = z.number().nonnegative().max(1e13).optional();

export const MAX_STATEMENT_ROWS = 48;

const statementMonthSchema = z.object({
  debits: z.array(z.number().positive().max(1e13)).max(MAX_STATEMENT_ROWS),
  credits: z.array(z.number().positive().max(1e13)).max(MAX_STATEMENT_ROWS),
});

export const bprsProfileSchema = z.object({
  // Informasi Pokok
  kantor: opt("kantor"),
  nomorProposal: text(100),
  namaAo: text(),
  kategoriNasabah: opt("kategoriNasabah"),
  namaReferral: text(),
  jenisKelamin: opt("jenisKelamin"),
  tempatLahir: text(100),
  tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  desa: text(100),
  kecamatan: text(100),
  kabupaten: text(100),
  kodePos: text(10),
  statusPerkawinan: opt("statusPerkawinan"),
  tanggungan: opt("tanggungan"),
  pendidikan: opt("pendidikan"),
  ibuKandung: text(),
  namaPasangan: text(),
  ttlPasangan: text(),
  ktpPasangan: text(30),
  pekerjaanPasangan: text(),
  namaSaudara: text(),
  hpSaudara: text(30),
  statusTempatTinggal: opt("statusTempatTinggal"),
  lamaMenetap: opt("lamaMenetap"),
  reputasi: opt("reputasi"),
  indikatorReputasi: text(2000),
  laporanKeuangan: opt("laporanKeuangan"),
  sistemPenjualan: opt("sistemPenjualan"),
  kepemilikanTempatUsaha: opt("kepemilikanTempatUsaha"),
  lokasiUsaha: opt("lokasiUsaha"),
  daerahPemasaran: opt("daerahPemasaran"),
  tenagaKerja: opt("tenagaKerja"),
  pengelolaanKeuangan: opt("pengelolaanKeuangan"),
  hutangDagang: opt("hutangDagang"),
  hubunganBank: opt("hubunganBank"),
  riwayatSlik: opt("riwayatSlik"),
  pembiayaanKe: z.number().int().min(1).max(99).optional(),
  buktiPenggunaanDana: opt("buktiPenggunaanDana"),
  sektorEkonomi: opt("sektorEkonomi"),
  jenisPenggunaan: opt("jenisPenggunaan"),
  jenisMargin: opt("jenisMargin"),
  rpcPersen: opt("rpcPersen"),
  // Aspek Non Keuangan
  latarBelakang: text(3000),
  pengalamanUsaha: text(3000),
  pengikatan: opt("pengikatan"),
  asuransiAgunan: opt("asuransiAgunan"),
  asuransiJiwa: opt("asuransiJiwa"),
  agunanTanah: z.array(z.object({
    jenisSurat: opt("jenisSuratTanah"),
    nomor: text(100),
    atasNama: text(),
    luasTanah: money,
    luasBangunan: money,
    nilaiPasar: money,
    persen: z.number().min(0).max(1).optional(),
    pengikatan: opt("pengikatanTanah"),
    lokasi: text(),
  })).max(7).optional(),
  agunanKendaraan: z.array(z.object({
    merek: text(100),
    tipe: text(100),
    tahun: z.number().int().min(1950).max(2100).optional(),
    atasNama: text(),
    nomorBpkb: text(50),
    nopol: text(20),
    nilaiPasar: money,
    persen: z.number().min(0).max(1).optional(),
  })).max(5).optional(),
  // Aspek Keuangan
  kas: money,
  biayaRumahTangga: money,
  // Rekening koran 3 bulan
  rekeningKoran: z.object({
    bank: text(100),
    nomorRekening: text(50),
    saldoAwal: z.number().min(-1e13).max(1e13).optional(),
    bulanPertama: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    months: z.array(statementMonthSchema).max(3),
  }).optional(),
}).strict();

export type BprsProfile = z.infer<typeof bprsProfileSchema>;

// ---------------------------------------------------------------------------
// Nilai turunan dari data SSCI
// ---------------------------------------------------------------------------

export type BprsApplicationData = {
  businessAge: number; // bulan
  monthlyRevenue: number;
  monthlyExpenses: number;
  existingDebt: number; // angsuran existing per bulan
  collateralValue: number;
  requestedAmount: number;
  financingTenor: number; // bulan
  marginRate: number; // margin total dalam persen dari pokok
  financingAkad: string | null;
  createdAt?: Date | string | null;
};

export function lamaUsahaFromMonths(months: number): (typeof BPRS_OPTIONS.lamaUsaha)[number] {
  if (months <= 12) return "=1 tahun";
  if (months <= 60) return ">1 - 5 tahun";
  if (months <= 120) return ">5 - 10 tahun";
  return ">10 tahun";
}

export const AKAD_TO_BPRS: Record<string, string> = {
  murabahah: "Murabahah",
  mudharabah: "Mudharabah",
  qardh: "Qardh",
  multijasa: "Ijarah Multijasa",
};

export function ageOn(birthDate: string, reference: Date): number | null {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    reference.getUTCMonth() < birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() && reference.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Margin per bulan (flat) dari margin total SSCI. */
export function monthlyFlatRate(app: Pick<BprsApplicationData, "marginRate" | "financingTenor">): number {
  if (app.financingTenor <= 0) return 0;
  return app.marginRate / 100 / app.financingTenor;
}

export function newInstallment(app: Pick<BprsApplicationData, "requestedAmount" | "marginRate" | "financingTenor">): number {
  if (app.financingTenor <= 0) return 0;
  return (app.requestedAmount * (1 + app.marginRate / 100)) / app.financingTenor;
}

export function collateralTotal(profile: BprsProfile, app: Pick<BprsApplicationData, "collateralValue">): number {
  const rows = [...(profile.agunanTanah ?? []), ...(profile.agunanKendaraan ?? [])];
  const fromRows = rows.reduce((sum, row) => sum + (row.nilaiPasar ?? 0) * (row.persen ?? 1), 0);
  return fromRows > 0 ? fromRows : app.collateralValue;
}

export type StatementSummary = {
  monthsUsed: number;
  avgCreditCount: number;
  avgCreditTotal: number;
  avgDebitTotal: number;
  avgClosingBalance: number;
};

export function summarizeStatement(statement: BprsProfile["rekeningKoran"]): StatementSummary | null {
  if (!statement || statement.months.length === 0) return null;
  let balance = statement.saldoAwal ?? 0;
  let closingSum = 0;
  let creditCount = 0;
  let creditTotal = 0;
  let debitTotal = 0;
  for (const month of statement.months) {
    const credit = month.credits.reduce((a, b) => a + b, 0);
    const debit = month.debits.reduce((a, b) => a + b, 0);
    balance += credit - debit;
    closingSum += balance;
    creditCount += month.credits.length;
    creditTotal += credit;
    debitTotal += debit;
  }
  const n = statement.months.length;
  return {
    monthsUsed: n,
    avgCreditCount: creditCount / n,
    avgCreditTotal: creditTotal / n,
    avgDebitTotal: debitTotal / n,
    avgClosingBalance: closingSum / n,
  };
}

// ---------------------------------------------------------------------------
// Estimasi skor sesuai sheet Parameter (template Fluktuatif)
// ---------------------------------------------------------------------------

type PointsTable = Record<string, number>;

/** Nilai K = BBT x %Faktor x %Variabel, disalin dari sheet Parameter. */
export const BPRS_POINTS: Record<string, PointsTable> = {
  usia: { "21 - 30 tahun": 1, "31 - 40 tahun": 1.7, "41 - 55 tahun": 2, "56 - 60 tahun": 1.4 },
  statusPerkawinan: { Menikah: 1, Lajang: 0.8, Cerai: 0.8 },
  tanggungan: { "> 5 Orang": 0.4375, "3 - 5 Orang": 0.875, " 1 - 2 Orang": 1.3125, "Tidak Mempunyai Tanggungan": 1.75 },
  pendidikan: { SD: 0.25, SMP: 0.5, SMA: 0.75, "Dip./S1-S3": 1.5 },
  statusTempatTinggal: { Sewa: 1, "Lain-lain (Menumpang)": 2, Angsuran: 3, "Milik sendiri": 4 },
  lamaMenetap: { "0 - 2 tahun": 0.75, "> 2 - 5 tahun": 1.5, "> 5 - 8 tahun": 2.25, "> 8 tahun": 3 },
  reputasi: { "Tidak baik": 0, "Tidak dikenal": 0.6, "Dikenal namum kurang bersosialisasi": 2.25, "Dikenal memiliki reputasi baik": 3 },
  laporanKeuangan: { Proforma: 0.4, "Inhouse & Proforma": 0.8, Inhouse: 1.2, "Audit & Inhouse": 1.6, Audit: 2 },
  lamaUsaha: { "=1 tahun": 0.8, ">1 - 5 tahun": 2, ">5 - 10 tahun": 3, ">10 tahun": 4 },
  sistemPenjualan: { "Konsinyasi & Bagi Hasil": 0.9, "Non Tunai": 1.5, "Non Tunai & Tunai": 2.1, Tunai: 3 },
  kepemilikanTempatUsaha: { "Lain-lain": 1.125, Sewa: 2.25, Angsuran: 3.375, "Milik sendiri": 4.5 },
  lokasiUsaha: { "Lain-lain": 0.75, Berpindah: 1.5, "Mangkal/Non Permanen": 2.25, "Menetap/Permanen": 3 },
  tenagaKerja: { "<= 2 Orang": 0.75, ">2 sd. 5 Orang": 1.2, ">5 sd. 10 Orang": 2.25, "> 10 Orang": 3 },
  pengelolaanKeuangan: Object.fromEntries(BPRS_OPTIONS.pengelolaanKeuangan.map((o, i) => [o, [1.125, 1.8, 3.375, 4.5][i]!])),
  hutangDagang: Object.fromEntries(BPRS_OPTIONS.hutangDagang.map((o, i) => [o, [0, 0.75, 2.1, 3][i]!])),
  hubunganBank: Object.fromEntries(BPRS_OPTIONS.hubunganBank.map((o, i) => [o, [1.25, 2.5, 5, 6.25][i]!])),
  saldoRataRata: { "Tidak ada": 1, "< 5 Juta": 3, "5 - 10 juta": 4, "> 10 juta": 5 },
  frekuensiMutasi: {
    "Tidak ada": 1.25,
    "Pasif atau kurang dari 3 kali perbulan": 2.5,
    "Mutasi 3 - 8 kali perbulan": 5,
    "Lebih dari 8 Kali perbulan": 6.25,
  },
  riwayatSlik: Object.fromEntries(BPRS_OPTIONS.riwayatSlik.map((o, i) => [o, [0, 1.875, 5.625, 7.5][i]!])),
  rpc: { "RPC tidak memadai": 0, "RPC memadai": 5, "RPC baik": 7, "RPC sangat baik": 10 },
  jangkaWaktu: { ">8 Tahun": 0.5, "7 - 8 Tahun": 1, "5 - 6 Tahun": 1.5, "3 - 4 Tahun": 2, "1 - 2 Tahun": 2.5 },
  pembiayaanKe: { "1-2": 1.875, "3-4": 2.8125, ">=5": 3.75 },
  agunan: { "100% s.d 125%": 3.75, ">125% s.d 150%": 5.625, ">150%": 8, "<100%": -30 },
  pengikatan: { "Tidak Pengikatan Notaril": 1, "Pengikatan Notaril": 4 },
  asuransiAgunan: { "Tidak Diasuransikan": 0.45, "Asuransi Kerugian Syariah": 1.75 },
  asuransiJiwa: { "Tidak Diasuransikan": 0.45, "Asuransi Jiwa Syariah": 1.75 },
};

export const BPRS_CRITERIA_LABELS: Record<string, string> = {
  usia: "Usia calon nasabah",
  statusPerkawinan: "Status perkawinan",
  tanggungan: "Jumlah tanggungan",
  pendidikan: "Pendidikan terakhir",
  statusTempatTinggal: "Kepemilikan tempat tinggal",
  lamaMenetap: "Lama menetap",
  reputasi: "Reputasi",
  laporanKeuangan: "Jenis laporan keuangan",
  lamaUsaha: "Lama berusaha",
  sistemPenjualan: "Sistem penjualan",
  kepemilikanTempatUsaha: "Kepemilikan tempat usaha",
  lokasiUsaha: "Lokasi usaha",
  tenagaKerja: "Jumlah tenaga kerja",
  pengelolaanKeuangan: "Pengelolaan keuangan",
  hutangDagang: "Hutang dagang",
  hubunganBank: "Hubungan dengan perbankan",
  saldoRataRata: "Saldo rata-rata rekening",
  frekuensiMutasi: "Frekuensi mutasi rekening",
  riwayatSlik: "Riwayat SLIK",
  rpc: "Kemampuan bayar (RPC)",
  jangkaWaktu: "Jangka waktu",
  pembiayaanKe: "Pembiayaan ke-",
  agunan: "Coverage agunan",
  pengikatan: "Pengikatan agunan",
  asuransiAgunan: "Asuransi agunan",
  asuransiJiwa: "Asuransi jiwa",
};

export const BPRS_RATING_BANDS: Array<{ min: number; rating: string; label: string }> = [
  { min: 98, rating: "AAA", label: "Outstanding" },
  { min: 95, rating: "AA+", label: "Strong" },
  { min: 92, rating: "AA", label: "Strong" },
  { min: 89, rating: "AA-", label: "Strong" },
  { min: 86, rating: "A+", label: "Good" },
  { min: 83, rating: "A", label: "Good" },
  { min: 80, rating: "A-", label: "Good" },
  { min: 77, rating: "BBB+", label: "Average" },
  { min: 74, rating: "BBB", label: "Average" },
  { min: 71, rating: "BBB-", label: "Average" },
  { min: 68, rating: "BB+", label: "Acceptable" },
  { min: 65, rating: "BB", label: "Acceptable" },
  { min: 62, rating: "BB-", label: "High Risk" },
  { min: 59, rating: "B+", label: "High Risk" },
  { min: 56, rating: "B", label: "Watch List" },
  { min: 53, rating: "B-", label: "Watch List" },
  { min: 50, rating: "CCC+", label: "Special Mention" },
  { min: 47, rating: "CCC", label: "Special Mention" },
  { min: 44, rating: "CCC-", label: "Substandard" },
  { min: 0, rating: "D", label: "Doubtful" },
];

export function bprsRating(score: number) {
  const rounded = Math.round(score);
  return BPRS_RATING_BANDS.find(band => rounded >= band.min) ?? BPRS_RATING_BANDS[BPRS_RATING_BANDS.length - 1]!;
}

export type BprsCriterionResult = {
  key: string;
  label: string;
  answer: string | null;
  points: number;
  maxPoints: number;
  source: "profil" | "data_ssci" | "rekening_koran" | "belum_diisi";
};

export type BprsScoreResult = {
  criteria: BprsCriterionResult[];
  subtotal: number;
  rpcAdequate: boolean;
  coverageRatio: number;
  coverageThreshold: number;
  score: number;
  rating: string;
  ratingLabel: string;
  status: "Layak" | "Tidak Layak";
  missing: string[];
  netProfit: number;
};

function bucketTenor(months: number): string {
  const years = months / 12;
  if (years <= 2) return "1 - 2 Tahun";
  if (years <= 4) return "3 - 4 Tahun";
  if (years <= 6) return "5 - 6 Tahun";
  if (years <= 8) return "7 - 8 Tahun";
  return ">8 Tahun";
}

function bucketAge(age: number): string | null {
  if (age >= 21 && age <= 30) return "21 - 30 tahun";
  if (age >= 31 && age <= 40) return "31 - 40 tahun";
  if (age >= 41 && age <= 55) return "41 - 55 tahun";
  if (age >= 56 && age <= 60) return "56 - 60 tahun";
  return null;
}

function bucketCoverage(ratio: number): string {
  if (ratio > 1.5) return ">150%";
  if (ratio > 1.25) return ">125% s.d 150%";
  if (ratio >= 1) return "100% s.d 125%";
  return "<100%";
}

export function bucketBalance(avg: number): string {
  if (avg <= 0) return "Tidak ada";
  if (avg < 5_000_000) return "< 5 Juta";
  if (avg <= 10_000_000) return "5 - 10 juta";
  return "> 10 juta";
}

export function bucketMutation(avgCount: number): string {
  if (avgCount <= 0) return "Tidak ada";
  if (avgCount < 3) return "Pasif atau kurang dari 3 kali perbulan";
  if (avgCount <= 8) return "Mutasi 3 - 8 kali perbulan";
  return "Lebih dari 8 Kali perbulan";
}

export const BPRS_TAX_RATE = 0.05;

/** Laba bersih per bulan sesuai susunan yang ditulis ke Excel (biaya usaha + rumah tangga, pajak 5%). */
export function netProfitFor(profile: BprsProfile, app: BprsApplicationData): number {
  const beforeTax = app.monthlyRevenue - app.monthlyExpenses - (profile.biayaRumahTangga ?? 0);
  return beforeTax * (1 - BPRS_TAX_RATE);
}

/**
 * Menghitung estimasi skor format BPRS. Excel tetap menjadi acuan resmi;
 * fungsi ini meniru rumus sheet Parameter dan Usulan Pembiayaan agar analis
 * bisa melihat hasilnya di SSCI sebelum mengunduh file.
 */
export function computeBprsScore(profile: BprsProfile, app: BprsApplicationData, referenceDate = new Date()): BprsScoreResult {
  const criteria: BprsCriterionResult[] = [];
  const missing: string[] = [];
  const add = (key: string, answer: string | null | undefined, source: BprsCriterionResult["source"]) => {
    const table = BPRS_POINTS[key]!;
    const maxPoints = Math.max(...Object.values(table));
    const points = answer != null && answer in table ? table[answer]! : 0;
    const filled = answer != null && answer in table;
    if (!filled) missing.push(BPRS_CRITERIA_LABELS[key]!);
    criteria.push({ key, label: BPRS_CRITERIA_LABELS[key]!, answer: filled ? answer! : null, points, maxPoints, source: filled ? source : "belum_diisi" });
  };

  const age = profile.tanggalLahir ? ageOn(profile.tanggalLahir, referenceDate) : null;
  add("usia", age == null ? null : bucketAge(age), "profil");
  add("statusPerkawinan", profile.statusPerkawinan, "profil");
  add("tanggungan", profile.tanggungan, "profil");
  add("pendidikan", profile.pendidikan, "profil");
  add("statusTempatTinggal", profile.statusTempatTinggal, "profil");
  add("lamaMenetap", profile.lamaMenetap, "profil");
  add("reputasi", profile.reputasi, "profil");
  add("laporanKeuangan", profile.laporanKeuangan, "profil");
  add("lamaUsaha", lamaUsahaFromMonths(app.businessAge), "data_ssci");
  add("sistemPenjualan", profile.sistemPenjualan, "profil");
  add("kepemilikanTempatUsaha", profile.kepemilikanTempatUsaha, "profil");
  add("lokasiUsaha", profile.lokasiUsaha, "profil");
  add("tenagaKerja", profile.tenagaKerja, "profil");
  add("pengelolaanKeuangan", profile.pengelolaanKeuangan, "profil");
  add("hutangDagang", profile.hutangDagang, "profil");
  add("hubunganBank", profile.hubunganBank, "profil");

  const statement = summarizeStatement(profile.rekeningKoran);
  add("saldoRataRata", statement ? bucketBalance(statement.avgClosingBalance) : null, "rekening_koran");
  add("frekuensiMutasi", statement ? bucketMutation(statement.avgCreditCount) : null, "rekening_koran");
  add("riwayatSlik", profile.riwayatSlik, "profil");

  // Kemampuan bayar: sama dengan Usulan Pembiayaan AA87/AA88.
  const rpcPct = Number(profile.rpcPersen ?? "0.7");
  const netProfit = netProfitFor(profile, app);
  const otherNet = -app.existingDebt; // angsuran existing ditulis sebagai biaya lain-lain
  const installment = newInstallment(app);
  const coverageRatio = installment > 0 ? (netProfit + otherNet) / installment : 0;
  const thresholdDenominator = netProfit * rpcPct + otherNet;
  const coverageThreshold = thresholdDenominator > 0 ? (netProfit + otherNet) / thresholdDenominator : Number.POSITIVE_INFINITY;
  const rpcAdequate = Number.isFinite(coverageThreshold) && coverageRatio >= coverageThreshold;
  let rpcBand = "RPC tidak memadai";
  if (rpcAdequate) {
    if (coverageRatio > coverageThreshold + 3.75) rpcBand = "RPC sangat baik";
    else if (coverageRatio > coverageThreshold + 1.75) rpcBand = "RPC baik";
    else rpcBand = "RPC memadai";
  }
  add("rpc", rpcBand, "data_ssci");

  add("jangkaWaktu", bucketTenor(app.financingTenor), "data_ssci");
  const nth = profile.pembiayaanKe ?? null;
  add("pembiayaanKe", nth == null ? null : nth <= 2 ? "1-2" : nth <= 4 ? "3-4" : ">=5", "profil");
  const collateral = collateralTotal(profile, app);
  add("agunan", app.requestedAmount > 0 ? bucketCoverage(collateral / app.requestedAmount) : null, "data_ssci");
  add("pengikatan", profile.pengikatan, "profil");
  add("asuransiAgunan", profile.asuransiAgunan, "profil");
  add("asuransiJiwa", profile.asuransiJiwa, "profil");

  const subtotal = criteria.reduce((sum, c) => sum + c.points, 0);
  const score = Math.max(0, rpcAdequate ? subtotal : subtotal * 0.7);
  const band = bprsRating(score);
  return {
    criteria,
    subtotal,
    rpcAdequate,
    coverageRatio,
    coverageThreshold: Number.isFinite(coverageThreshold) ? coverageThreshold : 0,
    score,
    rating: band.rating,
    ratingLabel: band.label,
    status: score >= 70 ? "Layak" : "Tidak Layak",
    missing,
    netProfit,
  };
}

// ---------------------------------------------------------------------------
// Pemeriksaan isian sebelum Excel diunduh
// ---------------------------------------------------------------------------

export type BprsCheck = { severity: "tinggi" | "sedang" | "rendah"; message: string };

export function checkBprsProfile(profile: BprsProfile, app: BprsApplicationData, referenceDate = new Date()): BprsCheck[] {
  const checks: BprsCheck[] = [];
  const statement = summarizeStatement(profile.rekeningKoran);
  if (statement && app.monthlyRevenue > 0) {
    const ratio = statement.avgCreditTotal / app.monthlyRevenue;
    if (ratio < 0.5) {
      checks.push({ severity: "sedang", message: `Rata-rata uang masuk di rekening koran (Rp ${Math.round(statement.avgCreditTotal).toLocaleString("id-ID")}) kurang dari separuh omzet yang diisi (Rp ${app.monthlyRevenue.toLocaleString("id-ID")}). Pastikan omzet didukung bukti lain.` });
    } else if (ratio > 2) {
      checks.push({ severity: "rendah", message: "Uang masuk di rekening koran jauh di atas omzet yang diisi. Periksa apakah ada dana non usaha (transfer pribadi, pinjaman)." });
    }
  }
  if (statement && statement.monthsUsed < 3) {
    checks.push({ severity: "rendah", message: `Rekening koran baru ${statement.monthsUsed} bulan. Format BPRS meminta 3 bulan.` });
  }
  if ((profile.laporanKeuangan === "Audit" || profile.laporanKeuangan === "Audit & Inhouse") &&
      profile.pengelolaanKeuangan === BPRS_OPTIONS.pengelolaanKeuangan[0]) {
    checks.push({ severity: "sedang", message: "Laporan keuangan diisi \"Audit\", tetapi pengelolaan keuangan diisi tidak ada pencatatan. Kedua isian saling bertentangan." });
  }
  if (profile.pengelolaanKeuangan === BPRS_OPTIONS.pengelolaanKeuangan[3] && profile.laporanKeuangan === "Proforma") {
    checks.push({ severity: "rendah", message: "Pengelolaan keuangan diisi mampu membuat laporan sendiri, tetapi jenis laporan hanya Proforma." });
  }
  if (profile.riwayatSlik === "Belum memiliki kredit/Pembiayaan" && app.existingDebt > 0) {
    checks.push({ severity: "tinggi", message: "SLIK diisi belum memiliki pembiayaan, padahal ada angsuran existing. Periksa iDeb SLIK." });
  }
  if (profile.hubunganBank === "Belum Pernah" && profile.rekeningKoran?.months.length) {
    checks.push({ severity: "rendah", message: "Hubungan dengan perbankan diisi \"Belum Pernah\", tetapi ada rekening koran bank." });
  }
  if (profile.pembiayaanKe && profile.pembiayaanKe > 1 && profile.buktiPenggunaanDana === "Tidak Ada") {
    checks.push({ severity: "rendah", message: "Ini bukan pembiayaan pertama, tetapi bukti penggunaan dana sebelumnya tidak ada." });
  }
  if (profile.tanggalLahir) {
    const age = ageOn(profile.tanggalLahir, referenceDate);
    if (age != null && (age < 21 || age > 60)) {
      checks.push({ severity: "tinggi", message: `Usia nasabah ${age} tahun di luar rentang tabel BPRS (21 sampai 60 tahun). Excel akan menampilkan #N/A pada skor usia.` });
    } else if (age != null) {
      const endAge = age + app.financingTenor / 12;
      if (endAge > 65) checks.push({ severity: "sedang", message: `Usia nasabah saat pembiayaan berakhir sekitar ${Math.floor(endAge)} tahun.` });
    }
  }
  if (app.requestedAmount > 0 && collateralTotal(profile, app) < app.requestedAmount) {
    checks.push({ severity: "tinggi", message: "Nilai agunan di bawah 100% plafon. Di Excel BPRS ini memberi nilai -30 pada skor agunan." });
  }
  if (profile.hutangDagang === BPRS_OPTIONS.hutangDagang[0]) {
    checks.push({ severity: "sedang", message: "Hutang dagang lebih besar dari pembiayaan yang dimohon." });
  }
  const missingCore = (["statusPerkawinan", "tanggungan", "pendidikan", "statusTempatTinggal", "lamaMenetap", "reputasi", "riwayatSlik", "hubunganBank"] as const)
    .filter(key => !profile[key]);
  if (missingCore.length > 0) {
    checks.push({ severity: "rendah", message: `${missingCore.length} isian penilaian utama belum diisi. Skor format BPRS akan lebih rendah dari seharusnya.` });
  }
  return checks;
}
