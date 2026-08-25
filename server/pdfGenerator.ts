import type { Assessment, Application, Organization } from "../drizzle/schema";

export interface PDFData {
  assessment: Assessment;
  application: Application;
  organization?: Organization | null;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildLogoDataUrl(logoUrl: string | null | undefined): string {
  if (!logoUrl) return "";
  if (logoUrl.startsWith("data:")) return logoUrl;
  if (!logoUrl.startsWith("/uploads/")) return "";
  try {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const directory = process.env.UPLOAD_DIR || "/data/uploads";
    const filename = logoUrl.replace("/uploads/", "");
    const buffer = readFileSync(join(directory, filename));
    const mime = filename.endsWith(".svg") ? "image/svg+xml" : filename.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

export function generateAssessmentPDF(data: PDFData): string {
  const { assessment, application } = data;
  const logoDataUrl = buildLogoDataUrl(data.organization?.logoUrl);
  const safe = {
    logoDataUrl: escapeHtml(logoDataUrl),
    customerName: escapeHtml(application.customerName),
    customerId: escapeHtml(application.customerId),
    businessName: escapeHtml(application.businessName),
    businessType: escapeHtml(application.businessType),
    phone: escapeHtml(application.phone),
    email: escapeHtml(application.email || "-"),
    address: escapeHtml(application.address),
    loanPurpose: escapeHtml(application.loanPurpose),
    classification: escapeHtml(assessment.classification),
    strengths: escapeHtml(assessment.strengths),
    riskFactors: escapeHtml(assessment.riskFactors),
    recommendations: escapeHtml(assessment.recommendations),
    modelVersion: escapeHtml(assessment.modelVersion),
    recommendationModel: escapeHtml(
      assessment.recommendationModel || "Fallback aturan"
    ),
    orgName: escapeHtml(data.organization?.name || "SSCI BPRS"),
    orgLegalName: escapeHtml(data.organization?.legalName || data.organization?.name || ""),
    orgAddress: escapeHtml(data.organization?.address || ""),
    orgPhone: escapeHtml(data.organization?.phone || ""),
    orgEmail: escapeHtml(data.organization?.email || ""),
  };
  
  // Generate HTML content for PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    
    .header h1 {
      color: #2563eb;
      font-size: 24px;
      margin-bottom: 10px;
    }
    
    .header p {
      color: #666;
      font-size: 14px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      background-color: #2563eb;
      color: white;
      padding: 10px 15px;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .info-item {
      padding: 10px;
      background-color: #f8f9fa;
      border-left: 3px solid #2563eb;
    }
    
    .info-label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    .info-value {
      color: #333;
      font-size: 14px;
    }
    
    .score-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .score-card {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
    }
    
    .score-card.total {
      background-color: #2563eb;
      color: white;
      border-color: #2563eb;
    }
    
    .score-value {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .score-label {
      font-size: 12px;
      opacity: 0.8;
    }
    
    .classification {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      margin-top: 10px;
    }
    
    .classification.sangat-layak {
      background-color: #10b981;
      color: white;
    }
    
    .classification.layak {
      background-color: #3b82f6;
      color: white;
    }
    
    .classification.perlu-pengawasan {
      background-color: #f59e0b;
      color: white;
    }
    
    .classification.tidak-layak {
      background-color: #ef4444;
      color: white;
    }
    
    .recommendation-box {
      padding: 15px;
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      margin-top: 15px;
    }
    
    .risk-box {
      padding: 15px;
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      margin-top: 15px;
    }
    
    .strength-box {
      padding: 15px;
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
      margin-top: 15px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      background-color: #f8f9fa;
      font-weight: bold;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    ${safe.logoDataUrl ? `<img src="${safe.logoDataUrl}" style="max-height:64px;max-width:200px;object-fit:contain;margin:0 auto 8px;" />` : ""}
    <div style="font-size:20px;font-weight:bold;color:#2563eb;margin-bottom:4px;">${safe.orgName}</div>
    ${safe.orgLegalName ? `<div style="font-size:14px;color:#666;margin-bottom:4px;">${safe.orgLegalName}</div>` : ""}
    ${safe.orgAddress ? `<div style="font-size:12px;color:#666;">${safe.orgAddress}</div>` : ""}
    ${safe.orgPhone ? `<div style="font-size:12px;color:#666;">Telp: ${safe.orgPhone}</div>` : ""}
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;">
      <h1 style="font-size:18px;">LAPORAN PENILAIAN KELAYAKAN PEMBIAYAAN SYARIAH</h1>
      <p style="font-size:13px;">Sustainable Sharia Creditworthiness Index (SSCI)</p>
    </div>
    <p style="font-size:12px;color:#666;">Tanggal: ${new Date(assessment.assessedAt).toLocaleDateString("id-ID", { 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    })}</p>
  </div>

  <div class="section">
    <div class="section-title">INFORMASI NASABAH</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Nama Lengkap</div>
        <div class="info-value">${safe.customerName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">NIK / ID Nasabah</div>
        <div class="info-value">${safe.customerId}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Nama Usaha</div>
        <div class="info-value">${safe.businessName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Jenis Usaha</div>
        <div class="info-value">${safe.businessType}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Telepon</div>
        <div class="info-value">${safe.phone}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">${safe.email}</div>
      </div>
    </div>
    <div class="info-item" style="margin-top: 10px;">
      <div class="info-label">Alamat</div>
      <div class="info-value">${safe.address}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">HASIL PENILAIAN SSCI</div>
    <div style="text-align: center;">
      <span class="classification ${getClassificationClass(assessment.classification)}">
        ${safe.classification}
      </span>
    </div>
    <div class="score-container">
      <div class="score-card total">
        <div class="score-value">${Number(assessment.totalScore).toFixed(1)}</div>
        <div class="score-label">Total Skor</div>
      </div>
      <div class="score-card">
        <div class="score-value" style="color: #3b82f6;">${Number(assessment.sustainableFinanceScore).toFixed(1)}</div>
        <div class="score-label">Kontribusi Keuangan /55</div>
      </div>
      <div class="score-card">
        <div class="score-value" style="color: #10b981;">${Number(assessment.shariaScore).toFixed(1)}</div>
        <div class="score-label">Kontribusi Syariah /25</div>
      </div>
      <div class="score-card">
        <div class="score-value" style="color: #8b5cf6;">${Number(assessment.legalScore).toFixed(1)}</div>
        <div class="score-label">Kontribusi Legal /20</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">DATA KEUANGAN</div>
    <table>
      <tr>
        <th>Keterangan</th>
        <th style="text-align: right;">Nilai (Rp)</th>
      </tr>
      <tr>
        <td>Pendapatan Bulanan</td>
        <td style="text-align: right;">${Number(application.monthlyRevenue).toLocaleString("id-ID")}</td>
      </tr>
      <tr>
        <td>Pengeluaran Bulanan</td>
        <td style="text-align: right;">${Number(application.monthlyExpenses).toLocaleString("id-ID")}</td>
      </tr>
      <tr>
        <td>Angsuran Existing per Bulan</td>
        <td style="text-align: right;">${Number(application.existingDebt).toLocaleString("id-ID")}</td>
      </tr>
      <tr>
        <td>Nilai Agunan</td>
        <td style="text-align: right;">${Number(application.collateralValue).toLocaleString("id-ID")}</td>
      </tr>
      <tr>
        <td><strong>Pembiayaan Diajukan</strong></td>
        <td style="text-align: right;"><strong>${Number(application.requestedAmount).toLocaleString("id-ID")}</strong></td>
      </tr>
    </table>
    <div class="info-item" style="margin-top: 15px;">
      <div class="info-label">Tujuan Pembiayaan</div>
      <div class="info-value">${safe.loanPurpose}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">ANALISIS & REKOMENDASI</div>
    
    <div class="strength-box">
      <div style="font-weight: bold; margin-bottom: 8px; color: #065f46;">✓ Kekuatan</div>
      <div>${safe.strengths}</div>
    </div>
    
    <div class="risk-box">
      <div style="font-weight: bold; margin-bottom: 8px; color: #92400e;">⚠ Faktor Risiko</div>
      <div>${safe.riskFactors}</div>
    </div>
    
    <div class="recommendation-box">
      <div style="font-weight: bold; margin-bottom: 8px; color: #1e40af;">📋 Rekomendasi</div>
      <div>${safe.recommendations}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">METADATA AUDIT</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Versi Aturan</div><div class="info-value">${safe.modelVersion}</div></div>
      <div class="info-item"><div class="info-label">Model Narasi</div><div class="info-value">${safe.recommendationModel}</div></div>
      <div class="info-item"><div class="info-label">ID Aplikasi</div><div class="info-value">${application.id}</div></div>
      <div class="info-item"><div class="info-label">ID Penilaian</div><div class="info-value">${assessment.id}</div></div>
    </div>
    <div class="recommendation-box">Skor dan klasifikasi dihitung oleh aturan SSCI. Narasi AI bersifat pendukung dan keputusan pembiayaan final tetap menjadi kewenangan BPRS.</div>
  </div>

  <div class="footer">
    <p>Laporan operasional pendukung analisis, bukan keputusan pembiayaan final.</p>
    <p>Sustainable Sharia Creditworthiness Index - Universitas Islam Bandung</p>
    <p>© ${new Date().getFullYear()} - Laporan operasional SSCI</p>
  </div>
</body>
</html>
  `;
  
  return html;
}

function getClassificationClass(classification: string): string {
  const classMap: Record<string, string> = {
    "Sangat Layak": "sangat-layak",
    "Layak": "layak",
    "Perlu Pengawasan": "perlu-pengawasan",
    "Tidak Layak": "tidak-layak",
  };
  return classMap[classification] || "";
}
