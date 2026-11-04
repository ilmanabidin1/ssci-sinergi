import type { DemoScenario } from "./demoData";
import { monthlyFiguresFromStatements, monthsSince, type BentukBadanUsaha, type CompanyProfile, type FinancialStatements } from "./financialStatements";

/**
 * Data contoh fiktif untuk segmen badan hukum. Neraca selalu seimbang (total
 * aset = kewajiban + modal), laba tahun berjalan sama dengan laba bersih laba
 * rugi, dan periode berjalan tumbuh wajar dibanding tahun lalu.
 */

type Rng = () => number;
const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]!;
const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const pad = (value: number, length: number) => String(value).padStart(length, "0");
const digits = (rng: Rng, length: number) => Array.from({ length }, () => randInt(rng, 0, 9)).join("");

type Archetype = {
  bentuk: BentukBadanUsaha;
  names: string[];
  businessType: string;
  /** Rentang penjualan tahun lalu (Rp). */
  sales: [number, number];
  hppRatio: [number, number];
  /** Biaya penjualan dan biaya operasional terhadap penjualan. */
  biayaPenjualan: [number, number];
  biayaOperasional: [number, number];
  hariPiutang: [number, number];
  hariPersediaan: [number, number];
  /** Porsi aset tetap terhadap penjualan. */
  fixed: { tanahBangunan: number; kendaraan: number; peralatan: number; asetLain: number };
  purpose: string;
  object: string;
  supplier: string;
  employees: [number, number];
};

const ARCHETYPES: Archetype[] = [
  {
    bentuk: "CV",
    names: ["Sinar Busana Mandiri", "Rahayu Konveksi Sejahtera", "Barokah Garmen Priangan"],
    businessType: "Konveksi dan garmen (seragam sekolah dan kantor)",
    sales: [3_600_000_000, 5_400_000_000],
    hppRatio: [0.66, 0.7],
    biayaPenjualan: [0.02, 0.035],
    biayaOperasional: [0.07, 0.09],
    hariPiutang: [35, 50],
    hariPersediaan: [50, 70],
    fixed: { tanahBangunan: 0.17, kendaraan: 0.05, peralatan: 0.09, asetLain: 0.01 },
    purpose: "Modal kerja pembelian kain dan aksesoris untuk pesanan seragam tahun ajaran baru dari 14 sekolah mitra.",
    object: "Kain drill dan kain katun untuk produksi seragam",
    supplier: "PT Tekstil Cigondewah Jaya",
    employees: [25, 45],
  },
  {
    bentuk: "PT",
    names: ["Amanah Distribusi Nusantara", "Berkah Pangan Lestari", "Mitra Niaga Parahyangan"],
    businessType: "Distributor sembako dan kebutuhan pokok ke toko ritel",
    sales: [6_000_000_000, 9_000_000_000],
    hppRatio: [0.78, 0.82],
    biayaPenjualan: [0.01, 0.02],
    biayaOperasional: [0.035, 0.045],
    hariPiutang: [25, 40],
    hariPersediaan: [30, 45],
    fixed: { tanahBangunan: 0.12, kendaraan: 0.06, peralatan: 0.02, asetLain: 0.01 },
    purpose: "Modal kerja penambahan stok beras dan minyak goreng untuk melayani 60 toko ritel baru di Kabupaten Bandung.",
    object: "Persediaan beras premium dan minyak goreng kemasan",
    supplier: "PT Sumber Pangan Priangan",
    employees: [15, 30],
  },
];

const DIRECTORS = ["H. Asep Saepudin", "Hj. Neneng Rohmawati", "Dadang Kurniawan", "Rina Permana", "Hendra Sutisna", "Dewi Mulyana"];
const PARTNERS = ["Agus Hermawan", "Siti Rahayu", "Iwan Kusnadi", "Lilis Suryana", "Rahmat Hidayat"];
const STREETS = ["Jl. Soekarno Hatta", "Jl. Moh. Toha", "Jl. Raya Cibaduyut", "Jl. Kopo Sayati", "Jl. Terusan Buah Batu"];
const CITIES = [
  { city: "Kota Bandung", kecamatan: "Bojongloa Kidul", code: "3273" },
  { city: "Kabupaten Bandung", kecamatan: "Margahayu", code: "3204" },
  { city: "Kota Cimahi", kecamatan: "Cimahi Selatan", code: "3277" },
];

