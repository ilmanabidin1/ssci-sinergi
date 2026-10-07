import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AKAD_TO_BPRS,
  MAX_STATEMENT_ROWS,
  lamaUsahaFromMonths,
  monthlyFlatRate,
  type BprsApplicationData,
  type BprsProfile,
  type BprsTemplateKind,
} from "@shared/bprsTemplate";
import { XlsxWorkbook, type CellValue } from "./xlsxPatch";

export const FLUKTUATIF_TEMPLATE_PATH = join(process.cwd(), "templates", "bprs", "fluktuatif-umkm.xlsx");

export const SHEET = {
  info: "Informasi Pokok",
  nonKeuangan: "Aspek Non Keuangan",
  rekening: "Rekening Koran & Aset ", // spasi di akhir memang bagian dari nama sheet
  keuangan: "Aspek Keuangan",
  usulan: "Usulan Pembiayaan",
  jadang: "Jadang",
} as const;

export type BprsExportApplication = BprsApplicationData & {
  customerName: string;
  customerId: string;
  address: string;
  phone: string;
  businessName: string;
  businessType: string;
  loanPurpose: string;
};

const range = (cols: string[], from: number, to: number) => {
  const out: string[] = [];
  for (let r = from; r <= to; r++) for (const c of cols) out.push(`${c}${r}`);
  return out;
};

/**
 * Sel isian dari template contoh BPRS yang harus dikosongkan agar data
 * nasabah contoh tidak ikut terbawa. Label dan opsi bawaan tidak disentuh.
 */
export const FLUKTUATIF_INPUT_CELLS: Record<string, string[]> = {
  [SHEET.info]: [
    "D3", "D4", "D5", "D6", "D7", "D11", "H11", "D12", "D13", "D14", "I14", "D15", "D16", "F18", "I18", "F19", "I19",
    "D20", "D21", "D22", "D23", "D24", "D25", "D26", "D27", "D28", "D29", "D30", "D32", "D36", "D37", "D38", "D39",
    "D43", "D44", "D45", "D47", "D48", "D49", "D50", "D51", "D52", "D56", "D57", "D62", "D63", "D64", "D65", "D66",
    "E66", "D67", "D68", "D69", "D70", "D71", "B76", "D77",
  ],
  [SHEET.nonKeuangan]: [
    "B5", "K13", "K18", "K19", "K23", "K27", "K31", "K35", "K41", "K42", "K44", "K46", "K52",
    "G111", "G117", "G122", "H142",
    ...range(["F", "M", "S"], 56, 61), "B59", "B60", "B61",
    ...range(["B", "G", "H", "L", "M", "N", "P", "Q", "V", "X"], 69, 75),
    ...range(["B", "E", "H", "I", "L", "N", "O", "Q", "R"], 81, 85), "Z81",
    ...range(["E", "H", "L", "Q"], 91, 94),
  ],
  [SHEET.rekening]: [
    "C1", "C2", "E2", "A6",
    ...range(["B", "C", "F", "G", "J", "K"], 6, 53),
    ...range(["C", "D"], 62, 66),
    ...[87, 90, 93, 96, 99, 103, 106, 109, 113].flatMap(t => [`D${t + 1}`, `D${t + 2}`]),
    ...[90, 93, 96, 99, 103, 106, 109, 113].flatMap(t => [`H${t + 1}`, `H${t + 2}`]),
  ],
  [SHEET.keuangan]: [
    "G5", "E26", "E39", "E50", "E63", "E74", "E65", "P80", "P81", "L88", "O100", "O101",
    "M110", "M111", "M113", "M114", "M116", "M117",
    ...range(["B", "H", "K", "T"], 19, 23),
    ...range(["B", "H", "K", "N"], 32, 36),
    ...range(["B", "H", "K", "T"], 45, 47),
    ...range(["B", "F", "L", "Q", "T", "W", "Z"], 56, 60),
    ...range(["B", "F", "L", "Q", "T", "W", "Z"], 67, 71),
    "C92", "H92", "I92", "O92", "P92", "V92", "W92", "C93", "H93", "I93", "O93", "P93", "V93", "W93",
    ...range(["C", "M"], 123, 128),
    "M133", "M134", "M135", "M136", "C137", "M137", "C138", "M138",
    "J145", "T145", "J150", "T150", "J151", "T151",
    "H164", "H172",
  ],
  [SHEET.usulan]: ["N36", "J76", "J77", "J78", "J79", "J81", "J82", "M82", "B107", "K109", "B136"],
  [SHEET.jadang]: ["A131"],
};

