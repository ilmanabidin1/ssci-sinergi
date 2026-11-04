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
  // Khusus template Fix Income (karyawan)
  template: ["fluktuatif", "fix_income"],
  pendidikanFix: ["SMA", "D1 - D4", "S1", "S2 - S3"],
  reputasiFix: ["Tidak baik", "Tidak dikenal", "Dikenal namum kurang bersosialisasi", "Dikenal baik"],
  statusKaryawan: ["TNI/POLRI", "PNS", "Kontrak Swasta", "Kontrak ASN/PPPK", "Tetap Swasta"],
  bidangPekerjaan: ["Perdagangan", "Jasa", "Pendidikan", "Kesehatan", "Pemerintahan"],
  bonafiditas: ["Bonafide", "Cukup Bonafide", "Kurang Bonafide"],
  suratKeteranganBekerja: ["Tidak Ada", "Ada"],
  slipGaji: ["Tidak Ada", "Ada"],
  rekeningGaji: ["Tidak Ada", "Ada"],
  mouInstansi: ["Tidak Ada", "Ada"],
  suratKuasaPotongGaji: ["Tidak Ada", "Ada"],
  potonganGaji: ["0.3", "0.35", "0.4"],
  // Tabel hubungan bank, aset, dan perizinan
  pemilikFasilitas: ["nasabah", "pasangan"],
  dilunasi: ["Tidak", "Ya"],
  jenisAset: ["Tanah&Bangunan", "Kendaraan", "Peralatan"],
} as const;

export type BprsOptionKey = keyof typeof BPRS_OPTIONS;

const opt = <K extends BprsOptionKey>(key: K) =>
  z.enum(BPRS_OPTIONS[key] as unknown as [string, ...string[]]).optional();

const text = (max = 255) => z.string().trim().max(max).optional();
const money = z.number().nonnegative().max(1e13).optional();

export const MAX_STATEMENT_ROWS = 48;

const isoDateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const nameAmountSchema = z.object({ nama: text(150), nominal: money });
export type NameAmount = z.infer<typeof nameAmountSchema>;

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
  // Template Fix Income (karyawan)
  template: opt("template"),
  pendidikanFix: opt("pendidikanFix"),
  reputasiFix: opt("reputasiFix"),
  statusKaryawan: opt("statusKaryawan"),
  bidangPekerjaan: opt("bidangPekerjaan"),
  bonafiditas: opt("bonafiditas"),
  suratKeteranganBekerja: opt("suratKeteranganBekerja"),
  slipGaji: opt("slipGaji"),
  rekeningGaji: opt("rekeningGaji"),
  mouInstansi: opt("mouInstansi"),
  suratKuasaPotongGaji: opt("suratKuasaPotongGaji"),
  potonganGaji: opt("potonganGaji"),
  gajiBulanan: money,
  uangLembur: money,
  pendapatanTetapLain: money,
  namaInstansi: text(),
  alamatInstansi: text(500),
  nomorSk: text(100),
  tanggalSk: text(50),
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

  // Pejabat dan tanda tangan (baris "Mengetahui", petugas verifikasi, tempat dan tanggal)
  nomorRegister: text(100),
  telponRumah: text(30),
  kotaTandaTangan: text(100),
  mengetahuiNama: text(),
  mengetahuiJabatan: text(100),
  verifikatorNama: text(),
  verifikatorJabatan: text(100),
  kepalaCabangNama: text(),
  kabagMarketingNama: text(),

  // Aspek teknis, pemasaran, dan legalitas usaha (template Fluktuatif)
  alamatUsaha: text(500),
  gambaranDaerah: text(2000),
  saranaPrasarana: text(2000),
  bahanBaku: text(2000),
  hubunganSupplier: text(2000),
  prosesProduksi: text(2000),
  sistemPenjualanNarasi: text(1000),
  daerahPemasaranNarasi: text(1000),
  saluranDistribusi: text(1000),
  faktorPersaingan: text(1000),
  bentukUsaha: text(200),
  perizinan: z.array(z.object({
    jenis: text(100),
    nomor: text(100),
    berlakuSampai: text(50),
    atasNama: text(),
  })).max(6).optional(),
  mitigasiRisikoUsaha: text(500),
  mitigasiWanprestasi: text(500),
  cakupanPengikatan: text(200),
  cakupanAsuransiAgunan: text(200),

  // Rincian keuangan. Fluktuatif: penjualan, HPP, tenaga kerja, biaya usaha, rumah tangga.
  // Fix Income: penjualan sampai biaya usaha dipakai untuk pendapatan tidak tetap (usaha sampingan).
  penjualan: z.array(z.object({
    nama: text(150),
    hppPersen: z.number().min(0).max(1).optional(),
    bulan: z.array(z.object({
      hari: z.number().int().min(0).max(31).optional(),
      omzetHarian: money,
    })).max(3),
  })).max(2).optional(),
  tenagaKerjaJumlah: z.number().int().min(0).max(999).optional(),
  tenagaKerjaUpah: money,
  biayaUsaha: z.array(nameAmountSchema).max(6).optional(),
  rumahTangga: z.object({
    belanja: money,
    pendidikan: money,
    listrikAir: money,
    telepon: money,
    lainnya: z.array(nameAmountSchema).max(2).optional(),
  }).optional(),
  pendapatanLain: z.array(nameAmountSchema).max(2).optional(),
  biayaLain: z.array(nameAmountSchema).max(1).optional(),
  piutang: z.array(z.object({ nama: text(150), jumlah: money, harga: money, keterangan: text(200) })).max(5).optional(),
  persediaan: z.array(z.object({ nama: text(150), jumlah: money, satuan: text(30), harga: money })).max(5).optional(),
  hutangUsaha: z.array(z.object({ nama: text(150), jumlah: money, harga: money, keterangan: text(200) })).max(3).optional(),
  keteranganPiutang: text(1000),
  keteranganPersediaan: text(1000),
  keteranganHutang: text(1000),
  keteranganBank: text(1000),
  keteranganBankPasangan: text(1000),

  // Hubungan bank: fasilitas berjalan nasabah dan pasangan (iDeb SLIK)
  fasilitasBank: z.array(z.object({
    pemilik: opt("pemilikFasilitas"),
    namaBank: text(150),
    plafond: money,
    marginTahunan: z.number().min(0).max(1).optional(),
    tanggalMulai: isoDateText,
    tanggalAkhir: isoDateText,
    pangsa: text(100),
    jenisMargin: opt("jenisMargin"),
    kol: z.number().int().min(1).max(5).optional(),
    dilunasi: opt("dilunasi"),
  })).max(10).optional(),

  // Rekening koran dan aset
  saldoBankLain: z.array(z.object({
    bank: text(150),
    nomorRekening: text(50),
    saldo: z.number().min(-1e13).max(1e13).optional(),
  })).max(5).optional(),
  aset: z.array(z.object({
    jenis: opt("jenisAset"),
    jumlah: z.number().int().min(0).max(9999).optional(),
    tahunPerolehan: z.number().int().min(1900).max(2100).optional(),
    nilaiTaksasi: money,
  })).max(17).optional(),
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
// Struktur keuangan yang ditulis ke Excel. Penulis Excel dan port skor memakai
// fungsi yang sama agar angka di SSCI selalu sama dengan hasil hitung Excel.
// ---------------------------------------------------------------------------

