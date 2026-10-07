import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BPRS_OPTIONS,
  BPRS_POINTS,
  bprsProfileSchema,
  checkBprsProfile,
  computeBprsScore,
  lamaUsahaFromMonths,
  type BprsProfile,
} from "@shared/bprsTemplate";
import { ENV } from "./_core/env";
import { fitStatementRows, readBankStatement, ruleScoreComparison } from "./aiAssist";
import { FLUKTUATIF_TEMPLATE_PATH, SHEET, buildFluktuatifCells, fillFluktuatifWorkbook, type BprsExportApplication } from "./bprsExcel";
import { excelDateSerial, stripFormulaCaches, writeCells } from "./xlsxPatch";

const app: BprsExportApplication = {
  customerName: "Budi Contoh",
  customerId: "3273010101800001",
  address: "Jl. Contoh No 1",
  phone: "081200000000",
  businessName: "Warung Budi",
  businessType: "Perdagangan",
  loanPurpose: "Tambah modal",
  businessAge: 84,
  monthlyRevenue: 30_000_000,
  monthlyExpenses: 18_000_000,
  existingDebt: 1_000_000,
  collateralValue: 80_000_000,
  requestedAmount: 50_000_000,
  financingTenor: 36,
  marginRate: 30,
  financingAkad: "murabahah",
  createdAt: "2026-10-01",
};

const profile: BprsProfile = {
  kantor: "PUSAT",
  tanggalLahir: "1982-04-15",
  statusPerkawinan: "Menikah",
  tanggungan: " 1 - 2 Orang",
  pendidikan: "SMA",
  statusTempatTinggal: "Milik sendiri",
  lamaMenetap: "> 8 tahun",
  reputasi: "Dikenal memiliki reputasi baik",
  laporanKeuangan: "Inhouse",
  sistemPenjualan: "Tunai",
  kepemilikanTempatUsaha: "Sewa",
  lokasiUsaha: "Menetap/Permanen",
  daerahPemasaran: "Sekitar Lokasi Usaha",
  tenagaKerja: ">2 sd. 5 Orang",
  pengelolaanKeuangan: "Terdapat pencatatan usaha namun tidak ada pemisahan dengan keuangan lainnya",
  hutangDagang: "Tidak ada/sebagian kecil dari Pembiayaan yang dimohon",
  hubunganBank: "Nasabah/debitur bank 1 - 3 tahun",
  riwayatSlik: "Tidak pernah terlambat 12 bulan terakhir",
  pembiayaanKe: 3,
  sektorEkonomi: "Perdagangan",
  jenisPenggunaan: "Modal Kerja",
  rpcPersen: "0.7",
  pengikatan: "Pengikatan Notaril",
  asuransiAgunan: "Tidak Diasuransikan",
  asuransiJiwa: "Asuransi Jiwa Syariah",
  biayaRumahTangga: 3_000_000,
  agunanTanah: [{ jenisSurat: "Sertipikat Hak Milik", nomor: "123", atasNama: "Budi", nilaiPasar: 100_000_000, persen: 0.8, pengikatan: "SKMHT" }],
  rekeningKoran: {
    bank: "BRI",
    nomorRekening: "0012",
    saldoAwal: 2_000_000,
    bulanPertama: "2026-07",
    months: [
      { credits: [5e6, 5e6, 4e6, 3e6], debits: [6e6, 2e6] },
      { credits: [5e6, 5e6, 4e6], debits: [8e6] },
      { credits: [5e6, 2e6], debits: [1e6, 1e6] },
    ],
  },
};

const now = new Date("2026-10-07T03:00:00Z");