const WORKING_DAYS = 26;

function jakartaToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

function isoDate(value: Date | string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : jakartaToday(date);
}

const nonCashShare: Record<string, number> = {
  Tunai: 0,
  "Non Tunai & Tunai": 0.5,
  "Non Tunai": 1,
  "Konsinyasi & Bagi Hasil": 1,
};

export type FilledSheets = Record<string, Record<string, CellValue>>;

/** Menyusun nilai sel per sheet dari data pengajuan SSCI dan profil format BPRS. */
export function buildFluktuatifCells(app: BprsExportApplication, profile: BprsProfile, now = new Date()): FilledSheets {
  const today = jakartaToday(now);
  const v = <T,>(value: T | undefined | null): T | null => (value === undefined || value === "" ? null : value);
  const info: Record<string, CellValue> = {
    D3: v(profile.kantor),
    D4: v(profile.nomorProposal),
    D5: v(profile.nomorProposal),
    D6: v(profile.namaAo),
    D7: { date: today },
    D11: v(profile.kategoriNasabah),
    H11: profile.kategoriNasabah === "Referral" ? v(profile.namaReferral) : null,
    D12: app.customerName,
    D13: v(profile.jenisKelamin),
    D14: v(profile.tempatLahir),
    I14: profile.tanggalLahir ? { date: profile.tanggalLahir } : null,
    D15: app.customerId,
    D16: app.address,
    F18: v(profile.desa),
    I18: v(profile.kecamatan),
    F19: v(profile.kabupaten),
    I19: v(profile.kodePos),
    D21: app.phone,
    D22: v(profile.statusPerkawinan),
    D23: v(profile.tanggungan),
    D24: v(profile.pendidikan),
    D25: v(profile.ibuKandung),
    D26: v(profile.namaPasangan),
    D27: v(profile.ttlPasangan),
    D28: v(profile.ktpPasangan),
    D29: v(profile.pekerjaanPasangan),
    D30: v(profile.namaSaudara),
    D32: v(profile.hpSaudara),
    D36: v(profile.statusTempatTinggal),
    D37: v(profile.lamaMenetap),
    D38: v(profile.reputasi),
    D39: v(profile.indikatorReputasi),
    D43: v(profile.laporanKeuangan),
    D44: lamaUsahaFromMonths(app.businessAge),
    D45: v(profile.sistemPenjualan),
    D47: v(profile.kepemilikanTempatUsaha),
    D48: v(profile.lokasiUsaha),
    D49: v(profile.daerahPemasaran),
    D50: v(profile.tenagaKerja),
    D51: v(profile.pengelolaanKeuangan),
    D52: v(profile.hutangDagang),
    D56: v(profile.hubunganBank),
    D57: v(profile.riwayatSlik),
    D62: profile.pembiayaanKe ?? 1,
    D63: v(profile.buktiPenggunaanDana),
    D64: app.requestedAmount,
    D65: app.financingTenor,
    D66: monthlyFlatRate(app),
    E66: profile.jenisMargin ?? "Flat",
    D67: app.financingAkad ? AKAD_TO_BPRS[app.financingAkad] ?? null : null,
    D68: v(profile.sektorEkonomi),
    D69: v(profile.jenisPenggunaan),
    D70: app.loanPurpose,
    D71: { date: isoDate(app.createdAt, today) },
  };

  const nonKeuangan: Record<string, CellValue> = {
    B5: v(profile.latarBelakang),
    K13: v(profile.pengalamanUsaha),
    K18: app.address,
    K41: v(profile.sistemPenjualan),
    K42: v(profile.daerahPemasaran),
    K52: "Perorangan (UMKM)",
    G111: v(profile.pengikatan),
    G117: v(profile.asuransiJiwa),
    G122: v(profile.asuransiAgunan),
  };
  const tanah = profile.agunanTanah ?? [];
  const kendaraan = profile.agunanKendaraan ?? [];
  tanah.slice(0, 7).forEach((row, i) => {
    const r = 69 + i;
    Object.assign(nonKeuangan, {
      [`B${r}`]: v(row.jenisSurat), [`G${r}`]: v(row.nomor), [`H${r}`]: v(row.atasNama),
      [`L${r}`]: v(row.luasTanah), [`M${r}`]: v(row.luasBangunan), [`N${r}`]: v(row.nilaiPasar),
      [`P${r}`]: row.persen ?? 1, [`Q${r}`]: 0, [`V${r}`]: v(row.pengikatan), [`X${r}`]: v(row.lokasi),
    });
  });
  kendaraan.slice(0, 5).forEach((row, i) => {
    const r = 81 + i;
    Object.assign(nonKeuangan, {
      [`B${r}`]: v(row.merek), [`E${r}`]: v(row.tipe), [`H${r}`]: v(row.tahun), [`I${r}`]: v(row.atasNama),
      [`L${r}`]: v(row.nomorBpkb), [`N${r}`]: v(row.nopol), [`O${r}`]: v(row.nilaiPasar), [`Q${r}`]: row.persen ?? 1, [`R${r}`]: 0,
    });
  });
  if (kendaraan.length > 0) nonKeuangan.Z81 = "Fidusia";
  if (tanah.length === 0 && kendaraan.length === 0 && app.collateralValue > 0) {
    // Rincian agunan belum diisi: nilai agunan SSCI dicatat di baris pertama.
    Object.assign(nonKeuangan, { N69: app.collateralValue, P69: 1, Q69: 0, X69: "Nilai agunan dari data SSCI, rincian perlu dilengkapi" });
  }

  const rekening: Record<string, CellValue> = {};
  const statement = profile.rekeningKoran;
  if (statement) {
    Object.assign(rekening, {
      C1: v(statement.bank),
      E1: "IDR",
      C2: v(statement.nomorRekening),
      E2: statement.saldoAwal ?? 0,
      A6: statement.bulanPertama ? { date: `${statement.bulanPertama}-01` } : null,
    });
    const columns: Array<[string, string]> = [["B", "C"], ["F", "G"], ["J", "K"]];
    statement.months.slice(0, 3).forEach((month, i) => {
      const [debitCol, creditCol] = columns[i]!;
      month.debits.slice(0, MAX_STATEMENT_ROWS).forEach((amount, j) => { rekening[`${debitCol}${6 + j}`] = amount; });
      month.credits.slice(0, MAX_STATEMENT_ROWS).forEach((amount, j) => { rekening[`${creditCol}${6 + j}`] = amount; });
    });
  }

  const dailySales = app.monthlyRevenue / WORKING_DAYS;
  const keuangan: Record<string, CellValue> = {
    G5: v(profile.kas),
    E65: v(profile.namaPasangan),
    P80: 0,
    P81: 0,
    L88: profile.sistemPenjualan ? nonCashShare[profile.sistemPenjualan] ?? null : null,
    C92: app.businessName || app.businessType,
    H92: WORKING_DAYS, I92: dailySales,
    O92: WORKING_DAYS, P92: dailySales,
    V92: WORKING_DAYS, W92: dailySales,
    O100: 0,
    C123: "Biaya usaha per bulan (data SSCI)",
    M123: app.monthlyExpenses,
    M133: v(profile.biayaRumahTangga),
    J145: app.existingDebt > 0 ? "Angsuran pembiayaan existing (data SSCI)" : null,
    T145: app.existingDebt > 0 ? app.existingDebt : null,
  };

  const usulan: Record<string, CellValue> = {
    N36: Number(profile.rpcPersen ?? "0.7"),
    J76: app.requestedAmount,
    J77: 0,
    J78: 0,
    J81: app.financingTenor,
    J82: monthlyFlatRate(app),
    M82: profile.jenisMargin ?? "Flat",
  };

  return {
    [SHEET.info]: info,
    [SHEET.nonKeuangan]: nonKeuangan,
    [SHEET.rekening]: rekening,
    [SHEET.keuangan]: keuangan,
    [SHEET.usulan]: usulan,
  };
}

