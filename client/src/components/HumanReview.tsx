import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useConfirm } from "@/components/ConfirmDialog";
import { errorMessage } from "@/lib/errors";
import { Activity, AlertTriangle, CheckCircle2, Gavel, Loader2, RotateCw, UserCheck } from "lucide-react";
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300" aria-hidden="true"><Activity className="h-5 w-5" /></span>
            <div>
              <CardTitle as="h2" className="text-xl">Uji Sensitivitas Skor</CardTitle>
              <CardDescription>Seberapa besar skor berubah jika data pemohon bergeser ±10% dan ±20%, serta jika bobot pilar digeser 5 poin. Dihitung ulang dengan aturan SSCI yang sama, tanpa AI.</CardDescription>
            </div>
          </div>
          {!enabled && <Button onClick={() => setEnabled(true)}>Jalankan uji sensitivitas</Button>}
          {enabled && query.isError && (
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />}Coba lagi
            </Button>
          )}
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-5" aria-live="polite" aria-busy={query.isFetching}>
          {query.isLoading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Menghitung skenario...</p>}
          {query.error && <p role="alert" className="text-sm text-rose-700">Uji sensitivitas gagal: {errorMessage(query.error)}</p>}
          {data && (
            <>
              <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${data.stable ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                {data.stable ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                <div>
                  <p className="font-semibold">
                    {data.stable
                      ? `Klasifikasi "${data.base.classification}" stabil pada semua skenario ±20% dan pergeseran bobot.`
                      : `Klasifikasi "${data.base.classification}" dapat berubah pada sebagian skenario. Sel bertanda segitiga peringatan (latar merah) mengubah klasifikasi; klasifikasi barunya tertulis di bawah angka.`}
                  </p>
                  <p className="mt-0.5">Skor dasar {data.base.totalScore.toFixed(1)}.{data.mostSensitive ? ` Input paling berpengaruh: ${data.mostSensitive}.` : ""}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="sr-only">Perubahan skor total per skenario perubahan input</caption>
                  <thead className="bg-ivory text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 text-left">Input</th>
                      {data.inputs[0]?.points.map(p => <th key={p.changePct} scope="col" className="px-3 py-2.5 text-center">{fmtPct(p.changePct)}</th>)}
                      <th scope="col" className="px-3 py-2.5 text-left">Klasifikasi berubah jika</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inputs.map(input => (
                      <tr key={input.key} className="border-t border-border/70">
                        <th scope="row" className="px-3 py-2 text-left font-medium text-navy-900">{input.label}</th>
                        {input.points.map(point => {
                          const flipped = point.classification !== data.base.classification;
                          return (
                            <td key={point.changePct} className="px-2 py-1.5 text-center">
                              <span className={`inline-flex min-w-12 flex-col items-center rounded-md px-2 py-0.5 ${deltaTone(point.delta, flipped)}`}>
                                <span className="inline-flex items-center gap-1">
                                  {flipped && <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                  {fmtDelta(point.delta)}
                                </span>
                                {flipped && <span className="whitespace-nowrap text-xs font-normal">{point.classification}</span>}
                                {flipped && <span className="sr-only">, klasifikasi berubah</span>}
                              </span>
                            </td>
                          );
                        })}
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
                        {flipped && <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-rose-800"><AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />Klasifikasi berubah</p>}
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
  const { promptReason } = useConfirm();
  const [classification, setClassification] = useState<Classification | "">("");
  const [reason, setReason] = useState("");
  const mutation = trpc.applications.overrideClassification.useMutation({
    onSuccess: async (_data, variables) => {
      setReason("");
      setClassification("");
      await utils.assessments.getWithApplication.invalidate({ applicationId });
      await utils.applications.exitGate.invalidate({ applicationId });
      await utils.applications.listActivity.invalidate({ applicationId });
      toast.success(variables.classification ? "Hasil peninjauan disimpan dan tercatat di audit." : "Hasil peninjauan dibatalkan.");
    },
    onError: error => toast.error(errorMessage(error, "Hasil peninjauan gagal disimpan.")),
  });
  const reasonLength = reason.trim().length;
  const cancelOverride = async () => {
    const cancelReason = await promptReason({
      title: "Batalkan hasil peninjauan?",
      description: `Klasifikasi kembali ke hasil sistem (${assessment.classification}). Pembatalan dan alasannya tercatat di audit.`,
      label: "Alasan membatalkan peninjauan",
      placeholder: "Contoh: Data pendapatan musiman sudah dikoreksi analis, sehingga klasifikasi sistem kini mencerminkan kondisi nasabah.",
      minLength: 20,
      confirmLabel: "Ya, batalkan peninjauan",
      cancelLabel: "Kembali",
      destructive: true,
    });
    if (!cancelReason || mutation.isPending) return;
    mutation.mutate({ applicationId, classification: null, reason: cancelReason });
  };
  const hasOverride = Boolean(assessment.overrideClassification);
  const options = CLASSIFICATIONS.filter(c => c !== assessment.classification);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300" aria-hidden="true"><Gavel className="h-5 w-5" /></span>
          <div>
            <CardTitle as="h2" className="text-xl">Peninjauan oleh Pejabat Berwenang</CardTitle>
            <CardDescription>Checker dapat mengoreksi klasifikasi sistem dengan alasan tertulis. Skor dan klasifikasi asli tetap tersimpan, dan setiap perubahan tercatat di audit.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasOverride ? (
          <div className="rounded-xl border border-gold-400/50 bg-gold-50 p-4 text-sm text-navy-900">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              <UserCheck className="h-4 w-4 text-navy-900" aria-hidden="true" />
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
              if (!classification || reasonLength < 20 || mutation.isPending) return;
              mutation.mutate({ applicationId, classification, reason: reason.trim() });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="override-classification">Klasifikasi hasil peninjauan</Label>
                <Select value={classification} onValueChange={v => setClassification(v as Classification)}>
                  <SelectTrigger id="override-classification" className="w-full"><SelectValue placeholder="Pilih klasifikasi" /></SelectTrigger>
                  <SelectContent>{options.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="override-reason">Alasan mengubah klasifikasi</Label>
                <Textarea
                  id="override-reason"
                  rows={3}
                  maxLength={2000}
                  aria-describedby="override-reason-hint"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Contoh: Pendapatan musiman Ramadan tidak tercermin dalam data 3 bulan; verifikasi lapangan menunjukkan arus kas stabil."
                />
                <p id="override-reason-hint" className={`text-xs ${reasonLength > 0 && reasonLength < 20 ? "text-amber-800" : "text-muted-foreground"}`} aria-live="polite">
                  {reasonLength}/20 karakter minimum. Alasan ini juga dicantumkan di laporan PDF.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!classification || reasonLength < 20 || mutation.isPending}>
                {mutation.isPending && mutation.variables?.classification && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Simpan hasil peninjauan
              </Button>
              {hasOverride && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={mutation.isPending}
                  onClick={cancelOverride}
                >
                  {mutation.isPending && mutation.variables?.classification === null && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Batalkan hasil peninjauan
                </Button>
              )}
            </div>
          </form>
        ) : (
          blockedReason && <p className="text-sm text-muted-foreground">{blockedReason}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ExitGatePanel({ applicationId }: { applicationId: number }) {
  const query = trpc.applications.exitGate.useQuery({ applicationId });
  const gate = query.data;
  if (!gate) {
    if (query.isError) {
      return (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Syarat persetujuan tidak dapat dimuat: {errorMessage(query.error)}{" "}
          <Button variant="link" size="sm" className="h-auto px-0 text-amber-900 underline" onClick={() => query.refetch()} disabled={query.isFetching}>Coba lagi</Button>
        </div>
      );
    }
    return (
      <div role="status" className="space-y-2 rounded-xl border border-border bg-white p-4" aria-label="Memuat syarat persetujuan">
        <div className="h-4 w-1/2 animate-pulse rounded bg-navy-50" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-navy-50" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-navy-50" />
      </div>
    );
  }
  return (
    <div className={`rounded-xl border p-4 text-sm ${gate.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`} aria-live="polite">
      <h2 className="mb-2 font-semibold text-navy-900">
        Syarat persetujuan {gate.track === "ringkas" ? "jalur ringkas" : "jalur lengkap"}{" "}
        <span className={`ml-1 text-xs font-bold ${gate.passed ? "text-emerald-800" : "text-amber-800"}`}>{gate.passed ? "terpenuhi" : "belum terpenuhi"}</span>
      </h2>
      <ul className="space-y-1">
        {gate.items.map(item => (
          <li key={item.label} className="flex items-center gap-2">
            {item.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />}
            <span className={item.ok ? "text-navy-900" : "text-amber-900"}>{item.label}<span className="sr-only">{item.ok ? " (terpenuhi)" : " (belum terpenuhi)"}</span></span>
          </li>
        ))}
      </ul>
      {!gate.passed && <p className="mt-2 text-xs text-amber-900">Pengajuan tetap dapat ditolak. Tombol Setujui aktif setelah semua syarat terpenuhi.</p>}
    </div>
  );
}
