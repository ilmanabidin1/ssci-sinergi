import { TRACK_REQUIREMENTS, type ReviewTrack } from "./reviewTrack";

/**
 * Tahap kerja satu pengajuan dan daftar kelengkapan tunggal. Dipakai halaman
 * detail (penanda tahap + bilah kelengkapan) dan daftar pengajuan.
 */

export type WorkflowStage = "lengkapi" | "nilai" | "tinjau" | "selesai";

export const STAGES: Array<{ key: WorkflowStage; label: string }> = [
  { key: "lengkapi", label: "Lengkapi" },
  { key: "nilai", label: "Nilai" },
  { key: "tinjau", label: "Tinjau" },
  { key: "selesai", label: "Putuskan" },
];

export type CompletenessItem = {
  key: string;
  label: string;
  done: boolean;
  hint?: string;
  /** Tab halaman detail tempat kekurangan ini dilengkapi. */
  tab: "ringkasan" | "data" | "penilaian" | "bprs";
  /** Wajib sebelum penilaian SSCI (bukan hanya sebelum keputusan). */
  beforeAssessment: boolean;
};

export type CompletenessInput = {
  status: string;
  track: ReviewTrack;
  hasAssessment: boolean;
  documents: Array<{ documentType: string; status: string }>;
  surveyPhotoCount: number;
  openCustomerRequests: number;
  blockingDataIssues: number;
  bprsMissingCriteria: string[];
};

export type Completeness = {
  percent: number;
  items: CompletenessItem[];
  missing: CompletenessItem[];
  readyToAssess: boolean;
  stage: WorkflowStage;
};

export function computeCompleteness(input: CompletenessInput): Completeness {
  const required = TRACK_REQUIREMENTS[input.track];
  const byType = new Map(input.documents.map(d => [d.documentType.toUpperCase(), d.status]));
  const notUploaded = required.verifiedDocuments.filter(t => !byType.has(t) || byType.get(t) === "rejected");
  const notVerified = required.verifiedDocuments.filter(t => byType.get(t) !== "verified");

  const items: CompletenessItem[] = [
    {
      key: "dokumen_unggah",
      label: `Dokumen wajib diunggah (${required.verifiedDocuments.join(", ")})`,
      done: notUploaded.length === 0,
      hint: notUploaded.length ? `Belum ada: ${notUploaded.join(", ")}` : undefined,
      tab: "data",
      beforeAssessment: true,
    },
    {
      key: "data_konsisten",
      label: "Data pengajuan tanpa temuan yang belum dikonfirmasi",
      done: input.hasAssessment || input.blockingDataIssues === 0,
      hint: !input.hasAssessment && input.blockingDataIssues > 0 ? `${input.blockingDataIssues} temuan perlu diperbaiki atau dikonfirmasi saat penilaian` : undefined,
      tab: "ringkasan",
      beforeAssessment: false,
    },
    {
      key: "format_bprs",
      label: "Isian format Excel BPRS",
      done: input.bprsMissingCriteria.length === 0,
      hint: input.bprsMissingCriteria.length ? `${input.bprsMissingCriteria.length} kriteria belum diisi` : undefined,
      tab: "bprs",
      beforeAssessment: false,
    },
  ];
  if (required.minSurveyPhotos > 0) {
    items.push({
      key: "survei",
      label: `Minimal ${required.minSurveyPhotos} foto survei lapangan`,
      done: input.surveyPhotoCount >= required.minSurveyPhotos,
      tab: "data",
      beforeAssessment: false,
    });
  }
  items.push(
    {
      key: "penilaian",
      label: "Penilaian SSCI",
      done: input.hasAssessment,
      tab: "ringkasan",
      beforeAssessment: false,
    },
    {
      key: "verifikasi",
      label: "Dokumen wajib diverifikasi checker",
      done: notVerified.length === 0,
      hint: notVerified.length ? `Belum terverifikasi: ${notVerified.join(", ")}` : undefined,
      tab: "data",
      beforeAssessment: false,
    },
    {
      key: "permintaan",
      label: "Permintaan nasabah sudah ditanggapi",
      done: input.openCustomerRequests === 0,
      hint: input.openCustomerRequests ? `${input.openCustomerRequests} permintaan terbuka` : undefined,
      tab: "ringkasan",
      beforeAssessment: false,
    },
  );

  const done = items.filter(i => i.done).length;
  const missing = items.filter(i => !i.done);
  const readyToAssess = items.filter(i => i.beforeAssessment).every(i => i.done);
  return {
    percent: Math.round((done / items.length) * 100),
    items,
    missing,
    readyToAssess,
    stage: stageFor(input.status, readyToAssess),
  };
}