export async function fillFluktuatifWorkbook(
  template: Buffer,
  app: BprsExportApplication,
  profile: BprsProfile,
  now = new Date(),
): Promise<Buffer> {
  const workbook = await XlsxWorkbook.load(template);
  const sheets = buildFluktuatifCells(app, profile, now);
  for (const [sheet, cells] of Object.entries(sheets)) {
    await workbook.write(sheet, cells, { overwriteFormulas: true });
  }
  await workbook.forceRecalculation();
  return workbook.toBuffer();
}

export async function loadFluktuatifTemplate(): Promise<Buffer> {
  return readFile(FLUKTUATIF_TEMPLATE_PATH);
}

/** Nama file unduhan, misalnya "SSCI-00015 Skoring Fluktuatif UMKM.xlsx". */
export function bprsWorkbookFilename(applicationId: number): string {
  return `SSCI-${String(applicationId).padStart(5, "0")} Skoring Fluktuatif UMKM.xlsx`;
}

// ---------------------------------------------------------------------------
// Template Fix Income (karyawan, dengan agunan)
// ---------------------------------------------------------------------------

export const FIX_INCOME_TEMPLATE_PATH = join(process.cwd(), "templates", "bprs", "fix-income-agunan.xlsx");

export const FIX_SHEET = {
  info: "Informasi Pokok",
  nonKeuangan: "Aspek Non Keuangan",
  keuangan: "Aspek Keuangan",
  rekening: "Rekening Koran & Aset",
  usulan: "Usulan Pembiayaan",
  rekomendasi: "Rekomendasi AO",
  keputusan: "Keputusan Pembiayaan",
  komite: "Komite Kredit",
} as const;