/** Hari kerja yang dipakai saat omzet hanya tersedia sebagai total bulanan SSCI. */
export const WORKING_DAYS = 26;

type BprsTemplateKindLocal = "fluktuatif" | "fix_income";

/** Kapasitas baris tabel hubungan bank yang rumusnya lengkap di masing-masing template. */
export const BANK_ROW_CAPACITY: Record<BprsTemplateKindLocal, { nasabah: number; pasangan: number }> = {
  fluktuatif: { nasabah: 5, pasangan: 5 },
  fix_income: { nasabah: 4, pasangan: 3 },
};

export type BankFacilityRow = NonNullable<BprsProfile["fasilitasBank"]>[number];

/** DATEDIF(mulai, akhir, "M") versi Excel: jumlah bulan penuh. */
export function datedifMonths(start: string | undefined, end: string | undefined): number {
  if (!start || !end) return 0;
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  if (![y1, m1, d1, y2, m2, d2].every(Number.isFinite)) return 0;
  const months = (y2! - y1!) * 12 + (m2! - m1!) - (d2! < d1! ? 1 : 0);
  return Math.max(0, months);
}

/**
 * Angsuran per bulan sesuai rumus tabel hubungan bank (kolom AE):
 * Flat = plafond / bulan + plafond x margin / 12, Efektif = PMT(margin / 12, bulan, -plafond).
 * Fasilitas yang dilunasi dari pembiayaan baru tidak dihitung (kolom N = 0).
 */
export function facilityInstallment(row: BankFacilityRow): number {
  if (row.dilunasi === "Ya") return 0;
  const plafond = row.plafond ?? 0;
  const rate = row.marginTahunan ?? 0;
  const months = datedifMonths(row.tanggalMulai, row.tanggalAkhir);
  if ((row.jenisMargin ?? "Flat") === "Flat") {
    return (months > 0 ? plafond / months : 0) + plafond * (rate / 12);
  }
  if (months <= 0) return 0;
  const r = rate / 12;
  return r === 0 ? plafond / months : (plafond * r) / (1 - Math.pow(1 + r, -months));
}

const hasFacilityData = (row: BankFacilityRow) => Boolean(row.namaBank || row.plafond);

/** Baris fasilitas yang muat di template, dipisah antara nasabah dan pasangan. */
export function bankFacilities(kind: BprsTemplateKindLocal, profile: BprsProfile) {
  const rows = (profile.fasilitasBank ?? []).filter(hasFacilityData);
  const capacity = BANK_ROW_CAPACITY[kind];
  const nasabahAll = rows.filter(r => r.pemilik !== "pasangan");
  const pasanganAll = rows.filter(r => r.pemilik === "pasangan");
  const nasabah = nasabahAll.slice(0, capacity.nasabah);
  const pasangan = pasanganAll.slice(0, capacity.pasangan);
  const used = [...nasabah, ...pasangan];
  return {
    nasabah,
    pasangan,
    /** Ada baris fasilitas: angsuran existing diambil dari tabel, bukan dari angka SSCI. */
    hasRows: used.length > 0,
    installment: used.reduce((sum, row) => sum + facilityInstallment(row), 0),
    dropped: rows.length - used.length,
  };
}

/** Angsuran existing yang dihitung Excel: dari tabel hubungan bank, atau angka SSCI bila tabel kosong. */
export function existingInstallment(kind: BprsTemplateKindLocal, profile: BprsProfile, app: Pick<BprsApplicationData, "existingDebt">): number {
  const bank = bankFacilities(kind, profile);
  return bank.hasRows ? bank.installment : app.existingDebt;
}

