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
  FileText,
  Loader2,
  RefreshCw,
  Shield,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

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
  const orgQuery = trpc.organization.getSettings.useQuery();
  const orgName = orgQuery.data?.name;
  const isLoading = queueQuery.isLoading || statsQuery.isLoading;
  const isError = queueQuery.isError || statsQuery.isError;
  const applications = queueQuery.data ?? [];
  const stats = statsQuery.data;
  const refresh = () => {
    void queueQuery.refetch();
    void statsQuery.refetch();
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
            <Shield className="h-6 w-6" />
            <span className="text-xl font-bold">{orgName || "SSCI BPRS"}</span>
            {orgName && (
              <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500 sm:inline">
                BPRS
              </span>
            )}
          </Link>
          <ProfileMenu />
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

        {/* Queue */}
        <section className="mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Queue pengajuan</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Prioritas pekerjaan assessment dan keputusan.</p>
              </div>
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
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/applications/${item.id}`}>Detail</Link>
                            </Button>
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