/** Baris tabel yang rumusnya lengkap di template (baris 35 dan 46 tidak punya rumus nilai bank). */
const FIX_LAND_ROWS = [34, 36, 37, 38, 39, 40];
const FIX_VEHICLE_ROWS = [47, 48, 49, 50];
const FIX_STATEMENT_FIRST_ROW = 7;
const FIX_STATEMENT_ROWS = 47;

export const FIX_INCOME_INPUT_CELLS: Record<string, string[]> = {
  [FIX_SHEET.info]: [
    "D2", "D3", "D4", "D5", "D6", "D10", "H10", "D11", "D12", "D13", "I13", "D14", "D15", "F17", "I17", "F18", "I18",
    "D19", "D20", "D21", "D22", "D23", "D24", "D25", "D26", "D27", "D29", "D30", "D31", "D32", "D33", "D34", "D35",
    "D36", "D37", "D38", "D39", "D40", "D41", "D43", "D48", "D49", "D53", "D54", "D55", "D56", "D57", "E57", "D58",
    "D59", "D60", "D61", "D62", ...range(["M"], 299, 310),
  ],
  [FIX_SHEET.nonKeuangan]: [
    ...range(["B"], 5, 14), "K16", "K19", "N24", "N25", "N26", "N27",
    ...range(["B", "G", "H", "L", "M", "N", "P", "Q", "V", "X"], 34, 40),
    ...range(["B", "E", "H", "I", "L", "N", "O", "R", "Z"], 46, 50),
    ...range(["B", "E", "H", "L", "Q"], 56, 59),
    "F77", "K77", "F83", "F88", "K88", "L96",
  ],
  [FIX_SHEET.keuangan]: [
    "M5", "M6", "M7", "M10", "M67", "C20", "C21", ...range(["H", "I", "O", "P", "W", "X"], 20, 21), "O28", "O29",
    "M36", "M37", "M39", "M40", "M42", "M43", "M49", "M50", "M51", "M52", "M53",
    "F72", "E86", ...range(["B", "F", "L", "Q", "T", "W", "Z"], 74, 80), ...range(["B", "F", "L", "Q", "T", "W", "Z"], 88, 92),
    "AD74", "AD75", "P100", "P101", "M111",
  ],
  [FIX_SHEET.rekening]: [
    "C1", "C2", "E2", "A6", "G2", "F81",
    ...range(["B", "C", "F", "G", "J", "K"], FIX_STATEMENT_FIRST_ROW, FIX_STATEMENT_FIRST_ROW + FIX_STATEMENT_ROWS - 1),
    "H62", "H63", "H64", "H65", "D67", "D68", "D69", "D70", "H67", "H68", "H69", "H70",
  ],
  [FIX_SHEET.usulan]: ["J49", "J50", "J51", "J52", "J54", "J55", "M55", "C80", "C81", "C82", "J90"],
  [FIX_SHEET.rekomendasi]: ["D5", "D7", "D8", "D9", "D10", "D11", "D15", "D16", "D19", "D20", "A23", "A28", "D28", "G28"],
  [FIX_SHEET.keputusan]: ["A70", "C75", "K75", "R75"],
  [FIX_SHEET.komite]: ["A2", "C19", "C20", "C21", "B24", "A39", "A45", "A51", "J7"],
};

