import { RupiahInput } from "@/components/RupiahInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { determineReviewTrack, estimateFromDailySales, FAST_TRACK_MAX_AMOUNT, TRACK_LABELS, TRACK_REQUIREMENTS } from "@shared/reviewTrack";
import { Calculator, Check, ChevronDown, Route } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

/** Hanya digit yang dibaca, sehingga "800.000" (format ribuan Indonesia) terbaca 800000. */
const num = (value: string | number | undefined) => Number(String(value ?? "").replace(/[^\d]/g, "")) || 0;
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export function DailySalesCalculator<V extends Record<string, any>>({ setValues, defaultOpen = false }: { setValues: React.Dispatch<React.SetStateAction<V>>; defaultOpen?: boolean }) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [dailySales, setDailySales] = useState<number | undefined>(undefined);
  const [days, setDays] = useState("26");
  const [cogs, setCogs] = useState("60");
  const [fixed, setFixed] = useState<number | undefined>(undefined);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const daysNum = Math.min(num(days), 31);
  const cogsNum = Math.min(num(cogs), 100);
  const ready = (dailySales ?? 0) > 0 && daysNum > 0;
  const estimate = ready
    ? estimateFromDailySales({ dailySales: dailySales ?? 0, openDaysPerMonth: daysNum, costOfGoodsPct: cogsNum, fixedMonthlyCosts: fixed ?? 0 })
    : null;
  const inputKey = `${dailySales}|${daysNum}|${cogsNum}|${fixed}`;
  const applied = appliedKey === inputKey;

  const apply = () => {
    if (!estimate) return;
    setValues(v => ({
      ...v,
      monthlyRevenue: String(estimate.monthlyRevenue),
      monthlyExpenses: String(estimate.monthlyExpenses),
      financialDataSource: "omzet_harian",
      financialDataNote: estimate.note,
    }));
    setAppliedKey(inputKey);
    toast.success("Pendapatan dan pengeluaran bulanan diisi dari estimasi omzet harian.");
  };

  return (
    <div className="rounded-2xl border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400/50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-navy-900"><Calculator className="h-4 w-4" /></span>
          <span>
            <span className="block font-semibold text-navy-900">Hitung dari omzet harian</span>
            <span className="block text-sm text-muted-foreground">Untuk nasabah tanpa laporan keuangan: perkirakan pendapatan dan pengeluaran bulanan.</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="space-y-4 border-t border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="calc-daily">Omzet rata-rata per hari</Label><RupiahInput id="calc-daily" value={dailySales} onValueChange={setDailySales} placeholder="800.000" /></div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-days">Hari buka per bulan</Label>
              <Input id="calc-days" inputMode="numeric" maxLength={2} value={days} onChange={e => setDays(e.target.value.replace(/\D/g, ""))} aria-describedby="calc-days-help" />
              <p id="calc-days-help" className="text-xs text-muted-foreground">1 sampai 31 hari.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-cogs">Modal/belanja barang (dari omzet)</Label>
              <div className="relative">
                <Input id="calc-cogs" inputMode="numeric" maxLength={3} value={cogs} onChange={e => { const digits = e.target.value.replace(/\D/g, ""); setCogs(digits === "" ? "" : String(Math.min(Number(digits), 100))); }} className="pr-9 tabular-nums" aria-describedby="calc-cogs-help" />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground" aria-hidden="true">%</span>
              </div>
              <p id="calc-cogs-help" className="text-xs text-muted-foreground">0 sampai 100 persen.</p>
            </div>
            <div className="space-y-1.5"><Label htmlFor="calc-fixed">Biaya tetap per bulan (sewa, listrik, gaji)</Label><RupiahInput id="calc-fixed" value={fixed} onValueChange={setFixed} placeholder="1.500.000" /></div>
          </div>
          <div role="status" aria-live="polite">
            {estimate && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory p-3 text-sm">
                <span>Pendapatan <strong className="text-navy-900">{rp(estimate.monthlyRevenue)}</strong>, pengeluaran <strong className="text-navy-900">{rp(estimate.monthlyExpenses)}</strong> per bulan</span>
                {applied
                  ? <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" />Sudah dipakai</span>
                  : <Button type="button" onClick={apply}>Pakai angka ini</Button>}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Metode dan asumsi perhitungan ikut tersimpan di pengajuan, supaya komite tahu angka berasal dari estimasi omzet harian.</p>
        </div>
      )}
    </div>
  );
}

export function ReviewTrackHint({ requestedAmount, isRelatedParty }: { requestedAmount: string; isRelatedParty?: string }) {
  const amount = Number(String(requestedAmount || "").replace(/[^\d.]/g, "")) || 0;
  if (!amount) return null;
  const track = determineReviewTrack({ requestedAmount: amount, isRelatedParty });
  const req = TRACK_REQUIREMENTS[track];
  return (
    <div role="status" aria-live="polite" className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${track === "ringkas" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-border bg-muted text-navy-900"}`}>
      <Route className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <strong>{TRACK_LABELS[track]}.</strong>{" "}
        {track === "ringkas"
          ? `Plafon sampai ${rp(FAST_TRACK_MAX_AMOUNT)} dan bukan pihak terkait. Sebelum diputuskan cukup KTP terverifikasi.`
          : `Sebelum diputuskan wajib: ${req.verifiedDocuments.join(", ")} terverifikasi dan minimal ${req.minSurveyPhotos} foto survei lapangan.`}
      </span>
    </div>
  );
}
