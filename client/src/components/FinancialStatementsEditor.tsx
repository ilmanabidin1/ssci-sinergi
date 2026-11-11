import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RupiahInput } from "@/components/RupiahInput";
import { cn } from "@/lib/utils";
import {
  LABA_RUGI_FIELDS,
  NERACA_AKTIVA_LANCAR,
  NERACA_AKTIVA_TETAP,
  NERACA_KEWAJIBAN,
  NERACA_MODAL,
  SIGNED_KEYS,
  benchmarkText,
  computeRatios,
  periodTotals,
  type FinancialPeriod,
  type FinancialStatements,
  type RatioResult,
} from "@shared/financialStatements";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

type Period = "previous" | "current";
const PERIODS: Array<{ key: Period; title: string }> = [
  { key: "previous", title: "Tahun lalu" },
  { key: "current", title: "Periode berjalan" },
];

export const rupiahText = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const abs = Math.round(Math.abs(value)).toLocaleString("id-ID");
  return value < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
};

export const ratioText = (ratio: Pick<RatioResult, "value" | "percent">) =>
  ratio.value === null ? "-" : ratio.percent ? `${ratio.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : `${ratio.value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}x`;

/** Id kolom isian, dipakai juga untuk memetakan pesan error dan fokus. */
export const fsFieldId = (period: Period, group: "neraca" | "labaRugi", key: string) => `fs-${period}-${group}-${key}`;
export const fsBalanceId = (period: Period) => `fs-${period}-balance`;
export const fsLabelId = (period: Period) => `fs-${period}-label`;

/** Nominal yang boleh negatif (akumulasi rugi): tanda minus diketik di depan angka. */
function SignedMoneyInput({ id, value, onValueChange, disabled, invalid, describedBy }: { id: string; value: number | undefined; onValueChange: (value: number | undefined) => void; disabled?: boolean; invalid?: boolean; describedBy?: string }) {
  // -0 menandai tanda minus yang sudah diketik sebelum angkanya.
  const display = value === undefined || !Number.isFinite(value) ? "" : Object.is(value, -0) ? "-" : `${value < 0 ? "-" : ""}${Math.round(Math.abs(value)).toLocaleString("id-ID")}`;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground" aria-hidden="true">Rp</span>
      <Input
        id={id}
        inputMode="numeric"
        className="pl-9 text-right tabular-nums"
        value={display}
        disabled={disabled}
        placeholder="0"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={event => {
          const raw = event.target.value.trim();
          const negative = raw.startsWith("-");
          const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
          if (!digits) return onValueChange(negative ? -0 : undefined);
          onValueChange((negative ? -1 : 1) * Number(digits));
        }}
      />
    </div>
  );
}

type Row = { key: string; label: string };

/**
 * Isian neraca dan laba rugi dua periode, mengikuti urutan sheet Neraca dan LR
 * pada workbook ANALISA_KEUANGAN BPRS. Total dan selisih neraca dihitung langsung.
 */
export function FinancialStatementsEditor({
  value,
  onChange,
  disabled,
  errors = {},
  onFieldEdit,
}: {
  value: FinancialStatements;
  onChange: (next: FinancialStatements) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
  onFieldEdit?: (id: string) => void;
}) {
  const totals = { previous: periodTotals(value.previous), current: periodTotals(value.current) };

  const setAmount = (period: Period, group: "neraca" | "labaRugi", key: string, amount: number | undefined) => {
    const current: FinancialPeriod = value[period] ?? { neraca: {}, labaRugi: {} };
    onChange({ ...value, [period]: { ...current, [group]: { ...(current[group] ?? {}), [key]: amount } } });
    onFieldEdit?.(fsFieldId(period, group, key));
    onFieldEdit?.(fsBalanceId(period));
  };

  const inputRow = (group: "neraca" | "labaRugi", row: Row) => (
    <div key={row.key} className="grid gap-2 border-t border-border py-2 sm:grid-cols-[minmax(0,1.3fr)_1fr_1fr] sm:items-center">
      <span className="text-sm text-navy-900" aria-hidden="true">{row.label}</span>
      {PERIODS.map(period => {
        const id = fsFieldId(period.key, group, row.key);
        const amount = (value[period.key]?.[group] as Record<string, number | undefined> | undefined)?.[row.key];
        const signed = (SIGNED_KEYS as readonly string[]).includes(row.key);
        const error = errors[id];
        return (
          <div key={period.key} className="space-y-1">
            <Label htmlFor={id} className="text-xs font-normal text-muted-foreground sm:sr-only">{row.label}, {period.title.toLowerCase()}</Label>
            {signed ? (
              <SignedMoneyInput id={id} value={amount} disabled={disabled} invalid={!!error} describedBy={error ? `${id}-error` : undefined} onValueChange={next => setAmount(period.key, group, row.key, next)} />
            ) : (
              <RupiahInput id={id} value={amount} disabled={disabled} placeholder="0" className="text-right tabular-nums" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} onValueChange={next => setAmount(period.key, group, row.key, next)} />
            )}
            {error && <p id={`${id}-error`} className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{error}</p>}
          </div>
        );
      })}
    </div>
  );

  const totalRow = (label: string, pick: (t: ReturnType<typeof periodTotals>) => number, strong = false) => (
    <div className="grid gap-1 border-t border-border bg-muted/60 px-2 py-2 text-sm sm:grid-cols-[minmax(0,1.3fr)_1fr_1fr] sm:items-center">
      <span className={cn("text-navy-900", strong && "font-semibold")}>{label}</span>
      {PERIODS.map(period => (
        <span key={period.key} className={cn("text-right tabular-nums text-navy-900", strong && "font-semibold")}>
          <span className="mr-2 text-xs text-muted-foreground sm:hidden">{period.title}:</span>{rupiahText(pick(totals[period.key]))}
        </span>
      ))}
    </div>
  );

  const group = (title: string, children: ReactNode) => (
    <div className="rounded-lg border border-border bg-white px-3 pb-1 pt-3">
      <h4 className="pb-2 text-sm font-semibold text-navy-900">{title}</h4>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_1fr_1fr] sm:items-end">
        <p className="text-sm text-muted-foreground">Isi dari laporan keuangan nasabah (nominal setahun). Kolom kosong dihitung 0.</p>
        {PERIODS.map(period => (
          <div key={period.key} className="space-y-1">
            <Label htmlFor={fsLabelId(period.key)}>Nama periode: {period.title.toLowerCase()}</Label>
            <Input
              id={fsLabelId(period.key)}
              value={value[period.key]?.label ?? ""}
              disabled={disabled}
              maxLength={60}
              placeholder="PER-DESEMBER 2025"
              onChange={event => onChange({ ...value, [period.key]: { ...(value[period.key] ?? { neraca: {}, labaRugi: {} }), label: event.target.value } })}
            />
          </div>
        ))}
      </div>

      {group("Neraca: aktiva", <>
        {NERACA_AKTIVA_LANCAR.map(row => inputRow("neraca", row))}
        {totalRow("Jumlah aktiva lancar", t => t.aktivaLancar)}
        {NERACA_AKTIVA_TETAP.map(row => inputRow("neraca", row))}
        {totalRow("Jumlah aktiva tetap", t => t.aktivaTetap)}
        {totalRow("Total aset", t => t.totalAset, true)}
      </>)}

      {group("Neraca: kewajiban dan modal", <>
        {NERACA_KEWAJIBAN.map(row => inputRow("neraca", row))}
        {totalRow("Jumlah kewajiban", t => t.totalKewajiban)}
        {NERACA_MODAL.map(row => inputRow("neraca", row))}
        {totalRow("Jumlah modal", t => t.modal)}
        {totalRow("Total kewajiban + modal", t => t.totalPasiva, true)}
        <p className="py-2 text-xs text-muted-foreground">Saldo laba dan laba tahun berjalan boleh negatif: ketik tanda minus di depan angka, misalnya -25.000.000.</p>
      </>)}

      <div className="grid gap-2 sm:grid-cols-2" aria-live="polite">
        {PERIODS.map(period => {
          const selisih = totals[period.key].selisih;
          const balanced = Math.abs(selisih) <= 1_000;
          const error = errors[fsBalanceId(period.key)];
          return (
            <div
              key={period.key}
              id={fsBalanceId(period.key)}
              tabIndex={-1}
              className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400/50", balanced ? "border-emerald-200 bg-emerald-50 text-emerald-900" : error ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-amber-300 bg-amber-50 text-amber-950")}
            >
              {balanced ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
              <span>
                <strong>Neraca {period.title.toLowerCase()}:</strong>{" "}
                {balanced ? "seimbang (selisih 0)." : `belum seimbang, selisih ${rupiahText(selisih)}. Total aset harus sama dengan kewajiban + modal.`}
              </span>
            </div>
          );
        })}
      </div>

      {group("Laba rugi (setahun)", <>
        {LABA_RUGI_FIELDS.map(row => inputRow("labaRugi", row))}
        {totalRow("Laba kotor", t => t.labaKotor)}
        {totalRow("Jumlah biaya", t => t.totalBiaya)}
        {totalRow("Laba bersih", t => t.labaBersih, true)}
      </>)}
    </div>
  );
}

const STATUS_STYLE: Record<RatioResult["status"], { label: string; className: string }> = {
  memenuhi: { label: "Memenuhi", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  tidak_memenuhi: { label: "Di luar benchmark", className: "bg-red-50 text-red-800 border-red-200" },
  info: { label: "Informasi", className: "bg-muted text-navy-900 border-border" },
  tidak_dapat_dihitung: { label: "Belum dapat dihitung", className: "bg-slate-50 text-slate-600 border-slate-200" },
};

export function RatioStatusBadge({ status }: { status: RatioResult["status"] }) {
  const style = STATUS_STYLE[status];
  return <span className={cn("inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", style.className)}>{style.label}</span>;
}

/** Tabel rasio keuangan dua periode dengan benchmark bank; status dinilai pada periode berjalan. */
export function RatioTable({ value, caption }: { value: FinancialStatements; caption?: string }) {
  const previous = computeRatios(value.previous);
  const current = computeRatios(value.current);
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="w-full min-w-[560px] text-sm">
        {caption && <caption className="px-3 pt-3 text-left text-xs text-muted-foreground">{caption}</caption>}
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-semibold">Rasio</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">{value.previous?.label || "Tahun lalu"}</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">{value.current?.label || "Periode berjalan"}</th>
            <th scope="col" className="px-3 py-2 font-semibold">Benchmark</th>
            <th scope="col" className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {current.map((ratio, index) => (
            <tr key={ratio.key} className="border-b border-border last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <span className="block font-medium text-navy-900">{ratio.label}</span>
                <span className="block text-xs text-muted-foreground">{ratio.formula}</span>
              </th>
              <td className="px-3 py-2 text-right tabular-nums">{ratioText(previous[index]!)}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-navy-900">{ratioText(ratio)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{benchmarkText(ratio)}</td>
              <td className="px-3 py-2"><RatioStatusBadge status={ratio.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
