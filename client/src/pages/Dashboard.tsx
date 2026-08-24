import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2, RefreshCw, Shield, XCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

type Status = "all" | "pending" | "assessed" | "approved" | "rejected";

const statusLabels: Record<Exclude<Status, "all">, string> = {
  pending: "Menunggu penilaian",
  assessed: "Menunggu keputusan",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const formatMoney = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function Dashboard() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [status, setStatus] = useState<Status>("all");
  const queueQuery = trpc.applications.queue.useQuery(status === "all" ? undefined : { status });
  const statsQuery = trpc.applications.operationalStats.useQuery();
  const isLoading = queueQuery.isLoading || statsQuery.isLoading;
  const isError = queueQuery.isError || statsQuery.isError;
  const applications = queueQuery.data ?? [];
  const stats = statsQuery.data;
  const refresh = () => { void queueQuery.refetch(); void statsQuery.refetch(); };
  const totalRequested = stats?.totalRequestedAmount ?? 0;
  const totalApproved = stats?.approvedAmount ?? 0;
  const averageScore = stats?.averageAssessedScore ?? 0;

  const cards = [
    ["Pending assessment", stats?.counts.pending ?? 0, Clock3, "text-amber-600"],
    ["Waiting checker decision", stats?.pendingDecision ?? 0, FileText, "text-blue-600"],
    ["Approved", stats?.counts.approved ?? 0, CheckCircle2, "text-emerald-600"],
    ["Rejected", stats?.counts.rejected ?? 0, XCircle, "text-red-600"],
    ["Total requested", formatMoney(totalRequested), FileText, "text-slate-600"],
    ["Total approved", formatMoney(totalApproved), CheckCircle2, "text-emerald-600"],
    ["Average score", averageScore.toFixed(1), Shield, "text-violet-600"],
  ] as const;

  return <div className="min-h-screen bg-slate-50">
    <nav className="border-b bg-white"><div className="container flex items-center justify-between py-4"><Link href="/" className="flex items-center gap-2 text-primary"><Shield className="h-6 w-6" /><span className="text-xl font-bold">SSCI BPRS</span></Link><span className="text-sm text-slate-600">{user?.name || "Belum masuk"}</span></div></nav>
    <main className="container max-w-7xl py-6 sm:py-8">
       <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">Operational center</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Dashboard operasional</h1><p className="mt-2 text-slate-600">Pantau alur pengajuan pembiayaan BPRS secara real time.</p></div><div className="flex flex-wrap gap-2"><Button asChild><Link href="/applications/new"><FileText className="mr-2 h-4 w-4" />Mulai penilaian baru</Link></Button><Button asChild variant="outline"><Link href="/assessments">Riwayat penilaian</Link></Button><Button variant="outline" onClick={refresh} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button></div></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">{cards.map(([label, value, Icon, color]) => <Card key={label} className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{label}</p><Icon className={`h-4 w-4 ${color}`} /></div><p className="mt-2 text-xl font-bold text-slate-900">{value}</p></CardContent></Card>)}</div>
       <Card className="mt-6 border-0 shadow-sm"><CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Queue pengajuan</CardTitle><p className="mt-1 text-sm text-slate-500">Prioritas pekerjaan assessment dan keputusan checker.</p></div><Select value={status} onValueChange={value => setStatus(value as Status)}><SelectTrigger className="w-full sm:w-56" aria-label="Filter status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{Object.entries(statusLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></CardHeader><CardContent className="p-0">
         {isLoading ? <div className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Memuat queue...</div> : isError ? <div className="flex flex-col items-center gap-3 py-16 text-center text-red-600"><AlertCircle className="h-8 w-8" /><p>Data queue tidak dapat dimuat.</p><Button variant="outline" onClick={refresh}>Coba lagi</Button></div> : applications.length === 0 ? <div className="py-16 text-center text-slate-500">Tidak ada pengajuan pada filter ini.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Customer", "Business", "Amount", "Status", "Score / classification", "Date", ""].map(label => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y">{applications.map(item => <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-4 font-semibold text-slate-900">{item.customerName}</td><td className="px-4 py-4 text-slate-600">{item.businessName}<span className="block text-xs text-slate-400">{item.businessType}</span></td><td className="px-4 py-4 whitespace-nowrap">{formatMoney(Number(item.requestedAmount))}</td><td className="px-4 py-4"><Badge variant={item.status === "rejected" ? "destructive" : item.status === "approved" ? "default" : "secondary"}>{statusLabels[item.status]}</Badge></td><td className="px-4 py-4">{item.latestAssessmentScore !== null ? <><span className="font-semibold">{item.latestAssessmentScore.toFixed(1)}</span><span className="block text-xs text-slate-500">{item.latestAssessmentClassification}</span></> : <span className="text-slate-400">Belum dinilai</span>}</td><td className="px-4 py-4 whitespace-nowrap text-slate-500">{new Date(item.createdAt).toLocaleDateString("id-ID")}</td><td className="px-4 py-4"><Button asChild size="sm" variant="outline"><Link href={`/applications/${item.id}`}>Detail</Link></Button></td></tr>)}</tbody></table></div>}
      </CardContent></Card>
    </main>
  </div>;
}
