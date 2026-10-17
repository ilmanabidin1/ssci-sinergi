import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

export type CheckerDecision = "approved" | "rejected";

export type DecisionGate = {
  passed: boolean;
  track: string;
  items: Array<{ label: string; ok: boolean }>;
};

const MAX_NOTES = 2000;

/**
 * Dialog keputusan checker (Setujui/Tolak). Menampilkan ringkasan pengajuan dan
 * status syarat persetujuan, dan catatan hanya dikosongkan setelah keputusan
 * benar-benar tersimpan, sehingga isian tidak hilang bila server menolak.
 */
export function DecisionDialog({
  decision,
  onClose,
  onSubmit,
  pending,
  error,
  summary,
  gate,
  gateLoading,
}: {
  decision: CheckerDecision | null;
  onClose: () => void;
  /** Mengembalikan true jika keputusan tersimpan. */
  onSubmit: (decision: CheckerDecision, notes: string) => Promise<boolean>;
  pending: boolean;
  error: string | null;
  summary: {
    customerName: string;
    businessName?: string | null;
    ticket: string;
    plafon: string;
    tenor: string;
    classification: string;
    systemClassification?: string | null;
    score: string;
  };
  gate: DecisionGate | undefined;
  gateLoading: boolean;
}) {
  const [notes, setNotes] = useState<Record<CheckerDecision, string>>({ approved: "", rejected: "" });
  const [touched, setTouched] = useState(false);
  const current = decision ?? "approved";
  const text = notes[current];
  const isApprove = current === "approved";
  const blockedByGate = isApprove && (!gate || !gate.passed);
  const empty = text.trim().length === 0;

  const submit = async () => {
    setTouched(true);
    if (!decision || empty || blockedByGate || pending) return;
    const saved = await onSubmit(decision, text.trim());
    if (saved) {
      setNotes(prev => ({ ...prev, [decision]: "" }));
      setTouched(false);
    }
  };

  return (
    <AlertDialog open={decision !== null} onOpenChange={open => { if (!open && !pending) onClose(); }}>
      <AlertDialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
        onOpenAutoFocus={event => {
          // Fokus langsung ke kolom catatan, bukan tombol Kembali bawaan AlertDialog.
          event.preventDefault();
          document.getElementById("decision-notes")?.focus();
        }}
      >
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void submit();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-navy-900">
              {isApprove ? "Setujui pembiayaan" : "Tolak pembiayaan"} {summary.customerName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Keputusan ini final, tercatat di jejak audit, dan tidak dapat diubah setelah disimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-ivory p-4 text-sm">
            <div className="col-span-2 min-w-0">
              <dt className="text-xs text-muted-foreground">Nasabah</dt>
              <dd className="break-words font-medium text-navy-900">
                {summary.customerName}{summary.businessName ? `, ${summary.businessName}` : ""} ({summary.ticket})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Plafon diajukan</dt>
              <dd className="font-medium text-navy-900">{summary.plafon}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tenor</dt>
              <dd className="font-medium text-navy-900">{summary.tenor}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Klasifikasi</dt>
              <dd className="font-medium text-navy-900">
                {summary.classification}
                {summary.systemClassification && summary.systemClassification !== summary.classification && (
                  <span className="block text-xs font-normal text-muted-foreground">Sistem: {summary.systemClassification}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Skor SSCI</dt>
              <dd className="font-medium text-navy-900">{summary.score}</dd>
            </div>
          </dl>

          <div
            className={`rounded-xl border p-3 text-sm ${gate?.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            aria-live="polite"
          >
            {gateLoading ? (
              <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Memeriksa syarat persetujuan...</p>
            ) : !gate ? (
              <p className="text-amber-900">Syarat persetujuan tidak dapat dimuat. Persetujuan belum dapat diberikan; penolakan tetap dapat disimpan.</p>
            ) : (
              <>
                <p className="mb-1.5 font-semibold text-navy-900">
                  Syarat persetujuan {gate.track === "ringkas" ? "jalur ringkas" : "jalur lengkap"}: {gate.passed ? "terpenuhi" : "belum terpenuhi"}
                </p>
                <ul className="space-y-1">
                  {gate.items.map(item => (
                    <li key={item.label} className="flex items-start gap-2">
                      {item.ok
                        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />}
                      <span className={item.ok ? "text-navy-900" : "text-amber-900"}>
                        {item.label}<span className="sr-only">{item.ok ? " (terpenuhi)" : " (belum terpenuhi)"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {blockedByGate && <p className="mt-2 text-xs text-amber-900">Lengkapi syarat di atas sebelum menyetujui. Pengajuan tetap dapat ditolak.</p>}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision-notes">{isApprove ? "Catatan persetujuan" : "Alasan penolakan"}</Label>
            <Textarea
              id="decision-notes"
              rows={5}
              value={text}
              maxLength={MAX_NOTES}
              aria-invalid={touched && empty}
              aria-describedby="decision-notes-hint"
              placeholder={isApprove
                ? "Contoh: Disetujui sesuai rekomendasi plafon, dengan syarat pengikatan agunan dilakukan sebelum pencairan."
                : "Contoh: Kapasitas angsuran melebihi batas DSR 40% dan agunan belum dapat diverifikasi."}
              onChange={event => setNotes(prev => ({ ...prev, [current]: event.target.value }))}
            />
            <p id="decision-notes-hint" className={`text-xs ${touched && empty ? "text-destructive" : "text-muted-foreground"}`}>
              {touched && empty ? "Wajib diisi. " : ""}{text.trim().length}/{MAX_NOTES} karakter. Catatan dicantumkan di riwayat dan laporan.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Keputusan belum tersimpan: {error} Catatan Anda tetap tersimpan di kolom di atas.
            </p>
          )}

          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel type="button" disabled={pending}>Kembali</AlertDialogCancel>
            <Button
              type="submit"
              variant={isApprove ? "default" : "destructive"}
              disabled={pending || empty || blockedByGate}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {pending ? "Menyimpan..." : isApprove ? "Ya, setujui" : "Ya, tolak pengajuan"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
