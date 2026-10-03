import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { determineReviewTrack, estimateFromDailySales, FAST_TRACK_MAX_AMOUNT, TRACK_LABELS, TRACK_REQUIREMENTS } from "@shared/reviewTrack";
import { Calculator, ChevronDown, Route } from "lucide-react";
import { useState } from "react";

const num = (value: string) => Number(value.replace(/[^\d.]/g, "")) || 0;
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export function DailySalesCalculator<V extends Record<string, any>>({ setValues }: { setValues: React.Dispatch<React.SetStateAction<V>> }) {
  const [open, setOpen] = useState(false);
  const [dailySales, setDailySales] = useState("");
  const [days, setDays] = useState("26");
  const [cogs, setCogs] = useState("60");
  const [fixed, setFixed] = useState("");
  const ready = num(dailySales) > 0 && num(days) > 0;
  const estimate = ready
    ? estimateFromDailySales({ dailySales: num(dailySales), openDaysPerMonth: num(days), costOfGoodsPct: Math.min(num(cogs), 100), fixedMonthlyCosts: num(fixed) })
    : null;

  return (
    <div className="rounded-2xl border border-border bg-white">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2f8] text-navy-900"><Calculator className="h-4 w-4" /></span>
          <span>
            <span className="block font-semibold text-navy-900">Nasabah tidak punya laporan keuangan?</span>
            <span className="block text-sm text-muted-foreground">Hitung pendapatan dan pengeluaran bulanan dari omzet harian.</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="calc-daily">Omzet rata-rata per hari (Rp)</Label><Input id="calc-daily" inputMode="numeric" value={dailySales} onChange={e => setDailySales(e.target.value)} placeholder="800000" /></div>
            <div className="space-y-1.5"><Label htmlFor="calc-days">Hari buka per bulan</Label><Input id="calc-days" inputMode="numeric" value={days} onChange={e => setDays(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="calc-cogs">Modal/belanja barang (% dari omzet)</Label><Input id="calc-cogs" inputMode="numeric" value={cogs} onChange={e => setCogs(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="calc-fixed">Biaya tetap per bulan (sewa, listrik, gaji) (Rp)</Label><Input id="calc-fixed" inputMode="numeric" value={fixed} onChange={e => setFixed(e.target.value)} placeholder="1500000" /></div>
          </div>
          {estimate && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory p-3 text-sm">
              <span>Pendapatan <strong className="text-navy-900">{rp(estimate.monthlyRevenue)}</strong> · Pengeluaran <strong className="text-navy-900">{rp(estimate.monthlyExpenses)}</strong> per bulan</span>
              <Button
                type="button"
                size="sm"
                onClick={() => setValues(v => ({
                  ...v,
                  monthlyRevenue: String(estimate.monthlyRevenue),
                  monthlyExpenses: String(estimate.monthlyExpenses),
                  financialDataSource: "omzet_harian",
                  financialDataNote: estimate.note,
                }))}
              >
                Pakai angka ini
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Metode dan asumsi perhitungan ikut tersimpan di pengajuan, supaya komite tahu angka berasal dari estimasi omzet harian.</p>
        </div>
      )}
    </div>
  );
}

export function ReviewTrackHint({ requestedAmount, isRelatedParty }: { requestedAmount: string; isRelatedParty?: string }) {
  const amount = num(String(requestedAmount || ""));
  if (!amount) return null;
  const track = determineReviewTrack({ requestedAmount: amount, isRelatedParty });
  const req = TRACK_REQUIREMENTS[track];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${track === "ringkas" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-[#cfd8e8] bg-[#eef2f8] text-navy-900"}`}>
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
