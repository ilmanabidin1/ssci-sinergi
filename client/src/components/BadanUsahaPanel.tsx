import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ConfirmDialog";
import { FinancialStatementsEditor, RatioTable, rupiahText } from "@/components/FinancialStatementsEditor";
import { trpc } from "@/lib/trpc";
import { errorMessage } from "@/lib/errors";
import {
  computeGrowth,
  computeWorkingCapital,
  emptyStatements,
  financialChecks,
  monthlyFiguresFromStatements,
  type FinancialStatements,
} from "@shared/financialStatements";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Save } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

function downloadBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const percent = (value: number | null, digits = 1) =>
  value === null || !Number.isFinite(value) ? "-" : `${value.toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;
const days = (value: number | null) => (value === null ? "-" : `${Math.round(value).toLocaleString("id-ID")} hari`);

/** Membuang -0 (tanda minus tanpa angka) dan nilai kosong sebelum disimpan. */
function cleanStatements(fs: FinancialStatements): FinancialStatements {
  const clean = (record: Record<string, number | undefined> | undefined) =>
    Object.fromEntries(Object.entries(record ?? {}).filter(([, n]) => n !== undefined && Number.isFinite(n)).map(([k, n]) => [k, Object.is(n, -0) ? 0 : n]));
  const period = (p: FinancialStatements["previous"] | undefined) => ({ label: p?.label?.trim() || undefined, neraca: clean(p?.neraca), labaRugi: clean(p?.labaRugi) });
  return {
    previous: period(fs.previous),
    current: period(fs.current),
    ...(Number.isFinite(fs.expectedSalesGrowth) ? { expectedSalesGrowth: fs.expectedSalesGrowth } : {}),
    periodDays: fs.periodDays ?? 365,
  };
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium text-navy-900">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Format Analisa Keuangan untuk segmen badan hukum: neraca dan laba rugi dua
 * periode, rasio dengan benchmark bank, pertumbuhan, kebutuhan modal kerja,
 * dan unduhan Excel ANALISA_KEUANGAN.
 */
export function BadanUsahaPanel({ applicationId, canEdit }: { applicationId: number; canEdit: boolean }) {
  const utils = trpc.useUtils();
  const { confirm } = useConfirm();
  const query = trpc.analisaKeuangan.get.useQuery({ applicationId }, { enabled: applicationId > 0 });
  const [draft, setDraft] = useState<FinancialStatements>(() => emptyStatements());
  const [dirty, setDirty] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    if (!query.data || dirty) return;
    setDraft(query.data.financials ?? emptyStatements());
  }, [query.data, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const save = trpc.analisaKeuangan.save.useMutation({
    onSuccess: result => {
      toast.success(result.monthlyUpdated ? "Laporan keuangan tersimpan. Pendapatan dan pengeluaran bulanan pengajuan diperbarui." : "Laporan keuangan tersimpan");
      setDirty(false);
      utils.analisaKeuangan.get.setData({ applicationId }, result);
      utils.applications.workflow.invalidate({ applicationId });
      utils.assessments.getWithApplication.invalidate({ applicationId });
      utils.applications.listActivity.invalidate({ applicationId });
      utils.aiAssist.ruleCheck.invalidate({ applicationId });
    },
    onError: e => toast.error(errorMessage(e, "Laporan keuangan gagal disimpan.")),
  });
  const exportExcel = trpc.analisaKeuangan.exportExcel.useMutation({
    onSuccess: data => {
      setExportError("");
      downloadBase64(data.base64, data.filename);
      utils.applications.listActivity.invalidate({ applicationId });
    },
    onError: e => {
      const message = errorMessage(e, "File Excel Analisa Keuangan gagal dibuat.");
      setExportError(message);
      toast.error(message);
    },
  });

  const editable = canEdit && (query.data?.editable ?? false);
  const update = (next: FinancialStatements) => {
    setDraft(next);
    setDirty(true);
  };
  const saveNow = () => save.mutateAsync({ applicationId, financials: cleanStatements(draft) });

  const handleExport = async () => {
    if (exportExcel.isPending || save.isPending) return;
    if (dirty && editable) {
      const ok = await confirm({
        title: "Simpan isian sebelum mengunduh?",
        description: "Ada perubahan yang belum disimpan. File Excel dibuat dari data tersimpan, jadi isian perlu disimpan dulu agar file memakai angka terbaru.",
        confirmLabel: "Simpan dan unduh",
        cancelLabel: "Kembali",
      });
      if (!ok) return;
      try {
        await saveNow();
      } catch {
        return;
      }
    }
    exportExcel.mutate({ applicationId });
  };

  if (query.isLoading) {
    return <Card><CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Memuat analisa keuangan...</CardContent></Card>;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Analisa keuangan tidak dapat dimuat</AlertTitle>
        <AlertDescription>{errorMessage(query.error)} <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>Coba lagi</button></AlertDescription>
      </Alert>
    );
  }

  const checks = financialChecks(draft);
  const growth = computeGrowth(draft);
  const wc = computeWorkingCapital(draft);
  const monthly = monthlyFiguresFromStatements(draft);
  const requested = query.data?.requestedAmount ?? 0;
  const templateMessage = query.data?.templateMessage ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle as="h2">Analisa Keuangan Badan Usaha</CardTitle>
            <CardDescription>Neraca, laba rugi, rasio, pertumbuhan, dan kebutuhan modal kerja sesuai Excel Analisa Keuangan BPRS. Rasio hanya pembanding benchmark, tanpa skor.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button variant="outline" onClick={() => saveNow().catch(() => undefined)} disabled={!dirty || save.isPending}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
                {save.isPending ? "Menyimpan..." : "Simpan isian"}
              </Button>
            )}
            <Button onClick={() => void handleExport()} disabled={exportExcel.isPending || save.isPending || !!templateMessage} aria-describedby={templateMessage ? "ak-template-missing" : undefined}>
              {exportExcel.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />}
              {exportExcel.isPending ? "Menyiapkan Excel..." : "Unduh Excel Analisa Keuangan"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {(templateMessage || exportError) && (
          <Alert id="ak-template-missing" className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Excel belum dapat diunduh</AlertTitle>
            <AlertDescription className="text-amber-900">{templateMessage ?? exportError}. Isian dan rasio di halaman ini tetap dapat dipakai dan disimpan.</AlertDescription>
          </Alert>
        )}
        {!editable && canEdit && query.data && !query.data.editable && (
          <p className="text-sm text-muted-foreground">Pengajuan sudah diputuskan atau dibatalkan, sehingga laporan keuangan tidak dapat diubah.</p>
        )}

        <Section title="Periksa data" description="Pemeriksaan otomatis atas neraca dan laba rugi yang sedang ditampilkan.">
          {checks.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Tidak ada temuan. Neraca seimbang dan rasio utama dalam batas wajar.</p>
          ) : (
            <ul className="space-y-2" aria-live="polite">
              {checks.map((check, index) => (
                <li key={index} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${check.severity === "tinggi" ? "border-red-200 bg-red-50 text-red-900" : check.severity === "sedang" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-border bg-muted text-navy-900"}`}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span><strong>{check.field}</strong> ({check.severity}): {check.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Neraca dan laba rugi" description={editable ? "Ubah angka lalu tekan Simpan isian. Selama pengajuan belum dinilai, pendapatan dan pengeluaran bulanan SSCI ikut diperbarui." : undefined}>
          <FinancialStatementsEditor value={draft} onChange={update} disabled={!editable} />
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Angka bulanan SSCI dari laba rugi periode berjalan: pendapatan {rupiahText(monthly.monthlyRevenue)} (penjualan / 12), pengeluaran {rupiahText(monthly.monthlyExpenses)} (HPP + seluruh biaya / 12).
          </p>
        </Section>

        <Section title="Rasio keuangan" description="Status dinilai pada periode berjalan terhadap benchmark bank.">
          <RatioTable value={draft} />
        </Section>

        <Section title="Pertumbuhan" description="Periode berjalan dibanding tahun lalu (sheet Pertumbuhan).">
          <dl className="grid gap-3 sm:grid-cols-4">
            {([["Aset", growth.aset], ["Penjualan", growth.penjualan], ["Laba bersih", growth.labaBersih], ["Rata-rata", growth.rataRata]] as const).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-white p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={`text-lg font-semibold tabular-nums ${value !== null && value < 0 ? "text-red-700" : "text-navy-900"}`}>{percent(value)}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Kebutuhan modal kerja" description="Siklus kas (cash to cash cycle) seperti sheet Keb Modal: hari piutang + hari persediaan - hari hutang.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ak-growth">Proyeksi pertumbuhan penjualan (% bulat)</Label>
              <Input
                id="ak-growth"
                inputMode="numeric"
                disabled={!editable}
                value={draft.expectedSalesGrowth === undefined ? "" : String(Math.round(draft.expectedSalesGrowth))}
                placeholder={growth.penjualan !== null ? `Kosong: pakai historis ${percent(growth.penjualan)}` : "cth: 10"}
                aria-describedby="ak-growth-help"
                onChange={event => {
                  const raw = event.target.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "").slice(0, 5);
                  const value = raw === "" || raw === "-" ? undefined : Number(raw);
                  update({ ...draft, expectedSalesGrowth: value !== undefined && Number.isFinite(value) ? Math.max(-100, Math.min(1000, value)) : undefined });
                }}
              />
              <p id="ak-growth-help" className="text-xs text-muted-foreground">Sel E33 Keb Modal-B. Kosongkan untuk memakai pertumbuhan penjualan historis (Keb Modal-A).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ak-days">Jumlah hari periode</Label>
              <Input
                id="ak-days"
                inputMode="numeric"
                disabled={!editable}
                value={String(draft.periodDays ?? 365)}
                aria-describedby="ak-days-help"
                onChange={event => {
                  const value = Number(event.target.value.replace(/\D/g, "").slice(0, 3));
                  update({ ...draft, periodDays: value >= 1 && value <= 366 ? value : undefined });
                }}
              />
              <p id="ak-days-help" className="text-xs text-muted-foreground">Sel I14 Keb Modal-B, biasanya 365.</p>
            </div>
          </div>
          <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-border bg-white p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
            <dt className="text-muted-foreground">Hari piutang (piutang / penjualan x hari)</dt><dd className="tabular-nums sm:text-right">{days(wc.hariPiutang)}</dd>
            <dt className="text-muted-foreground">Hari persediaan (persediaan / HPP x hari)</dt><dd className="tabular-nums sm:text-right">{days(wc.hariPersediaan)}</dd>
            <dt className="text-muted-foreground">Hari hutang (hutang jangka pendek / HPP x hari)</dt><dd className="tabular-nums sm:text-right">{days(wc.hariHutang)}</dd>
            <dt className="font-medium text-navy-900">Siklus kas</dt><dd className="font-medium tabular-nums text-navy-900 sm:text-right">{days(wc.siklusKas)}</dd>
            <dt className="text-muted-foreground">Pertumbuhan dipakai ({wc.sumberPertumbuhan === "proyeksi" ? "proyeksi" : wc.sumberPertumbuhan === "historis" ? "historis" : "tidak ada"})</dt><dd className="tabular-nums sm:text-right">{percent(wc.pertumbuhan)}</dd>
            <dt className="text-muted-foreground">Proyeksi penjualan setahun</dt><dd className="tabular-nums sm:text-right">{rupiahText(wc.proyeksiPenjualan)}</dd>
            <dt className="font-semibold text-navy-900">Kebutuhan modal kerja (siklus x proyeksi penjualan / hari)</dt><dd className="font-semibold tabular-nums text-navy-900 sm:text-right">{rupiahText(wc.kebutuhanModalKerja)}</dd>
            <dt className="text-muted-foreground">Modal kerja bersih tersedia (aktiva lancar - hutang jangka pendek)</dt><dd className="tabular-nums sm:text-right">{rupiahText(wc.modalKerjaTersedia)}</dd>
            <dt className="text-muted-foreground">Pembiayaan diajukan</dt><dd className="tabular-nums sm:text-right">{rupiahText(requested)}</dd>
          </dl>
          {wc.kebutuhanModalKerja !== null && requested > wc.kebutuhanModalKerja && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Pembiayaan diajukan melebihi kebutuhan modal kerja hasil perhitungan siklus kas. Pastikan tujuan pembiayaan bukan hanya modal kerja, atau tinjau ulang plafon.</p>
          )}
        </Section>
      </CardContent>
    </Card>
  );
}
