import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AKAD_TO_BPRS,
  MAX_STATEMENT_ROWS,
  lamaUsahaFromMonths,
  monthlyFlatRate,
  type BprsApplicationData,
  type BprsProfile,
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
