import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
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
  rendah: "bg-[#eef2f8] text-navy-900 border-[#cfd8e8]",
};

function FindingList({ items, source }: { items: Finding[]; source: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${severityTone[item.severity]}`}>
          <span className="mt-0.5 shrink-0 rounded-full border border-current/30 px-1.5 text-[10px] font-bold uppercase">{item.severity}</span>
          <span className="flex-1"><span className="font-semibold">{item.field}: </span>{item.message}</span>
          <span className="shrink-0 text-[10px] font-semibold uppercase opacity-70">{source}</span>
        </li>
      ))}
    </ul>
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

  const start = () => {
    if (blocking.length > 0) setOpen(true);
    else onAssess();
  };

  return (
    <>
      <Button onClick={start} disabled={pending || check.isLoading}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Lakukan Penilaian SSCI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl text-navy-900">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Konfirmasi temuan pemeriksaan data
            </DialogTitle>
            <DialogDescription>
              Skor SSCI dihitung dari data yang diisi. Temuan berikut akan dicantumkan di Faktor Risiko, narasi, dan laporan PDF.
              Perbaiki datanya terlebih dahulu, atau lanjutkan dengan catatan konfirmasi yang tersimpan di jejak audit.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto">
            <FindingList items={issues} source="Aturan" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data-check-note">Catatan konfirmasi analis</Label>
            <Textarea
              id="data-check-note"
              rows={3}
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Contoh: NIK sudah dicocokkan dengan KTP asli; margin 0% karena akad qardh salah input dan akan dikoreksi."
            />
            <p className="text-xs text-muted-foreground">Minimal 10 karakter.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Perbaiki data dulu</Button>
            <Button
              disabled={note.trim().length < 10 || pending}
              onClick={() => {
                setOpen(false);
                onAssess(note.trim());
              }}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          <ClipboardCheck className="h-5 w-5 text-gold-500" />
          Pemeriksaan data
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(dataChecks.checkedAt).toLocaleString("id-ID")}
          {dataChecks.aiStatus === "unavailable" && " · AI tidak tersedia, hanya aturan otomatis"}
        </span>
      </div>
      {total === 0 ? (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />Tidak ditemukan ketidaksesuaian data.
        </p>
      ) : (
        <>
          {dataChecks.ruleIssues.length > 0 && <FindingList items={dataChecks.ruleIssues} source="Aturan" />}
          {dataChecks.aiNotes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Catatan AI (tidak memengaruhi skor)</p>
              <FindingList items={dataChecks.aiNotes} source="AI" />
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