describe("computeBprsScore", () => {
  it("matches the score Excel calculates for the same filled workbook", () => {
    // Acuan: file hasil fillFluktuatifWorkbook untuk data ini, dihitung ulang dengan
    // LibreOffice Calc, menghasilkan Usulan Pembiayaan B102 = 82.025, A-, Layak.
    const result = computeBprsScore(profile, app, now);
    expect(result.score).toBeCloseTo(82.025, 3);
    expect(result.rating).toBe("A-");
    expect(result.status).toBe("Layak");
    expect(result.coverageRatio).toBeCloseTo(4.1815, 3);
    expect(result.coverageThreshold).toBeCloseTo(1.5145, 3);
    expect(result.missing).toEqual([]);
  });

  it("applies the 70% penalty when repayment capacity is not adequate", () => {
    const weak = { ...app, existingDebt: 9_000_000 };
    const result = computeBprsScore(profile, weak, now);
    expect(result.rpcAdequate).toBe(false);
    expect(result.score).toBeCloseTo(result.subtotal * 0.7, 6);
  });

  it("gives -30 for collateral below the requested amount", () => {
    const result = computeBprsScore({ ...profile, agunanTanah: [] }, { ...app, collateralValue: 40_000_000 }, now);
    expect(result.criteria.find(c => c.key === "agunan")?.points).toBe(-30);
  });

  it("marks unanswered criteria as missing instead of scoring them", () => {
    const result = computeBprsScore({}, app, now);
    expect(result.missing).toContain("Riwayat SLIK");
    expect(result.criteria.find(c => c.key === "lamaUsaha")?.source).toBe("data_ssci");
  });

  it("keeps every scored option string identical to the Parameter sheet", () => {
    const scored = ["statusPerkawinan", "tanggungan", "pendidikan", "statusTempatTinggal", "lamaMenetap", "reputasi", "laporanKeuangan",
      "lamaUsaha", "sistemPenjualan", "kepemilikanTempatUsaha", "lokasiUsaha", "tenagaKerja", "pengelolaanKeuangan", "hutangDagang",
      "hubunganBank", "riwayatSlik", "pengikatan", "asuransiAgunan", "asuransiJiwa"] as const;
    for (const key of scored) {
      expect(Object.keys(BPRS_POINTS[key]!).sort()).toEqual([...BPRS_OPTIONS[key]].sort());
    }
  });

  it("maps business age to the BPRS buckets", () => {
    expect(lamaUsahaFromMonths(12)).toBe("=1 tahun");
    expect(lamaUsahaFromMonths(13)).toBe(">1 - 5 tahun");
    expect(lamaUsahaFromMonths(121)).toBe(">10 tahun");
  });
});

describe("checkBprsProfile", () => {
  it("flags contradictions an analyst should fix before exporting", () => {
    const checks = checkBprsProfile(
      { ...profile, riwayatSlik: "Belum memiliki kredit/Pembiayaan", laporanKeuangan: "Audit", pengelolaanKeuangan: BPRS_OPTIONS.pengelolaanKeuangan[0] },
      app,
      now,
    ).map(c => c.message).join(" ");
    expect(checks).toContain("SLIK");
    expect(checks).toContain("saling bertentangan");
  });

  it("warns when statement inflows are far below declared revenue", () => {
    const checks = checkBprsProfile(profile, { ...app, monthlyRevenue: 100_000_000 }, now);
    expect(checks.some(c => c.message.includes("rekening koran"))).toBe(true);
  });
});

describe("bprsProfileSchema", () => {
  it("rejects option text that would break the Excel lookup", () => {
    expect(bprsProfileSchema.safeParse({ tanggungan: "1 - 2 Orang" }).success).toBe(false);
    expect(bprsProfileSchema.safeParse({ tanggungan: " 1 - 2 Orang" }).success).toBe(true);
    expect(bprsProfileSchema.safeParse({ unknownField: 1 }).success).toBe(false);
  });
});

describe("xlsxPatch", () => {
  const sheet = '<worksheet><sheetData><row r="2" spans="1:3"><c r="A2" s="4"><v>1</v></c><c r="C2" s="5"><f>A2*2</f><v>2</v></c></row><row r="5"><c r="B5"/></row></sheetData></worksheet>';

  it("replaces values, keeps styles, and does not touch formulas by default", () => {
    const result = writeCells(sheet, { A2: "Nama & <Usaha>", B2: 7, C2: 9, D4: { date: "2024-10-21" } });
    expect(result.xml).toContain('<c r="A2" s="4" t="inlineStr"><is><t xml:space="preserve">Nama &amp; &lt;Usaha&gt;</t></is></c><c r="B2"><v>7</v></c><c r="C2" s="5"><f>');
    expect(result.skippedFormula).toEqual(["C2"]);
    expect(result.xml).toContain('<row r="4"><c r="D4"><v>45586</v></c></row><row r="5">');
    expect(result.xml).not.toContain("spans=");
  });

  it("strips cached formula values", () => {
    expect(stripFormulaCaches('<c r="A1" s="1" t="str"><f>B1</f><v>Sani</v></c>')).toBe('<c r="A1" s="1"><f>B1</f></c>');
  });

  it("converts ISO dates to Excel serials", () => {
    expect(excelDateSerial("1900-03-01")).toBe(61);
    expect(excelDateSerial("2024-10-21")).toBe(45586);
  });
});