export function stageFor(status: string, readyToAssess: boolean): WorkflowStage {
  if (status === "approved" || status === "rejected" || status === "cancelled") return "selesai";
  if (status === "assessed") return "tinjau";
  return readyToAssess ? "nilai" : "lengkapi";
}

export type NextAction = { title: string; detail: string; tab: CompletenessItem["tab"] | "riwayat" };

/** Satu kalimat "apa yang harus dilakukan sekarang" sesuai tahap dan peran. */
export function nextAction(params: {
  stage: WorkflowStage;
  status: string;
  role: string | undefined;
  isOwnWork: boolean;
  completeness: Completeness;
}): NextAction {
  const { stage, role, isOwnWork, completeness } = params;
  const isMaker = role === "maker" || role === "admin";
  const isChecker = role === "checker" || role === "admin";
  if (stage === "selesai") {
    return {
      title: params.status === "approved" ? "Pengajuan disetujui" : params.status === "rejected" ? "Pengajuan ditolak" : "Pengajuan dibatalkan",
      detail: "Tidak ada tindakan lanjutan. Riwayat dan laporan tetap dapat dibuka.",
      tab: "riwayat",
    };
  }
  if (stage === "lengkapi") {
    const first = completeness.missing.find(i => i.beforeAssessment) ?? completeness.missing[0];
    return {
      title: isMaker ? "Lengkapi dokumen wajib" : "Menunggu maker melengkapi dokumen",
      detail: first?.hint ?? first?.label ?? "Unggah dokumen wajib sebelum penilaian.",
      tab: "data",
    };
  }
  if (stage === "nilai") {
    return {
      title: isMaker ? "Jalankan penilaian SSCI" : "Menunggu penilaian oleh maker",
      detail: "Dokumen wajib sudah ada. Tekan \"Lakukan Penilaian SSCI\"; pemeriksaan data dan asisten AI berjalan otomatis.",
      tab: "ringkasan",
    };
  }
  // tinjau
  const pending = completeness.missing.filter(i => i.key !== "format_bprs");
  if (isChecker && !isOwnWork) {
    return pending.length
      ? { title: "Lengkapi syarat sebelum memutuskan", detail: pending.map(i => i.hint ?? i.label).join("; "), tab: pending[0]!.tab }
      : { title: "Siap diputuskan", detail: "Semua syarat terpenuhi. Baca ringkasan komite, lalu Setujui atau Tolak.", tab: "ringkasan" };
  }
  return {
    title: "Menunggu keputusan checker",
    detail: pending.length ? `Masih kurang: ${pending.map(i => i.hint ?? i.label).join("; ")}` : "Semua syarat terpenuhi.",
    tab: pending[0]?.tab ?? "ringkasan",
  };
}

type LegalDocument = { type: string; status: string; notes?: string };

const UPLOAD_TO_LEGAL_STATUS: Record<string, string> = {
  verified: "verified",
  uploaded: "complete",
  rejected: "missing",
};

/**
 * Status dokumen legal diambil dari unggahan nyata (dan verifikasi checker),
 * bukan dari pilihan manual di formulir. Dokumen tanpa unggahan memakai status
 * yang diisi analis, tetapi tidak bisa "terverifikasi" tanpa berkas.
 */
export function syncLegalDocuments(legalDocuments: LegalDocument[], uploads: Array<{ documentType: string; status: string }>): LegalDocument[] {
  const uploadStatus = new Map(uploads.map(u => [u.documentType.toUpperCase(), u.status]));
  return legalDocuments.map(doc => {
    const uploaded = uploadStatus.get(doc.type.toUpperCase());
    if (uploaded) return { ...doc, status: UPLOAD_TO_LEGAL_STATUS[uploaded] ?? doc.status };
    return doc.status === "verified" ? { ...doc, status: "complete" } : doc;
  });
}
