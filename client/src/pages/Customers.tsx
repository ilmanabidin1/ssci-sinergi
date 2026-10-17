import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { classifySSCI } from "@shared/ssciMethodology";
import { AlertCircle, FilePlus2, History, Loader2, Search, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function formatDate(iso: string | Date) {
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
  return score.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

const scoreClass: Record<string, string> = {
  "Sangat Layak": "score-excellent",
  Layak: "score-good",
  "Perlu Pengawasan": "score-warning",
  "Tidak Layak": "score-poor",
};

export default function Customers() {
  usePageTitle("Master nasabah");
  useAuth({ redirectOnUnauthenticated: true });

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const { data: customers, isLoading, isError, error, isFetching, refetch } = trpc.applications.customerMaster.useQuery(
    debounced ? { search: debounced } : undefined
  );

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDebounced(search.trim());
  };

  const clearSearch = () => {
    setSearch("");
    setDebounced("");
  };

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />
      <main id="main-content" tabIndex={-1} className="container max-w-6xl px-4 py-8 focus:outline-none sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-medium text-navy-900 sm:text-4xl">Master nasabah</h1>
          <p className="mt-1 text-slate-600">
            Ringkasan nasabah BPRS berdasarkan riwayat pengajuan pembiayaan.
          </p>
        </div>

        <Card className="mb-6 border-border shadow-premium">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" aria-hidden="true" />
              Cari nasabah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="customer-search">Nama, ID nasabah, atau nama usaha</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <Input
                    id="customer-search"
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Contoh: Siti Aminah"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 sm:flex-none" disabled={isFetching && !!debounced}>
                  {isFetching && debounced ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
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
            <CardTitle as="h2" className="flex flex-wrap items-center gap-2">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
              Daftar nasabah
              {debounced && !isError && (
                <Badge className="ml-2 bg-slate-100 text-slate-700">Hasil: {customers?.length ?? 0}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Memuat data nasabah...
              </div>
            ) : isError ? (
              <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center text-red-700">
                <AlertCircle className="h-8 w-8" aria-hidden="true" />
                <p>Gagal memuat data nasabah. {errorMessage(error, "")}</p>
                <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
                  {isFetching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Coba lagi
                </Button>
              </div>
            ) : !customers || customers.length === 0 ? (
              <div className="py-10 text-center text-slate-600">
                {debounced
                  ? "Tidak ada nasabah yang cocok dengan pencarian Anda."
                  : "Belum ada data nasabah."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600">
                      <th scope="col" className="px-4 py-3 font-semibold">Nama nasabah</th>
                      <th scope="col" className="px-4 py-3 font-semibold">ID nasabah</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Nama usaha</th>
                      <th scope="col" className="px-4 py-3 text-center font-semibold">Total pengajuan</th>
                      <th scope="col" className="px-4 py-3 text-center font-semibold">Skor terakhir</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Pengajuan terakhir</th>
                      <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Aksi</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(entry => {
                      const hasScore = entry.latestAssessmentScore !== null && entry.latestAssessmentScore !== undefined;
                      const classification = hasScore ? classifySSCI(entry.latestAssessmentScore as number) : null;
                      const historyHref = `/assessments?search=${encodeURIComponent(entry.customerName)}`;
                      return (
                        <tr
                          key={entry.customerId}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 font-medium text-navy-900">
                            <Link href={historyHref} className="hover:underline">{entry.customerName}</Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{entry.customerId}</td>
                          <td className="px-4 py-3 text-slate-600">{entry.businessName}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{entry.totalApplications}</td>
                          <td className="px-4 py-3 text-center">
                            {hasScore && classification ? (
                              <Badge variant="outline" className={`${scoreClass[classification]} flex-col gap-0 px-2.5 py-0.5`}>
                                <span>{formatScore(entry.latestAssessmentScore)}</span>
                                <span className="text-[11px] font-medium">{classification}</span>
                              </Badge>
                            ) : (
                              <span className="text-slate-600">Belum dinilai</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(entry.lastApplicationDate)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button asChild size="sm" variant="outline">
                                <Link href={historyHref} aria-label={`Lihat pengajuan ${entry.customerName}`}>
                                  <History className="h-4 w-4" aria-hidden="true" />
                                  Pengajuan
                                </Link>
                              </Button>
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/applications/new?nama=${encodeURIComponent(entry.customerName)}&usaha=${encodeURIComponent(entry.businessName ?? "")}`} aria-label={`Buat pengajuan baru untuk ${entry.customerName}`}>
                                  <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                                  Pengajuan baru
                                </Link>
                              </Button>
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
      </main>
    </div>
  );
}
