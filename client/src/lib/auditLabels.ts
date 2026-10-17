export type AuditTone = "neutral" | "positive" | "negative" | "warning" | "info";

/** Label dan warna per kode aksi yang dicatat server (lihat recordAuditEvent). */
export const ACTION_META: Record<string, { label: string; tone: AuditTone }> = {
  APPLICATION_CREATED: { label: "Pengajuan dibuat", tone: "info" },
  APPLICATION_CANCELLED: { label: "Pengajuan dibatalkan", tone: "warning" },
  APPLICATION_APPROVED: { label: "Pengajuan disetujui", tone: "positive" },
  APPLICATION_REJECTED: { label: "Pengajuan ditolak", tone: "negative" },
  ASSESSMENT_CREATED: { label: "Penilaian dibuat", tone: "info" },
  ASSESSMENT_DELETED: { label: "Penilaian dihapus", tone: "negative" },
  CLASSIFICATION_OVERRIDDEN: { label: "Klasifikasi diubah manual", tone: "warning" },
  CLASSIFICATION_OVERRIDE_CLEARED: { label: "Ubahan klasifikasi dihapus", tone: "neutral" },
  BPRS_PROFILE_UPDATED: { label: "Profil BPRS pengajuan diperbarui", tone: "neutral" },
  BPRS_EXCEL_EXPORTED: { label: "Workbook BPRS diekspor", tone: "neutral" },
  REPORT_EXPORTED: { label: "Laporan diekspor", tone: "neutral" },
  BULK_EXPORTED: { label: "Ekspor data massal", tone: "warning" },
  SLIK_EXPORTED: { label: "Ekspor SLIK", tone: "warning" },
  NIK_REVEALED: { label: "NIK dibuka", tone: "warning" },
  CUSTOMER_REQUEST_CREATED: { label: "Permintaan nasabah masuk", tone: "info" },
  CUSTOMER_REQUEST_RESOLVED: { label: "Permintaan nasabah diselesaikan", tone: "positive" },
  DOCUMENT_REJECTED: { label: "Dokumen ditolak", tone: "negative" },
  TWO_FACTOR_ENABLED: { label: "2FA diaktifkan", tone: "positive" },
  TWO_FACTOR_DISABLED: { label: "2FA dinonaktifkan", tone: "negative" },
  TWO_FACTOR_RESET: { label: "2FA direset admin", tone: "warning" },
  PILOT_ADMIN_RECOVERED: { label: "Akun admin dipulihkan", tone: "warning" },
  ORGANIZATION_APPROVED: { label: "BPRS disetujui platform", tone: "positive" },
  ORGANIZATION_SUSPENDED: { label: "BPRS ditangguhkan platform", tone: "negative" },
};

export const TONE_CLASS: Record<AuditTone, string> = {
  neutral: "border-slate-300 bg-slate-100 text-slate-700",
  positive: "border-emerald-300 bg-emerald-50 text-emerald-800",
  negative: "border-red-300 bg-red-50 text-red-800",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-navy-200 bg-navy-50 text-navy-900",
};

export const ENTITY_LABEL: Record<string, string> = {
  application: "Pengajuan",
  assessment: "Penilaian",
  organization: "Organisasi",
  user: "Pengguna",
};

export function auditActionLabel(action: string) {
  return ACTION_META[action]?.label ?? action;
}
