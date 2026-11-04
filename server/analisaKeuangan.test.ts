import JSZip from "jszip";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AK_SHEET,
  ANALISA_KEUANGAN_TEMPLATE_MISSING,
  ANALISA_KEUANGAN_TEMPLATE_PATH,
  AnalisaKeuanganTemplateMissingError,
  LABA_RUGI_CELLS,
  NERACA_CELLS,
  buildAnalisaKeuanganCells,
  fillAnalisaKeuanganBuffer,
  fillAnalisaKeuanganWorkbook,
} from "./analisaKeuanganExcel";
import { XlsxWorkbook } from "./xlsxPatch";
import { ruleConsistencyIssues, type ApplicationSnapshot } from "./aiAssist";
import { computeCompleteness, nextAction } from "@shared/workflow";
import { buildDemoBadanScenario } from "@shared/demoBadan";
import type { FinancialStatements } from "@shared/financialStatements";

const statements: FinancialStatements = {
  previous: {
    label: "PER-DESEMBER 2024",
    neraca: { kas: 11, bank: 12, piutang: 13, persediaan: 14, tanahBangunan: 15, kendaraan: 16, peralatan: 17, asetLain: 18, hutangJangkaPendek: 19, hutangJangkaPanjang: 20, modalDisetor: 21, modalLain: 22, saldoLabaLalu: -23, labaBerjalan: 24 },
    labaRugi: { penjualan: 31, hpp: 32, biayaPenjualan: 33, biayaOperasional: 34, biayaBank: 35, biayaPajak: 36, biayaLainnya: 37 },
  },
  current: {
    label: "PER-DESEMBER 2025",
    neraca: { kas: 41, bank: 42, piutang: 43, persediaan: 44, tanahBangunan: 45, kendaraan: 46, peralatan: 47, asetLain: 48, hutangJangkaPendek: 49, hutangJangkaPanjang: 50, modalDisetor: 51, modalLain: 52, saldoLabaLalu: 53, labaBerjalan: 54 },
    labaRugi: { penjualan: 61, hpp: 62, biayaPenjualan: 63, biayaOperasional: 64, biayaBank: 65, biayaPajak: 66, biayaLainnya: 67 },
  },
  expectedSalesGrowth: 12,
  periodDays: 360,
};

