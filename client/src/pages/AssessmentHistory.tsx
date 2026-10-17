import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { APPLICATION_STATUS_LABELS, StatusBadge, isApplicationStatus, type ApplicationStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useEffect, useState } from "react";

type StatusFilter = "all" | ApplicationStatus;

const moneyFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function AssessmentHistory() {
  usePageTitle("Riwayat penilaian");
  useAuth({ redirectOnUnauthenticated: true });
  const searchParams = new URLSearchParams(useSearch());
  const initialStatus = searchParams.get("status") ?? "";
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [status, setStatus] = useState<StatusFilter>(() => (isApplicationStatus(initialStatus) ? initialStatus : "all"));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const listQuery = trpc.applications.list.useQuery(
    { ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(status === "all" ? {} : { status }) },
    { placeholderData: keepPreviousData }
  );
  const applications = listQuery.data;
  const isFiltering = Boolean(debouncedSearch) || status !== "all";

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />

      <main id="main-content" tabIndex={-1} className="container max-w-6xl py-8 focus:outline-none">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-medium text-navy-900 sm:text-4xl">Riwayat penilaian</h1>
          <p className="mt-2 text-slate-600">Daftar pengajuan pembiayaan dan hasil penilaiannya.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle as="h2">Pencarian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[1fr_240px]">
              <div className="space-y-1.5">
                <Label htmlFor="history-search">Cari nasabah</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <Input
                    id="history-search"
                    type="search"
                    placeholder="Nama nasabah, NIK, atau nama usaha"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-10"
                    aria-describedby="history-search-status"
                  />
                  {listQuery.isFetching && !listQuery.isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" aria-hidden="true" />
                  )}
                </div>
                <p id="history-search-status" className="sr-only" aria-live="polite">
                  {listQuery.isFetching ? "Mencari..." : applications ? `${applications.length} pengajuan ditemukan` : ""}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="history-status">Status</Label>
                <Select value={status} onValueChange={value => setStatus(value as StatusFilter)}>
                  <SelectTrigger id="history-status"><SelectValue placeholder="Semua status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua status</SelectItem>
                    {Object.entries(APPLICATION_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {listQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            Memuat riwayat...
          </div>
        ) : listQuery.isError ? (
          <Card>
            <CardContent role="alert" className="flex flex-col items-center gap-3 p-12 text-center text-red-700">
              <AlertCircle className="h-8 w-8" aria-hidden="true" />
              <p>Riwayat pengajuan tidak dapat dimuat. {errorMessage(listQuery.error, "")}</p>
              <Button variant="outline" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
                Coba lagi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={`space-y-4 transition-opacity ${listQuery.isPlaceholderData ? "opacity-60" : ""}`}>
            {applications && applications.length > 0 ? (
              applications.map((app) => (
                <Card key={app.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h2 className="break-words text-lg font-semibold text-navy-900">{app.customerName}</h2>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="mb-1 text-sm text-slate-600">{app.businessName} · {app.businessType}</p>
                        <p className="text-sm text-slate-600">
                          Pembiayaan: {moneyFormatter.format(Number(app.requestedAmount) || 0)}
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          Diajukan: {new Date(app.createdAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href={`/applications/${app.id}`} aria-label={`Lihat detail pengajuan ${app.customerName}`}>Lihat detail</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-slate-600">
                  {isFiltering ? "Tidak ada pengajuan yang cocok dengan pencarian atau filter." : "Belum ada pengajuan pembiayaan."}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
