import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Ban, CheckCircle2, Clock3, FileText, XCircle, type LucideIcon } from "lucide-react";

export type ApplicationStatus = "pending" | "assessed" | "approved" | "rejected" | "cancelled";

/** Label status pengajuan yang dipakai bersama di semua halaman. */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Menunggu penilaian",
  assessed: "Menunggu keputusan",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

const STATUS_STYLE: Record<ApplicationStatus, { className: string; Icon: LucideIcon }> = {
  pending: { className: "border-amber-300 bg-amber-50 text-amber-900", Icon: Clock3 },
  assessed: { className: "border-navy-200 bg-navy-50 text-navy-900", Icon: FileText },
  approved: { className: "border-emerald-300 bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  rejected: { className: "border-red-300 bg-red-50 text-red-800", Icon: XCircle },
  cancelled: { className: "border-slate-300 bg-slate-100 text-slate-700", Icon: Ban },
};

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return value in APPLICATION_STATUS_LABELS;
}

/** Badge status pengajuan dengan warna dan ikon yang konsisten (tidak hanya mengandalkan warna). */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  if (!isApplicationStatus(status)) {
    return <Badge variant="outline" className={className}>{status}</Badge>;
  }
  const { className: tone, Icon } = STATUS_STYLE[status];
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      <Icon aria-hidden="true" />
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