describe("fillFluktuatifWorkbook", () => {
  it("fills the template without losing dropdowns and asks Excel to recalculate", async () => {
    const template = await readFile(FLUKTUATIF_TEMPLATE_PATH);
    const filled = await fillFluktuatifWorkbook(template, app, profile, now);
    const [before, after] = await Promise.all([JSZip.loadAsync(template), JSZip.loadAsync(filled)]);
    const countValidations = async (zip: JSZip) => {
      let total = 0;
      for (const name of Object.keys(zip.files).filter(n => n.startsWith("xl/worksheets/sheet"))) {
        total += ((await zip.file(name)!.async("string")).match(/<x14:dataValidation /g) ?? []).length;
      }
      return total;
    };
    expect(await countValidations(after)).toBe(await countValidations(before));
    expect(await countValidations(after)).toBeGreaterThan(20);
    expect(await after.file("xl/workbook.xml")!.async("string")).toContain('fullCalcOnLoad="1"');
    const info = await after.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(info).toMatch(/<c r="D15"[^>]*t="inlineStr"><is><t xml:space="preserve">3273010101800001<\/t>/);
    expect(info).toMatch(/<c r="D23"[^>]*t="inlineStr"><is><t xml:space="preserve"> 1 - 2 Orang<\/t>/);
    expect(info).toMatch(/<c r="D44"[^>]*t="inlineStr"><is><t xml:space="preserve">&gt;5 - 10 tahun<\/t>/);
  });

  it("writes the bank statement and financial structure into the right cells", () => {
    const cells = buildFluktuatifCells(app, profile, now);
    expect(cells[SHEET.rekening]!.C6).toBe(5e6);
    expect(cells[SHEET.rekening]!.F6).toBe(8e6);
    expect(cells[SHEET.rekening]!.K7).toBe(2e6);
    expect(cells[SHEET.usulan]!.J82).toBeCloseTo(0.3 / 36, 10);
    expect(cells[SHEET.keuangan]!.T145).toBe(1_000_000);
    expect(cells[SHEET.info]!.D67).toBe("Murabahah");
  });

  it("falls back to the SSCI collateral value when no collateral rows are given", () => {
    const cells = buildFluktuatifCells(app, { ...profile, agunanTanah: [] }, now);
    expect(cells[SHEET.nonKeuangan]!.N69).toBe(80_000_000);
  });

  it("ships a template without the sample customer data", async () => {
    const zip = await JSZip.loadAsync(await readFile(FLUKTUATIF_TEMPLATE_PATH));
    for (const name of Object.keys(zip.files).filter(n => n.endsWith(".xml"))) {
      const xml = await zip.file(name)!.async("string");
      expect(xml, name).not.toMatch(/Handiyana|3204161504820001|082116377471|Kartikasari|Kusnandar|Kusnadar|absPath/i);
    }
  });
});

describe("bank statement reading", () => {
  const originalKey = ENV.openRouterApiKey;
  const originalBaseUrl = ENV.openRouterBaseUrl;
  afterEach(() => {
    ENV.openRouterApiKey = originalKey;
    ENV.openRouterBaseUrl = originalBaseUrl;
  });

  it("merges overflow rows into the last row", () => {
    const rows = fitStatementRows(Array.from({ length: 50 }, () => 10));
    expect(rows).toHaveLength(48);
    expect(rows[47]).toBe(30);
  });

  it("keeps the last three months in order and warns on a different account holder", async () => {
    ENV.openRouterApiKey = "test-key";
    ENV.openRouterBaseUrl = "https://openrouter.test/api/v1";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        bank: "BRI", accountNumber: "0012", holderName: "Siti Lain", openingBalance: 1000,
        months: [
          { month: "2026-08", credits: [100], debits: [50] },
          { month: "2026-06", credits: [10], debits: [] },
          { month: "2026-07", credits: [20], debits: [5] },
          { month: "2026-05", credits: [1], debits: [] },
        ],
        confidence: 0.9, warnings: [],
      }) } }],
    }), { status: 200 }));
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]).toString("base64");
    const result = await readBankStatement(
      { pages: [{ imageBase64: jpeg, contentType: "image/jpeg" }], customerName: "Budi Contoh" },
      { fetch: fetchMock as unknown as typeof fetch },
    );
    expect(result.months.map(m => m.month)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(result.firstMonth).toBe("2026-06");
    expect(result.warnings.join(" ")).toContain("Nama pemilik rekening");
    expect(result.warnings.join(" ")).toContain("lebih dari 3 bulan");
  });
});

describe("ruleScoreComparison", () => {
  it("explains the gap between the SSCI and BPRS scores", () => {
    const bprs = computeBprsScore({ ...profile, riwayatSlik: undefined }, app, now);
    const text = ruleScoreComparison({ ssci: { totalScore: 88, classification: "Sangat Layak" }, bprs });
    expect(text).toContain("Skor SSCI 88.00");
    expect(text).toContain("riwayat slik (belum diisi)");
  });
});
