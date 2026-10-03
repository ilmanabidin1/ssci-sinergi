import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, CheckCircle2, Gavel, Loader2, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CLASSIFICATIONS = ["Sangat Layak", "Layak", "Perlu Pengawasan", "Tidak Layak"] as const;
type Classification = (typeof CLASSIFICATIONS)[number];

const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n}%`;
const fmtDelta = (n: number) => (n === 0 ? "0" : `${n > 0 ? "+" : ""}${n.toFixed(1)}`);

function deltaTone(delta: number, flipped: boolean) {
  if (flipped) return "bg-rose-100 text-rose-800 font-semibold ring-1 ring-rose-300";
  if (delta === 0) return "text-muted-foreground";
  return delta > 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900";
}

export function SensitivityPanel({ applicationId }: { applicationId: number }) {
  const [enabled, setEnabled] = useState(false);
  const query = trpc.applications.sensitivity.useQuery({ applicationId }, { enabled });
  const data = query.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300"><Activity className="h-5 w-5" /></span>
            <div>
              <CardTitle className="text-xl">Uji Sensitivitas Skor</CardTitle>
              <CardDescription>Seberapa besar skor berubah jika data pemohon bergeser ±10% dan ±20%, serta jika bobot pilar digeser 5 poin. Dihitung ulang dengan aturan SSCI yang sama, tanpa AI.</CardDescription>
            </div>
          </div>
          {!enabled && <Button onClick={() => setEnabled(true)}>Jalankan uji sensitivitas</Button>}
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-5">
          {query.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Menghitung skenario...</p>}
          {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}
          {data && (
            <>
              <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${data.stable ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                {data.stable ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="font-semibold">
                    {data.stable
                      ? `Klasifikasi "${data.base.classification}" stabil pada semua skenario ±20% dan pergeseran bobot.`
                      : `Klasifikasi "${data.base.classification}" dapat berubah pada sebagian skenario. Sel merah menandai skenario yang mengubah klasifikasi.`}
                  </p>
                  <p className="mt-0.5">Skor dasar {data.base.totalScore.toFixed(1)}.{data.mostSensitive ? ` Input paling berpengaruh: ${data.mostSensitive}.` : ""}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-ivory text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Input</th>
                      {data.inputs[0]?.points.map(p => <th key={p.changePct} className="px-3 py-2.5 text-center">{fmtPct(p.changePct)}</th>)}
                      <th className="px-3 py-2.5 text-left">Klasifikasi berubah jika</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inputs.map(input => (
                      <tr key={input.key} className="border-t border-border/70">
                        <td className="px-3 py-2 font-medium text-navy-900">{input.label}</td>
                        {input.points.map(point => (
                          <td key={point.changePct} className="px-2 py-1.5 text-center">
                            <span className={`inline-block min-w-12 rounded-md px-2 py-0.5 ${deltaTone(point.delta, point.classification !== data.base.classification)}`} title={point.classification}>
                              {fmtDelta(point.delta)}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {[input.flipAtPct.down !== null && `turun ${Math.abs(input.flipAtPct.down)}%`, input.flipAtPct.up !== null && `naik ${input.flipAtPct.up}%`].filter(Boolean).join(" atau ") || "tidak berubah dalam ±50%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Sensitivitas bobot pilar (55/25/20)</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.weights.map(w => {
                    const flipped = w.classification !== data.base.classification;
                    return (
                      <div key={w.label} className={`rounded-lg border px-3 py-2 text-sm ${flipped ? "border-rose-300 bg-rose-50" : "border-border bg-white"}`}>
                        <p className="text-xs text-muted-foreground">{w.label} ({w.weights.sustainableFinance}/{w.weights.sharia}/{w.weights.legal})</p>
                        <p className="font-semibold text-navy-900">{w.totalScore.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">({fmtDelta(w.delta)}) {w.classification}</span></p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Angka di tabel adalah perubahan skor total. Hasil ini alat bantu analisis dan tidak mengubah penilaian yang tersimpan.</p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

type OverrideAssessment = {
  classification: string;
  totalScore: string | number;
  overrideClassification?: string | null;
  overrideReason?: string | null;
  overriddenAt?: string | Date | null;
};

export function OverridePanel({
  applicationId,
  assessment,
  canReview,
  blockedReason,
}: {
  applicationId: number;
  assessment: OverrideAssessment;
  canReview: boolean;
  blockedReason?: string;
}) {
  const utils = trpc.useUtils();
  const [classification, setClassification] = useState<Classification | "">("");
  const [reason, setReason] = useState("");
  const mutation = trpc.applications.overrideClassification.useMutation({
    onSuccess: async (_data, variables) => {
      setReason("");
      setClassification("");
      await utils.assessments.getWithApplication.invalidate({ applicationId });
      toast.success(variables.classification ? "Hasil peninjauan disimpan dan tercatat di audit." : "Hasil peninjauan dibatalkan.");
    },
    onError: error => toast.error(error.message),
  });
  const hasOverride = Boolean(assessment.overrideClassification);
  const options = CLASSIFICATIONS.filter(c => c !== assessment.classification);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300"><Gavel className="h-5 w-5" /></span>
          <div>
            <CardTitle className="text-xl">Peninjauan oleh Pejabat Berwenang</CardTitle>
            <CardDescription>Checker dapat mengoreksi klasifikasi sistem dengan alasan tertulis. Skor dan klasifikasi asli tetap tersimpan, dan setiap perubahan tercatat di audit.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasOverride ? (
          <div className="rounded-xl border border-gold-400/50 bg-gold-50 p-4 text-sm text-navy-900">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              <UserCheck className="h-4 w-4 text-gold-500" />
              Klasifikasi hasil peninjauan: {assessment.overrideClassification}
              <span className="font-normal text-muted-foreground">(sistem: {assessment.classification}, skor {Number(assessment.totalScore).toFixed(1)})</span>
            </p>
            <p className="mt-2"><span className="font-semibold">Alasan: </span>{assessment.overrideReason}</p>
            {assessment.overriddenAt && <p className="mt-1 text-xs text-muted-foreground">Ditinjau {new Date(assessment.overriddenAt).toLocaleString("id-ID")}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada peninjauan. Klasifikasi yang berlaku adalah hasil sistem: <span className="font-semibold text-navy-900">{assessment.classification}</span>.</p>
        )}

        {canReview ? (
          <form
            className="space-y-3"
            onSubmit={event => {
              event.preventDefault();
              if (!classification) return;
              mutation.mutate({ applicationId, classification, reason: reason.trim() });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <Label>Klasifikasi hasil peninjauan</Label>
                <Select value={classification} onValueChange={v => setClassification(v as Classification)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih klasifikasi" /></SelectTrigger>
                  <SelectContent>{options.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="override-reason">Alasan peninjauan</Label>
                <Textarea
                  id="override-reason"
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Contoh: Pendapatan musiman Ramadan tidak tercermin dalam data 3 bulan; verifikasi lapangan menunjukkan arus kas stabil."
                />
                <p className="text-xs text-muted-foreground">Minimal 20 karakter. Alasan ini juga dicantumkan di laporan PDF.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!classification || reason.trim().length < 20 || mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan hasil peninjauan
              </Button>
              {hasOverride && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={reason.trim().length < 20 || mutation.isPending}
                  onClick={() => mutation.mutate({ applicationId, classification: null, reason: reason.trim() })}
                >
                  Batalkan peninjauan (isi alasan)
                </Button>
              )}
            </div>
          </form>
        ) : (
          blockedReason && <p className="text-xs text-muted-foreground">{blockedReason}</p>
        )}
      </CardContent>
    </Card>
  );
}
