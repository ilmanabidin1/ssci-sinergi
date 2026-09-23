import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatScore(score: number | null) {
  if (score === null || score === undefined) return "-";
  return score.toFixed(0);
}

export default function Customers() {
  useAuth({ redirectOnUnauthenticated: true });

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const { data: customers, isLoading, isError, refetch } = trpc.applications.customerMaster.useQuery(
    debounced ? { search: debounced } : undefined
  );

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDebounced(search);
  };

  const clearSearch = () => {
    setSearch("");
    setDebounced("");
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-ivory">
        <AppHeader />
        <main className="container max-w-6xl px-4 py-16 sm:px-6">
          <Card className="border-border shadow-premium">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-slate-600">Gagal memuat data nasabah.</p>
              <button
                onClick={() => {
                  void refetch();
                  toast.error("Gagal memuat data nasabah");
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                Coba lagi
              </button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />
      <main className="container max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-medium text-navy-900 sm:text-4xl">Master Nasabah</h1>
          <p className="mt-1 text-slate-600">
            Ringkasan nasabah BPRS berdasarkan riwayat pengajuan pembiayaan.
          </p>
        </div>

        <Card className="mb-6 border-border shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Cari Nasabah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Cari berdasarkan nama, ID nasabah, atau nama usaha..."
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="sm:w-auto">
                  Cari
                </Button>
                {debounced && (
                  <Button type="button" variant="outline" onClick={clearSearch}>
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Daftar Nasabah
              {debounced && (
                <Badge className="ml-2 bg-slate-100 text-slate-600">Hasil: {customers?.length ?? 0}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />Memuat data nasabah...
              </div>
            ) : !customers || customers.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                {debounced
                  ? "Tidak ada nasabah yang cocok dengan pencarian Anda."
                  : "Belum ada data nasabah."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 font-semibold">Nama Nasabah</th>
                      <th className="px-4 py-3 font-semibold">ID Nasabah</th>
                      <th className="px-4 py-3 font-semibold">Nama Usaha</th>
                      <th className="px-4 py-3 font-semibold text-center">Total Pengajuan</th>
                      <th className="px-4 py-3 font-semibold text-center">Skor Terakhir</th>
                      <th className="px-4 py-3 font-semibold">Pengajuan Terakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(entry => (
                      <tr
                        key={entry.customerId}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{entry.customerName}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.customerId}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.businessName}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{entry.totalApplications}</td>
                        <td className="px-4 py-3 text-center">
                          {entry.latestAssessmentScore !== null &&
                          entry.latestAssessmentScore !== undefined ? (
                            <Badge className="bg-[#e1e8f4] text-navy-800">
                              {formatScore(entry.latestAssessmentScore)}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(entry.lastApplicationDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

