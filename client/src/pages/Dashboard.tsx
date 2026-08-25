import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
  TrendingUp,
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

type Status = "all" | "pending" | "assessed" | "approved" | "rejected" | "cancelled";

const statusLabels: Record<Exclude<Status, "all">, string> = {
  pending: "Menunggu penilaian",
  assessed: "Menunggu keputusan",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

const statusTone: Record<string, string> = {
  pending: "secondary",
  assessed: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

const formatMoney = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function Dashboard() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [status, setStatus] = useState<Status>("all");
  const queueQuery = trpc.applications.queue.useQuery(status === "all" ? undefined : { status });
  const statsQuery = trpc.applications.operationalStats.useQuery();
  const trendQuery = trpc.applications.dashboardTrend.useQuery();
  const analystQuery = trpc.applications.analystPerformance.useQuery();
  const orgQuery = trpc.organization.getSettings.useQuery();
  const orgName = orgQuery.data?.name;
  const orgLogo = orgQuery.data?.logoUrl;
  const isLoading = queueQuery.isLoading || statsQuery.isLoading;
  const isError = queueQuery.isError || statsQuery.isError;
  const applications = queueQuery.data ?? [];
  const stats = statsQuery.data;
  const refresh = () => {
    void queueQuery.refetch();
    void statsQuery.refetch();
    void trendQuery.refetch();
    void analystQuery.refetch();
  };
  const utils = trpc.useUtils();
  const deleteAssessment = trpc.assessments.delete.useMutation({
    onSuccess: async () => {
      await utils.applications.queue.invalidate();
      await utils.applications.operationalStats.invalidate();
      toast.success("Penilaian berhasil dihapus. Pengajuan kembali ke menunggu penilaian.");
    },
    onError: error => toast.error(`Gagal menghapus penilaian: ${error.message}`),
  });

  const hardDelete = trpc.assessments.hardDelete.useMutation({
    onSuccess: async () => {
      await utils.applications.queue.invalidate();
      await utils.applications.operationalStats.invalidate();
      toast.success("Pengajuan berhasil dihapus permanen.");
    },
    onError: error => toast.error(`Gagal menghapus pengajuan: ${error.message}`),
  });

  const handleDeleteAssessment = (item: { id: number; customerName: string }) => {
    if (!window.confirm(`Hapus penilaian untuk "${item.customerName}"? Pengajuan akan kembali ke status menunggu penilaian.`)) {
      return;
    }
    deleteAssessment.mutate({ applicationId: item.id });
  };

  const handleHardDelete = (item: { id: number; customerName: string }) => {
    if (!window.confirm(`Hapus permanen pengajuan "${item.customerName}" beserta semua penilaian dan dokumennya? Aksi ini tidak dapat dibatalkan.`)) {
      return;
    }
    hardDelete.mutate({ applicationId: item.id });
  };

  const exportSlikQuery = trpc.applications.exportSlik.useQuery(undefined, { enabled: false });

  const downloadCsv = (rows: NonNullable<typeof exportSlikQuery.data>) => {
    const header = ["Nama", "NIK", "Usaha", "Jenis", "Pembiayaan", "Status", "Skor", "Klasifikasi", "Tanggal"];
    const escapeCell = (value: string | number | null | undefined) => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const lines = rows.map(row => [
      row.customerName,
      row.customerId,
      row.businessName,
      row.businessType,
      row.requestedAmount,
      row.status,
      row.totalScore !== null && row.totalScore !== undefined ? row.totalScore : "",
      row.classification ?? "",
      row.assessedAt ? new Date(row.assessedAt).toLocaleDateString("id-ID") : "",
    ]);
    const csv = [header, ...lines].map(line => line.map(escapeCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `slik-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSlik = async () => {
    try {
      const result = await exportSlikQuery.refetch();
      const rows = result.data ?? [];
      if (rows.length === 0) {
        toast.error("Tidak ada data pengajuan untuk diekspor.");
        return;
      }
      downloadCsv(rows);
      toast.success("Export SLIK berhasil diunduh.");
    } catch (error) {
      toast.error(`Gagal mengekspor SLIK: ${(error as Error).message}`);
    }
  };

  const statusCards = [
    {
      label: "Menunggu penilaian",
      value: stats?.counts.pending ?? 0,
      Icon: Clock3,
      color: "text-amber-600",
      bg: "bg-amber-50",
      to: "/assessments",
    },
    {
      label: "Menunggu keputusan",
      value: stats?.pendingDecision ?? 0,
      Icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      to: "/assessments",
    },
    {
      label: "Disetujui",
      value: stats?.counts.approved ?? 0,
      Icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      to: "/assessments",
    },
    {
      label: "Ditolak",
      value: stats?.counts.rejected ?? 0,
      Icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      to: "/assessments",
    },
  ];

  const financialCards = [
    {
      label: "Total pengajuan",
      value: formatMoney(stats?.totalRequestedAmount ?? 0),
      Icon: TrendingUp,
      color: "text-slate-600",
    },
    {
      label: "Total disetujui",
      value: formatMoney(stats?.approvedAmount ?? 0),
      Icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      label: "Rata-rata skor",
      value: (stats?.averageAssessedScore ?? 0).toFixed(1),
      Icon: Shield,
      color: "text-violet-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2 text-primary">
            {orgLogo ? (
              <img src={orgLogo} alt="Logo BPRS" className="h-7 w-7 rounded object-contain" />
            ) : (
              <Shield className="h-6 w-6" />
            )}
            <span className="text-xl font-bold">{orgName || "SSCI BPRS"}</span>
            {orgName && (
              <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500 sm:inline">
                BPRS
              </span>
            )}
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ProfileMenu />
          </div>
        </div>
      </nav>

      <main className="container max-w-7xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Operational center</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Dashboard operasional</h1>
            <p className="mt-2 text-slate-600">Pantau alur pengajuan pembiayaan BPRS secara real time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/applications/new">
                <FileText className="mr-2 h-4 w-4" />
                Mulai penilaian baru
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/assessments">Riwayat penilaian</Link>
            </Button>
            <Button variant="outline" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Status summary */}
        <section className="mt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Ringkasan status</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statusCards.map(({ label, value, Icon, color, bg, to }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                      <Link to={to}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
                  <p className="mt-1 text-sm text-slate-500">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Financial summary */}
        <section className="mt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Ringkasan keuangan</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {financialCards.map(({ label, value, Icon, color }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
                  </div>
                  <Icon className={`h-6 w-6 ${color}`} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Analytics charts */}
        <section className="mt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Analitik</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Trend skor 6 bulan</CardTitle>
                <p className="text-sm text-slate-500">Rata-rata skor penilaian per bulan.</p>
              </CardHeader>
              <CardContent>
                {trendQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Memuat tren...
                  </div>
                ) : (trendQuery.data ?? []).length === 0 ? (
                  <p className="py-24 text-center text-slate-500">Belum ada data tren.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendQuery.data ?? []} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={(m) => m.slice(5)} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${Number(value).toFixed(1)} skor (${props.payload.count} penilaian)`,
                          "Rata-rata",
                        ]}
                      />
                      <Line type="monotone" dataKey="averageScore" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Performa analis</CardTitle>
                <p className="text-sm text-slate-500">Jumlah dan rata-rata skor per analis.</p>
              </CardHeader>
              <CardContent>
                {analystQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Memuat performa analis...
                  </div>
                ) : (analystQuery.data ?? []).length === 0 ? (
                  <p className="py-24 text-center text-slate-500">Belum ada data analis.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analystQuery.data ?? []} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${value} penilaian (rata-rata ${Number(props.payload.averageScore).toFixed(1)})`,
                          "Jumlah",
                        ]}
                      />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Queue */}
        <section className="mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Queue pengajuan</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Prioritas pekerjaan assessment dan keputusan.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Button variant="outline" onClick={handleExportSlik} disabled={exportSlikQuery.isFetching}>
                  {exportSlikQuery.isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export SLIK
                </Button>
                <Select value={status} onValueChange={(value) => setStatus(value as Status)}>
                  <SelectTrigger className="w-full sm:w-56" aria-label="Filter status">
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua status</SelectItem>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Memuat queue...
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center gap-3 py-24 text-center text-red-600">
                  <AlertCircle className="h-8 w-8" />
                  <p>Data queue tidak dapat dimuat.</p>
                  <Button variant="outline" onClick={refresh}>
                    Coba lagi
                  </Button>
                </div>
              ) : applications.length === 0 ? (
                <div className="py-24 text-center text-slate-500">Tidak ada pengajuan pada filter ini.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        {["Customer", "Business", "Amount", "Status", "Score / classification", "Date", ""].map(
                          (label) => (
                            <th key={label} className="px-6 py-4 font-semibold">
                              {label}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-semibold text-slate-900">{item.customerName}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {item.businessName}
                            <span className="block text-xs text-slate-400">{item.businessType}</span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">{formatMoney(Number(item.requestedAmount))}</td>
                          <td className="px-6 py-4">
                            <Badge variant={statusTone[item.status] as "default" | "destructive" | "secondary"}>
                              {statusLabels[item.status]}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {item.latestAssessmentScore !== null ? (
                              <>
                                <span className="font-semibold">{item.latestAssessmentScore.toFixed(1)}</span>
                                <span className="block text-xs text-slate-500">
                                  {item.latestAssessmentClassification}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400">Belum dinilai</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString("id-ID")}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/applications/${item.id}`}>Detail</Link>
                              </Button>
                              {item.latestAssessmentScore !== null && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-400 hover:text-orange-600"
                                  title="Hapus penilaian"
                                  onClick={() => handleDeleteAssessment(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-red-600"
                                title="Hapus permanen pengajuan"
                                onClick={() => handleHardDelete(item)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