export type SalesLine = {
  nama: string;
  months: Array<{ hari: number; omzetHarian: number; omzetBulan: number }>;
  average: number;
  hppPersen: number;
  hpp: number;
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function salesLines(profile: BprsProfile): SalesLine[] {
  return (profile.penjualan ?? [])
    .filter(p => p.nama || p.bulan.some(m => (m.omzetHarian ?? 0) > 0))
    .slice(0, 2)
    .map(p => {
      const months = [0, 1, 2].map(i => {
        const m = p.bulan[i];
        const hari = m?.hari ?? 0;
        const omzetHarian = m?.omzetHarian ?? 0;
        return { hari, omzetHarian, omzetBulan: hari * omzetHarian };
      });
      // Excel: rata-rata tiga kolom bulan (bulan kosong dihitung nol), lalu HPP = rata-rata x %.
      const average = sum(months.map(m => m.omzetBulan)) / 3;
      const hppPersen = p.hppPersen ?? 0;
      return { nama: p.nama ?? "", months, average, hppPersen, hpp: average * hppPersen };
    });
}

const amountRows = (rows: NameAmount[] | undefined, max: number) =>
  (rows ?? []).filter(r => r.nama || r.nominal).slice(0, max).map(r => ({ nama: r.nama ?? "", nominal: r.nominal ?? 0 }));

export type FluktuatifFinancials = {
  structuredSales: boolean;
  sales: SalesLine[];
  salesTotal: number;
  hppTotal: number;
  tenagaKerja: number;
  biayaUsahaRows: Array<{ nama: string; nominal: number }>;
  biayaUsahaFromSsci: boolean;
  biayaUsaha: number;
  rumahTanggaRows: { belanja: number; pendidikan: number; listrikAir: number; telepon: number; lainnya: Array<{ nama: string; nominal: number }> } | null;
  rumahTangga: number;
  pendapatanLainRows: Array<{ nama: string; nominal: number }>;
  pendapatanLain: number;
  biayaLainRow: { nama: string; nominal: number } | null;
  biayaLain: number;
  bankInstallment: number;
  bankRows: boolean;
  netProfit: number;
};

/**
 * Susunan Aspek Keuangan template Fluktuatif. Rincian dari analis dipakai bila ada;
 * jika tidak, omzet dan biaya bulanan SSCI ditulis sebagai satu baris (perilaku lama).
 */
export function fluktuatifFinancials(
  profile: BprsProfile,
  app: Pick<BprsApplicationData, "monthlyRevenue" | "monthlyExpenses" | "existingDebt"> & { businessName?: string; businessType?: string },
): FluktuatifFinancials {
  let sales = salesLines(profile);
  const structuredSales = sales.length > 0;
  if (!structuredSales) {
    const daily = app.monthlyRevenue / WORKING_DAYS;
    const months = [0, 1, 2].map(() => ({ hari: WORKING_DAYS, omzetHarian: daily, omzetBulan: WORKING_DAYS * daily }));
    sales = [{ nama: app.businessName || app.businessType || "Penjualan", months, average: sum(months.map(m => m.omzetBulan)) / 3, hppPersen: 0, hpp: 0 }];
  }
  const salesTotal = sum(sales.map(s => s.average));
  const hppTotal = sum(sales.map(s => s.hpp));
  const tenagaKerja = (profile.tenagaKerjaJumlah ?? 0) * (profile.tenagaKerjaUpah ?? 0);

  let biayaUsahaRows = amountRows(profile.biayaUsaha, 6);
  const biayaUsahaFromSsci = biayaUsahaRows.length === 0;
  if (biayaUsahaFromSsci) {
    const rest = Math.max(0, app.monthlyExpenses - hppTotal - tenagaKerja);
    const label = hppTotal > 0 || tenagaKerja > 0
      ? "Biaya usaha lainnya (biaya SSCI dikurangi HPP dan tenaga kerja)"
      : "Biaya usaha per bulan (data SSCI)";
    biayaUsahaRows = [{ nama: label, nominal: rest }];
  }
  const biayaUsaha = sum(biayaUsahaRows.map(r => r.nominal));

  const rt = profile.rumahTangga;
  const rtLain = amountRows(rt?.lainnya, 2);
  const hasRtDetail = rt != null && (rt.belanja != null || rt.pendidikan != null || rt.listrikAir != null || rt.telepon != null || rtLain.length > 0);
  const rumahTanggaRows = hasRtDetail
    ? { belanja: rt!.belanja ?? 0, pendidikan: rt!.pendidikan ?? 0, listrikAir: rt!.listrikAir ?? 0, telepon: rt!.telepon ?? 0, lainnya: rtLain }
    : null;
  const rumahTangga = rumahTanggaRows
    ? rumahTanggaRows.belanja + rumahTanggaRows.pendidikan + rumahTanggaRows.listrikAir + rumahTanggaRows.telepon + sum(rtLain.map(r => r.nominal))
    : profile.biayaRumahTangga ?? 0;

  const pendapatanLainRows = amountRows(profile.pendapatanLain, 2);
  const pendapatanLain = sum(pendapatanLainRows.map(r => r.nominal));

  // Sheet hanya menjumlah satu baris biaya lain-lain (T145). Bila tabel hubungan bank
  // kosong, angsuran existing SSCI digabung ke baris itu seperti sebelumnya.
  const bank = bankFacilities("fluktuatif", profile);
  const userBiayaLain = amountRows(profile.biayaLain, 1)[0] ?? null;
  const fallbackDebt = !bank.hasRows && app.existingDebt > 0 ? app.existingDebt : 0;
  let biayaLainRow: FluktuatifFinancials["biayaLainRow"] = userBiayaLain;
  if (fallbackDebt > 0) {
    biayaLainRow = userBiayaLain
      ? { nama: `${userBiayaLain.nama || "Biaya lain-lain"} dan angsuran pembiayaan existing (data SSCI)`, nominal: userBiayaLain.nominal + fallbackDebt }
      : { nama: "Angsuran pembiayaan existing (data SSCI)", nominal: fallbackDebt };
  }
  const biayaLain = biayaLainRow?.nominal ?? 0;

  const beforeTax = salesTotal - hppTotal - tenagaKerja - biayaUsaha - rumahTangga;
  return {
    structuredSales,
    sales,
    salesTotal,
    hppTotal,
    tenagaKerja,
    biayaUsahaRows,
    biayaUsahaFromSsci,
    biayaUsaha,
    rumahTanggaRows,
    rumahTangga,
    pendapatanLainRows,
    pendapatanLain,
    biayaLainRow,
    biayaLain,
    bankInstallment: bank.installment,
    bankRows: bank.hasRows,
    netProfit: beforeTax * (1 - BPRS_TAX_RATE),
  };
}

export type SideBusiness = {
  sales: SalesLine[];
  salesTotal: number;
  hppTotal: number;
  tenagaKerja: number;
  biayaUsahaRows: Array<{ nama: string; nominal: number }>;
  biayaUsaha: number;
  /** Laba bersih usaha sampingan, sel M65 sheet Aspek Keuangan template Fix Income. */
  netProfit: number;
};

/** Pendapatan tidak tetap template Fix Income. Tanpa rincian semua nol (tidak ada lump SSCI). */
export function fixSideBusiness(profile: BprsProfile): SideBusiness {
  const sales = salesLines(profile);
  const salesTotal = sum(sales.map(s => s.average));
  const hppTotal = sum(sales.map(s => s.hpp));
  const tenagaKerja = (profile.tenagaKerjaJumlah ?? 0) * (profile.tenagaKerjaUpah ?? 0);
  const biayaUsahaRows = amountRows(profile.biayaUsaha, 6);
  const biayaUsaha = sum(biayaUsahaRows.map(r => r.nominal));
  const beforeTax = salesTotal - hppTotal - (tenagaKerja + biayaUsaha);
  return { sales, salesTotal, hppTotal, tenagaKerja, biayaUsahaRows, biayaUsaha, netProfit: beforeTax * (1 - BPRS_TAX_RATE) };
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

/**
 * Laba bersih per bulan sesuai susunan yang ditulis ke Excel (Usulan Pembiayaan N35):
 * penjualan - HPP - tenaga kerja - biaya usaha - biaya rumah tangga, dikurangi pajak 5%.
 */
export function netProfitFor(profile: BprsProfile, app: BprsApplicationData): number {
  return fluktuatifFinancials(profile, app).netProfit;
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
  // AA88 = (N35 + N38) / (N39 + J87): laba bersih + (pendapatan lain - biaya lain),
  // dibagi angsuran bank existing (tabel hubungan bank) + angsuran baru.
  const rpcPct = Number(profile.rpcPersen ?? "0.7");
  const fin = fluktuatifFinancials(profile, app);
  const netProfit = fin.netProfit;
  const otherNet = fin.pendapatanLain - fin.biayaLain;
  const installment = newInstallment(app);
  const totalInstallments = fin.bankInstallment + installment;
  const coverageRatio = totalInstallments > 0 ? (netProfit + otherNet) / totalInstallments : 0;
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

const idr = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

function facilityChecks(kind: BprsTemplateKindLocal, profile: BprsProfile, app: BprsApplicationData): BprsCheck[] {
  const checks: BprsCheck[] = [];
  const bank = bankFacilities(kind, profile);
  const capacity = BANK_ROW_CAPACITY[kind];
  if (bank.dropped > 0) {
    checks.push({ severity: "sedang", message: `${bank.dropped} fasilitas bank tidak muat di template (maksimal ${capacity.nasabah} untuk nasabah dan ${capacity.pasangan} untuk pasangan) dan tidak ikut dihitung Excel.` });
  }
  const undated = [...bank.nasabah, ...bank.pasangan].filter(r => r.dilunasi !== "Ya" && datedifMonths(r.tanggalMulai, r.tanggalAkhir) <= 0);
  if (undated.length > 0) {
    checks.push({ severity: "sedang", message: `Fasilitas ${undated.map(r => r.namaBank || "tanpa nama").join(", ")} belum punya tanggal mulai dan akhir yang benar. Excel tidak dapat menghitung angsurannya.` });
  }
  if (bank.hasRows && app.existingDebt > 0 && Math.abs(bank.installment - app.existingDebt) / app.existingDebt > 0.1) {
    checks.push({ severity: "sedang", message: `Angsuran dari tabel hubungan bank (${idr(bank.installment)}) berbeda dengan angsuran existing SSCI (${idr(app.existingDebt)}). Excel memakai angka dari tabel.` });
  }
  if (bank.hasRows && app.existingDebt === 0 && bank.installment > 0) {
    checks.push({ severity: "rendah", message: "Ada fasilitas bank berjalan di tabel hubungan bank, tetapi angsuran existing di SSCI nol." });
  }
  return checks;
}

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
  checks.push(...facilityChecks("fluktuatif", profile, app));
  const fin = fluktuatifFinancials(profile, app);
  if (fin.structuredSales && app.monthlyRevenue > 0 && Math.abs(fin.salesTotal - app.monthlyRevenue) / app.monthlyRevenue > 0.2) {
    checks.push({ severity: "sedang", message: `Rata-rata penjualan dari rincian produk (${idr(fin.salesTotal)}) berbeda lebih dari 20% dari omzet SSCI (${idr(app.monthlyRevenue)}). Excel memakai angka rincian produk.` });
  }
  if (!fin.biayaUsahaFromSsci && app.monthlyExpenses > 0) {
    const structuredCosts = fin.hppTotal + fin.tenagaKerja + fin.biayaUsaha;
    if (Math.abs(structuredCosts - app.monthlyExpenses) / app.monthlyExpenses > 0.2) {
      checks.push({ severity: "rendah", message: `HPP, tenaga kerja, dan biaya usaha di rincian (${idr(structuredCosts)}) berbeda lebih dari 20% dari biaya usaha SSCI (${idr(app.monthlyExpenses)}).` });
    }
  }
  const missingCore = (["statusPerkawinan", "tanggungan", "pendidikan", "statusTempatTinggal", "lamaMenetap", "reputasi", "riwayatSlik", "hubunganBank"] as const)
    .filter(key => !profile[key]);
  if (missingCore.length > 0) {
    checks.push({ severity: "rendah", message: `${missingCore.length} isian penilaian utama belum diisi. Skor format BPRS akan lebih rendah dari seharusnya.` });
  }
  return checks;
}

// ---------------------------------------------------------------------------
// Template Fix Income (karyawan, dengan agunan)
// ---------------------------------------------------------------------------

export type BprsTemplateKind = (typeof BPRS_OPTIONS.template)[number];

export const BPRS_TEMPLATE_LABELS: Record<BprsTemplateKind, string> = {
  fluktuatif: "Skoring Fluktuatif Income UMKM",
  fix_income: "Skoring Fix Income dengan Agunan",
};

/** Template mengikuti sumber penghasilan pengajuan, kecuali analis memilih lain. */
export function templateFor(profile: BprsProfile, incomeSourceType: string | null | undefined): BprsTemplateKind {
  if (profile.template === "fluktuatif" || profile.template === "fix_income") return profile.template;
  return incomeSourceType === "fixed" ? "fix_income" : "fluktuatif";
}

/** Nilai K dari sheet Parameter template Fix Income. */
export const FIX_POINTS: Record<string, PointsTable> = {
  usia: { "20 - 30 tahun": 3.75, "31 - 40 tahun": 3, "41 - 50 tahun": 2.25, "51 - 55 tahun": 1.5, "51 - 60 tahun": 1.5 },
  statusPerkawinan: { Menikah: 3, Lajang: 2.4, Cerai: 1.95 },
  tanggungan: { "> 5 Orang": 0.75, "3 - 5 Orang": 1.5, " 1 - 2 Orang": 2.25, "Tidak Mempunyai Tanggungan": 3 },
  pendidikanFix: { SMA: 0.75, "D1 - D4": 1.5, S1: 2.25, "S2 - S3": 3 },
  statusTempatTinggal: { Sewa: 1.25, "Lain-lain (Menumpang)": 2.5, Angsuran: 3.75, "Milik sendiri": 5 },
  statusKaryawan: { "TNI/POLRI": 1, PNS: 5, "Kontrak Swasta": 2, "Kontrak ASN/PPPK": 3, "Tetap Swasta": 4 },
  reputasiFix: { "Tidak baik": 0, "Tidak dikenal": 1.2, "Dikenal namum kurang bersosialisasi": 4.5, "Dikenal baik": 6 },
  usiaPensiun: { "<5 Tahun": 1.25, "5 Tahun - 15 Tahun": 3.125, ">15 Tahun": 4.6875, "Masa kerja panjang": 6 },
  suratKeteranganBekerja: { "Tidak Ada": 0.4, Ada: 3 },
  slipGaji: { "Tidak Ada": 0.4, Ada: 3 },
  rekeningGaji: { "Tidak Ada": 0.4, Ada: 3 },
  hubunganBank: Object.fromEntries(BPRS_OPTIONS.hubunganBank.map((o, i) => [o, [2, 2.5, 5, 6.25][i]!])),
  riwayatSlik: Object.fromEntries(BPRS_OPTIONS.riwayatSlik.map((o, i) => [o, [0, 1.75, 5.25, 7][i]!])),
  rpc: { "RPC tidak memadai": 0, "RPC memadai": 9, "RPC baik": 13.5, "RPC sangat baik": 18 },
  jangkaWaktu: { ">8 Tahun": 1, "7 - 8 Tahun": 2, "5 - 6 Tahun": 3, "3 - 4 Tahun": 4, "1 - 2 Tahun": 5 },
  pembiayaanKe: { "1-2": 2, "3-4": 3, ">=5": 4 },
  agunan: { "100% s.d 125%": 5, ">125% s.d 150%": 7.5, ">150%": 10, "<100%": -30 },
  pengikatan: { "Tidak Pengikatan Notaril": 1, "Pengikatan Notaril": 2 },
  asuransiJiwa: { "Tidak Diasuransikan": 1, "Asuransi Jiwa Syariah": 2 },
  asuransiAgunan: { "Tidak Diasuransikan": 1, "Asuransi Kerugian Syariah": 2 },
};

const FIX_LABELS: Record<string, string> = {
  ...BPRS_CRITERIA_LABELS,
  pendidikanFix: "Pendidikan terakhir",
  reputasiFix: "Reputasi",
  statusKaryawan: "Status karyawan",
  usiaPensiun: "Sisa masa kerja sampai pensiun",
  suratKeteranganBekerja: "Surat keterangan bekerja",
  slipGaji: "Slip gaji",
  rekeningGaji: "Rekening gaji",
};

/** TNI/POLRI dan PNS memakai aturan PNS (pensiun 60 tahun). */
export function isPnsRules(statusKaryawan: string | undefined): boolean {
  return statusKaryawan === "TNI/POLRI" || statusKaryawan === "PNS";
}

export function retirementAge(statusKaryawan: string | undefined): number {
  return isPnsRules(statusKaryawan) ? 60 : 55;
}

function fixAgeBucket(age: number, pns: boolean): string | null {
  if (age >= 21 && age <= 30) return "20 - 30 tahun";
  if (age >= 31 && age <= 40) return "31 - 40 tahun";
  if (age >= 41 && age <= 50) return "41 - 50 tahun";
  if (age >= 51 && age <= (pns ? 60 : 55)) return pns ? "51 - 60 tahun" : "51 - 55 tahun";
  return null;
}

function retirementBucket(yearsLeft: number, pns: boolean): string {
  if (yearsLeft < 5) return "<5 Tahun";
  if (yearsLeft <= 15) return "5 Tahun - 15 Tahun";
  if (yearsLeft <= (pns ? 30 : 25)) return ">15 Tahun";
  return "Masa kerja panjang";
}

/** Gaji pokok (THP) yang dipakai rumus RPC: isian profil, atau pendapatan bulanan SSCI. */
export function fixSalary(profile: BprsProfile, app: BprsApplicationData): number {
  return profile.gajiBulanan ?? app.monthlyRevenue;
}

export function computeFixIncomeScore(profile: BprsProfile, app: BprsApplicationData, referenceDate = new Date()): BprsScoreResult {
  const criteria: BprsCriterionResult[] = [];
  const missing: string[] = [];
  const add = (key: string, answer: string | null | undefined, source: BprsCriterionResult["source"]) => {
    const table = FIX_POINTS[key]!;
    const maxPoints = Math.max(...Object.values(table));
    const filled = answer != null && answer in table;
    if (!filled) missing.push(FIX_LABELS[key]!);
    criteria.push({ key, label: FIX_LABELS[key]!, answer: filled ? answer! : null, points: filled ? table[answer!]! : 0, maxPoints, source: filled ? source : "belum_diisi" });
  };

  const pns = isPnsRules(profile.statusKaryawan);
  const age = profile.tanggalLahir ? ageOn(profile.tanggalLahir, referenceDate) : null;
  add("usia", age == null ? null : fixAgeBucket(age, pns), "profil");
  add("statusPerkawinan", profile.statusPerkawinan, "profil");
  add("tanggungan", profile.tanggungan, "profil");
  add("pendidikanFix", profile.pendidikanFix, "profil");
  add("statusTempatTinggal", profile.statusTempatTinggal, "profil");
  add("statusKaryawan", profile.statusKaryawan, "profil");
  add("reputasiFix", profile.reputasiFix, "profil");
  const yearsLeft = age == null || !profile.statusKaryawan ? null : retirementAge(profile.statusKaryawan) - age;
  add("usiaPensiun", yearsLeft == null ? null : retirementBucket(yearsLeft, pns), "profil");
  add("suratKeteranganBekerja", profile.suratKeteranganBekerja, "profil");
  add("slipGaji", profile.slipGaji, "profil");
  add("rekeningGaji", profile.rekeningGaji, "profil");
  add("hubunganBank", profile.hubunganBank, "profil");
  add("riwayatSlik", profile.riwayatSlik, "profil");

  // Usulan Pembiayaan AA54..AA59: pendapatan = gaji (M5) + laba usaha sampingan (M65).
  // RPC = pendapatan / (angsuran existing + angsuran baru); batas = pendapatan / (60% gaji + 20% laba sampingan).
  const salary = fixSalary(profile, app);
  const side = fixSideBusiness(profile);
  const income = salary + side.netProfit;
  const installment = newInstallment(app);
  const totalInstallments = existingInstallment("fix_income", profile, app) + installment;
  const coverageRatio = totalInstallments > 0 ? income / totalInstallments : 0;
  const thresholdDenominator = salary * 0.6 + side.netProfit * 0.2;
  const coverageThreshold = thresholdDenominator !== 0 ? income / thresholdDenominator : Number.POSITIVE_INFINITY;
  const rpcAdequate = income > 0 && Number.isFinite(coverageThreshold) && coverageRatio >= coverageThreshold;
  let rpcBand = "RPC tidak memadai";
  if (rpcAdequate) {
    if (coverageRatio > coverageThreshold + 3.75) rpcBand = "RPC sangat baik";
    else if (coverageRatio > coverageThreshold + 1.75) rpcBand = "RPC baik";
    else rpcBand = "RPC memadai";
  }
  add("rpc", rpcBand, "data_ssci");
  add("jangkaWaktu", bucketTenor(app.financingTenor), "data_ssci");
  const nth = profile.pembiayaanKe ?? 1;
  add("pembiayaanKe", nth <= 2 ? "1-2" : nth < 5 ? "3-4" : ">=5", profile.pembiayaanKe ? "profil" : "data_ssci");
  const collateral = collateralTotal(profile, app);
  add("agunan", app.requestedAmount > 0 ? bucketCoverage(collateral / app.requestedAmount) : null, "data_ssci");
  add("pengikatan", profile.pengikatan, "profil");
  add("asuransiJiwa", profile.asuransiJiwa, "profil");
  add("asuransiAgunan", profile.asuransiAgunan, "profil");

  // Excel hanya menerapkan pemotongan jangka waktu > pensiun untuk non PNS (lihat Usulan AB82).
  const beyondRetirement = !pns && yearsLeft != null && app.financingTenor > yearsLeft * 12;
  const subtotal = criteria.reduce((sum, c) => sum + c.points, 0);
  const penalized = !rpcAdequate || beyondRetirement;
  const score = Math.max(0, penalized ? subtotal * 0.7 : subtotal);
  const band = bprsRating(score);
  return {
    criteria,
    subtotal,
    rpcAdequate: rpcAdequate && !beyondRetirement,
    coverageRatio,
    coverageThreshold: Number.isFinite(coverageThreshold) ? coverageThreshold : 0,
    score,
    rating: band.rating,
    ratingLabel: band.label,
    status: score >= 70 ? "Layak" : "Tidak Layak",
    missing,
    netProfit: income,
  };
}

export function checkFixIncomeProfile(profile: BprsProfile, app: BprsApplicationData, referenceDate = new Date()): BprsCheck[] {
  const checks: BprsCheck[] = [];
  const pns = isPnsRules(profile.statusKaryawan);
  const age = profile.tanggalLahir ? ageOn(profile.tanggalLahir, referenceDate) : null;
  if (age != null && fixAgeBucket(age, pns) == null) {
    checks.push({ severity: "tinggi", message: `Usia nasabah ${age} tahun di luar tabel usia BPRS (21 sampai ${pns ? 60 : 55} tahun untuk ${pns ? "PNS/TNI/POLRI" : "non PNS"}). Skor usia di Excel akan #N/A.` });
  }
  if (age != null && profile.statusKaryawan) {
    const monthsLeft = (retirementAge(profile.statusKaryawan) - age) * 12;
    if (app.financingTenor > monthsLeft) {
      checks.push({
        severity: "tinggi",
        message: pns
          ? "Jangka waktu melewati usia pensiun. Excel BPRS tidak memotong skor untuk PNS/TNI/POLRI, tetapi hal ini perlu dipertimbangkan komite."
          : "Jangka waktu melewati usia pensiun (55 tahun). Excel BPRS memotong skor menjadi 70%.",
      });
    }
  }
  if (profile.slipGaji === "Tidak Ada" && profile.rekeningGaji === "Tidak Ada") {
    checks.push({ severity: "sedang", message: "Slip gaji dan rekening gaji sama-sama tidak ada. Penghasilan belum terverifikasi." });
  }
  if (profile.gajiBulanan != null && app.monthlyRevenue > 0 && Math.abs(profile.gajiBulanan - app.monthlyRevenue) / app.monthlyRevenue > 0.2) {
    checks.push({ severity: "rendah", message: "Gaji di format BPRS berbeda lebih dari 20% dari pendapatan bulanan di SSCI." });
  }
  if (profile.riwayatSlik === "Belum memiliki kredit/Pembiayaan" && app.existingDebt > 0) {
    checks.push({ severity: "tinggi", message: "SLIK diisi belum memiliki pembiayaan, padahal ada angsuran existing. Periksa iDeb SLIK." });
  }
  if (app.requestedAmount > 0 && collateralTotal(profile, app) < app.requestedAmount) {
    checks.push({ severity: "tinggi", message: "Nilai agunan di bawah 100% plafon. Di Excel BPRS ini memberi nilai -30 pada skor agunan." });
  }
  checks.push(...facilityChecks("fix_income", profile, app));
  const missingCore = (["statusKaryawan", "statusPerkawinan", "tanggungan", "pendidikanFix", "statusTempatTinggal", "reputasiFix", "riwayatSlik", "hubunganBank"] as const)
    .filter(key => !profile[key]);
  if (missingCore.length > 0) {
    checks.push({ severity: "rendah", message: `${missingCore.length} isian penilaian utama belum diisi. Skor format BPRS akan lebih rendah dari seharusnya.` });
  }
  return checks;
}

export function scoreForTemplate(kind: BprsTemplateKind, profile: BprsProfile, app: BprsApplicationData, referenceDate = new Date()) {
  return kind === "fix_income" ? computeFixIncomeScore(profile, app, referenceDate) : computeBprsScore(profile, app, referenceDate);
}

export function checksForTemplate(kind: BprsTemplateKind, profile: BprsProfile, app: BprsApplicationData, referenceDate = new Date()) {
  return kind === "fix_income" ? checkFixIncomeProfile(profile, app, referenceDate) : checkBprsProfile(profile, app, referenceDate);
}

// ---------------------------------------------------------------------------
// Kelengkapan isian Excel BPRS
// ---------------------------------------------------------------------------

/** Tab panel "Format Excel BPRS" tempat kolom diisi. */
export type BprsPanelTab = "identitas" | "usaha" | "keuangan" | "bank" | "rekening" | "agunan" | "narasi" | "legalitas" | "pejabat";

export type CompletenessItem = { key: string; label: string; sheet: string; tab: BprsPanelTab; filled: boolean };

export type ExcelCompleteness = {
  filled: number;
  total: number;
  items: CompletenessItem[];
  /** Kolom yang masih kosong, dikelompokkan per sheet Excel. */
  missing: Array<{ sheet: string; items: Array<{ key: string; label: string; tab: BprsPanelTab }> }>;
};

const present = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const rowsWith = <T,>(rows: T[] | undefined, pred: (row: T) => boolean) => (rows ?? []).some(pred);

/**
 * Menghitung kolom isian manual (M/PG) format Excel BPRS yang sudah terisi,
 * dari data SSCI dan profil format BPRS. Kolom yang tidak berlaku (misalnya data
 * pasangan bagi nasabah lajang) tidak dihitung.
 */
export function excelCompleteness(kind: BprsTemplateKind, profile: BprsProfile, app: BprsApplicationData): ExcelCompleteness {
  const items: CompletenessItem[] = [];
  const fix = kind === "fix_income";
  const info = "Informasi Pokok";
  const nonKeu = "Aspek Non Keuangan";
  const keu = "Aspek Keuangan";
  const rek = "Rekening Koran & Aset";
  const tanda = fix ? "Rekomendasi AO & Keputusan" : "Usulan, Keputusan & Jadang";
  const add = (key: string, label: string, sheet: string, tab: BprsPanelTab, filled: boolean) => items.push({ key, label, sheet, tab, filled });
  const field = (key: keyof BprsProfile, label: string, sheet: string, tab: BprsPanelTab) => add(String(key), label, sheet, tab, present(profile[key]));

  // Informasi Pokok
  field("kantor", "Kantor", info, "identitas");
  field("nomorRegister", "Nomor register", info, "identitas");
  field("nomorProposal", "Nomor proposal", info, "identitas");
  field("namaAo", "Nama AO", info, "identitas");
  field("kategoriNasabah", "Jenis kategori nasabah", info, "identitas");
  if (profile.kategoriNasabah === "Referral") field("namaReferral", "Nama referral", info, "identitas");
  field("jenisKelamin", "Jenis kelamin", info, "identitas");
  field("tempatLahir", "Tempat lahir", info, "identitas");
  field("tanggalLahir", "Tanggal lahir", info, "identitas");
  field("desa", "Desa/Kelurahan", info, "identitas");
  field("kecamatan", "Kecamatan", info, "identitas");
  field("kabupaten", "Kab./Kota", info, "identitas");
  field("kodePos", "Kode pos", info, "identitas");
  field("statusPerkawinan", "Status perkawinan", info, "identitas");
  field("tanggungan", "Jumlah tanggungan", info, "identitas");
  field(fix ? "pendidikanFix" : "pendidikan", "Pendidikan terakhir", info, "identitas");
  field("ibuKandung", "Nama gadis ibu kandung", info, "identitas");
  if (profile.statusPerkawinan === "Menikah") {
    field("namaPasangan", "Nama pasangan", info, "identitas");
    field("ttlPasangan", "Tempat/tanggal lahir pasangan", info, "identitas");
    field("ktpPasangan", "No. KTP pasangan", info, "identitas");
    field("pekerjaanPasangan", "Pekerjaan pasangan", info, "identitas");
  }
  field("namaSaudara", fix ? "Nama anak/saudara tidak serumah" : "Nama saudara tidak serumah", info, "identitas");
  field("hpSaudara", "HP saudara", info, "identitas");
  field("statusTempatTinggal", fix ? "Kepemilikan tempat tinggal" : "Status tempat tinggal", info, "usaha");
  if (fix) {
    field("statusKaryawan", "Status karyawan", info, "usaha");
    field("bidangPekerjaan", "Bidang usaha pekerjaan", info, "usaha");
    field("bonafiditas", "Bonafiditas perusahaan", info, "usaha");
    field("suratKeteranganBekerja", "Surat keterangan bekerja", info, "usaha");
    field("slipGaji", "Slip gaji", info, "usaha");
    field("rekeningGaji", "Rekening gaji", info, "usaha");
    field("mouInstansi", "MoU instansi dengan BPRS", info, "usaha");
    field("suratKuasaPotongGaji", "Surat kuasa potong gaji", info, "usaha");
    field("reputasiFix", "Reputasi di tempat kerja dan tinggal", info, "usaha");
  } else {
    field("lamaMenetap", "Lama menetap", info, "usaha");
    field("reputasi", "Reputasi", info, "usaha");
    field("laporanKeuangan", "Jenis laporan keuangan", info, "usaha");
    field("sistemPenjualan", "Sistem penjualan", info, "usaha");
    field("kepemilikanTempatUsaha", "Kepemilikan tempat usaha", info, "usaha");
    field("lokasiUsaha", "Lokasi usaha", info, "usaha");
    field("daerahPemasaran", "Daerah pemasaran", info, "usaha");
    field("tenagaKerja", "Jumlah tenaga kerja", info, "usaha");
    field("pengelolaanKeuangan", "Pengelolaan keuangan", info, "usaha");
    field("hutangDagang", "Kewajiban / hutang dagang", info, "usaha");
  }
  field("indikatorReputasi", "Indikator reputasi", info, "narasi");
  field("hubunganBank", "Hubungan dengan perbankan", info, "bank");
  field("riwayatSlik", "Riwayat SLIK", info, "bank");
  field("pembiayaanKe", "Permohonan pembiayaan ke-", info, "bank");
  if ((profile.pembiayaanKe ?? 1) > 1) field("buktiPenggunaanDana", "Bukti penggunaan dana sebelumnya", info, "bank");
  field("sektorEkonomi", "Sektor ekonomi", info, "bank");
  field("jenisPenggunaan", "Jenis penggunaan", info, "bank");
  add("akad", "Akad pembiayaan (data SSCI)", info, "bank", present(app.financingAkad));
  if (!fix) add("mengetahuiNama", "Nama pejabat \"Mengetahui\"", info, "pejabat", present(profile.mengetahuiNama) || present(profile.kepalaCabangNama));

  // Aspek Non Keuangan
  field("latarBelakang", "Latar belakang nasabah", nonKeu, "narasi");
  field("pengalamanUsaha", fix ? "Pengalaman bekerja" : "Pengalaman usaha", nonKeu, "narasi");
  if (fix) {
    field("alamatInstansi", "Alamat perusahaan", nonKeu, "usaha");
    field("namaInstansi", "Nama instansi/lembaga", nonKeu, "usaha");
    field("nomorSk", "Nomor SK", nonKeu, "usaha");
    field("tanggalSk", "Tanggal SK", nonKeu, "usaha");
  } else {
    field("gambaranDaerah", "Gambaran daerah sekitar lokasi usaha", nonKeu, "narasi");
    field("saranaPrasarana", "Sarana dan prasarana", nonKeu, "narasi");
    field("bahanBaku", "Perolehan bahan baku", nonKeu, "narasi");
    field("hubunganSupplier", "Hubungan dengan supplier", nonKeu, "narasi");
    field("prosesProduksi", "Proses produksi / layanan", nonKeu, "narasi");
    field("saluranDistribusi", "Saluran distribusi", nonKeu, "narasi");
    field("faktorPersaingan", "Faktor persaingan", nonKeu, "narasi");
    add("perizinan", "Perizinan usaha (NIB, SKU, sertifikat halal)", nonKeu, "legalitas", rowsWith(profile.perizinan, r => present(r.jenis) && present(r.nomor)));
  }
  add("agunan", "Rincian agunan", nonKeu, "agunan", present(profile.agunanTanah) || present(profile.agunanKendaraan));
  field("pengikatan", "Mitigasi risiko hukum (pengikatan)", nonKeu, "agunan");
  field("asuransiJiwa", "Mitigasi risiko kematian", nonKeu, "agunan");
  field("asuransiAgunan", "Mitigasi risiko agunan", nonKeu, "agunan");
  if (fix) field("mengetahuiNama", "Nama pejabat \"Mengetahui\" (Koord. Marketing)", nonKeu, "pejabat");
  field("verifikatorNama", fix ? "Petugas verifikasi (Manajer Bisnis)" : "Petugas verifikasi (Koordinator)", nonKeu, "pejabat");
  field("kepalaCabangNama", "Petugas verifikasi (Kepala Cabang)", nonKeu, "pejabat");

  // Aspek Keuangan
  // Tabel hubungan bank wajib bila ada angsuran existing; tabel yang sudah diisi juga dihitung.
  const bankRows = bankFacilities(kind, profile).hasRows;
  const needsBankRows = app.existingDebt > 0 || bankRows;
  if (fix) {
    add("gajiBulanan", "Gaji bulanan (THP)", keu, "usaha", present(profile.gajiBulanan));
    field("potonganGaji", "Persentase potongan gaji", keu, "usaha");
  } else {
    field("kas", "Kas", keu, "keuangan");
    add("penjualan", "Rincian penjualan per produk (3 bulan)", keu, "keuangan", fluktuatifFinancials(profile, app).structuredSales);
    add("hppPersen", "Persentase HPP per produk", keu, "keuangan", rowsWith(profile.penjualan, p => p.hppPersen != null));
    add("tenagaKerjaUpah", "Biaya tenaga kerja (jumlah dan upah)", keu, "keuangan", profile.tenagaKerjaJumlah != null && (profile.tenagaKerjaJumlah === 0 || profile.tenagaKerjaUpah != null));
    add("biayaUsaha", "Rincian biaya usaha", keu, "keuangan", rowsWith(profile.biayaUsaha, r => present(r.nama) && r.nominal != null));
    add("rumahTangga", "Rincian biaya rumah tangga", keu, "keuangan", fluktuatifFinancials(profile, app).rumahTanggaRows != null);
    add("piutang", "Piutang usaha (rincian atau keterangan)", keu, "keuangan", present(profile.piutang) || present(profile.keteranganPiutang));
    add("persediaan", "Persediaan (rincian atau keterangan)", keu, "keuangan", present(profile.persediaan) || present(profile.keteranganPersediaan));
    add("hutangUsaha", "Hutang usaha (rincian atau keterangan)", keu, "keuangan", present(profile.hutangUsaha) || present(profile.keteranganHutang));
  }
  if (needsBankRows) add("fasilitasBank", "Tabel hubungan bank (fasilitas berjalan)", keu, "bank", bankRows);

  // Rekening Koran & Aset
  add("rekeningKoran", "Rekening koran 3 bulan", rek, "rekening", (profile.rekeningKoran?.months.length ?? 0) >= 3 && present(profile.rekeningKoran?.bank));
  add("aset", "Daftar aset yang dimiliki", rek, "rekening", rowsWith(profile.aset, a => a.nilaiTaksasi != null));

  // Usulan, keputusan, tanda tangan
  add("kotaTandaTangan", "Kota tempat tanda tangan", tanda, "pejabat", present(profile.kotaTandaTangan));
  if (fix) field("kabagMarketingNama", "Nama Kabag. Marketing", tanda, "pejabat");

  const missingMap = new Map<string, Array<{ key: string; label: string; tab: BprsPanelTab }>>();
  for (const item of items) {
    if (item.filled) continue;
    if (!missingMap.has(item.sheet)) missingMap.set(item.sheet, []);
    missingMap.get(item.sheet)!.push({ key: item.key, label: item.label, tab: item.tab });
  }
  return {
    filled: items.filter(i => i.filled).length,
    total: items.length,
    items,
    missing: Array.from(missingMap, ([sheet, list]) => ({ sheet, items: list })),
  };
}
