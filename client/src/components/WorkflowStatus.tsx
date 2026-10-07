import { trpc } from "@/lib/trpc";
import { STAGES, nextAction, type CompletenessItem } from "@shared/workflow";
import { TRACK_LABELS } from "@shared/reviewTrack";
import { ArrowRight, Check, CircleDashed } from "lucide-react";

export type DetailTab = CompletenessItem["tab"] | "riwayat";

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
  if (!data) return null;
  const { completeness, track } = data;
  const stageIndex = STAGES.findIndex(s => s.key === completeness.stage);
  const action = nextAction({ stage: completeness.stage, status, role, isOwnWork, completeness });
  const finished = completeness.stage === "selesai";

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <ol className="grid grid-cols-4 border-b border-border text-xs sm:text-sm">
        {STAGES.map((stage, i) => {
          const done = i < stageIndex || finished;
          const current = i === stageIndex && !finished;
          return (
            <li
              key={stage.key}
              className={`flex items-center justify-center gap-1.5 px-2 py-3 font-medium ${current ? "bg-navy-900 text-white" : done ? "bg-[#eef2f8] text-navy-900" : "text-muted-foreground"}`}
            >
              {done ? <Check className="h-4 w-4 shrink-0" /> : <span className="hidden sm:inline">{i + 1}.</span>}
              <span>{stage.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_minmax(0,320px)] md:items-center">
        <button type="button" onClick={() => onNavigate(action.tab)} className="group flex items-start gap-3 text-left">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-500"><ArrowRight className="h-4 w-4" /></span>
          <span className="min-w-0">
            <span className="block font-semibold text-navy-900 group-hover:underline">{action.title}</span>
            <span className="block text-sm text-muted-foreground">{action.detail}</span>
          </span>
        </button>
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Kelengkapan · {TRACK_LABELS[track]}</span>
            <span className="font-serif text-lg text-navy-900">{completeness.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e6ebf3]">
            <div className={`h-full rounded-full transition-all ${completeness.percent === 100 ? "bg-emerald-600" : "bg-gold-400"}`} style={{ width: `${completeness.percent}%` }} />
          </div>
          {completeness.missing.length > 0 && !finished && (
            <ul className="mt-2 space-y-1">
              {completeness.missing.slice(0, 4).map(item => (
                <li key={item.key}>
                  <button type="button" onClick={() => onNavigate(item.tab)} className="flex w-full items-start gap-1.5 text-left text-xs text-muted-foreground hover:text-navy-900">
                    <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
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