const sheetXml = (rows: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;

/** Workbook kecil dengan nama sheet sama seperti ANALISA_KEUANGAN: sel isian bernilai 0, total berupa rumus. */
async function minimalTemplate(): Promise<Buffer> {
  const zip = new JSZip();
  const sheets = [AK_SHEET.neraca, AK_SHEET.labaRugi, "Pertumbuhan", "Rasio", "Keb Modal-A", AK_SHEET.kebModalB];
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`);
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((name, i) => `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets><calcPr calcId="191029"/></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join("")}</Relationships>`,
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    sheetXml(`<row r="2"><c r="A2" t="inlineStr"><is><t>PER-DESEMBER 2024</t></is></c></row><row r="5"><c r="E5" s="3"><v>0</v></c></row><row r="10"><c r="E10"><f>SUM(E5:E8)</f><v>0</v></c></row><row r="20"><c r="K20"><f>E20-J20</f><v>0</v></c></row>`),
  );
  zip.file("xl/worksheets/sheet2.xml", sheetXml(`<row r="5"><c r="D5"><v>0</v></c></row><row r="7"><c r="D7"><f>D5-D6</f><v>0</v></c></row>`));
  for (const n of [3, 4, 5]) zip.file(`xl/worksheets/sheet${n}.xml`, sheetXml(""));
  zip.file("xl/worksheets/sheet6.xml", sheetXml(`<row r="33"><c r="E33" t="inlineStr"><is><t>%</t></is></c></row>`));
  return zip.generateAsync({ type: "nodebuffer" });
}

const cellValue = (xml: string, address: string) => {
  const match = new RegExp(`<c r="${address}"[^>]*?(?:/>|>([\\s\\S]*?)</c>)`).exec(xml);
  if (!match) return undefined;
  const inner = match[1] ?? "";
  const text = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
  if (text) return text[1];
  const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
  return v ? Number(v[1]) : null;
};

describe("Excel Analisa Keuangan", () => {
  it("memetakan setiap pos ke sel workbook bank", () => {
    const cells = buildAnalisaKeuanganCells(statements);
    const neraca = cells[AK_SHEET.neraca]!;
    expect(neraca.A2).toBe("PER-DESEMBER 2024");
    expect(neraca.A25).toBe("PER-DESEMBER 2025");
    expect(neraca.E5).toBe(11);
    expect(neraca.E16).toBe(18);
    expect(neraca.J7).toBe(19);
    expect(neraca.J14).toBe(22);
    expect(neraca.J18).toBe(-23);
    expect(neraca.J19).toBe(24);
    expect(neraca.E28).toBe(41);
    expect(neraca.E39).toBe(48);
    expect(neraca.J30).toBe(49);
    expect(neraca.J36).toBe(51);
    expect(neraca.J37).toBe(52);
    expect(neraca.J41).toBe(53);
    expect(neraca.J42).toBe(54);
    const lr = cells[AK_SHEET.labaRugi]!;
    expect([lr.D5, lr.D6, lr.D13, lr.D14, lr.D15, lr.D16, lr.D17]).toEqual([31, 32, 33, 34, 35, 36, 37]);
    expect([lr.D30, lr.D31, lr.D38, lr.D39, lr.D40, lr.D41, lr.D42]).toEqual([61, 62, 63, 64, 65, 66, 67]);
    expect(cells[AK_SHEET.kebModalB]).toEqual({ E33: 0.12, I14: 360 });
    // Tidak ada sel yang dipetakan dua kali.
    const all = [...Object.values(NERACA_CELLS.previous), ...Object.values(NERACA_CELLS.current)];
    expect(new Set(all).size).toBe(all.length);
    const lrAll = [...Object.values(LABA_RUGI_CELLS.previous), ...Object.values(LABA_RUGI_CELLS.current)];
    expect(new Set(lrAll).size).toBe(lrAll.length);
  });

  it("mengisi workbook di memori tanpa menimpa rumus", async () => {
    const { buffer, skippedFormula } = await fillAnalisaKeuanganBuffer(await minimalTemplate(), statements);
    expect(skippedFormula).toEqual([]);
    const workbook = await XlsxWorkbook.load(buffer);
    const neraca = await workbook.readSheet(AK_SHEET.neraca);
    expect(cellValue(neraca, "E5")).toBe(11);
    expect(neraca).toMatch(/<c r="E5" s="3">/);
    expect(cellValue(neraca, "J18")).toBe(-23);
    expect(cellValue(neraca, "A25")).toBe("PER-DESEMBER 2025");
    expect(neraca).toContain("<f>SUM(E5:E8)</f>");
    const lr = await workbook.readSheet(AK_SHEET.labaRugi);
    expect(cellValue(lr, "D30")).toBe(61);
    expect(lr).toContain("<f>D5-D6</f>");
    const kebModal = await workbook.readSheet(AK_SHEET.kebModalB);
    expect(cellValue(kebModal, "E33")).toBe(0.12);
    expect(cellValue(kebModal, "I14")).toBe(360);
    const zip = await JSZip.loadAsync(buffer);
    expect(await zip.file("xl/workbook.xml")!.async("string")).toContain('fullCalcOnLoad="1"');
  });

  it("memberi pesan jelas bila template belum tersedia", async () => {
    await expect(fillAnalisaKeuanganWorkbook(statements, "/tidak/ada/analisa-keuangan.xlsx")).rejects.toBeInstanceOf(AnalisaKeuanganTemplateMissingError);
    expect(ANALISA_KEUANGAN_TEMPLATE_MISSING).toBe("Template Analisa Keuangan belum tersedia, hubungi admin");
  });

  it.skipIf(!existsSync(ANALISA_KEUANGAN_TEMPLATE_PATH))("template bank: semua sel isian bukan rumus", async () => {
    const { skippedFormula } = await fillAnalisaKeuanganWorkbook(statements);
    expect(skippedFormula).toEqual([]);
  });
});

describe("pemeriksaan aturan badan hukum", () => {
  const demo = buildDemoBadanScenario({ rng: () => 0.42, today: new Date(2026, 10, 4) });
  const app: ApplicationSnapshot = {
    customerName: demo.customer.customerName,
    customerId: demo.customer.customerId,
    businessName: demo.business.businessName,
    businessType: demo.business.businessType,
    businessAge: Number(demo.business.businessAge),
    address: demo.customer.address,
    monthlyRevenue: Number(demo.finance.monthlyRevenue),
    monthlyExpenses: Number(demo.finance.monthlyExpenses),
    existingDebt: Number(demo.finance.existingDebt),
    collateralValue: Number(demo.finance.collateralValue),
    requestedAmount: Number(demo.finance.requestedAmount),
    financingTenor: Number(demo.finance.financingTenor),
    marginRate: Number(demo.finance.marginRate),
    financingAkad: "murabahah",
    loanPurpose: demo.finance.loanPurpose,
    businessShariaCompliant: "yes",
    legalDocuments: [],
    productSegment: "non_perorangan",
    companyProfile: { ...demo.company, financials: demo.financials },
  };

  it("memeriksa NPWP dan NIB, bukan NIK 16 digit", () => {
    expect(ruleConsistencyIssues(app).filter(i => i.severity !== "rendah")).toEqual([]);
    const fields = ruleConsistencyIssues({ ...app, customerId: "123", companyProfile: { ...app.companyProfile, nib: undefined } }).map(i => i.field);
    expect(fields).toContain("NPWP");
    expect(fields).toContain("NIB");
    expect(fields).not.toContain("NIK");
  });

  it("menandai neraca tidak seimbang dan laporan kosong", () => {
    const fs = structuredClone(demo.financials);
    fs.current.neraca.kas = (fs.current.neraca.kas ?? 0) + 50_000_000;
    const issues = ruleConsistencyIssues({ ...app, companyProfile: { ...app.companyProfile, financials: fs } });
    expect(issues.find(i => i.field === "Neraca")?.severity).toBe("tinggi");
    expect(ruleConsistencyIssues({ ...app, companyProfile: { nib: "1234567890123" } }).some(i => i.field === "Laporan keuangan")).toBe(true);
  });

  it("alur kerja badan hukum mensyaratkan laporan keuangan sebelum penilaian", () => {
    const base = {
      status: "pending",
      track: "ringkas" as const,
      hasAssessment: false,
      documents: [{ documentType: "KTP", status: "uploaded" }],
      surveyPhotoCount: 0,
      openCustomerRequests: 0,
      blockingDataIssues: 0,
      bprsMissingCriteria: ["tidak dipakai"],
      badanUsaha: true,
    };
    const incomplete = computeCompleteness({ ...base, financialStatementsMissing: ["Neraca & laba rugi tahun lalu"] });
    expect(incomplete.items.some(i => i.key === "format_bprs")).toBe(false);
    expect(incomplete.readyToAssess).toBe(false);
    const action = nextAction({ stage: incomplete.stage, status: "pending", role: "maker", isOwnWork: true, completeness: incomplete });
    expect(action.title).toBe("Lengkapi laporan keuangan badan usaha");
    expect(action.tab).toBe("bprs");
    expect(computeCompleteness({ ...base, financialStatementsMissing: [] }).readyToAssess).toBe(true);
  });
});
