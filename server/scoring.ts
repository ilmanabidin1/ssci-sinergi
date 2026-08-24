import type { Application } from "../drizzle/schema";
import {
  classifySSCI,
  SSCI_PILLAR_WEIGHTS,
  SSCI_REQUIRED_LEGAL_DOCUMENTS,
  type SSCIClassification,
} from "@shared/ssciMethodology";

/**
 * SSCI Scoring Algorithm
 * 
 * Three pillars with weighted contributions:
 * 1. Sustainable Finance Index: 55%
 * 2. Sharia Index: 25%
 * 3. Legal Index: 20%
 * 
 * Final score ranges from 0-100
 */

export interface ScoreBreakdown {
  sustainableFinance: {
    financial_health: number;
    debt_capacity: number;
    cash_flow: number;
    collateral: number;
  };
  sharia: {
    business_compliance: number;
    transaction_compliance: number;
    documentation: number;
  };
  legal: {
    business_legality: number;
    document_completeness: number;
    regulatory_compliance: number;
  };
}

export interface SSCIResult {
  sustainableFinanceScore: number;
  shariaScore: number;
  legalScore: number;
  totalScore: number;
  classification: SSCIClassification;
  scoreBreakdown: ScoreBreakdown;
  recommendations: string;
  riskFactors: string;
  strengths: string;
  confidence: number;
}

/**
 * Calculate Sustainable Finance Index (55% weight)
 */
function calculateSustainableFinanceScore(app: Application): { score: number; breakdown: ScoreBreakdown['sustainableFinance'] } {
  const monthlyRevenue = Number(app.monthlyRevenue);
  const monthlyExpenses = Number(app.monthlyExpenses);
  const existingDebt = Number(app.existingDebt);
  const collateralValue = Number(app.collateralValue);
  const requestedAmount = Number(app.requestedAmount);
  const financingTenor = Number(app.financingTenor);
  const marginRate = Number(app.marginRate);

  const financialValues = [
    monthlyRevenue,
    monthlyExpenses,
    existingDebt,
    collateralValue,
    requestedAmount,
    financingTenor,
    marginRate,
  ];
  if (financialValues.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Data keuangan harus berupa angka non-negatif yang valid");
  }
  if (monthlyRevenue <= 0 || requestedAmount <= 0 || financingTenor <= 0) {
    throw new Error("Pendapatan, jumlah pembiayaan, dan tenor harus lebih dari nol");
  }
  
  // 1. Financial Health (30 points) - based on profit margin
  const netIncome = monthlyRevenue - monthlyExpenses;
  const profitMargin = monthlyRevenue > 0 ? (netIncome / monthlyRevenue) * 100 : 0;
  let financialHealth = 0;
  if (profitMargin >= 30) financialHealth = 30;
  else if (profitMargin >= 20) financialHealth = 25;
  else if (profitMargin >= 10) financialHealth = 20;
  else if (profitMargin >= 5) financialHealth = 15;
  else if (profitMargin > 0) financialHealth = 10;
  
  // 2. Debt Capacity (25 points) - debt to income ratio
  const debtToIncomeRatio = netIncome > 0 ? (existingDebt / netIncome) * 100 : 100;
  let debtCapacity = 0;
  if (debtToIncomeRatio <= 30) debtCapacity = 25;
  else if (debtToIncomeRatio <= 40) debtCapacity = 20;
  else if (debtToIncomeRatio <= 50) debtCapacity = 15;
  else if (debtToIncomeRatio <= 60) debtCapacity = 10;
  else debtCapacity = 5;
  
  // 3. Cash Flow (25 points) - ability to repay
  const totalRepayment = requestedAmount * (1 + marginRate / 100);
  const estimatedMonthlyPayment = totalRepayment / financingTenor;
  const totalMonthlyObligations = existingDebt + estimatedMonthlyPayment;
  const cashFlowCoverage =
    netIncome > 0 && totalMonthlyObligations > 0
      ? netIncome / totalMonthlyObligations
      : 0;
  let cashFlow = 0;
  if (cashFlowCoverage >= 2) cashFlow = 25;
  else if (cashFlowCoverage >= 1.5) cashFlow = 20;
  else if (cashFlowCoverage >= 1.2) cashFlow = 15;
  else if (cashFlowCoverage >= 1) cashFlow = 10;
  else cashFlow = 5;
  
  // 4. Collateral (20 points) - loan to value ratio
  const loanToValue = collateralValue > 0 ? (requestedAmount / collateralValue) * 100 : 100;
  let collateral = 0;
  if (loanToValue <= 50) collateral = 20;
  else if (loanToValue <= 70) collateral = 15;
  else if (loanToValue <= 85) collateral = 10;
  else if (loanToValue <= 100) collateral = 5;
  else collateral = 0;
  
  const totalScore = financialHealth + debtCapacity + cashFlow + collateral;
  
  return {
    score: totalScore,
    breakdown: {
      financial_health: financialHealth,
      debt_capacity: debtCapacity,
      cash_flow: cashFlow,
      collateral: collateral,
    }
  };
}

