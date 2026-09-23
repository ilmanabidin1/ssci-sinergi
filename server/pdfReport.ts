import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Application, Assessment, Organization } from "../drizzle/schema";
import { evaluateBprsPolicy } from "@shared/bprsPolicy";

export interface PdfReportData {
  application: Application;
  assessment: Assessment;
  organization?: Organization | null;
}

type Doc = InstanceType<typeof PDFDocument>;

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

const C = {
  navy: "#14213d",
  navy2: "#1d2e52",
  gold: "#efb84b",
  goldDark: "#b7801a",
  goldSoft: "#fdf6e7",
  ivory: "#f7f8fb",
  line: "#e1e5ec",
  muted: "#60708c",
  soft: "#8e9cb4",
  text: "#1f2a44",
  royal: "#2458d6",
  slate: "#7d8fae",
  green: "#1f7a4d",
  greenSoft: "#e7f5ed",
  red: "#b42318",
  redSoft: "#fdecea",
  amberSoft: "#fff4dc",
};

const M = 40;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CW = PAGE_W - M * 2;
const BOTTOM = PAGE_H - 48;

const PILLAR_LABELS: Record<string, string> = {
  financial_health: "Kesehatan keuangan",
  debt_capacity: "Kapasitas utang",
  cash_flow: "Arus kas",
  collateral: "Agunan",
  business_compliance: "Kepatuhan usaha",
  transaction_compliance: "Kepatuhan transaksi",
  documentation: "Dokumentasi syariah",
  business_legality: "Legalitas usaha",
  document_completeness: "Kelengkapan dokumen",
  regulatory_compliance: "Kepatuhan regulasi",
};

function escapeText(value: unknown): string {
  return String(value ?? "")
    .replaceAll("\r", " ")
    .replaceAll("\t", " ");
}

function formatIdDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function formatIdMoney(value: string | number): string {
  return `Rp ${Number(value).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return Buffer.from(dataUrl, "base64");
  return Buffer.from(dataUrl.slice(commaIndex + 1), "base64");
}

function readLogoBuffer(logoUrl: string | null | undefined): Buffer | null {
  if (!logoUrl || !logoUrl.startsWith("/uploads/")) return null;
  const filename = logoUrl.replace("/uploads/", "");
  if (filename.endsWith(".svg")) return null;
  try {
    return readFileSync(join(UPLOAD_DIR, filename));
  } catch {
    return null;
  }
}

function readDefaultLogo(): Buffer | null {
  for (const dir of ["dist/public", "client/public"]) {
    try {
      return readFileSync(join(process.cwd(), dir, "logo-dark-bg.png"));
    } catch {
      continue;
    }
  }
  return null;
}

function classificationTone(classification: string) {
  if (classification === "Sangat Layak") return { bg: C.greenSoft, fg: C.green };
  if (classification === "Layak") return { bg: "#e1e8f4", fg: C.navy };
  if (classification === "Perlu Pengawasan") return { bg: C.amberSoft, fg: C.goldDark };
  return { bg: C.redSoft, fg: C.red };
}

export async function generatePdfReport(data: PdfReportData): Promise<Buffer> {
  const { application, assessment, organization } = data;

  const verificationString = `SSCI:${assessment.id}:${assessment.modelVersion}:${application.id}`;
  const qrDataUrl = await QRCode.toDataURL(verificationString, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: { dark: C.navy, light: "#ffffff" },
  });
  const qrBuffer = dataUrlToBuffer(qrDataUrl);
  const orgLogo = readLogoBuffer(organization?.logoUrl);
  const logoBuffer = orgLogo ?? readDefaultLogo();

  const bprsEval = evaluateBprsPolicy({
    requestedAmount: Number(application.requestedAmount),
    collateralValue: Number(application.collateralValue),
    monthlyRevenue: Number(application.monthlyRevenue),
    monthlyExpenses: Number(application.monthlyExpenses),
    existingDebt: Number(application.existingDebt),
    tenorMonths: Number(application.financingTenor),
    marginRate: Number(application.marginRate),
    isRelatedParty: application.isRelatedParty === "yes",
    relatedPartyRelation: application.relatedPartyRelation || undefined,
    isNonIndividual: application.businessType?.toLowerCase().includes("pt") ||
      application.businessType?.toLowerCase().includes("cv") ||
      application.businessType?.toLowerCase().includes("badan"),
  });

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: M, bottom: M, left: M, right: M },
      bufferPages: true,
      compress: false,
      info: { Title: "Laporan Penilaian SSCI", Author: organization?.name || "SSCI" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const orgName = escapeText(organization?.name || "SSCI BPRS");
    const orgLegalName = organization?.legalName && organization.legalName !== organization.name ? escapeText(organization.legalName) : "";
    const orgContact = [organization?.address, organization?.phone ? `Telp: ${organization.phone}` : ""].filter(Boolean).map(escapeText).join("  |  ");
    const ticket = `SSCI-${String(application.id).padStart(5, "0")}`;

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > BOTTOM) {
        doc.addPage();
        drawRunningHeader(doc, orgName, ticket);
      }
    };

    // Cover header band
    doc.rect(0, 0, PAGE_W, 104).fill(C.navy);
    drawPattern(doc, 0, 0, PAGE_W, 104);
    doc.rect(0, 104, PAGE_W, 2.5).fill(C.gold);
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, M, 26, { fit: [130, 52], valign: "center" });
      } catch {
        void 0;
      }
    }
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#ffffff")
      .text(orgName, M + 180, 30, { width: CW - 180, align: "right" });
    doc.font("Helvetica").fontSize(8.5).fillColor("#b9c4d8");
    if (orgLegalName) doc.text(orgLegalName, M + 180, doc.y + 2, { width: CW - 180, align: "right" });
    if (orgContact) doc.text(orgContact, M + 180, doc.y + 2, { width: CW - 180, align: "right" });

    // Title block
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.goldDark)
      .text("LAPORAN RESMI  |  SUSTAINABLE SHARIA CREDITWORTHINESS INDEX (SSCI)", M, 128, { width: CW, characterSpacing: 1.2 });
    doc.font("Times-Bold").fontSize(19).fillColor(C.navy)
      .text("LAPORAN PENILAIAN KELAYAKAN PEMBIAYAAN SYARIAH", M, 144, { width: CW - 130 });
    const titleBottom = doc.y;
    // Reference box
    doc.roundedRect(PAGE_W - M - 118, 140, 118, 46, 6).fill(C.goldSoft);
    doc.font("Helvetica").fontSize(7).fillColor(C.goldDark).text("NO. REFERENSI", PAGE_W - M - 108, 148, { width: 100, characterSpacing: 0.8 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.navy).text(ticket, PAGE_W - M - 108, 160, { width: 100 });
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(formatIdDate(assessment.assessedAt), PAGE_W - M - 108, 174, { width: 100 });
    doc.font("Helvetica").fontSize(9).fillColor(C.muted)
      .text(`Tanggal penilaian: ${formatIdDate(assessment.assessedAt)}`, M, Math.max(titleBottom + 4, 170), { width: CW - 130 });

    doc.y = 208;

    // Score summary card
    drawScoreCard(doc, assessment);

    // 01 Customer information
    sectionTitle(doc, "01", "INFORMASI NASABAH", ensureSpace);
    renderGrid(doc, [
      ["Nama lengkap", escapeText(application.customerName)],
      ["NIK / ID nasabah", escapeText(application.customerId)],
      ["Nama usaha", escapeText(application.businessName)],
      ["Jenis usaha", escapeText(application.businessType)],
      ["Telepon", escapeText(application.phone)],
      ["Email", escapeText(application.email || "-")],
      ["Alamat", escapeText(application.address)],
    ], ensureSpace);

    // 02 Pillar breakdown
    const breakdown = assessment.scoreBreakdown;
    if (breakdown) {
      sectionTitle(doc, "02", "RINCIAN PILAR PENILAIAN", ensureSpace);
      const groups: Array<[string, string, Record<string, number>]> = [
        ["Keuangan Berkelanjutan", C.royal, breakdown.sustainableFinance],
        ["Kepatuhan Syariah", C.gold, breakdown.sharia],
        ["Legalitas", C.slate, breakdown.legal],
      ];
      for (const [groupName, color, items] of groups) {
        ensureSpace(18 + Object.keys(items).length * 16);
        const y = doc.y;
        doc.rect(M, y, 3, 12).fill(color);
        doc.font("Helvetica-Bold").fontSize(9).fillColor(C.navy).text(groupName, M + 10, y + 1.5, { width: CW - 10 });
        doc.y = y + 18;
        const max = Math.max(...Object.values(items), 1);
        for (const [key, value] of Object.entries(items)) {
          const ry = doc.y;
          doc.font("Helvetica").fontSize(9).fillColor(C.text).text(PILLAR_LABELS[key] ?? key, M + 10, ry, { width: 170 });
          const barX = M + 190;
          const barW = CW - 190 - 60;
          doc.roundedRect(barX, ry + 3, barW, 5, 2.5).fill("#e6ebf3");
          doc.roundedRect(barX, ry + 3, Math.max(4, (barW * Number(value)) / max), 5, 2.5).fill(color);
          doc.font("Helvetica-Bold").fontSize(9).fillColor(C.navy).text(`${value} poin`, PAGE_W - M - 55, ry, { width: 55, align: "right" });
          doc.y = ry + 16;
        }
        doc.y += 6;
      }
    }

    // 03 Financial data
    sectionTitle(doc, "03", "DATA KEUANGAN & PEMBIAYAAN", ensureSpace);
    renderTable(doc, ["Keterangan", "Nilai"], [
      ["Pendapatan bulanan", formatIdMoney(application.monthlyRevenue)],
      ["Pengeluaran bulanan", formatIdMoney(application.monthlyExpenses)],
      ["Angsuran existing per bulan", formatIdMoney(application.existingDebt)],
      ["Nilai agunan", formatIdMoney(application.collateralValue)],
      ["Pembiayaan diajukan", formatIdMoney(application.requestedAmount)],
      ["Tenor", `${application.financingTenor} bulan`],
      ["Skema akad", (application.financingAkad || "murabahah").toUpperCase()],
      ["Margin / ujrah", `${application.marginRate}%`],
    ], ensureSpace);
    doc.y += 8;
    renderCallout(doc, "Tujuan pembiayaan", escapeText(application.loanPurpose), C.gold, C.goldSoft, ensureSpace);

    // 04 Analysis
    sectionTitle(doc, "04", "ANALISIS & REKOMENDASI", ensureSpace);
    renderCallout(doc, "Kekuatan", escapeText(assessment.strengths || "-"), C.green, C.greenSoft, ensureSpace);
    renderCallout(doc, "Faktor Risiko", escapeText(assessment.riskFactors || "-"), C.goldDark, C.amberSoft, ensureSpace);
    renderCallout(doc, "Rekomendasi", escapeText(assessment.recommendations), C.navy, "#eef2f8", ensureSpace);

    // 05 BPRS policy
    sectionTitle(doc, "05", "KESESUAIAN KEBIJAKAN PEMBIAYAAN BPRS (KPB)", ensureSpace);
    const bprsRows: Array<[string, string, string?]> = [
      ["Kapasitas angsuran (DSR)", `${bprsEval.dsrRatio}%  (${bprsEval.isDsrCompliant ? "Memenuhi maks 40%" : "Melebihi batas 40%"})`, bprsEval.isDsrCompliant ? C.green : C.red],
      ["Estimasi angsuran baru", formatIdMoney(bprsEval.monthlyInstallment)],
      ["Kewenangan memutus", `${bprsEval.approvalAuthority.roleTitle} (${bprsEval.approvalAuthority.description})`],
      ["Rekomendasi hirarki", bprsEval.approvalAuthority.subordinateApprovalRequired],
      ["Ketentuan taksasi agunan", bprsEval.appraisalRequirement.label],
      ["Opini Kepatuhan & MR", bprsEval.needsComplianceOpinion ? "Wajib (Plafon >= Rp 100 Juta)" : "Tidak dipersyaratkan khusus"],
      ["Opini Legal", bprsEval.needsLegalOpinion ? "Wajib (Plafon >= Rp 250 Juta / Badan Usaha)" : "Standar verifikasi legal"],
    ];
    if (application.financingAkad === "multijasa") {
      bprsRows.push(["Rincian jasa", `${escapeText(application.multijasaServiceProvider || "-")} (${escapeText(application.multijasaSourceObject || "-")})`]);
      bprsRows.push(["Nilai jasa & ujrah", `Biaya: ${formatIdMoney(application.multijasaServiceCost || 0)}, Ujrah: ${formatIdMoney(application.multijasaUjrahAmount || 0)}`]);
    }
    renderTable(doc, ["Parameter pedoman KPB", "Status / rekomendasi"], bprsRows, ensureSpace);

    // 06 Audit metadata
    sectionTitle(doc, "06", "METADATA AUDIT", ensureSpace);
    renderGrid(doc, [
      ["ID penilaian", String(assessment.id)],
      ["ID pengajuan", String(application.id)],
      ["Versi model", escapeText(assessment.modelVersion)],
      ["Model rekomendasi", escapeText(assessment.recommendationModel || "Fallback aturan")],
      ["Tanggal penilaian", formatIdDate(assessment.assessedAt)],
    ], ensureSpace);

    // Committee disposition sheet
    const needsDisposition = bprsEval.isRelatedParty || bprsEval.needsComplianceOpinion || bprsEval.needsLegalOpinion || Number(application.requestedAmount) >= 25_000_000;
    if (needsDisposition) {
      doc.addPage();
      drawRunningHeader(doc, orgName, ticket);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.goldDark)
        .text("LAMPIRAN EVALUASI KEBIJAKAN PEMBIAYAAN BPRS (KPB)", M, doc.y, { width: CW, align: "center", characterSpacing: 1.2 });
      doc.font("Times-Bold").fontSize(16).fillColor(C.navy)
        .text("LEMBAR DISPOSISI KOMITE PEMBIAYAAN & OPINI RISIKO", M, doc.y + 4, { width: CW, align: "center" });
      const ry = doc.y + 8;
      doc.rect(PAGE_W / 2 - 30, ry, 60, 1.5).fill(C.gold);
      doc.y = ry + 14;

      if (bprsEval.isRelatedParty) {
        const y = doc.y;
        doc.roundedRect(M, y, CW, 38, 6).fill(C.redSoft);
        doc.rect(M, y, 3, 38).fill(C.red);
        doc.font("Helvetica-Bold").fontSize(9).fillColor(C.red).text("PERHATIAN: CALON NASABAH PIHAK TERKAIT BPRS", M + 14, y + 8, { width: CW - 28 });
        doc.font("Helvetica").fontSize(8.5).fillColor(C.red)
          .text(`Hubungan: ${escapeText(application.relatedPartyRelation || "-")}. Wajib persetujuan Direktur Bisnis & minimal 1 Dewan Komisaris.`, M + 14, doc.y + 2, { width: CW - 28 });
        doc.y = y + 50;
      }

      sectionTitle(doc, "1", "OPINI KEPATUHAN & MANAJEMEN RISIKO", ensureSpace);
      renderOpinionBox(doc,
        bprsEval.needsComplianceOpinion
          ? "Status: WAJIB (Plafon >= Rp 100.000.000,-). PE Kepatuhan & Manajemen Risiko wajib memberikan analisis independen."
          : "Status: Opsional/Standar (Plafon < Rp 100.000.000,-).",
        bprsEval.needsComplianceOpinion,
        "Catatan / rekomendasi opini Kepatuhan & Manajemen Risiko (diisi oleh PE Kepatuhan & MR):");

      sectionTitle(doc, "2", "OPINI LEGAL PEMBIAYAAN", ensureSpace);
      renderOpinionBox(doc,
        bprsEval.needsLegalOpinion
          ? "Status: WAJIB (Plafon >= Rp 250.000.000,- atau Pembiayaan Non-Perorangan). Bagian Legal wajib memeriksa keabsahan subjek & objek akad."
          : "Status: Standar Verifikasi Administrasi Pembiayaan & Legal.",
        bprsEval.needsLegalOpinion,
        "Catatan / rekomendasi opini Legal (diisi oleh Pejabat Legal):");

      sectionTitle(doc, "3", "KEPUTUSAN KOMITE PEMBIAYAAN", ensureSpace);
      const roles = bprsEval.isRelatedParty
        ? [
            ["Pemutus 1 (Inisiasi)", "Account Officer / Ka. Marketing"],
            ["Pemutus 2 (Direksi)", "Direktur yang Membawahi Bisnis"],
            ["Pemutus 3 (Dewan Komisaris)", "Anggota Dewan Komisaris (Non-Pemohon)"],
          ]
        : [
            ["Pemutus 1 (Inisiasi)", "Account Officer / Ka. Marketing"],
            ["Pemutus 2 (Review)", "Ka. Kantor Cabang / Koordinator"],
            ["Pemutus 3 (Final)", bprsEval.approvalAuthority.roleTitle],
          ];
      renderSignatureBoxes(doc, roles, true);
    } else {
      ensureSpace(150);
      doc.y += 14;
    }

    // Signatures
    ensureSpace(130);
    doc.y += 6;
    renderSignatureBoxes(doc, [["Disiapkan oleh,", "Analis / Account Officer"], ["Disetujui oleh,", "Pejabat Pemutus"]], false);

    // Verification
    ensureSpace(110);
    doc.y += 10;
    const vy = doc.y;
    doc.roundedRect(M, vy, CW, 92, 8).fill(C.ivory);
    doc.roundedRect(M, vy, CW, 92, 8).lineWidth(0.6).strokeColor(C.line).stroke();
    try {
      doc.image(qrBuffer, M + 12, vy + 10, { fit: [72, 72] });
    } catch {
      void 0;
    }
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.goldDark).text("VERIFIKASI KEASLIAN", M + 100, vy + 16, { width: CW - 112, characterSpacing: 1 });
    doc.font("Helvetica").fontSize(9).fillColor(C.text).text("Pindai kode QR untuk memverifikasi keaslian laporan.", M + 100, doc.y + 4, { width: CW - 112 });
    doc.font("Courier-Bold").fontSize(9).fillColor(C.navy).text(escapeText(verificationString), M + 100, doc.y + 4, { width: CW - 112 });
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(C.muted)
      .text("Laporan operasional pendukung analisis, bukan keputusan pembiayaan final.", M + 100, doc.y + 8, { width: CW - 112 });
    doc.y = vy + 100;

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const prevBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const fy = PAGE_H - 28;
      doc.rect(M, fy - 8, CW, 0.6).fill(C.line);
      doc.font("Helvetica").fontSize(7.5).fillColor(C.soft)
        .text(`${orgName}  |  Laporan SSCI ${ticket}  |  Rahasia`, M, fy, { width: CW - 80, lineBreak: false });
      doc.text(`Halaman ${i - range.start + 1} dari ${range.count}`, PAGE_W - M - 80, fy, { width: 80, align: "right", lineBreak: false });
      doc.page.margins.bottom = prevBottom;
    }

    doc.end();
  });
}

function drawPattern(doc: Doc, x: number, y: number, w: number, h: number) {
  doc.save();
  doc.rect(x, y, w, h).clip();
  doc.strokeColor(C.gold).strokeOpacity(0.07).lineWidth(0.6);
  for (let cx = x + 20; cx < x + w + 40; cx += 40) {
    for (let cy = y + 20; cy < y + h + 40; cy += 40) {
      doc.polygon([cx, cy - 14], [cx + 14, cy], [cx, cy + 14], [cx - 14, cy]).stroke();
      doc.circle(cx, cy, 4).stroke();
    }
  }
  doc.restore();
  doc.strokeOpacity(1);
}

function drawRunningHeader(doc: Doc, orgName: string, ticket: string) {
  doc.rect(0, 0, PAGE_W, 34).fill(C.navy);
  doc.rect(0, 34, PAGE_W, 1.5).fill(C.gold);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff").text(orgName, M, 13, { width: CW / 2, lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor(C.gold).text(`Laporan SSCI  |  ${ticket}`, M + CW / 2, 13, { width: CW / 2, align: "right", lineBreak: false });
  doc.y = 56;
}

function drawScoreCard(doc: Doc, assessment: Assessment) {
  const y = doc.y;
  const h = 132;
  doc.roundedRect(M, y, CW, h, 10).fill(C.ivory);
  doc.roundedRect(M, y, CW, h, 10).lineWidth(0.6).strokeColor(C.line).stroke();

  // Navy score tile
  const tileW = 150;
  doc.roundedRect(M, y, tileW, h, 10).fill(C.navy);
  drawPattern(doc, M, y, tileW, h);
  const total = Number(assessment.totalScore);
  const cx = M + tileW / 2;
  const cy = y + 56;
  const r = 36;
  doc.circle(cx, cy, r).lineWidth(6).strokeColor(C.navy2).stroke();
  const pct = Math.max(0.001, Math.min(0.999, total / 100));
  const end = -Math.PI / 2 + pct * Math.PI * 2;
  const sx = cx;
  const sy = cy - r;
  const ex = cx + r * Math.cos(end);
  const ey = cy + r * Math.sin(end);
  doc.path(`M ${sx} ${sy} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${ex} ${ey}`).lineWidth(6).lineCap("round").strokeColor(C.gold).stroke();
  doc.lineCap("butt");
  doc.font("Times-Bold").fontSize(24).fillColor("#ffffff").text(total.toFixed(1), M, cy - 12, { width: tileW, align: "center" });
  doc.font("Helvetica").fontSize(7).fillColor("#b9c4d8").text("dari 100", M, cy + 12, { width: tileW, align: "center" });
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.gold).text("TOTAL SKOR SSCI", M, y + h - 26, { width: tileW, align: "center", characterSpacing: 1.2 });

  // Right side
  const rx = M + tileW + 22;
  const rw = CW - tileW - 44;
  doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text("KLASIFIKASI", rx, y + 18, { width: rw, characterSpacing: 1 });
  const cls = escapeText(assessment.classification);
  const tone = classificationTone(assessment.classification);
  doc.font("Helvetica-Bold").fontSize(10);
  const pillW = doc.widthOfString(cls) + 22;
  doc.roundedRect(rx, y + 30, pillW, 18, 9).fill(tone.bg);
  doc.fillColor(tone.fg).text(cls, rx + 11, y + 34.5, { width: pillW, lineBreak: false });

  const pillars: Array<[string, number, number, string]> = [
    ["Keuangan berkelanjutan", Number(assessment.sustainableFinanceScore), 55, C.royal],
    ["Kepatuhan syariah", Number(assessment.shariaScore), 25, C.gold],
    ["Legalitas", Number(assessment.legalScore), 20, C.slate],
  ];
  let py = y + 60;
  for (const [label, value, max, color] of pillars) {
    doc.font("Helvetica").fontSize(8.5).fillColor(C.text).text(label, rx, py, { width: rw - 80, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.navy).text(`${value.toFixed(2)} / ${max}`, rx + rw - 80, py, { width: 80, align: "right", lineBreak: false });
    doc.roundedRect(rx, py + 12, rw, 4.5, 2.25).fill("#e6ebf3");
    doc.roundedRect(rx, py + 12, Math.max(4, rw * Math.min(1, value / max)), 4.5, 2.25).fill(color);
    py += 22;
  }
  doc.y = y + h + 8;
}

function sectionTitle(doc: Doc, num: string, text: string, ensureSpace: (n: number) => void) {
  ensureSpace(60);
  doc.y += 14;
  const y = doc.y;
  doc.font("Times-Italic").fontSize(11).fillColor(C.goldDark).text(num, M, y, { width: 22, lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.navy).text(text, M + 24, y + 0.5, { width: CW - 24, characterSpacing: 0.6 });
  const ly = doc.y + 5;
  doc.rect(M, ly, 40, 1.5).fill(C.gold);
  doc.rect(M + 40, ly + 0.5, CW - 40, 0.5).fill(C.line);
  doc.y = ly + 10;
}

function renderGrid(doc: Doc, rows: Array<[string, string]>, ensureSpace: (n: number) => void) {
  const colW = (CW - 20) / 2;
  for (let i = 0; i < rows.length; i += 2) {
    const pair = rows.slice(i, i + 2);
    doc.font("Helvetica").fontSize(9.5);
    const heights = pair.map(([, v]) => doc.heightOfString(v, { width: colW }));
    const rowH = 14 + Math.max(...heights);
    ensureSpace(rowH + 6);
    const y = doc.y;
    pair.forEach(([label, value], idx) => {
      const x = M + idx * (colW + 20);
      doc.font("Helvetica").fontSize(7).fillColor(C.soft).text(label.toUpperCase(), x, y, { width: colW, characterSpacing: 0.8 });
      doc.font("Helvetica").fontSize(9.5).fillColor(C.text).text(value, x, y + 11, { width: colW });
    });
    doc.y = y + rowH + 6;
  }
}

function renderTable(doc: Doc, headers: [string, string], rows: Array<[string, string, string?]>, ensureSpace: (n: number) => void) {
  const labelW = CW * 0.45;
  const valueW = CW - labelW;
  ensureSpace(46);
  const hy = doc.y;
  doc.roundedRect(M, hy, CW, 20, 4).fill(C.navy);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff");
  doc.text(headers[0].toUpperCase(), M + 10, hy + 6.5, { width: labelW - 10, characterSpacing: 0.8, lineBreak: false });
  doc.fillColor(C.gold).text(headers[1].toUpperCase(), M + labelW, hy + 6.5, { width: valueW - 10, align: "right", characterSpacing: 0.8, lineBreak: false });
  doc.y = hy + 20;
  rows.forEach(([label, value, color], idx) => {
    doc.font("Helvetica").fontSize(9);
    const h = Math.max(doc.heightOfString(label, { width: labelW - 10 }), doc.heightOfString(value, { width: valueW - 20 })) + 10;
    ensureSpace(h);
    const y = doc.y;
    if (idx % 2 === 1) doc.rect(M, y, CW, h).fill(C.ivory);
    doc.font("Helvetica").fontSize(9).fillColor(C.muted).text(label, M + 10, y + 5, { width: labelW - 10 });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(color ?? C.navy).text(value, M + labelW, y + 5, { width: valueW - 10, align: "right" });
    doc.rect(M, y + h - 0.5, CW, 0.5).fill(C.line);
    doc.y = y + h;
  });
}

function renderCallout(doc: Doc, title: string, body: string, accent: string, bg: string, ensureSpace: (n: number) => void) {
  doc.font("Helvetica").fontSize(9.5);
  const bodyH = doc.heightOfString(body, { width: CW - 32, lineGap: 2 });
  const h = bodyH + 34;
  ensureSpace(h + 8);
  const y = doc.y;
  doc.roundedRect(M, y, CW, h, 6).fill(bg);
  doc.rect(M, y, 3, h).fill(accent);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(accent).text(title.toUpperCase(), M + 16, y + 10, { width: CW - 32, characterSpacing: 1 });
  doc.font("Helvetica").fontSize(9.5).fillColor(C.text).text(body, M + 16, y + 24, { width: CW - 32, lineGap: 2 });
  doc.y = y + h + 8;
}

function renderOpinionBox(doc: Doc, status: string, required: boolean, placeholder: string) {
  const y = doc.y;
  const tone = required ? { bg: C.redSoft, fg: C.red, label: "WAJIB" } : { bg: C.greenSoft, fg: C.green, label: "STANDAR" };
  doc.font("Helvetica-Bold").fontSize(7.5);
  const pw = doc.widthOfString(tone.label) + 16;
  doc.roundedRect(M, y, pw, 14, 7).fill(tone.bg);
  doc.fillColor(tone.fg).text(tone.label, M + 8, y + 3.5, { width: pw, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(C.text).text(status, M + pw + 10, y + 2, { width: CW - pw - 10 });
  const by = Math.max(doc.y, y + 14) + 8;
  doc.roundedRect(M, by, CW, 58, 6).lineWidth(0.6).strokeColor(C.line).dash(3, { space: 3 }).stroke();
  doc.undash();
  doc.font("Helvetica-Oblique").fontSize(8).fillColor(C.soft).text(placeholder, M + 10, by + 9, { width: CW - 20 });
  doc.y = by + 64;
}

function renderSignatureBoxes(doc: Doc, roles: Array<[string, string] | string[]>, withCaption: boolean) {
  const gap = 14;
  const n = roles.length;
  const w = (CW - gap * (n - 1)) / n;
  const h = 92;
  const y = doc.y;
  roles.forEach(([title, role], idx) => {
    const x = M + idx * (w + gap);
    doc.roundedRect(x, y, w, h, 6).fill(C.ivory);
    doc.roundedRect(x, y, w, h, 6).lineWidth(0.6).strokeColor(C.line).stroke();
    doc.rect(x, y, w, 2).fill(C.gold);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.navy).text(title, x + 8, y + 10, { width: w - 16, align: "center" });
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(role, x + 8, doc.y + 2, { width: w - 16, align: "center" });
    doc.rect(x + 14, y + h - 26, w - 28, 0.6).fill(C.soft);
    doc.font("Helvetica-Oblique").fontSize(7).fillColor(C.soft)
      .text(withCaption ? "(Tanda Tangan & Tanggal)" : "(Nama & Tanda Tangan)", x + 8, y + h - 20, { width: w - 16, align: "center" });
  });
  doc.y = y + h + 10;
}
