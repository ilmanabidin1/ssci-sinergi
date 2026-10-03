// Plain-language explanation for applicants. Derived only from the stored rule
// breakdown: no scores, no internal notes, no AI text.

export type ExplanationLevel = "baik" | "cukup" | "perlu diperbaiki";

export type CustomerExplanation = {
  headline: string;
  factors: Array<{ aspect: string; level: ExplanationLevel; note: string }>;
  improvements: string[];
};

type Breakdown = {
  sustainableFinance: { financial_health: number; debt_capacity: number; cash_flow: number; collateral: number };
  sharia: { business_compliance: number; transaction_compliance: number; documentation: number };
  legal: { business_legality: number; document_completeness: number; regulatory_compliance: number };
};

const level = (value: number, max: number): ExplanationLevel => {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.8) return "baik";
  if (ratio >= 0.5) return "cukup";
  return "perlu diperbaiki";
};

export function buildCustomerExplanation(input: {
  status: string;
  breakdown: Breakdown | null | undefined;
  legalDocuments?: Array<{ type: string; status: string }> | null;
}): CustomerExplanation | null {
  if (!input.breakdown || (input.status !== "approved" && input.status !== "rejected")) return null;
  const b = input.breakdown;
  const factors: CustomerExplanation["factors"] = [
    { aspect: "Kesehatan usaha", level: level(b.sustainableFinance.financial_health, 30), note: "Selisih pendapatan dan pengeluaran usaha setiap bulan." },
    { aspect: "Beban angsuran yang sudah ada", level: level(b.sustainableFinance.debt_capacity, 25), note: "Besarnya cicilan lain dibanding keuntungan bulanan." },
    { aspect: "Kemampuan membayar angsuran baru", level: level(b.sustainableFinance.cash_flow, 25), note: "Apakah keuntungan bulanan cukup untuk angsuran pembiayaan ini." },
    { aspect: "Jaminan", level: level(b.sustainableFinance.collateral, 20), note: "Nilai jaminan dibanding jumlah pembiayaan." },
    { aspect: "Kesesuaian syariah usaha", level: level(b.sharia.business_compliance + b.sharia.transaction_compliance, 70), note: "Kegiatan usaha dan tujuan pembiayaan sesuai prinsip syariah." },
    { aspect: "Kelengkapan dokumen", level: level(b.legal.document_completeness + b.legal.regulatory_compliance, 60), note: "KTP, NPWP, NIB, dan dokumen pendukung lainnya." },
  ];

  const improvements: string[] = [];
  if (b.sustainableFinance.cash_flow < 15) improvements.push("Pertimbangkan jumlah pembiayaan yang lebih kecil atau tenor yang lebih panjang agar angsuran lebih ringan.");
  if (b.sustainableFinance.debt_capacity < 15) improvements.push("Kurangi atau lunasi sebagian cicilan lain sebelum mengajukan kembali.");
  if (b.sustainableFinance.financial_health < 20) improvements.push("Siapkan catatan pemasukan dan pengeluaran usaha yang lebih lengkap untuk menunjukkan keuntungan usaha.");
  if (b.sustainableFinance.collateral < 10) improvements.push("Tambahkan atau perbarui nilai jaminan.");
  const missingDocs = (input.legalDocuments ?? []).filter(d => d.status === "missing" || d.status === "pending").map(d => d.type);
  if (missingDocs.length > 0) improvements.push(`Lengkapi dokumen: ${missingDocs.join(", ")}.`);
  else if (b.legal.document_completeness < 35) improvements.push("Lengkapi dokumen legal usaha (KTP, NPWP, NIB).");
  if (b.sharia.business_compliance < 40) improvements.push("Diskusikan dengan petugas BPRS mengenai kesesuaian kegiatan usaha dengan prinsip syariah.");

  const headline = input.status === "approved"
    ? "Pengajuan Anda disetujui. Berikut gambaran hasil penilaian kelayakan."
    : "Pengajuan Anda belum dapat disetujui saat ini. Berikut aspek yang memengaruhi hasil penilaian dan hal yang dapat Anda perbaiki.";

  return { headline, factors, improvements: input.status === "rejected" ? improvements : [] };
}