/**
 * Calculate Sharia Index (25% weight)
 */
function calculateShariaScore(app: Application): { score: number; breakdown: ScoreBreakdown['sharia'] } {
  // 1. Business Compliance (40 points)
  let businessCompliance = 0;
  if (app.businessShariaCompliant === "yes") businessCompliance = 40;
  else if (app.businessShariaCompliant === "partial") businessCompliance = 20;
  else businessCompliance = 0;
  
  // 2. Transaction Compliance (35 points) - based on business type and practices
  let transactionCompliance = 30; // default assumption
  const prohibitedKeywords = ['riba', 'bunga', 'alkohol', 'judi', 'gambling', 'pork', 'babi'];
  const businessTypeLower = app.businessType.toLowerCase();
  const loanPurposeLower = app.loanPurpose.toLowerCase();
  
  if (prohibitedKeywords.some(keyword => 
    businessTypeLower.includes(keyword) || loanPurposeLower.includes(keyword)
  )) {
    transactionCompliance = 0;
  }
  
  // 3. Documentation (25 points) - sharia compliance notes quality
  let documentation = 15; // default
  if (app.shariaComplianceNotes && app.shariaComplianceNotes.length > 100) {
    documentation = 25;
  } else if (app.shariaComplianceNotes && app.shariaComplianceNotes.length > 50) {
    documentation = 20;
  }
  
  const totalScore = businessCompliance + transactionCompliance + documentation;
  
  return {
    score: totalScore,
    breakdown: {
      business_compliance: businessCompliance,
      transaction_compliance: transactionCompliance,
      documentation: documentation,
    }
  };
}

/**
 * Calculate Legal Index (20% weight)
 */
function calculateLegalScore(app: Application): { score: number; breakdown: ScoreBreakdown['legal'] } {
  const docs = app.legalDocuments as { type: string; status: string; notes?: string }[];
  
  // 1. Business Legality (40 points) - business age and registration
  let businessLegality = 0;
  const businessAgeYears = app.businessAge / 12;
  if (businessAgeYears >= 3) businessLegality = 40;
  else if (businessAgeYears >= 2) businessLegality = 30;
  else if (businessAgeYears >= 1) businessLegality = 20;
  else businessLegality = 10;
  
  // 2. Document Completeness (35 points)
  const completedDocumentTypes = new Set(
    docs
      .filter(d => d.status === "complete" || d.status === "verified")
      .map(d => d.type.toUpperCase())
  );
  const completedRequiredDocuments = SSCI_REQUIRED_LEGAL_DOCUMENTS.filter(doc =>
    completedDocumentTypes.has(doc)
  );
  const completenessRatio =
    completedRequiredDocuments.length / SSCI_REQUIRED_LEGAL_DOCUMENTS.length;
  const documentCompleteness = Math.round(completenessRatio * 35);
  
  // 3. Regulatory Compliance (25 points)
  let regulatoryCompliance = 20; // default assumption
  const hasBusinessPermit = docs.some(d => 
    d.type.toUpperCase() === "NIB" && (d.status === 'complete' || d.status === 'verified')
  );
  if (hasBusinessPermit) regulatoryCompliance = 25;
  
  const totalScore = businessLegality + documentCompleteness + regulatoryCompliance;
  
  return {
    score: totalScore,
    breakdown: {
      business_legality: businessLegality,
      document_completeness: documentCompleteness,
      regulatory_compliance: regulatoryCompliance,
    }
  };
}

/**
 * Classify based on total SSCI score
 */
export const classifyScore = classifySSCI;

/**
 * Generate recommendations based on assessment
 */
