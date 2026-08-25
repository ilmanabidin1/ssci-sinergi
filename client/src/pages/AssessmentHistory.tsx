import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Shield, Search, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function AssessmentHistory() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const orgQuery = trpc.organization.getSettings.useQuery();
  const orgName = orgQuery.data?.name;
  const orgLogo = orgQuery.data?.logoUrl;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "assessed" | "approved" | "rejected" | "cancelled">("all");
  
  const { data: applications, isLoading } = trpc.applications.list.useQuery(
    { search, ...(status === "all" ? {} : { status }) }
  );

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: <Badge variant="outline">Menunggu penilaian</Badge>,
      assessed: <Badge className="bg-blue-100 text-blue-800">Menunggu keputusan</Badge>,
      approved: <Badge className="bg-green-100 text-green-800">Disetujui</Badge>,
      rejected: <Badge className="bg-red-100 text-red-800">Ditolak</Badge>,
      cancelled: <Badge variant="outline">Dibatalkan</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <img src={orgLogo || "/logo-light-bg.png"} alt="SSCI" className="h-10 w-auto object-contain" />
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary">SSCI</h1>
                {orgName && <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500 sm:inline">{orgName}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ProfileMenu />
          </div>
        </div>
      </nav>

      <main className="container py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Riwayat Penilaian</h1>
          <p className="text-gray-600 mt-2">Daftar aplikasi pembiayaan dan hasil assessment</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pencarian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama nasabah, NIK, atau nama usaha..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={value => setStatus(value as typeof status)}>
              <SelectTrigger aria-label="Filter status"><SelectValue placeholder="Semua status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="pending">Menunggu penilaian</SelectItem>
                <SelectItem value="assessed">Menunggu keputusan</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {applications && applications.length > 0 ? (
              applications.map((app) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{app.customerName}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{app.businessName} - {app.businessType}</p>
                        <p className="text-sm text-gray-500">
                          Pembiayaan: Rp {Number(app.requestedAmount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Diajukan: {new Date(app.createdAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <Button asChild variant="outline">
                        <Link href={`/applications/${app.id}`}>Lihat Detail</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  Tidak ada data aplikasi pembiayaan
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