export type DemoBadanScenario = {
  customer: { customerName: string; customerId: string; phone: string; email: string; address: string };
  business: { businessName: string; businessType: string; businessAge: string };
  company: Omit<CompanyProfile, "financials">;
  financials: FinancialStatements;
  /** Sama bentuknya dengan skenario perorangan sehingga ceklist akad dapat dipakai bersama. */
  finance: DemoScenario["finance"];
  akad: DemoScenario["akad"];
  legal: DemoScenario["legal"];
  esg: DemoScenario["esg"];
};

const iso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;

export function buildDemoBadanScenario(options: { rng?: Rng; today?: Date } = {}): DemoBadanScenario {
  const rng = options.rng ?? Math.random;
  const today = options.today ?? new Date();
  const type = pick(rng, ARCHETYPES);
  const name = `${type.bentuk} ${pick(rng, type.names)}`;
  const place = pick(rng, CITIES);
  const yearsOld = randInt(rng, 5, 14);
  const founded = new Date(today.getFullYear() - yearsOld, randInt(rng, 0, 11), randInt(rng, 1, 28));
  const lastYear = today.getFullYear() - 1;

  // ---- Laba rugi dua periode -------------------------------------------------
  const step = 1_000_000;
  const salesPrev = roundTo(between(rng, ...type.sales), 10_000_000);
  const growth = between(rng, 0.08, 0.18);
  const salesCur = roundTo(salesPrev * (1 + growth), 10_000_000);
  const labaRugi = (sales: number) => {
    const hpp = roundTo(sales * between(rng, ...type.hppRatio), step);
    return {
      penjualan: sales,
      hpp,
      biayaPenjualan: roundTo(sales * between(rng, ...type.biayaPenjualan), step),
      biayaOperasional: roundTo(sales * between(rng, ...type.biayaOperasional), step),
      biayaBank: roundTo(sales * between(rng, 0.006, 0.012), step),
      biayaPajak: roundTo(sales * 0.005, step),
      biayaLainnya: roundTo(sales * between(rng, 0.002, 0.006), step),
    };
  };
  const lrPrev = labaRugi(salesPrev);
  const lrCur = labaRugi(salesCur);
  const netOf = (lr: ReturnType<typeof labaRugi>) =>
    lr.penjualan - lr.hpp - lr.biayaPenjualan - lr.biayaOperasional - lr.biayaBank - lr.biayaPajak - lr.biayaLainnya;
  const labaPrev = netOf(lrPrev);
  const labaCur = netOf(lrCur);

  // ---- Neraca: aset dari rasio hari, modal sebagai penyeimbang ----------------
  const assets = (lr: ReturnType<typeof labaRugi>, fixedGrowth: number) => ({
    kas: roundTo(lr.penjualan * between(rng, 0.015, 0.025), step),
    piutang: roundTo((lr.penjualan * between(rng, ...type.hariPiutang)) / 365, step),
    persediaan: roundTo((lr.hpp * between(rng, ...type.hariPersediaan)) / 365, step),
    tanahBangunan: roundTo(salesPrev * type.fixed.tanahBangunan, 10_000_000),
    kendaraan: roundTo(salesPrev * type.fixed.kendaraan * fixedGrowth, step),
    peralatan: roundTo(salesPrev * type.fixed.peralatan * fixedGrowth, step),
    asetLain: roundTo(salesPrev * type.fixed.asetLain, step),
  });
  const liabilities = (lr: ReturnType<typeof labaRugi>, longTerm: number) => ({
    hutangJangkaPendek: roundTo((lr.hpp * between(rng, 30, 40)) / 365, step),
    hutangJangkaPanjang: roundTo(longTerm, step),
  });
  const sum = (values: Record<string, number>) => Object.values(values).reduce((a, b) => a + b, 0);

  const longTermPrev = salesPrev * between(rng, 0.06, 0.1);
  const aPrev = assets(lrPrev, 1);
  const lPrev = liabilities(lrPrev, longTermPrev);
  const modalDisetor = roundTo(salesPrev * between(rng, 0.12, 0.16), 50_000_000);
  // Bank tahun lalu menyeimbangkan neraca setelah saldo laba ditetapkan.
  const saldoLabaPrev = roundTo(salesPrev * between(rng, 0.02, 0.05), step);
  const pasivaPrev = sum(lPrev) + modalDisetor + saldoLabaPrev + labaPrev;
  const bankPrev = Math.max(roundTo(salesPrev * 0.02, step), pasivaPrev - sum(aPrev));
  const modalLainPrev = sum(aPrev) + bankPrev - pasivaPrev;

  const aCur = assets(lrCur, 1.12);
  // Cicilan pinjaman jangka panjang berjalan sepanjang tahun.
  const lCur = liabilities(lrCur, longTermPrev * 0.8);
  // Sebagian laba tahun lalu dibagikan; sisanya menambah saldo laba.
  const minBankCur = roundTo(salesCur * 0.02, step);
  const retained = roundTo(labaPrev * between(rng, 0.3, 0.5), step);
  let saldoLabaCur = saldoLabaPrev + retained;
  let bankCur = sum(lCur) + modalDisetor + modalLainPrev + saldoLabaCur + labaCur - sum(aCur);
  if (bankCur < minBankCur) {
    // Kurang kas: anggap pembagian laba lebih besar.
    saldoLabaCur -= minBankCur - bankCur;
    bankCur = minBankCur;
  }

  const financials: FinancialStatements = {
    previous: {
      label: `PER-DESEMBER ${lastYear - 1}`,
      neraca: { ...aPrev, bank: bankPrev, ...lPrev, modalDisetor, modalLain: modalLainPrev, saldoLabaLalu: saldoLabaPrev, labaBerjalan: labaPrev },
      labaRugi: lrPrev,
    },
    current: {
      label: `PER-DESEMBER ${lastYear}`,
      neraca: { ...aCur, bank: bankCur, ...lCur, modalDisetor, modalLain: modalLainPrev, saldoLabaLalu: saldoLabaCur, labaBerjalan: labaCur },
      labaRugi: lrCur,
    },
    expectedSalesGrowth: Math.round(growth * 100),
    periodDays: 365,
  };

  // ---- Kebutuhan pembiayaan: DSR sekitar 30 sampai 35% ------------------------
  const { monthlyRevenue, monthlyExpenses } = monthlyFiguresFromStatements(financials);
  const net = monthlyRevenue - monthlyExpenses;
  // Angsuran pinjaman jangka panjang berjalan, dibatasi 10% laba bulanan.
  const existingDebt = roundTo(Math.min((lCur.hutangJangkaPanjang / 36) * 0.9, net * 0.1), 100_000);
  const tenor = pick(rng, [24, 36]);
  const monthlyRate = pick(rng, [0.0105, 0.0115, 0.0125]);
  const marginRate = Math.round(monthlyRate * tenor * 10_000) / 100;
  const capacity = Math.max(0, net * between(rng, 0.3, 0.35) - existingDebt);
  const requested = Math.min(roundTo((capacity * tenor) / (1 + marginRate / 100), 10_000_000), 2_000_000_000);
  const collateral = roundTo(Math.max(requested * 1.4, aCur.tanahBangunan), 10_000_000);

  const director = pick(rng, DIRECTORS);
  const partner = pick(rng, PARTNERS.filter(p => p !== director));
  const birth = new Date(today.getFullYear() - randInt(rng, 38, 55), randInt(rng, 0, 11), randInt(rng, 1, 28));
  const female = director.includes("Hj.") || /Neneng|Rina|Dewi/.test(director);
  const nik = `${place.code}${pad(randInt(rng, 10, 30), 2)}${pad(birth.getDate() + (female ? 40 : 0), 2)}${pad(birth.getMonth() + 1, 2)}${pad(birth.getFullYear() % 100, 2)}${pad(randInt(rng, 1, 2999), 4)}`;
  const share = pick(rng, [60, 65, 70, 75]);
  const slug = name.replace(/^(CV|PT) /, "").toLowerCase().replace(/[^a-z]+/g, "");
  const aktaYear = founded.getFullYear();
  const changeDate = new Date(Math.min(today.getTime() - 200 * 86_400_000, founded.getTime() + randInt(rng, 2, Math.max(2, yearsOld - 1)) * 365 * 86_400_000));

  const company: Omit<CompanyProfile, "financials"> = {
    bentuk: type.bentuk,
    nib: `${randInt(rng, 1, 9)}${digits(rng, 12)}`,
    aktaPendirianNomor: String(randInt(rng, 3, 58)),
    aktaPendirianTanggal: iso(founded),
    aktaPerubahanNomor: String(randInt(rng, 3, 58)),
    aktaPerubahanTanggal: iso(changeDate),
    skKemenkumham: type.bentuk === "PT"
      ? `AHU-${pad(randInt(rng, 1000, 99999), 7)}.AH.01.01.Tahun ${aktaYear}`
      : `AHU-${pad(randInt(rng, 1000, 99999), 7)}-AH.01.14 Tahun ${Math.max(aktaYear, 2019)}`,
    tanggalBerdiri: iso(founded),
    jumlahKaryawan: randInt(rng, ...type.employees),
    direktur: { nama: director, jabatan: type.bentuk === "PT" ? "Direktur Utama" : "Persero Pengurus (Direktur)", nik, hp: `08${pick(rng, ["12", "13", "21", "52", "77", "81"])}${digits(rng, 8)}` },
    pemegangSaham: [
      { nama: director, porsi: share },
      { nama: partner, porsi: 100 - share },
    ],
  };

  return {
    customer: {
      customerName: name,
      // NPWP badan format 16 digit (diawali 0 dari NPWP 15 digit lama).
      customerId: `0${digits(rng, 15)}`,
      phone: `022${digits(rng, 7)}`,
      email: `admin@${slug.slice(0, 18)}.co.id`,
      address: `${pick(rng, STREETS)} No. ${randInt(rng, 10, 250)}, Kec. ${place.kecamatan}, ${place.city}, Jawa Barat`,
    },
    business: { businessName: name, businessType: type.businessType, businessAge: String(monthsSince(iso(founded), today) ?? yearsOld * 12) },
    company,
    financials,
    finance: {
      monthlyRevenue: String(monthlyRevenue),
      monthlyExpenses: String(monthlyExpenses),
      existingDebt: String(existingDebt),
      collateralValue: String(collateral),
      requestedAmount: String(requested),
      financingTenor: String(tenor),
      marginRate: String(marginRate),
      loanPurpose: type.purpose,
      financialDataSource: "laporan_keuangan",
      financialDataNote: `Dihitung dari laporan laba rugi ${financials.current.label?.toLowerCase()} (penjualan dan seluruh biaya setahun dibagi 12).`,
    },
    akad: { object: type.object, supplier: type.supplier, downPaymentPct: 0.1 },
    legal: { businessShariaCompliant: "yes", shariaComplianceNotes: "Usaha halal, tidak bergerak di sektor yang dilarang. Rekening operasional di bank syariah." },
    esg: {
      environmentalPractices: "Sisa produksi dipilah dan dijual ke pengepul; gudang memakai lampu hemat energi.",
      socialImpact: `Mempekerjakan ${company.jumlahKaryawan} karyawan warga sekitar dengan BPJS Ketenagakerjaan.`,
      governanceQuality: "good",
    },
  };
}
