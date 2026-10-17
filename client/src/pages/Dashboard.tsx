import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useConfirm } from "@/components/ConfirmDialog";
import { APPLICATION_STATUS_LABELS, StatusBadge, type ApplicationStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Status = "all" | ApplicationStatus;

type BulkExportRow = {
  customerName: string;
  customerId: string;
  businessName: string;
  requestedAmount: number | string;
  financingTenor: number;
  status: string;
  totalScore: number | null;
  classification: string | null;
  createdAt: Date | string | null;
  assessedAt: Date | string | null;
};

type QueueItem = { id: number; customerName: string };

const moneyFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const formatMoney = (value: number) => moneyFormatter.format(Number.isFinite(value) ? value : 0);
const formatDateLabel = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const escapeCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

function downloadCsv(filename: string, header: string[], lines: Array<Array<string | number | null | undefined>>) {
  const csv = [header, ...lines].map(line => line.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const sectionHeading = "mb-4 text-xs font-bold uppercase tracking-[.18em] text-slate-600";

function QueryError({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center text-red-700">
      <AlertCircle className="h-8 w-8" aria-hidden="true" />
      <p>{message}</p>
      <Button variant="outline" onClick={onRetry} disabled={retrying}>
        {retrying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Coba lagi
      </Button>
    </div>
  );
}

export default function Dashboard() {
  usePageTitle("Dashboard operasional");
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const { confirm, promptReason } = useConfirm();
  const canExport = user?.role === "checker" || user?.role === "admin";
  const [status, setStatus] = useState<Status>("all");
  const [analystId, setAnalystId] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState<"slik" | "filtered" | null>(null);

  const dateInput = {
    fromDate: fromDate ? new Date(`${fromDate}T00:00:00`) : undefined,
    toDate: toDate ? new Date(`${toDate}T23:59:59`) : undefined,
  };
  const hasDateFilter = Boolean(fromDate || toDate);
  const analystFilter = analystId !== "all" ? Number(analystId) : undefined;
  const hasAnyFilter = hasDateFilter || status !== "all" || analystFilter !== undefined;

  const queueQuery = trpc.applications.queue.useQuery({
    ...(status !== "all" ? { status } : {}),
    ...(analystFilter !== undefined ? { submittedBy: analystFilter } : {}),
    ...dateInput,
  });
  const statsQuery = trpc.applications.operationalStats.useQuery({
    ...dateInput,
    ...(analystFilter !== undefined ? { analystId: analystFilter } : {}),
  });
  const trendQuery = trpc.applications.dashboardTrend.useQuery();
  const analystQuery = trpc.applications.analystPerformance.useQuery();
  const slaQuery = trpc.applications.slaMetrics.useQuery();
  const analystsQuery = trpc.applications.listAnalysts.useQuery();
  const isLoading = queueQuery.isLoading || statsQuery.isLoading;
  const isError = queueQuery.isError || statsQuery.isError;
  const isRefreshing =
    queueQuery.isFetching || statsQuery.isFetching || trendQuery.isFetching || analystQuery.isFetching || slaQuery.isFetching;
  const applications = queueQuery.data ?? [];
  const stats = statsQuery.data;
  const analystName = (analystsQuery.data ?? []).find(analyst => analyst.id === analystFilter);

  const refresh = () => {
    void queueQuery.refetch();
    void statsQuery.refetch();
    void trendQuery.refetch();
    void analystQuery.refetch();
    void slaQuery.refetch();
  };
  const utils = trpc.useUtils();
  const deleteAssessment = trpc.assessments.delete.useMutation({
    onSuccess: async () => {
      await utils.applications.queue.invalidate();
      await utils.applications.operationalStats.invalidate();
      toast.success("Penilaian berhasil dihapus. Pengajuan kembali ke menunggu penilaian.");
    },
    onError: error => toast.error("Gagal menghapus penilaian", { description: errorMessage(error) }),
  });

  const hardDelete = trpc.assessments.hardDelete.useMutation({
    onSuccess: async () => {
      await utils.applications.queue.invalidate();
      await utils.applications.operationalStats.invalidate();
      toast.success("Pengajuan berhasil dihapus permanen.");
    },
    onError: error => toast.error("Gagal menghapus pengajuan", { description: errorMessage(error) }),
  });
  const pendingRowId =
    (deleteAssessment.isPending ? deleteAssessment.variables?.applicationId : undefined) ??
    (hardDelete.isPending ? hardDelete.variables?.applicationId : undefined);

  const handleDeleteAssessment = async (item: QueueItem) => {
    const ok = await confirm({
      title: `Hapus penilaian ${item.customerName}?`,
      description: (
        <p>
          Hasil penilaian dan skor akan dihapus, lalu pengajuan kembali ke status <strong>Menunggu penilaian</strong>.
          Data nasabah dan dokumen tetap tersimpan, dan penilaian dapat dilakukan ulang.
        </p>
      ),
      confirmLabel: "Hapus penilaian",
    });
    if (!ok) return;
    deleteAssessment.mutate({ applicationId: item.id });
  };

  const handleHardDelete = async (item: QueueItem) => {
    const typed = await promptReason({
      title: `Hapus permanen pengajuan ${item.customerName}?`,
      description: (
        <div className="space-y-2">
          <p>
            Pengajuan, seluruh penilaian, dokumen, foto survei, dan catatannya akan dihapus{" "}
            <strong className="text-destructive">permanen dan tidak dapat dipulihkan</strong>.
          </p>
          <p>Ketik nama nasabah persis seperti tertulis untuk melanjutkan: <strong>{item.customerName}</strong></p>
        </div>
      ),
      label: "Nama nasabah",
      placeholder: item.customerName,
      confirmLabel: "Hapus permanen",
      destructive: true,
      maxLength: 255,
    });
    if (typed === null) return;
    if (typed.trim() !== item.customerName.trim()) {
      toast.error("Nama nasabah tidak cocok", { description: "Pengajuan tidak dihapus." });
      return;
    }
    hardDelete.mutate({ applicationId: item.id });
  };

  const handleExportSlik = async () => {
    setExporting("slik");
    try {
      const rows = await utils.applications.exportSlik.fetch();
      if (rows.length === 0) {
        toast.info("Belum ada data pengajuan untuk diekspor.");
        return;
      }
      downloadCsv(
        `slik-export-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Nama", "NIK", "Usaha", "Jenis", "Pembiayaan", "Status", "Skor", "Klasifikasi", "Tanggal"],
        rows.map(row => [
          row.customerName,
          row.customerId,
          row.businessName,
          row.businessType,
          row.requestedAmount,
          row.status,
          row.totalScore !== null && row.totalScore !== undefined ? row.totalScore : "",
          row.classification ?? "",
          row.assessedAt ? new Date(row.assessedAt).toLocaleDateString("id-ID") : "",
        ]),
      );
      toast.success("Ekspor SLIK berhasil diunduh.");
    } catch (error) {
      toast.error("Gagal mengekspor SLIK", { description: errorMessage(error) });
    } finally {
      setExporting(null);
    }
  };

  const handleExportFiltered = async () => {
    setExporting("filtered");
    try {
      const rows = (await utils.applications.bulkExport.fetch({
        ...(dateInput.fromDate ? { fromDate: dateInput.fromDate } : {}),
        ...(dateInput.toDate ? { toDate: dateInput.toDate } : {}),
        ...(status !== "all" ? { status } : {}),
        ...(analystFilter !== undefined ? { submittedBy: analystFilter } : {}),
      })) as BulkExportRow[];
      if (rows.length === 0) {
        toast.info("Tidak ada pengajuan yang cocok dengan filter untuk diekspor.");
        return;
      }
      downloadCsv(
        `ekspor-pengajuan-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Nama", "NIK", "Usaha", "Pembiayaan", "Tenor", "Status", "Skor", "Klasifikasi", "Dibuat", "Dinilai"],
        rows.map(row => [
          row.customerName,
          row.customerId,
          row.businessName,
          row.requestedAmount,
          row.financingTenor,
          row.status,
          row.totalScore !== null && row.totalScore !== undefined ? row.totalScore : "",
          row.classification ?? "",
          row.createdAt ? new Date(row.createdAt).toLocaleDateString("id-ID") : "",
          row.assessedAt ? new Date(row.assessedAt).toLocaleDateString("id-ID") : "",
        ]),
      );
      toast.success(`Ekspor ${rows.length} pengajuan sesuai filter berhasil diunduh.`);
    } catch (error) {
      toast.error("Gagal mengekspor data", { description: errorMessage(error) });
    } finally {
      setExporting(null);
    }
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setStatus("all");
    setAnalystId("all");
  };

  const statusCards = [
    {
      key: "pending" as const,
      label: "Menunggu penilaian",
      value: stats?.counts.pending ?? 0,
      Icon: Clock3,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      key: "assessed" as const,
      label: "Menunggu keputusan",
      value: stats?.pendingDecision ?? 0,
      Icon: FileText,
      color: "text-royal-600",
      bg: "bg-navy-100",
    },
    {
      key: "approved" as const,
      label: "Disetujui",
      value: stats?.counts.approved ?? 0,
      Icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      key: "rejected" as const,
      label: "Ditolak",
      value: stats?.counts.rejected ?? 0,
      Icon: XCircle,
      color: "text-red-700",
      bg: "bg-red-50",
    },
  ];

  const financialCards = [
    {
      label: "Total pengajuan",
      value: formatMoney(stats?.totalRequestedAmount ?? 0),
      Icon: TrendingUp,
    },
    {
      label: "Total disetujui",
      value: formatMoney(stats?.approvedAmount ?? 0),
      Icon: CheckCircle2,
    },
    {
      label: "Rata-rata skor",
      value: (stats?.averageAssessedScore ?? 0).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      Icon: Shield,
    },
  ];

  const activeChips = [
    fromDate || toDate
      ? `Periode: ${fromDate ? formatDateLabel(fromDate) : "awal"} s.d. ${toDate ? formatDateLabel(toDate) : "hari ini"}`
      : null,
    analystFilter !== undefined ? `Analis: ${analystName?.name || analystName?.email || `#${analystFilter}`}` : null,
    status !== "all" ? `Status antrean: ${APPLICATION_STATUS_LABELS[status]}` : null,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />

      <main id="main-content" tabIndex={-1} className="container max-w-7xl px-4 py-8 focus:outline-none sm:px-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-gold-700">
              <span className="h-px w-8 bg-gold-400" aria-hidden="true" />Pusat operasional
            </p>
            <h1 className="mt-2 font-serif text-4xl font-medium text-navy-900">Dashboard operasional</h1>
            <p className="mt-2 text-slate-600">Pantau alur pengajuan pembiayaan BPRS secara real time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-full bg-navy-900 text-white shadow-premium hover:bg-navy-800">
              <Link to="/applications/new">
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                Mulai penilaian baru
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/assessments">Riwayat penilaian</Link>
            </Button>
            <Button variant="outline" onClick={refresh} disabled={isRefreshing} aria-busy={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {isRefreshing ? "Memuat ulang..." : "Muat ulang"}
            </Button>
          </div>
        </div>

        {/* Filter toolbar: berlaku untuk ringkasan, antrean, dan ekspor sesuai filter */}
        <section aria-labelledby="filter-heading" className="mt-8 rounded-2xl border border-border bg-white p-4 shadow-premium">
          <h2 id="filter-heading" className="sr-only">Filter dashboard</h2>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
              <div className="space-y-1">
                <label htmlFor="fromDate" className="block text-xs font-medium text-slate-600">Dari tanggal</label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={event => setFromDate(event.target.value)}
                  className="lg:w-44"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="toDate" className="block text-xs font-medium text-slate-600">Sampai tanggal</label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={event => setToDate(event.target.value)}
                  className="lg:w-44"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="analystFilter" className="block text-xs font-medium text-slate-600">Analis</label>
                <Select value={analystId} onValueChange={setAnalystId}>
                  <SelectTrigger id="analystFilter" className="lg:w-56">
                    <SelectValue placeholder="Semua analis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua analis</SelectItem>
                    {(analystsQuery.data ?? []).map(analyst => (
                      <SelectItem key={analyst.id} value={String(analyst.id)}>
                        {analyst.name || analyst.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="statusFilter" className="block text-xs font-medium text-slate-600">Status antrean</label>
                <Select value={status} onValueChange={value => setStatus(value as Status)}>
                  <SelectTrigger id="statusFilter" className="lg:w-56">
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua status</SelectItem>
                    {Object.entries(APPLICATION_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasAnyFilter && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="self-start lg:self-end">
                <X className="h-4 w-4" aria-hidden="true" />
                Reset filter
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600" aria-live="polite">
            {activeChips.length > 0 ? (
              activeChips.map(chip => (
                <span key={chip} className="rounded-full border border-navy-200 bg-navy-100 px-3 py-1 font-medium text-navy-900">
                  {chip}
                </span>
              ))
            ) : (
              <span>Menampilkan semua data.</span>
            )}
            <span>Periode dan analis berlaku untuk ringkasan dan antrean; status hanya untuk antrean.</span>
          </div>
        </section>

        {/* Status summary */}
        <section className="mt-8" aria-labelledby="status-heading">
          <h2 id="status-heading" className={sectionHeading}>Ringkasan status</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statusCards.map(({ key, label, value, Icon, color, bg }) => (
              <Link
                key={key}
                to={`/assessments?status=${key}`}
                aria-label={`${label}: ${value} pengajuan. Buka daftar`}
                className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2"
              >
                <Card className="hover-lift h-full border-border shadow-premium">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                        <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-navy-900" aria-hidden="true" />
                    </div>
                    <p className="mt-4 font-serif text-4xl text-navy-900">{statsQuery.isLoading ? "..." : value}</p>
                    <p className="mt-1 text-sm text-slate-600">{label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Financial summary */}
        <section className="mt-8" aria-labelledby="finance-heading">
          <h2 id="finance-heading" className={sectionHeading}>Ringkasan keuangan</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {financialCards.map(({ label, value, Icon }) => (
              <Card key={label} className="relative overflow-hidden border-border shadow-premium">
                <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-300 to-gold-500" aria-hidden="true" />
                <CardContent className="flex items-center justify-between gap-3 p-5 pl-6">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-600">{label}</p>
                    <p className="mt-1 break-words font-serif text-2xl text-navy-900">{statsQuery.isLoading ? "..." : value}</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-900">
                    <Icon className="h-5 w-5 text-gold-300" aria-hidden="true" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* SLA & wait time */}
        <section className="mt-8" aria-labelledby="sla-heading">
          <h2 id="sla-heading" className={sectionHeading}>SLA &amp; waktu tunggu</h2>
          <Card className="border-border shadow-premium">
            <CardHeader className="border-b px-6 py-5">
              <CardTitle as="h3">Pengajuan menunggu lama</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                Pengajuan dengan waktu tunggu melebihi 48 jam perlu diprioritaskan.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {slaQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Memuat SLA...
                </div>
              ) : slaQuery.isError ? (
                <QueryError message="Data SLA tidak dapat dimuat." onRetry={() => slaQuery.refetch()} retrying={slaQuery.isFetching} />
              ) : (slaQuery.data ?? []).length === 0 ? (
                <div className="py-16 text-center text-slate-600">Tidak ada pengajuan menunggu.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                      <tr>
                        <th scope="col" className="px-6 py-3 font-semibold">Nasabah</th>
                        <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                        <th scope="col" className="px-6 py-3 font-semibold">Waktu tunggu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(slaQuery.data ?? []).map(row => {
                        const isOverdue = row.hoursSinceCreated > 48;
                        const waitText =
                          row.hoursSinceCreated > 24
                            ? `${row.daysSinceCreated} hari`
                            : `${row.hoursSinceCreated} jam`;
                        return (
                          <tr key={row.applicationId} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-semibold text-slate-900">
                              <Link to={`/applications/${row.applicationId}`} className="hover:underline">
                                {row.customerName}
                              </Link>
                            </td>
                            <td className="px-6 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                            <td
                              className={`whitespace-nowrap px-6 py-3 ${
                                isOverdue ? "font-semibold text-amber-700" : "text-slate-600"
                              }`}
                            >
                              {waitText}
                              {isOverdue && <span className="sr-only"> (melewati SLA 48 jam)</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Analytics charts */}
        <section className="mt-8" aria-labelledby="analytics-heading">
          <h2 id="analytics-heading" className={sectionHeading}>Analitik</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border shadow-premium">
              <CardHeader>
                <CardTitle as="h3">Tren skor 6 bulan</CardTitle>
                <p className="text-sm text-slate-600">Rata-rata skor penilaian per bulan.</p>
              </CardHeader>
              <CardContent>
                {trendQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-24 text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    Memuat tren...
                  </div>
                ) : trendQuery.isError ? (
                  <QueryError message="Data tren tidak dapat dimuat." onRetry={() => trendQuery.refetch()} retrying={trendQuery.isFetching} />
                ) : (trendQuery.data ?? []).length === 0 ? (
                  <p className="py-24 text-center text-slate-600">Belum ada data tren.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendQuery.data ?? []} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={(m) => m.slice(5)} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 1 })} skor (${props.payload.count} penilaian)`,
                          "Rata-rata",
                        ]}
                      />
                      <Line type="monotone" dataKey="averageScore" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--chart-2)", stroke: "var(--chart-1)", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-premium">
              <CardHeader>
                <CardTitle as="h3">Performa analis</CardTitle>
                <p className="text-sm text-slate-600">Jumlah dan rata-rata skor per analis.</p>
              </CardHeader>
              <CardContent>
                {analystQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-24 text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    Memuat performa analis...
                  </div>
                ) : analystQuery.isError ? (
                  <QueryError message="Data performa analis tidak dapat dimuat." onRetry={() => analystQuery.refetch()} retrying={analystQuery.isFetching} />
                ) : (analystQuery.data ?? []).length === 0 ? (
                  <p className="py-24 text-center text-slate-600">Belum ada data analis.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analystQuery.data ?? []} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${value} penilaian (rata-rata ${Number(props.payload.averageScore).toLocaleString("id-ID", { maximumFractionDigits: 1 })})`,
                          "Jumlah",
                        ]}
                      />
                      <Bar dataKey="count" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Queue */}
        <section className="mt-8" aria-labelledby="queue-heading">
          <Card className="border-border shadow-premium">
            <CardHeader className="flex flex-col gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle as="h2" id="queue-heading">Antrean pengajuan</CardTitle>
                <p className="mt-1 text-sm text-slate-600">Prioritas pekerjaan penilaian dan keputusan, mengikuti filter di atas.</p>
              </div>
              {canExport && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    variant="outline"
                    onClick={handleExportFiltered}
                    disabled={exporting !== null}
                    title="Mengekspor pengajuan sesuai periode, analis, dan status yang dipilih"
                  >
                    {exporting === "filtered" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    {hasAnyFilter ? "Ekspor sesuai filter" : "Ekspor semua pengajuan"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportSlik}
                    disabled={exporting !== null}
                    title="Format SLIK selalu memuat seluruh data, tidak mengikuti filter"
                  >
                    {exporting === "slik" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Ekspor SLIK (semua data)
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Memuat antrean...
                </div>
              ) : isError ? (
                <QueryError
                  message={`Data antrean tidak dapat dimuat. ${errorMessage(queueQuery.error ?? statsQuery.error, "")}`.trim()}
                  onRetry={refresh}
                  retrying={isRefreshing}
                />
              ) : applications.length === 0 ? (
                <div className="py-24 text-center text-slate-600">
                  {hasAnyFilter ? "Tidak ada pengajuan pada filter ini." : "Belum ada pengajuan."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                      <tr>
                        <th scope="col" className="sticky left-0 z-10 bg-slate-50 px-6 py-4 font-semibold">Nasabah</th>
                        <th scope="col" className="px-6 py-4 font-semibold">Usaha</th>
                        <th scope="col" className="px-6 py-4 font-semibold">Plafon diajukan</th>
                        <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                        <th scope="col" className="px-6 py-4 font-semibold">Skor / klasifikasi</th>
                        <th scope="col" className="px-6 py-4 font-semibold">Tanggal</th>
                        <th scope="col" className="px-6 py-4 font-semibold"><span className="sr-only">Aksi</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications.map((item) => {
                        const canDeleteAssessment = item.latestAssessmentScore !== null && canExport;
                        const canHardDelete = user?.role === "admin";
                        const rowPending = pendingRowId === item.id;
                        return (
                          <tr key={item.id} className="group hover:bg-slate-50">
                            <td className="sticky left-0 z-10 max-w-[180px] bg-white px-6 py-4 font-semibold text-navy-900 group-hover:bg-slate-50">
                              <Link to={`/applications/${item.id}`} className="hover:underline">
                                {item.customerName}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                              {item.businessName}
                              <span className="block text-xs text-slate-600">{item.businessType}</span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">{formatMoney(Number(item.requestedAmount))}</td>
                            <td className="px-6 py-4">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="px-6 py-4">
                              {item.latestAssessmentScore !== null ? (
                                <>
                                  <span className="font-semibold">
                                    {item.latestAssessmentScore.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                  </span>
                                  <span className="block text-xs text-slate-600">
                                    {item.latestAssessmentClassification}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-600">Belum dinilai</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                              {new Date(item.createdAt).toLocaleDateString("id-ID")}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button asChild size="sm" variant="outline">
                                  <Link to={`/applications/${item.id}`} aria-label={`Detail pengajuan ${item.customerName}`}>Detail</Link>
                                </Button>
                                {(canDeleteAssessment || canHardDelete) && (
                                  <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        disabled={rowPending}
                                        aria-label={`Aksi lain untuk ${item.customerName}`}
                                        title="Aksi lain"
                                      >
                                        {rowPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64">
                                      <DropdownMenuLabel className="truncate text-xs font-normal text-slate-600">
                                        {item.customerName}
                                      </DropdownMenuLabel>
                                      {canDeleteAssessment && (
                                        <DropdownMenuItem onSelect={() => void handleDeleteAssessment(item)}>
                                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                          <span className="flex flex-col">
                                            Hapus penilaian
                                            <span className="text-xs text-slate-600">Pengajuan kembali ke menunggu penilaian</span>
                                          </span>
                                        </DropdownMenuItem>
                                      )}
                                      {canDeleteAssessment && canHardDelete && <DropdownMenuSeparator />}
                                      {canHardDelete && (
                                        <DropdownMenuItem variant="destructive" onSelect={() => void handleHardDelete(item)}>
                                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                                          <span className="flex flex-col">
                                            Hapus permanen pengajuan
                                            <span className="text-xs">Termasuk dokumen; tidak dapat dipulihkan</span>
                                          </span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
