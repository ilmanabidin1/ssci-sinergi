import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Application, Assessment, Organization } from "../drizzle/schema";

export interface PdfReportData {
  application: Application;
  assessment: Assessment;
  organization?: Organization | null;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

function escapeText(value: unknown): string {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\t", " ");
}

function formatIdDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatIdMoney(value: string | number): string {
  return `Rp ${Number(value).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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

export async function generatePdfReport(data: PdfReportData): Promise<Buffer> {
  const { application, assessment, organization } = data;

  const verificationString = `SSCI:${assessment.id}:${assessment.modelVersion}:${application.id}`;
  const qrDataUrl = await QRCode.toDataURL(verificationString, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 160,
  });
  const qrBuffer = dataUrlToBuffer(qrDataUrl);
  const logoBuffer = readLogoBuffer(organization?.logoUrl);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true, compress: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

    const orgName = escapeText(organization?.name || "SSCI BPRS");
    const orgLegalName = escapeText(organization?.legalName || organization?.name || "");
    const orgAddress = escapeText(organization?.address || "");
    const orgPhone = escapeText(organization?.phone || "");

    const headerTop = doc.y;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, doc.x, headerTop, { fit: [120, 80] });
      } catch {
        void 0;
      }
    }

    doc.font("Helvetica-Bold");
    doc.fontSize(16);
    doc.fillColor("#2458d6");
    doc.text(orgName, doc.x, headerTop, { align: "right", width: contentWidth });

    doc.font("Helvetica");
    doc.fontSize(10);
    doc.fillColor("#4b5563");
    if (orgLegalName) {
      doc.text(orgLegalName, { align: "right", width: contentWidth });
    }
    if (orgAddress) {
      doc.text(orgAddress, { align: "right", width: contentWidth });
    }
    if (orgPhone) {
      doc.text(`Telp: ${orgPhone}`, { align: "right", width: contentWidth });
    }

    doc.moveDown(1.5);
    doc.moveTo(doc.page.margins.left, doc.y);
    doc.lineTo(pageWidth - doc.page.margins.right, doc.y);
    doc.strokeColor("#2458d6");
    doc.lineWidth(1.5);
    doc.stroke();

    doc.moveDown(1);
    doc.font("Helvetica-Bold");
    doc.fontSize(14);
    doc.fillColor("#111827");
    doc.text("LAPORAN PENILAIAN KELAYAKAN PEMBIAYAAN SYARIAH", {
      align: "center",
      width: contentWidth,
    });
    doc.font("Helvetica");
    doc.fontSize(10);
    doc.fillColor("#6b7280");
    doc.text("Sustainable Sharia Creditworthiness Index (SSCI)", {
      align: "center",
      width: contentWidth,
    });
    doc.text(`Tanggal: ${formatIdDate(assessment.assessedAt)}`, {
      align: "center",
      width: contentWidth,
    });

    doc.moveDown(1.5);
    sectionTitle(doc, "INFORMASI NASABAH");
    const customerRows: Array<[string, string]> = [
      ["Nama Lengkap", escapeText(application.customerName)],
      ["NIK / ID Nasabah", escapeText(application.customerId)],
      ["Nama Usaha", escapeText(application.businessName)],
      ["Jenis Usaha", escapeText(application.businessType)],
      ["Telepon", escapeText(application.phone)],
      ["Email", escapeText(application.email || "-")],
      ["Alamat", escapeText(application.address)],
    ];
    renderKeyValues(doc, customerRows, contentWidth);

    doc.moveDown(1.5);
    sectionTitle(doc, "HASIL PENILAIAN SSCI");
    doc.font("Helvetica-Bold");
    doc.fontSize(12);
    doc.fillColor("#111827");
    doc.text(`Klasifikasi: ${escapeText(assessment.classification)}`, { width: contentWidth });
    doc.font("Helvetica");
    doc.fontSize(10);
    doc.fillColor("#374151");
    const scoreRows: Array<[string, string]> = [
      ["Total Skor", Number(assessment.totalScore).toFixed(2)],
      ["Skor Keuangan Berkelanjutan (/55)", Number(assessment.sustainableFinanceScore).toFixed(2)],
      ["Skor Syariah (/25)", Number(assessment.shariaScore).toFixed(2)],
      ["Skor Legal (/20)", Number(assessment.legalScore).toFixed(2)],
    ];
    renderKeyValues(doc, scoreRows, contentWidth);

    const breakdown = assessment.scoreBreakdown;
    if (breakdown) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold");
      doc.fontSize(11);
      doc.fillColor("#111827");
      doc.text("Rincian Pilar:", { width: contentWidth });
      doc.font("Helvetica");
      doc.fontSize(10);
      doc.fillColor("#374151");
      const pillarRows: Array<[string, string]> = [
        ["Keuangan - financial_health", String(breakdown.sustainableFinance.financial_health)],
        ["Keuangan - debt_capacity", String(breakdown.sustainableFinance.debt_capacity)],
        ["Keuangan - cash_flow", String(breakdown.sustainableFinance.cash_flow)],
        ["Keuangan - collateral", String(breakdown.sustainableFinance.collateral)],
        ["Syariah - business_compliance", String(breakdown.sharia.business_compliance)],
        ["Syariah - transaction_compliance", String(breakdown.sharia.transaction_compliance)],
        ["Syariah - documentation", String(breakdown.sharia.documentation)],
        ["Legal - business_legality", String(breakdown.legal.business_legality)],
        ["Legal - document_completeness", String(breakdown.legal.document_completeness)],
        ["Legal - regulatory_compliance", String(breakdown.legal.regulatory_compliance)],
      ];
      renderKeyValues(doc, pillarRows, contentWidth);
    }

    doc.moveDown(1.5);
    sectionTitle(doc, "DATA KEUANGAN");
    const financialRows: Array<[string, string, "left" | "right"]> = [
      ["Pendapatan Bulanan", formatIdMoney(application.monthlyRevenue), "right"],
      ["Pengeluaran Bulanan", formatIdMoney(application.monthlyExpenses), "right"],
      ["Angsuran Existing per Bulan", formatIdMoney(application.existingDebt), "right"],
      ["Nilai Agunan", formatIdMoney(application.collateralValue), "right"],
      ["Pembiayaan Diajukan", formatIdMoney(application.requestedAmount), "right"],
      ["Tenor (bulan)", String(application.financingTenor), "right"],
      ["Margin Rate (%)", String(application.marginRate), "right"],
    ];
    renderTable(doc, ["Keterangan", "Nilai"], financialRows, contentWidth);
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold");
    doc.fontSize(10);
    doc.fillColor("#111827");
    doc.text("Tujuan Pembiayaan", { width: contentWidth });
    doc.font("Helvetica");
    doc.fillColor("#374151");
    doc.text(escapeText(application.loanPurpose), { width: contentWidth });

    doc.moveDown(1.5);
    sectionTitle(doc, "ANALISIS & REKOMENDASI");
    renderTextBlock(doc, "Kekuatan", escapeText(assessment.strengths || "-"), "#065f46");
    renderTextBlock(doc, "Faktor Risiko", escapeText(assessment.riskFactors || "-"), "#92400e");
    renderTextBlock(doc, "Rekomendasi", escapeText(assessment.recommendations), "#1e40af");

    doc.moveDown(1.5);
    sectionTitle(doc, "METADATA AUDIT");
    const auditRows: Array<[string, string]> = [
      ["ID Penilaian", String(assessment.id)],
      ["ID Pengajuan", String(application.id)],
      ["Versi Model", escapeText(assessment.modelVersion)],
      ["Model Rekomendasi", escapeText(assessment.recommendationModel || "Fallback aturan")],
      ["Tanggal Penilaian", formatIdDate(assessment.assessedAt)],
    ];
    renderKeyValues(doc, auditRows, contentWidth);

    doc.moveDown(2);
    const signatureY = doc.y;
    const halfWidth = contentWidth / 2 - 20;
    doc.font("Helvetica");
    doc.fontSize(10);
    doc.fillColor("#111827");
    doc.text("Disiapkan oleh,", doc.page.margins.left, signatureY, { width: halfWidth, align: "center" });
    doc.text("Disetujui oleh,", doc.page.margins.left + halfWidth + 40, signatureY, { width: halfWidth, align: "center" });
    doc.moveDown(4);
    const lineY = doc.y;
    doc.moveTo(doc.page.margins.left, lineY);
    doc.lineTo(doc.page.margins.left + halfWidth, lineY);
    doc.moveTo(doc.page.margins.left + halfWidth + 40, lineY);
    doc.lineTo(doc.page.margins.left + halfWidth + 40 + halfWidth, lineY);
    doc.strokeColor("#9ca3af");
    doc.lineWidth(0.75);
    doc.stroke();
    doc.moveDown(0.5);
    doc.fontSize(9);
    doc.fillColor("#6b7280");
    doc.text("(Nama & Tanda Tangan)", doc.page.margins.left, doc.y, { width: halfWidth, align: "center" });
    doc.text("(Nama & Tanda Tangan)", doc.page.margins.left + halfWidth + 40, lineY + 18, { width: halfWidth, align: "center" });

    doc.moveDown(2.5);
    const footerY = doc.y;
    try {
      doc.image(qrBuffer, doc.page.margins.left, footerY, { fit: [120, 120] });
    } catch {
      void 0;
    }
    doc.font("Helvetica");
    doc.fontSize(8);
    doc.fillColor("#6b7280");
    doc.text(
      `Pindai kode QR untuk memverifikasi keaslian laporan.\n${escapeText(verificationString)}`,
      doc.page.margins.left + 140,
      footerY + 20,
      { width: contentWidth - 140 }
    );

    doc.moveDown(3);
    doc.moveTo(doc.page.margins.left, doc.y);
    doc.lineTo(pageWidth - doc.page.margins.right, doc.y);
    doc.strokeColor("#e5e7eb");
    doc.lineWidth(0.5);
    doc.stroke();
    doc.moveDown(0.5);
    doc.font("Helvetica-Oblique");
    doc.fontSize(9);
    doc.fillColor("#6b7280");
    doc.text(
      "Laporan operasional pendukung analisis, bukan keputusan pembiayaan final.",
      { align: "center", width: contentWidth }
    );

    doc.end();
  });
}

function sectionTitle(doc: InstanceType<typeof PDFDocument>, text: string) {
  doc.font("Helvetica-Bold");
  doc.fontSize(12);
  doc.fillColor("#ffffff");
  const y = doc.y;
  doc.rect(doc.page.margins.left, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 20)
    .fill("#2458d6");
  doc.text(text, doc.page.margins.left + 8, y + 5, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 16,
  });
  doc.fillColor("#111827");
  doc.moveDown(0.5);
}

function renderKeyValues(
  doc: InstanceType<typeof PDFDocument>,
  rows: Array<[string, string]>,
  width: number
) {
  const labelWidth = Math.min(220, width * 0.55);
  const valueWidth = width - labelWidth;
  const startY = doc.y;
  let y = startY;
  for (const [label, value] of rows) {
    doc.font("Helvetica-Bold");
    doc.fontSize(10);
    doc.fillColor("#374151");
    doc.text(label, doc.page.margins.left, y, { width: labelWidth });
    doc.font("Helvetica");
    doc.fillColor("#111827");
    doc.text(value, doc.page.margins.left + labelWidth, y, { width: valueWidth });
    y = doc.y + 4;
    doc.y = y;
  }
}

function renderTable(
  doc: InstanceType<typeof PDFDocument>,
  headers: [string, string],
  rows: Array<[string, string, "left" | "right"]>,
  width: number
) {
  const labelWidth = Math.min(320, width * 0.65);
  const valueWidth = width - labelWidth;
  const startY = doc.y;
  doc.font("Helvetica-Bold");
  doc.fontSize(10);
  doc.fillColor("#374151");
  doc.rect(doc.page.margins.left, startY, width, 18).fill("#f3f4f6");
  doc.text(headers[0], doc.page.margins.left + 6, startY + 4, { width: labelWidth - 6 });
  doc.text(headers[1], doc.page.margins.left + labelWidth + 6, startY + 4, {
    width: valueWidth - 6,
    align: "right",
  });
  let y = startY + 22;
  doc.y = y;
  doc.font("Helvetica");
  doc.fillColor("#111827");
  for (const [label, value, align] of rows) {
    doc.text(label, doc.page.margins.left + 6, y, { width: labelWidth - 6 });
    doc.text(value, doc.page.margins.left + labelWidth + 6, y, {
      width: valueWidth - 6,
      align,
    });
    y = doc.y + 2;
    doc.y = y;
    doc
      .moveTo(doc.page.margins.left, y - 1)
      .lineTo(doc.page.margins.left + width, y - 1)
      .strokeColor("#e5e7eb")
      .lineWidth(0.5)
      .stroke();
  }
  doc.y = y;
}

function renderTextBlock(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  body: string,
  color: string
) {
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold");
  doc.fontSize(10);
  doc.fillColor(color);
  doc.text(title, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
  doc.font("Helvetica");
  doc.fillColor("#374151");
  doc.text(body, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
}
