import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FinancialStatements, LabaRugiKey, NeracaKey } from "@shared/financialStatements";
import { XlsxWorkbook, type CellValue } from "./xlsxPatch";

/**
 * Pengisian workbook ANALISA_KEUANGAN milik BPRS (segmen badan hukum).
 * Hanya sel isian yang ditulis; rasio, pertumbuhan, dan kebutuhan modal kerja
 * tetap dihitung oleh rumus Excel saat file dibuka.
 *
 * Template disalin apa adanya dari file asli bank (seluruh angka contohnya 0)
 * ke templates/bprs/analisa-keuangan.xlsx. Lihat docs/tata-kelola/01-manual-book.md bagian 3.3.
 */

export const ANALISA_KEUANGAN_TEMPLATE_PATH = join(process.cwd(), "templates", "bprs", "analisa-keuangan.xlsx");
export const ANALISA_KEUANGAN_TEMPLATE_MISSING = "Template Analisa Keuangan belum tersedia, hubungi admin";

export const AK_SHEET = {
  neraca: "Neraca",
  labaRugi: "LR",
  kebModalB: "Keb Modal-B",
} as const;

type Period = "previous" | "current";

/** Label periode yang diketik di sheet Neraca, misalnya "PER-DESEMBER 2025". */
export const PERIOD_LABEL_CELLS: Record<Period, string> = { previous: "A2", current: "A25" };

export const NERACA_CELLS: Record<Period, Record<NeracaKey, string>> = {
  previous: {
    kas: "E5",
    bank: "E6",
    piutang: "E7",
    persediaan: "E8",
    tanahBangunan: "E13",
    kendaraan: "E14",
    peralatan: "E15",
    asetLain: "E16",
    hutangJangkaPendek: "J7",
    hutangJangkaPanjang: "J8",
    modalDisetor: "J13",
    // Baris tanpa label di bawah modal disetor, ikut dijumlahkan ke modal.
    modalLain: "J14",
    saldoLabaLalu: "J18",
    labaBerjalan: "J19",
  },
  current: {
    kas: "E28",
    bank: "E29",
    piutang: "E30",
    persediaan: "E31",
    tanahBangunan: "E36",
    kendaraan: "E37",
    peralatan: "E38",
    asetLain: "E39",
    hutangJangkaPendek: "J30",
    hutangJangkaPanjang: "J31",
    modalDisetor: "J36",
    modalLain: "J37",
    saldoLabaLalu: "J41",
    labaBerjalan: "J42",
  },
};

export const LABA_RUGI_CELLS: Record<Period, Record<LabaRugiKey, string>> = {
  previous: {
    penjualan: "D5",
    hpp: "D6",
    biayaPenjualan: "D13",
    biayaOperasional: "D14",
    biayaBank: "D15",
    biayaPajak: "D16",
    biayaLainnya: "D17",
  },
  current: {
    penjualan: "D30",
    hpp: "D31",
    biayaPenjualan: "D38",
    biayaOperasional: "D39",
    biayaBank: "D40",
    biayaPajak: "D41",
    biayaLainnya: "D42",
  },
};

/** Keb Modal-B: E33 proyeksi pertumbuhan penjualan (pecahan, 12% ditulis 0,12), I14 jumlah hari periode. */
export const KEB_MODAL_B_CELLS = { expectedSalesGrowth: "E33", periodDays: "I14" } as const;

export type AnalisaKeuanganCells = Record<string, Record<string, CellValue>>;

const num = (value: number | undefined): number => (Number.isFinite(value) ? Number(value) : 0);

export function buildAnalisaKeuanganCells(fs: FinancialStatements): AnalisaKeuanganCells {
  const neraca: Record<string, CellValue> = {};
  const labaRugi: Record<string, CellValue> = {};
  for (const period of ["previous", "current"] as const) {
    const data = fs[period];
    if (data?.label?.trim()) neraca[PERIOD_LABEL_CELLS[period]] = data.label.trim();
    for (const [key, cell] of Object.entries(NERACA_CELLS[period])) neraca[cell] = num(data?.neraca?.[key as NeracaKey]);
    for (const [key, cell] of Object.entries(LABA_RUGI_CELLS[period])) labaRugi[cell] = num(data?.labaRugi?.[key as LabaRugiKey]);
  }
  const kebModal: Record<string, CellValue> = {
    // Placeholder "%" di template diganti angka; tanpa proyeksi diisi 0 agar rumus tidak error.
    [KEB_MODAL_B_CELLS.expectedSalesGrowth]: Number.isFinite(fs.expectedSalesGrowth) ? Number(fs.expectedSalesGrowth) / 100 : 0,
    [KEB_MODAL_B_CELLS.periodDays]: fs.periodDays && fs.periodDays > 0 ? fs.periodDays : 365,
  };
  return { [AK_SHEET.neraca]: neraca, [AK_SHEET.labaRugi]: labaRugi, [AK_SHEET.kebModalB]: kebModal };
}

export class AnalisaKeuanganTemplateMissingError extends Error {
  constructor() {
    super(ANALISA_KEUANGAN_TEMPLATE_MISSING);
    this.name = "AnalisaKeuanganTemplateMissingError";
  }
}

export function analisaKeuanganTemplateAvailable(path = ANALISA_KEUANGAN_TEMPLATE_PATH): boolean {
  return existsSync(path);
}

export function analisaKeuanganFilename(applicationId: number): string {
  return `SSCI-${String(applicationId).padStart(5, "0")} Analisa Keuangan.xlsx`;
}

/** Mengisi template dari buffer. Sel yang ternyata berisi rumus tidak ditimpa dan dilaporkan. */
export async function fillAnalisaKeuanganBuffer(template: Buffer | Uint8Array, fs: FinancialStatements): Promise<{ buffer: Buffer; skippedFormula: string[] }> {
  const workbook = await XlsxWorkbook.load(template);
  const skippedFormula: string[] = [];
  for (const [sheet, cells] of Object.entries(buildAnalisaKeuanganCells(fs))) {
    const result = await workbook.write(sheet, cells);
    skippedFormula.push(...result.skippedFormula.map(cell => `${sheet}!${cell}`));
  }
  await workbook.forceRecalculation();
  return { buffer: await workbook.toBuffer(), skippedFormula };
}

export async function fillAnalisaKeuanganWorkbook(fs: FinancialStatements, path = ANALISA_KEUANGAN_TEMPLATE_PATH) {
  if (!analisaKeuanganTemplateAvailable(path)) throw new AnalisaKeuanganTemplateMissingError();
  return fillAnalisaKeuanganBuffer(await readFile(path), fs);
}