function generateRecommendations(result: Omit<SSCIResult, 'recommendations' | 'riskFactors' | 'strengths' | 'confidence'>): {
  recommendations: string;
  riskFactors: string;
  strengths: string;
} {
  const recommendations: string[] = [];
  const riskFactors: string[] = [];
  const strengths: string[] = [];
  
  // Analyze Sustainable Finance
  if (result.scoreBreakdown.sustainableFinance.financial_health < 15) {
    riskFactors.push("Margin keuntungan rendah");
    recommendations.push("Tingkatkan efisiensi operasional untuk meningkatkan profitabilitas");
  } else if (result.scoreBreakdown.sustainableFinance.financial_health >= 25) {
    strengths.push("Kesehatan finansial yang baik dengan margin keuntungan tinggi");
  }
  
  if (result.scoreBreakdown.sustainableFinance.debt_capacity < 15) {
    riskFactors.push("Beban hutang tinggi relatif terhadap pendapatan");
    recommendations.push("Pertimbangkan restrukturisasi hutang sebelum pembiayaan baru");
  } else if (result.scoreBreakdown.sustainableFinance.debt_capacity >= 20) {
    strengths.push("Kapasitas hutang yang sehat");
  }
  
  if (result.scoreBreakdown.sustainableFinance.cash_flow < 15) {
    riskFactors.push("Arus kas tidak mencukupi untuk pembayaran cicilan");
    recommendations.push("Kurangi jumlah pembiayaan atau perpanjang tenor");
  } else if (result.scoreBreakdown.sustainableFinance.cash_flow >= 20) {
    strengths.push("Arus kas yang kuat untuk memenuhi kewajiban");
  }
  
  if (result.scoreBreakdown.sustainableFinance.collateral < 10) {
    riskFactors.push("Nilai agunan tidak memadai");
    recommendations.push("Tambahkan agunan atau kurangi jumlah pembiayaan");
  } else if (result.scoreBreakdown.sustainableFinance.collateral >= 15) {
    strengths.push("Agunan yang memadai");
  }
  
  // Analyze Sharia Compliance
  if (result.scoreBreakdown.sharia.business_compliance < 20) {
    riskFactors.push("Kepatuhan syariah bisnis dipertanyakan");
    recommendations.push("Lakukan audit syariah menyeluruh sebelum persetujuan");
  } else if (result.scoreBreakdown.sharia.business_compliance >= 35) {
    strengths.push("Bisnis sepenuhnya patuh syariah");
  }
  
  if (result.scoreBreakdown.sharia.transaction_compliance < 20) {
    riskFactors.push("Transaksi berpotensi tidak sesuai syariah");
    recommendations.push("Verifikasi kepatuhan transaksi dengan Dewan Pengawas Syariah");
  }
  
  // Analyze Legal Compliance
  if (result.scoreBreakdown.legal.business_legality < 20) {
    riskFactors.push("Usia bisnis masih muda");
    recommendations.push("Pertimbangkan pembiayaan dengan jumlah lebih kecil dan monitoring ketat");
  } else if (result.scoreBreakdown.legal.business_legality >= 30) {
    strengths.push("Bisnis telah beroperasi cukup lama");
  }
  
  if (result.scoreBreakdown.legal.document_completeness < 20) {
    riskFactors.push("Dokumen legal tidak lengkap");
    recommendations.push("Lengkapi seluruh dokumen legal yang dipersyaratkan");
  } else if (result.scoreBreakdown.legal.document_completeness >= 30) {
    strengths.push("Dokumentasi legal lengkap");
  }
  
  // Overall recommendations
  if (result.classification === "Sangat Layak") {
    recommendations.push("Lanjutkan ke review checker dengan syarat dan ketentuan standar");
  } else if (result.classification === "Layak") {
    recommendations.push("Pertimbangkan pada tahap review dengan monitoring berkala");
  } else if (result.classification === "Perlu Pengawasan") {
    recommendations.push("Pembiayaan memerlukan persetujuan komite dan pengawasan intensif");
  } else {
    recommendations.push("Tunda proses keputusan dan lakukan perbaikan profil sebelum review ulang");
  }
  
  return {
    recommendations: recommendations.join(". ") + ".",
    riskFactors: riskFactors.length > 0 ? riskFactors.join("; ") + "." : "Tidak ada faktor risiko signifikan.",
    strengths: strengths.length > 0 ? strengths.join("; ") + "." : "Perlu peningkatan di berbagai aspek.",
  };
}

/**
 * Main SSCI calculation function
 */
export function calculateSSCI(application: Application): SSCIResult {
  // Calculate each pillar
  const sustainableFinance = calculateSustainableFinanceScore(application);
  const sharia = calculateShariaScore(application);
  const legal = calculateLegalScore(application);
  
  // Apply weights: SF=55%, Sharia=25%, Legal=20%
  const sustainableFinanceScore =
    (sustainableFinance.score / 100) * SSCI_PILLAR_WEIGHTS.sustainableFinance;
  const shariaScore = (sharia.score / 100) * SSCI_PILLAR_WEIGHTS.sharia;
  const legalScore = (legal.score / 100) * SSCI_PILLAR_WEIGHTS.legal;
  
  // Calculate total score (0-100)
  const totalScore = sustainableFinanceScore + shariaScore + legalScore;
  
  // Classify
  const classification = classifyScore(totalScore);
  
  // Build result object
  const result: Omit<SSCIResult, 'recommendations' | 'riskFactors' | 'strengths' | 'confidence'> = {
    sustainableFinanceScore: Math.round(sustainableFinanceScore * 100) / 100,
    shariaScore: Math.round(shariaScore * 100) / 100,
    legalScore: Math.round(legalScore * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    classification,
    scoreBreakdown: {
      sustainableFinance: sustainableFinance.breakdown,
      sharia: sharia.breakdown,
      legal: legal.breakdown,
    },
  };
  
  // Generate insights
  const insights = generateRecommendations(result);
  
  // Calculate confidence based on data completeness
  let confidence = 85; // base confidence
  if (!application.email) confidence -= 5;
  if (!application.environmentalPractices) confidence -= 5;
  if (!application.socialImpact) confidence -= 5;
  
  return {
    ...result,
    ...insights,
    confidence: Math.round(confidence * 100) / 100,
  };
}