function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1 + months, d!));
  return date.toISOString().slice(0, 10);
}

function idDateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** Menyusun nilai sel template Fix Income dari data SSCI dan profil format BPRS. */
export function buildFixIncomeCells(app: BprsExportApplication, profile: BprsProfile, now = new Date()): FilledSheets {
  const today = jakartaToday(now);
  const v = <T,>(value: T | undefined | null): T | null => (value === undefined || value === "" ? null : value);
  const akad = app.financingAkad ? AKAD_TO_BPRS[app.financingAkad] ?? null : null;
  const rate = monthlyFlatRate(app);
  const marginType = profile.jenisMargin ?? "Flat";

  const info: Record<string, CellValue> = {
    D2: v(profile.kantor), D3: v(profile.nomorProposal), D4: v(profile.nomorProposal), D5: v(profile.namaAo),
    D6: { date: today }, D10: v(profile.kategoriNasabah),
    H10: profile.kategoriNasabah === "Referral" ? v(profile.namaReferral) : null,
    D11: app.customerName, D12: v(profile.jenisKelamin), D13: v(profile.tempatLahir),
    I13: profile.tanggalLahir ? { date: profile.tanggalLahir } : null,
    D14: app.customerId, D15: app.address, F17: v(profile.desa), I17: v(profile.kecamatan), F18: v(profile.kabupaten), I18: v(profile.kodePos),
    D20: app.phone, D21: v(profile.statusPerkawinan), D22: v(profile.tanggungan), D23: v(profile.pendidikanFix),
    D24: v(profile.statusTempatTinggal), D25: v(profile.statusKaryawan), D26: v(profile.bidangPekerjaan), D27: v(profile.bonafiditas),
    D29: v(profile.suratKeteranganBekerja), D30: v(profile.slipGaji), D31: v(profile.rekeningGaji),
    D32: v(profile.mouInstansi), D33: v(profile.suratKuasaPotongGaji), D34: v(profile.reputasiFix), D35: v(profile.indikatorReputasi),
    D36: v(profile.ibuKandung), D37: v(profile.namaPasangan), D38: v(profile.ttlPasangan), D39: v(profile.ktpPasangan),
    D40: v(profile.pekerjaanPasangan), D41: v(profile.namaSaudara), D43: v(profile.hpSaudara),
    D48: v(profile.hubunganBank), D49: v(profile.riwayatSlik), D53: profile.pembiayaanKe ?? 1, D54: v(profile.buktiPenggunaanDana),
    D55: app.requestedAmount, D56: app.financingTenor, D57: rate, E57: marginType, D58: akad,
    D59: v(profile.sektorEkonomi), D60: v(profile.jenisPenggunaan), D61: app.loanPurpose, D62: { date: isoDate(app.createdAt, today) },
  };

  const nonKeuangan: Record<string, CellValue> = {
    B5: v(profile.latarBelakang), K16: v(profile.pengalamanUsaha), K19: v(profile.alamatInstansi),
    N24: v(profile.namaInstansi), N25: v(profile.nomorSk), N26: v(profile.tanggalSk), N27: profile.nomorSk ? app.customerName : null,
    F77: v(profile.pengikatan), F83: v(profile.asuransiJiwa), F88: v(profile.asuransiAgunan),
  };
  const tanah = (profile.agunanTanah ?? []).slice(0, FIX_LAND_ROWS.length);
  const kendaraan = (profile.agunanKendaraan ?? []).slice(0, FIX_VEHICLE_ROWS.length);
  tanah.forEach((row, i) => {
    const r = FIX_LAND_ROWS[i]!;
    Object.assign(nonKeuangan, {
      [`B${r}`]: v(row.jenisSurat), [`G${r}`]: v(row.nomor), [`H${r}`]: v(row.atasNama), [`L${r}`]: v(row.luasTanah),
      [`M${r}`]: v(row.luasBangunan), [`N${r}`]: v(row.nilaiPasar), [`P${r}`]: row.persen ?? 1, [`Q${r}`]: 0,
      [`V${r}`]: v(row.pengikatan), [`X${r}`]: v(row.lokasi),
    });
  });
  kendaraan.forEach((row, i) => {
    const r = FIX_VEHICLE_ROWS[i]!;
    Object.assign(nonKeuangan, {
      [`B${r}`]: v(row.merek), [`E${r}`]: v(row.tipe), [`H${r}`]: v(row.tahun), [`I${r}`]: v(row.atasNama),
      [`L${r}`]: v(row.nomorBpkb), [`N${r}`]: v(row.nopol), [`O${r}`]: v(row.nilaiPasar), [`Q${r}`]: row.persen ?? 1, [`R${r}`]: 0, [`Z${r}`]: "Fidusia",
    });
  });
  if (tanah.length === 0 && kendaraan.length === 0 && app.collateralValue > 0) {
    Object.assign(nonKeuangan, { N34: app.collateralValue, P34: 1, Q34: 0, X34: "Nilai agunan dari data SSCI, rincian perlu dilengkapi" });
  }

  const keuangan: Record<string, CellValue> = {
    M5: profile.gajiBulanan ?? app.monthlyRevenue,
    M6: v(profile.uangLembur),
    M7: v(profile.pendapatanTetapLain),
    M10: Number(profile.potonganGaji ?? "0.4"),
    M67: Number(profile.rpcPersen ?? "0.7"),
    F72: app.customerName,
    E86: v(profile.namaPasangan),
    P100: 0,
    P101: 0,
  };
  if (app.existingDebt > 0) {
    // Angsuran existing SSCI ditulis sebagai satu fasilitas 12 bulan tanpa margin (efektif),
    // sehingga rumus PMT di template menghasilkan angsuran yang sama.
    Object.assign(keuangan, {
      B74: "Angsuran existing (data SSCI)", F74: app.existingDebt * 12, L74: 0,
      Q74: { date: today }, T74: { date: addMonths(today, 12) }, W74: "Konsumtif", Y74: "Efektif", Z74: 1, AA74: "Tidak",
    });
  }

  const rekening: Record<string, CellValue> = {};
  const statement = profile.rekeningKoran;
  if (statement) {
    Object.assign(rekening, {
      C1: v(statement.bank), E1: "IDR", C2: v(statement.nomorRekening), E2: statement.saldoAwal ?? 0,
      A6: statement.bulanPertama ? { date: `${statement.bulanPertama}-01` } : null,
    });
    const columns: Array<[string, string]> = [["B", "C"], ["F", "G"], ["J", "K"]];
    const fit = (values: number[]) => {
      if (values.length <= FIX_STATEMENT_ROWS) return values;
      const head = values.slice(0, FIX_STATEMENT_ROWS - 1);
      return [...head, values.slice(FIX_STATEMENT_ROWS - 1).reduce((a, b) => a + b, 0)];
    };
    statement.months.slice(0, 3).forEach((month, i) => {
      const [debitCol, creditCol] = columns[i]!;
      fit(month.debits).forEach((amount, j) => { rekening[`${debitCol}${FIX_STATEMENT_FIRST_ROW + j}`] = amount; });
      fit(month.credits).forEach((amount, j) => { rekening[`${creditCol}${FIX_STATEMENT_FIRST_ROW + j}`] = amount; });
    });
  }

  const collateralLines = [
    ...tanah.map(row => `${row.jenisSurat ?? "Sertipikat"}${row.nomor ? ` No. ${row.nomor}` : ""}${row.luasTanah ? ` luas ${row.luasTanah} m2` : ""}${row.atasNama ? ` an. ${row.atasNama}` : ""}`),
    ...kendaraan.map(row => `BPKB ${[row.merek, row.tipe, row.tahun].filter(Boolean).join(" ")}${row.nopol ? ` Nopol ${row.nopol}` : ""}${row.atasNama ? ` an. ${row.atasNama}` : ""}`),
  ].slice(0, 3);
  const usulan: Record<string, CellValue> = {
    J49: app.requestedAmount, J50: 0, J51: 0, J52: 0, J54: app.financingTenor, J55: rate, M55: marginType,
    C80: collateralLines[0] ?? null, C81: collateralLines[1] ?? null, C82: collateralLines[2] ?? null,
  };

  const place = profile.kabupaten ? `${profile.kabupaten}, ` : "";
  const rekomendasi: Record<string, CellValue> = {
    D5: app.requestedAmount, D7: app.financingTenor, D8: akad, D9: app.loanPurpose,
    D10: "Terlampir", D11: "Terlampir", D15: "Terlampir", D16: "Terlampir",
    D19: rate, D20: marginType, A23: `${place}${idDateLabel(today)}`, A28: v(profile.namaAo),
  };
  const keputusan: Record<string, CellValue> = { C75: v(profile.namaAo) };

  return {
    [FIX_SHEET.info]: info,
    [FIX_SHEET.nonKeuangan]: nonKeuangan,
    [FIX_SHEET.keuangan]: keuangan,
    [FIX_SHEET.rekening]: rekening,
    [FIX_SHEET.usulan]: usulan,
    [FIX_SHEET.rekomendasi]: rekomendasi,
    [FIX_SHEET.keputusan]: keputusan,
  };
}

