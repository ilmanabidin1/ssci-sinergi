import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BPRS_OPTIONS,
  BPRS_POINTS,
  bprsProfileSchema,
  checkBprsProfile,
  checkFixIncomeProfile,
  computeBprsScore,
  computeFixIncomeScore,
  datedifMonths,
  excelCompleteness,
  existingInstallment,
  facilityInstallment,
  fixSideBusiness,
  fluktuatifFinancials,
  scoreForTemplate,
  templateFor,
  lamaUsahaFromMonths,
  type BprsProfile,
} from "@shared/bprsTemplate";
import { buildDemoScenario } from "@shared/demoData";
import { ENV } from "./_core/env";
import { fitStatementRows, readBankStatement, ruleScoreComparison } from "./aiAssist";
import {
  BPRS_TEMPLATES,
  FIX_SHEET,
  FLUKTUATIF_TEMPLATE_PATH,
  SHEET,
  buildFixIncomeCells,
  buildFluktuatifCells,
  fillBprsWorkbook,
  fillFluktuatifWorkbook,
  wrapLines,
  type BprsExportApplication,
} from "./bprsExcel";
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

describe("Fix Income template", () => {
  const fixApp: BprsExportApplication = {
    ...app,
    customerName: "Contoh Karyawan",
    monthlyRevenue: 3_968_000,
    monthlyExpenses: 1_000_000,
    existingDebt: 0,
    collateralValue: 0,
    requestedAmount: 45_000_000,
    financingTenor: 60,
    marginRate: 96,
    createdAt: "2025-05-15",
  };
  const fixProfile: BprsProfile = {
    tanggalLahir: "1999-12-28", statusPerkawinan: "Lajang", tanggungan: "Tidak Mempunyai Tanggungan", pendidikanFix: "SMA",
    statusTempatTinggal: "Milik sendiri", statusKaryawan: "Tetap Swasta", reputasiFix: "Dikenal baik", suratKeteranganBekerja: "Tidak Ada",
    slipGaji: "Ada", rekeningGaji: "Ada", hubunganBank: "Nasabah/debitur bank 1 - 3 tahun", riwayatSlik: "Tidak pernah terlambat 12 bulan terakhir",
    pembiayaanKe: 2, potonganGaji: "0.4", gajiBulanan: 3_968_000, pengikatan: "Pengikatan Notaril", asuransiJiwa: "Asuransi Jiwa Syariah",
    asuransiAgunan: "Tidak Diasuransikan",
    agunanTanah: [{ jenisSurat: "Sertipikat Hak Milik", nomor: "1", atasNama: "X", luasTanah: 73, nilaiPasar: 198_142_857, persen: 0.7, pengikatan: "SKMHT" }],
  };
  const fixNow = new Date("2025-05-15T03:00:00Z");

  // Acuan: file hasil fillBprsWorkbook("fix_income", ...) dihitung ulang dengan LibreOffice Calc.
  it("matches Excel for the BPRS sample profile (78.3, BBB+, Layak)", () => {
    const result = computeFixIncomeScore(fixProfile, fixApp, fixNow);
    expect(result.score).toBeCloseTo(78.3, 6);
    expect(result.rating).toBe("BBB+");
    expect(result.coverageRatio).toBeCloseTo(2.6993, 3);
  });

  it("matches Excel when there is an existing installment", () => {
    const result = computeFixIncomeScore(fixProfile, { ...fixApp, existingDebt: 900_000 }, fixNow);
    expect(result.coverageRatio).toBeCloseTo(1.67426, 4);
    expect(result.score).toBeCloseTo(78.3, 6);
  });

  it("cuts the score to 70% when a non-PNS tenor runs past retirement, as Excel does", () => {
    const result = computeFixIncomeScore({ ...fixProfile, tanggalLahir: "1975-01-10" }, { ...fixApp, financingTenor: 120, marginRate: 192 }, fixNow);
    expect(result.score).toBeCloseTo(53.4975, 4);
    expect(result.status).toBe("Tidak Layak");
    expect(checkFixIncomeProfile({ ...fixProfile, tanggalLahir: "1975-01-10" }, { ...fixApp, financingTenor: 120 }, fixNow).map(c => c.message).join(" "))
      .toContain("melewati usia pensiun");
  });

  it("picks the template from the income source unless the analyst overrides it", () => {
    expect(templateFor({}, "fixed")).toBe("fix_income");
    expect(templateFor({}, "non_fixed")).toBe("fluktuatif");
    expect(templateFor({ template: "fluktuatif" }, "fixed")).toBe("fluktuatif");
  });

  it("writes the existing installment as a zero-margin 12-month facility the template can read", () => {
    const cells = buildFixIncomeCells({ ...fixApp, existingDebt: 900_000 }, fixProfile, fixNow);
    const keuangan = cells[FIX_SHEET.keuangan]!;
    expect(keuangan.F74).toBe(10_800_000);
    expect(keuangan.L74).toBe(0);
    expect(keuangan.Y74).toBe("Efektif");
    expect(keuangan.T74).toEqual({ date: "2026-05-15" });
    expect(cells[FIX_SHEET.nonKeuangan]!.N34).toBe(198_142_857);
    expect(cells[FIX_SHEET.usulan]!.J55).toBeCloseTo(0.016, 10);
  });

  it("fills the template without losing dropdowns", async () => {
    const template = await readFile(BPRS_TEMPLATES.fix_income.path);
    const { buffer, filename } = await fillBprsWorkbook("fix_income", fixApp, fixProfile, fixNow);
    const count = async (data: Buffer) => {
      const zip = await JSZip.loadAsync(data);
      let total = 0;
      for (const name of Object.keys(zip.files).filter(n => n.startsWith("xl/worksheets/sheet"))) {
        total += ((await zip.file(name)!.async("string")).match(/<x14:dataValidation /g) ?? []).length;
      }
      return total;
    };
    expect(await count(buffer)).toBe(await count(template));
    expect(filename(7)).toBe("SSCI-00007 Skoring Fix Income.xlsx");
  });

  it("ships a template without sample customer, staff or third-party data", async () => {
    const zip = await JSZip.loadAsync(await readFile(BPRS_TEMPLATES.fix_income.path));
    for (const name of Object.keys(zip.files).filter(n => /\.(xml|rels)$/.test(n))) {
      const xml = await zip.file(name)!.async("string");
      expect(xml, name).not.toMatch(/Fitri|3204166812990002|Santi|Fengtay|Heru Sukmawan|Linda Hasanah|Hardiman|Nurahman|Syafi|Lampani|Walelang|09020299765|Zaenal/i);
    }
  });
});

