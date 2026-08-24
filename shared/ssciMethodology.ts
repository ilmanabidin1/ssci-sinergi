export const SSCI_METHODOLOGY_VERSION = "ssci-rules-1.1.0";
export const SSCI_RECOMMENDATION_PROMPT_VERSION = "ssci-narrative-1.0.0";

export const SSCI_PILLAR_WEIGHTS = {
  sustainableFinance: 55,
  sharia: 25,
  legal: 20,
} as const;

export const SSCI_CLASSIFICATION_THRESHOLDS = {
  sangatLayak: 80,
  layak: 65,
  perluPengawasan: 50,
} as const;

export const SSCI_REQUIRED_LEGAL_DOCUMENTS = ["KTP", "NPWP", "NIB"] as const;
export const SSCI_LEGAL_DOCUMENT_STATUSES = [
  "pending",
  "complete",
  "verified",
  "missing",
] as const;

export type SSCIClassification =
  | "Sangat Layak"
  | "Layak"
  | "Perlu Pengawasan"
  | "Tidak Layak";

export function classifySSCI(score: number): SSCIClassification {
  if (score >= SSCI_CLASSIFICATION_THRESHOLDS.sangatLayak) return "Sangat Layak";
  if (score >= SSCI_CLASSIFICATION_THRESHOLDS.layak) return "Layak";
  if (score >= SSCI_CLASSIFICATION_THRESHOLDS.perluPengawasan) {
    return "Perlu Pengawasan";
  }
  return "Tidak Layak";
}