type TemplateSpec = {
  path: string;
  inputCells: Record<string, string[]>;
  build: (app: BprsExportApplication, profile: BprsProfile, now?: Date) => FilledSheets;
  filenameLabel: string;
};

export const BPRS_TEMPLATES: Record<BprsTemplateKind, TemplateSpec> = {
  fluktuatif: { path: FLUKTUATIF_TEMPLATE_PATH, inputCells: FLUKTUATIF_INPUT_CELLS, build: buildFluktuatifCells, filenameLabel: "Skoring Fluktuatif UMKM" },
  fix_income: { path: FIX_INCOME_TEMPLATE_PATH, inputCells: FIX_INCOME_INPUT_CELLS, build: buildFixIncomeCells, filenameLabel: "Skoring Fix Income" },
};

export async function fillBprsWorkbook(
  kind: BprsTemplateKind,
  app: BprsExportApplication,
  profile: BprsProfile,
  now = new Date(),
): Promise<{ buffer: Buffer; filename: (applicationId: number) => string }> {
  const spec = BPRS_TEMPLATES[kind];
  const workbook = await XlsxWorkbook.load(await readFile(spec.path));
  for (const [sheet, cells] of Object.entries(spec.build(app, profile, now))) {
    await workbook.write(sheet, cells, { overwriteFormulas: true });
  }
  await workbook.forceRecalculation();
  return {
    buffer: await workbook.toBuffer(),
    filename: id => `SSCI-${String(id).padStart(5, "0")} ${spec.filenameLabel}.xlsx`,
  };
}
