import { trpc } from "@/lib/trpc";
import { STAGES, nextAction, type CompletenessItem } from "@shared/workflow";
import { TRACK_LABELS } from "@shared/reviewTrack";
import { ArrowRight, Check, CircleDashed } from "lucide-react";

export type DetailTab = CompletenessItem["tab"] | "riwayat";

const focusRing = "rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Penanda tahap, satu aksi berikutnya, dan bilah kelengkapan untuk halaman detail. */
export function WorkflowStatus({ applicationId, status, role, isOwnWork, onNavigate }: {
  applicationId: number;
  status: string;
  role: string | undefined;
  isOwnWork: boolean;
  onNavigate: (tab: DetailTab) => void;
}) {
  const query = trpc.applications.workflow.useQuery({ applicationId });
  const data = query.data;

  if (status === "cancelled") return null;

  if (!data) {
    if (query.isError) {
      return (
        <section role="alert" className="mb-6 rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground shadow-sm">
          Status alur kerja tidak dapat dimuat.{" "}
          <button type="button" className={`font-semibold text-navy-900 underline pointer-coarse:min-h-11 ${focusRing}`} onClick={() => query.refetch()}>Coba lagi</button>
        </section>
      );
    }
    // Kerangka setinggi panel asli agar tata letak tidak bergeser saat data tiba.
    return (
      <section className="mb-6 h-36 animate-pulse rounded-2xl border border-border bg-white shadow-sm" role="status" aria-label="Memuat status alur kerja">
        <div className="h-11 border-b border-border bg-navy-100" />
      </section>
    );
  }

  const { completeness, track } = data;
  const stageIndex = STAGES.findIndex(s => s.key === completeness.stage);
  const action = nextAction({ stage: completeness.stage, status, role, isOwnWork, completeness });
  const finished = completeness.stage === "selesai";

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm" aria-label="Status alur kerja">
      <ol className="grid grid-cols-4 border-b border-border text-xs sm:text-sm" aria-label="Tahap pengajuan">
        {STAGES.map((stage, i) => {
          const done = i < stageIndex || finished;
          const current = i === stageIndex && !finished;
          return (
            <li
              key={stage.key}
              aria-current={current ? "step" : undefined}
              className={`flex items-center justify-center gap-1.5 px-2 py-3 text-center font-medium ${current ? "bg-navy-900 text-white" : done ? "bg-navy-100 text-navy-900" : "text-muted-foreground"}`}
            >
              {done ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="hidden sm:inline" aria-hidden="true">{i + 1}.</span>}
              <span>{stage.label}</span>
              <span className="sr-only">{done ? " (selesai)" : current ? " (tahap saat ini)" : " (belum)"}</span>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_minmax(0,320px)] md:items-center">
        <button type="button" onClick={() => onNavigate(action.tab)} className={`group flex items-start gap-3 p-1 text-left pointer-coarse:min-h-11 ${focusRing}`}>
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300" aria-hidden="true"><ArrowRight className="h-4 w-4" /></span>
          <span className="min-w-0">
            <span className="block font-semibold text-navy-900 group-hover:underline">{action.title}</span>
            <span className="block text-sm text-muted-foreground">{action.detail}</span>
          </span>
        </button>
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span id={`completeness-${applicationId}`} className="font-semibold uppercase tracking-wide text-muted-foreground">Kelengkapan · {TRACK_LABELS[track]}</span>
            <span className="font-serif text-lg text-navy-900">{completeness.percent}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-navy-50"
            role="progressbar"
            aria-labelledby={`completeness-${applicationId}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completeness.percent}
          >
            <div className={`h-full rounded-full transition-all ${completeness.percent === 100 ? "bg-emerald-600" : "bg-gold-400"}`} style={{ width: `${completeness.percent}%` }} />
          </div>
          {completeness.missing.length > 0 && !finished && (
            <ul className="mt-2 space-y-1" aria-label="Yang masih kurang">
              {completeness.missing.slice(0, 4).map(item => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.tab)}
                    className={`flex w-full items-start gap-1.5 py-1 text-left text-xs text-muted-foreground hover:text-navy-900 hover:underline pointer-coarse:min-h-11 pointer-coarse:items-center ${focusRing}`}
                  >
                    <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 pointer-coarse:mt-0" aria-hidden="true" />
                    <span>{item.hint ?? item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
