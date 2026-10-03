// Tiered review: small, non-related-party financing goes through a short track;
// everything else goes through the full track with stricter exit gates before
// the committee can decide.

export const FAST_TRACK_MAX_AMOUNT = 25_000_000;

export type ReviewTrack = "ringkas" | "lengkap";

export const TRACK_LABELS: Record<ReviewTrack, string> = {
  ringkas: "Jalur ringkas",
  lengkap: "Jalur lengkap",
};

export const TRACK_REQUIREMENTS: Record<ReviewTrack, { verifiedDocuments: string[]; minSurveyPhotos: number }> = {
  ringkas: { verifiedDocuments: ["KTP"], minSurveyPhotos: 0 },
  lengkap: { verifiedDocuments: ["KTP", "NPWP", "NIB"], minSurveyPhotos: 1 },
};

export function determineReviewTrack(input: { requestedAmount: number | string; isRelatedParty?: string | null }): ReviewTrack {
  const amount = Number(input.requestedAmount);
  if (input.isRelatedParty === "yes") return "lengkap";
  return Number.isFinite(amount) && amount > 0 && amount <= FAST_TRACK_MAX_AMOUNT ? "ringkas" : "lengkap";
}

export type ExitGateItem = { label: string; ok: boolean };
export type ExitGate = { track: ReviewTrack; passed: boolean; items: ExitGateItem[] };

export function evaluateExitGate(input: {
  track: ReviewTrack;
  documents: Array<{ documentType: string; status: string }>;
  surveyPhotoCount: number;
  openCustomerRequests: number;
}): ExitGate {
  const requirements = TRACK_REQUIREMENTS[input.track];
  const verified = new Set(input.documents.filter(d => d.status === "verified").map(d => d.documentType.toUpperCase()));
  const items: ExitGateItem[] = requirements.verifiedDocuments.map(type => ({
    label: `Dokumen ${type} diunggah dan diverifikasi checker`,
    ok: verified.has(type),
  }));
  if (requirements.minSurveyPhotos > 0) {
    items.push({ label: `Minimal ${requirements.minSurveyPhotos} foto survei lapangan`, ok: input.surveyPhotoCount >= requirements.minSurveyPhotos });
  }
  items.push({ label: "Semua permintaan nasabah sudah ditanggapi", ok: input.openCustomerRequests === 0 });
  return { track: input.track, passed: items.every(i => i.ok), items };
}

export function estimateFromDailySales(input: {
  dailySales: number;
  openDaysPerMonth: number;
  costOfGoodsPct: number;
  fixedMonthlyCosts: number;
}) {
  const monthlyRevenue = Math.round(input.dailySales * input.openDaysPerMonth);
  const monthlyExpenses = Math.round(monthlyRevenue * (input.costOfGoodsPct / 100) + input.fixedMonthlyCosts);
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  return {
    monthlyRevenue,
    monthlyExpenses,
    note: `Estimasi dari omzet harian ${rp(input.dailySales)} x ${input.openDaysPerMonth} hari; modal/HPP ${input.costOfGoodsPct}% dari omzet; biaya tetap ${rp(input.fixedMonthlyCosts)} per bulan.`,
  };
}