describe("structured financials and bank facilities (verified with LibreOffice)", () => {
  // Rincian lengkap: 2 produk, HPP, tenaga kerja, biaya usaha, rumah tangga, pendapatan/biaya lain,
  // fasilitas bank Flat + Efektif + dilunasi + pasangan.
  const flukStructured: BprsProfile = {
    ...profile,
    penjualan: [
      { nama: "Sembako", hppPersen: 0.55, bulan: [{ hari: 26, omzetHarian: 700_000 }, { hari: 27, omzetHarian: 720_000 }, { hari: 25, omzetHarian: 690_000 }] },
      { nama: "Minuman", hppPersen: 0.4, bulan: [{ hari: 26, omzetHarian: 300_000 }, { hari: 27, omzetHarian: 280_000 }, { hari: 25, omzetHarian: 310_000 }] },
    ],
    tenagaKerjaJumlah: 2,
    tenagaKerjaUpah: 1_500_000,
    biayaUsaha: [{ nama: "Sewa kios", nominal: 1_000_000 }, { nama: "Listrik dan air", nominal: 400_000 }, { nama: "Transportasi", nominal: 300_000 }],
    rumahTangga: { belanja: 1_500_000, pendidikan: 500_000, listrikAir: 300_000, telepon: 150_000, lainnya: [{ nama: "Arisan", nominal: 100_000 }] },
    pendapatanLain: [{ nama: "Gaji pasangan", nominal: 2_000_000 }],
    biayaLain: [{ nama: "Iuran BPJS", nominal: 200_000 }],
    fasilitasBank: [
      { pemilik: "nasabah", namaBank: "BRI", plafond: 20_000_000, marginTahunan: 0.18, tanggalMulai: "2025-04-10", tanggalAkhir: "2027-04-10", jenisMargin: "Flat", kol: 1, dilunasi: "Tidak", pangsa: "Modal Kerja" },
      { pemilik: "nasabah", namaBank: "Mandiri", plafond: 10_000_000, marginTahunan: 0.12, tanggalMulai: "2025-01-15", tanggalAkhir: "2028-01-15", jenisMargin: "Efektif", kol: 1, dilunasi: "Tidak" },
      { pemilik: "nasabah", namaBank: "Koperasi", plafond: 5_000_000, marginTahunan: 0.2, tanggalMulai: "2025-06-01", tanggalAkhir: "2026-12-01", jenisMargin: "Flat", kol: 1, dilunasi: "Ya" },
      { pemilik: "pasangan", namaBank: "BJB", plafond: 6_000_000, marginTahunan: 0.15, tanggalMulai: "2026-02-20", tanggalAkhir: "2027-02-20", jenisMargin: "Flat", kol: 1, dilunasi: "Tidak" },
    ],
  };

  it("matches Excel for a fully itemised Fluktuatif workbook (80.025, A-, Layak)", () => {
    // LibreOffice: Usulan B102 = 80.025, AA88 = 1.85261719716627, AA87 = 1.28901347451429,
    // N26 = 26.000.000, N27 = 13.144.500, N35 = 5.325.225, N38 = 1.800.000, N39 = 2.040.476,43.
    const result = computeBprsScore(flukStructured, app, now);
    expect(result.score).toBeCloseTo(80.025, 6);
    expect(result.rating).toBe("A-");
    expect(result.coverageRatio).toBeCloseTo(1.85261719716627, 8);
    expect(result.coverageThreshold).toBeCloseTo(1.28901347451429, 8);
    expect(result.netProfit).toBeCloseTo(5_325_225, 2);
    const fin = fluktuatifFinancials(flukStructured, app);
    expect(fin.salesTotal).toBeCloseTo(26_000_000, 4);
    expect(fin.hppTotal).toBeCloseTo(13_144_500, 4);
    expect(fin.bankInstallment).toBeCloseTo(2_040_476.43146185, 4);
  });

  it("uses the template formulas for Flat, Efektif and paid-off facilities", () => {
    const [bri, mandiri, koperasi, bjb] = flukStructured.fasilitasBank!;
    expect(facilityInstallment(bri!)).toBeCloseTo(1_133_333.33333333, 4); // 20 jt / 24 + 20 jt x 18% / 12
    expect(facilityInstallment(mandiri!)).toBeCloseTo(332_143.098128512, 4); // PMT(1%, 36, -10 jt)
    expect(facilityInstallment(koperasi!)).toBe(0); // dilunasi dari pembiayaan baru
    expect(facilityInstallment(bjb!)).toBeCloseTo(575_000, 6);
    expect(datedifMonths("2025-01-31", "2025-02-28")).toBe(0);
    expect(datedifMonths("2025-01-15", "2028-01-15")).toBe(36);
  });

  it("keeps the lump fallback when only part of the breakdown is given (82.025)", () => {
    // Tanpa produk dan fasilitas: omzet SSCI satu baris, biaya SSCI dikurangi upah, angsuran existing di biaya lain-lain.
    // LibreOffice: B102 = 82.025, AA88 = 4.81846153846154, AA87 = 1.41809290953545.
    const partial: BprsProfile = {
      ...profile, tenagaKerjaJumlah: 3, tenagaKerjaUpah: 1_200_000,
      pendapatanLain: [{ nama: "Sewa kamar", nominal: 800_000 }, { nama: "Ojek", nominal: 500_000 }], biayaLain: [{ nama: "Iuran", nominal: 150_000 }],
    };
    const result = computeBprsScore(partial, app, now);
    expect(result.score).toBeCloseTo(82.025, 6);
    expect(result.coverageRatio).toBeCloseTo(4.81846153846154, 8);
    expect(result.coverageThreshold).toBeCloseTo(1.41809290953545, 8);
    const cells = buildFluktuatifCells(app, partial, now)[SHEET.keuangan]!;
    expect(cells.M123).toBe(14_400_000);
    expect(cells.T145).toBe(1_150_000);
    expect(cells.J145).toContain("angsuran pembiayaan existing");
  });

  it("writes the itemised structure into the Fluktuatif cells the formulas read", () => {
    const sheets = buildFluktuatifCells(app, { ...flukStructured, kotaTandaTangan: "Banjaran", kepalaCabangNama: "Kepala", verifikatorNama: "Koordinator A" }, now);
    const keu = sheets[SHEET.keuangan]!;
    expect(keu.C92).toBe("Sembako");
    expect(keu.I92).toBe(700_000);
    expect(keu.W93).toBe(310_000);
    expect(keu.L93).toBe(26 * 300_000); // baris 2 berisi angka 0 di template, bukan rumus
    expect(keu.O100).toBe(0.55);
    expect(keu.M116).toBe(2);
    expect(keu.C125).toBe("Transportasi");
    expect(keu.M137).toBe(100_000);
    expect(keu.T145).toBe(200_000);
    expect(keu.B56).toBe("BRI");
    expect(keu.Y57).toBe("Efektif");
    expect(keu.AA58).toBe("Ya");
    expect(keu.B67).toBe("BJB");
    expect(keu.Q56).toEqual({ date: "2025-04-10" });
    expect(sheets[SHEET.jadang]!.A131).toBe("Banjaran, 7 Oktober 2026");
    expect(sheets[SHEET.keputusan]!.B90).toBe("Kepala");
    expect(sheets[SHEET.nonKeuangan]!.H134).toBe("Koordinator A");
    expect(sheets[SHEET.nonKeuangan]!.M111).toBe("(SKMHT)");
  });

  const fixApp: BprsExportApplication = {
    ...app, customerName: "Contoh Karyawan", monthlyRevenue: 3_968_000, monthlyExpenses: 1_000_000, existingDebt: 900_000,
    collateralValue: 0, requestedAmount: 45_000_000, financingTenor: 60, marginRate: 96, createdAt: "2025-05-15",
  };
  const fixBase: BprsProfile = {
    tanggalLahir: "1999-12-28", statusPerkawinan: "Lajang", tanggungan: "Tidak Mempunyai Tanggungan", pendidikanFix: "SMA",
    statusTempatTinggal: "Milik sendiri", statusKaryawan: "Tetap Swasta", reputasiFix: "Dikenal baik", suratKeteranganBekerja: "Tidak Ada",
    slipGaji: "Ada", rekeningGaji: "Ada", hubunganBank: "Nasabah/debitur bank 1 - 3 tahun", riwayatSlik: "Tidak pernah terlambat 12 bulan terakhir",
    pembiayaanKe: 2, potonganGaji: "0.4", gajiBulanan: 3_968_000, pengikatan: "Pengikatan Notaril", asuransiJiwa: "Asuransi Jiwa Syariah",
    asuransiAgunan: "Tidak Diasuransikan",
    agunanTanah: [{ jenisSurat: "Sertipikat Hak Milik", nomor: "1", atasNama: "X", luasTanah: 73, nilaiPasar: 198_142_857, persen: 0.7, pengikatan: "SKMHT" }],
  };
  const fixFacilities: BprsProfile["fasilitasBank"] = [
    { pemilik: "nasabah", namaBank: "BSI", plafond: 15_000_000, marginTahunan: 0.11, tanggalMulai: "2024-08-05", tanggalAkhir: "2027-08-05", jenisMargin: "Efektif", kol: 1, dilunasi: "Tidak" },
    { pemilik: "nasabah", namaBank: "Adira", plafond: 8_000_000, marginTahunan: 0.2, tanggalMulai: "2024-11-10", tanggalAkhir: "2026-11-10", jenisMargin: "Flat", kol: 1, dilunasi: "Tidak" },
    { pemilik: "pasangan", namaBank: "BJB", plafond: 4_000_000, marginTahunan: 0.15, tanggalMulai: "2025-01-01", tanggalAkhir: "2026-01-01", jenisMargin: "Flat", kol: 1, dilunasi: "Tidak" },
  ];
  const fixNow = new Date("2025-05-15T03:00:00Z");

  it("matches Excel for Fix Income bank rows instead of the SSCI installment (48.51, CCC)", () => {
    // LibreOffice: B71 = 48.51, AA59 = 1.41155674395511, N26 = 1.341.080,76 (rows 74, 75, 90).
    const result = computeFixIncomeScore({ ...fixBase, fasilitasBank: fixFacilities }, fixApp, fixNow);
    expect(result.score).toBeCloseTo(48.51, 6);
    expect(result.rating).toBe("CCC");
    expect(result.coverageRatio).toBeCloseTo(1.41155674395511, 8);
    expect(existingInstallment("fix_income", { fasilitasBank: fixFacilities }, fixApp)).toBeCloseTo(1_341_080.75675503, 4);
    const keu = buildFixIncomeCells(fixApp, { ...fixBase, fasilitasBank: fixFacilities }, fixNow)[FIX_SHEET.keuangan]!;
    expect(keu.B74).toBe("BSI");
    expect(keu.B75).toBe("Adira");
    expect(keu.B90).toBe("BJB");
    expect(keu.F74).toBe(15_000_000); // bukan fasilitas sintetis 12 bulan
  });

  it("adds side-business profit to the Fix Income RPC like Excel (78.3, threshold 1.7757)", () => {
    // LibreOffice: B71 = 78.3, AA59 = 2.5468140617434, AA58 = 1.77568169529696, AA54 = 7.159.300, M65 = 659.300.
    const withSide: BprsProfile = {
      ...fixBase, gajiBulanan: 6_500_000, fasilitasBank: fixFacilities,
      penjualan: [{ nama: "Jualan online pasangan", hppPersen: 0.7, bulan: [{ hari: 20, omzetHarian: 150_000 }, { hari: 22, omzetHarian: 140_000 }, { hari: 21, omzetHarian: 160_000 }] }],
      tenagaKerjaJumlah: 0, biayaUsaha: [{ nama: "Ongkos kirim", nominal: 150_000 }, { nama: "Kuota internet", nominal: 100_000 }],
    };
    expect(fixSideBusiness(withSide).netProfit).toBeCloseTo(659_300, 4);
    const result = computeFixIncomeScore(withSide, fixApp, fixNow);
    expect(result.score).toBeCloseTo(78.3, 6);
    expect(result.coverageRatio).toBeCloseTo(2.5468140617434, 8);
    expect(result.coverageThreshold).toBeCloseTo(1.77568169529696, 8);
    expect(result.netProfit).toBeCloseTo(7_159_300, 4);
  });

  it("splits the Fix Income background into one line per row and fills the signature blocks", () => {
    const text = Array.from({ length: 40 }, (_, i) => `kalimat${i}`).join(" ");
    const sheets = buildFixIncomeCells(fixApp, { ...fixBase, latarBelakang: text, kotaTandaTangan: "Banjaran", namaAo: "AO", mengetahuiNama: "Koord", kabagMarketingNama: "Kabag", verifikatorNama: "MB" }, fixNow);
    const nonKeu = sheets[FIX_SHEET.nonKeuangan]!;
    const lines = Array.from({ length: 10 }, (_, i) => nonKeu[`B${5 + i}`]).filter(Boolean) as string[];
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(text);
    expect(lines.every(l => l.length <= 120)).toBe(true);
    expect(wrapLines("a b c d e f", 3, 2)).toEqual(["a b", "c d e f"]);
    expect(sheets[FIX_SHEET.rekomendasi]!.A23).toBe("Banjaran, 15 Mei 2025");
    expect(sheets[FIX_SHEET.keputusan]).toMatchObject({ A70: "Banjaran, 15 Mei 2025", C75: "AO", K75: "Koord", R75: "Kabag" });
    expect(sheets[FIX_SHEET.usulan]!.B101).toBe("MB");
  });

  it("reports what is still empty and reaches 100% for a demo scenario", () => {
    const empty = excelCompleteness("fluktuatif", {}, app);
    expect(empty.filled).toBeLessThan(empty.total);
    expect(empty.missing.find(g => g.sheet === "Aspek Keuangan")?.items.map(i => i.key)).toContain("penjualan");
    expect(empty.items.every(i => i.tab)).toBe(true);
    const seeded = (seed: number) => () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (const [segment, seed] of [["umkm", 7], ["karyawan_swasta", 1003]] as const) {
      const s = buildDemoScenario({ segment, rng: seeded(seed), today: new Date(2026, 9, 8) });
      const demoApp = {
        businessAge: Number(s.business.businessAge), monthlyRevenue: Number(s.finance.monthlyRevenue), monthlyExpenses: Number(s.finance.monthlyExpenses),
        existingDebt: Number(s.finance.existingDebt), collateralValue: Number(s.finance.collateralValue), requestedAmount: Number(s.finance.requestedAmount),
        financingTenor: Number(s.finance.financingTenor), marginRate: Number(s.finance.marginRate), financingAkad: "murabahah",
      };
      const result = excelCompleteness(templateFor(s.profile, s.incomeSourceType), s.profile, demoApp);
      expect(result.missing).toEqual([]);
      expect(result.filled).toBe(result.total);
    }
  });

  it("matches Excel for demo exports (83.125 and 81.375 Fluktuatif, 88.375 and 91.4375 Fix Income)", () => {
    // Acuan: fillBprsWorkbook untuk skenario demo berikut, dihitung ulang dengan LibreOffice Calc.
    const seeded = (seed: number) => () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const today = new Date(2026, 9, 8, 10);
    const expected: Array<[string, number, number, number]> = [["umkm", 7, 83.125, 3.20487250086475], ["umkm", 42, 81.375, 2.72722266772981], ["karyawan_swasta", 1003, 88.375, 6.70422535211268], ["guru_sertifikasi", 5010, 91.4375, 6.57013574660634]];
    for (const [segment, seed, score, coverage] of expected) {
      const s = buildDemoScenario({ segment, rng: seeded(seed), today });
      const demoApp = {
        businessAge: Number(s.business.businessAge), monthlyRevenue: Number(s.finance.monthlyRevenue), monthlyExpenses: Number(s.finance.monthlyExpenses),
        existingDebt: Number(s.finance.existingDebt), collateralValue: Number(s.finance.collateralValue), requestedAmount: Number(s.finance.requestedAmount),
        financingTenor: Number(s.finance.financingTenor), marginRate: Number(s.finance.marginRate), financingAkad: "murabahah",
      };
      const result = scoreForTemplate(templateFor(s.profile, s.incomeSourceType), s.profile, demoApp, today);
      expect(result.score, `${segment} ${seed}`).toBeCloseTo(score, 6);
      expect(result.coverageRatio, `${segment} ${seed}`).toBeCloseTo(coverage, 8);
    }
  });
});
