import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { errorMessage } from "@/lib/errors";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2, RotateCw } from "lucide-react";
import { useState } from "react";

type Finding = { severity: "tinggi" | "sedang" | "rendah"; field: string; message: string };

type DataChecks = {
  ruleIssues: Finding[];
  aiNotes: Finding[];
  aiStatus: "generated" | "unavailable";
  acknowledgement: string | null;
  checkedAt: string;
};

const severityTone: Record<Finding["severity"], string> = {
  tinggi: "bg-rose-50 text-rose-800 border-rose-200",
  sedang: "bg-amber-50 text-amber-900 border-amber-200",
  rendah: "bg-navy-100 text-navy-900 border-navy-200",
};

const severityRank: Record<Finding["severity"], number> = { tinggi: 0, sedang: 1, rendah: 2 };

export function FindingList({ items, source }: { items: Finding[]; source: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={`flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2 text-sm ${severityTone[item.severity]}`}>
          <Badge variant="outline" className="mt-0.5 shrink-0 border-current/40 bg-white/60 text-xs font-semibold uppercase text-current">
            <span className="sr-only">Tingkat </span>{item.severity}
          </Badge>
          <span className="min-w-0 flex-1 break-words"><span className="font-semibold">{item.field}: </span>{item.message}</span>
          <span className="shrink-0 text-xs font-semibold uppercase"><span className="sr-only">Sumber: </span>{source}</span>
        </li>
      ))}
    </ul>
  );
}

/** Temuan tinggi/sedang di atas; temuan rendah (tidak memblokir) dilipat. */
function GroupedFindings({ items, source }: { items: Finding[]; source: string }) {
  const sorted = [...items].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const main = sorted.filter(item => item.severity !== "rendah");
  const minor = sorted.filter(item => item.severity === "rendah");
  return (
    <div className="space-y-2">
      {main.length > 0 && <FindingList items={main} source={source} />}
      {minor.length > 0 && (
        <details className="rounded-lg border border-border" open={main.length === 0}>
          <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-navy-900 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:min-h-11">
            {minor.length} temuan tingkat rendah (tidak memblokir)
          </summary>
          <div className="px-3 pb-3"><FindingList items={minor} source={source} /></div>
        </details>
      )}
    </div>
  );
}

export function AssessButtonWithDataCheck({
  applicationId,
  pending,
  onAssess,
}: {
  applicationId: number;
  pending: boolean;
  onAssess: (acknowledgement?: string) => void;
}) {
  const check = trpc.aiAssist.ruleCheck.useQuery({ applicationId });
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const issues = check.data?.issues ?? [];
  const blocking = issues.filter(issue => issue.severity !== "rendah");
  const checkFailed = check.isError;
  const noteLength = note.trim().length;

  const start = () => {
    if (pending) return;
    // Jika pemeriksaan otomatis gagal, jangan diam-diam menilai tanpa pemeriksaan.
    if (blocking.length > 0 || checkFailed) setOpen(true);
    else onAssess();
  };

  return (
    <>
      <Button onClick={start} disabled={pending || check.isLoading} aria-busy={pending || check.isLoading}>
        {(pending || check.isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {pending ? "Menilai... (sekitar 30 detik)" : check.isLoading ? "Memeriksa data..." : "Lakukan Penilaian SSCI"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl text-navy-900">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              {checkFailed ? "Pemeriksaan data otomatis gagal" : "Konfirmasi temuan pemeriksaan data"}
            </DialogTitle>
            <DialogDescription>
              {checkFailed
                ? "Pemeriksaan konsistensi data belum dapat dijalankan, sehingga temuan yang mungkin ada belum terlihat. Coba lagi, atau lanjutkan dengan catatan konfirmasi yang tersimpan di jejak audit."
                : "Skor SSCI dihitung dari data yang diisi. Temuan berikut akan dicantumkan di Faktor Risiko, narasi, dan laporan PDF. Perbaiki datanya terlebih dahulu, atau lanjutkan dengan catatan konfirmasi yang tersimpan di jejak audit."}
            </DialogDescription>
          </DialogHeader>
          {checkFailed ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <span>{errorMessage(check.error)}</span>
              <Button variant="outline" size="sm" onClick={() => check.refetch()} disabled={check.isFetching}>
                {check.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />}Coba lagi
              </Button>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <GroupedFindings items={issues} source="Aturan" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="data-check-note">Catatan konfirmasi analis</Label>
            <Textarea
              id="data-check-note"
              rows={3}
              value={note}
              onChange={event => setNote(event.target.value)}
              maxLength={1000}
              aria-describedby="data-check-note-hint"
              placeholder="Contoh: NIK sudah dicocokkan dengan KTP asli; margin 0% karena akad qardh salah input dan akan dikoreksi."
            />
            <p id="data-check-note-hint" className={`text-xs ${noteLength > 0 && noteLength < 10 ? "text-amber-800" : "text-muted-foreground"}`} aria-live="polite">
              {noteLength}/10 karakter minimum.
            </p>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Perbaiki data dulu</Button>
            <Button
              disabled={noteLength < 10 || pending}
              onClick={() => {
                setOpen(false);
                onAssess(note.trim());
              }}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Lanjutkan penilaian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DataChecksPanel({ dataChecks }: { dataChecks: DataChecks | null | undefined }) {
  if (!dataChecks) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        Penilaian ini dibuat sebelum pemeriksaan data otomatis tersedia. Jalankan tab Konsistensi data pada Asisten AI Penilaian untuk memeriksanya.
      </div>
    );
  }
  const total = dataChecks.ruleIssues.length + dataChecks.aiNotes.length;
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-navy-900">
          <ClipboardCheck className="h-5 w-5 text-amber-700" aria-hidden="true" />
          <h3>Pemeriksaan data</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(dataChecks.checkedAt).toLocaleString("id-ID")}
          {dataChecks.aiStatus === "unavailable" && " · AI tidak tersedia, hanya aturan otomatis"}
        </span>
      </div>
      {total === 0 ? (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />Tidak ditemukan ketidaksesuaian data.
        </p>
      ) : (
        <>
          {dataChecks.ruleIssues.length > 0 && <GroupedFindings items={dataChecks.ruleIssues} source="Aturan" />}
          {dataChecks.aiNotes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Catatan AI (tidak memengaruhi skor)</p>
              <GroupedFindings items={dataChecks.aiNotes} source="AI" />
            </div>
          )}
        </>
      )}
      {dataChecks.acknowledgement && (
        <div className="rounded-lg border border-gold-400/40 bg-gold-50 p-3 text-sm text-navy-900">
          <span className="font-semibold">Konfirmasi analis: </span>{dataChecks.acknowledgement}
        </div>
      )}
    </div>
  );
}
