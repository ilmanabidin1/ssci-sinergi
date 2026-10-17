import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessDenied, PageSkeleton } from "@/components/RouteGuard";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ACTION_META, ENTITY_LABEL, TONE_CLASS } from "@/lib/auditLabels";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, ScrollText } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const PAGE_SIZE = 50;

const actionOptions: { value: string; label: string }[] = [
  { value: "all", label: "Semua aksi" },
  ...Object.entries(ACTION_META)
    .filter(([key]) => !key.startsWith("ORGANIZATION_"))
    .map(([value, meta]) => ({ value, label: meta.label })),
];

export default function AuditLog() {
  usePageTitle("Log audit");
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";
  const [action, setAction] = useState<string>("all");
  const [offset, setOffset] = useState(0);

  const auditQuery = trpc.organization.auditLog.useQuery(
    {
      limit: PAGE_SIZE,
      offset,
      action: action === "all" ? undefined : action,
    },
    { enabled: isAdmin, placeholderData: keepPreviousData }
  );

  const entries = auditQuery.data ?? [];
  const hasNext = entries.length === PAGE_SIZE;
  const hasPrev = offset > 0;

  const handleActionChange = (value: string) => {
    setAction(value);
    setOffset(0);
  };

  if (loading || !user) return <PageSkeleton />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />

      <main id="main-content" tabIndex={-1} className="container max-w-6xl px-4 py-8 focus:outline-none sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-medium text-navy-900 sm:text-4xl">Log audit</h1>
          <p className="mt-1 text-slate-600">Riwayat tindakan penting di organisasi BPRS Anda.</p>
        </div>

        <Card className="border-border shadow-premium">
          <CardHeader className="flex flex-col gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle as="h2" className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" aria-hidden="true" />
              Riwayat aktivitas
            </CardTitle>
            <Select value={action} onValueChange={handleActionChange}>
              <SelectTrigger className="w-full sm:w-64" aria-label="Filter aksi">
                <SelectValue placeholder="Semua aksi" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>

          <CardContent className="p-0">
            {auditQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-24 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Memuat log audit...
              </div>
            ) : auditQuery.isError ? (
              <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center text-red-700">
                <AlertCircle className="h-8 w-8" aria-hidden="true" />
                <p>Data log audit tidak dapat dimuat. {errorMessage(auditQuery.error, "")}</p>
                <Button variant="outline" onClick={() => auditQuery.refetch()} disabled={auditQuery.isFetching}>
                  Coba lagi
                </Button>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-24 text-center text-slate-600">
                Tidak ada catatan audit pada filter ini.
              </div>
            ) : (
              <>
                <div className={`overflow-x-auto transition-opacity ${auditQuery.isPlaceholderData ? "opacity-60" : ""}`}>
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                      <tr>
                        {["Waktu", "Aksi", "Objek", "Pelaku"].map(label => (
                          <th key={label} scope="col" className="px-6 py-4 font-semibold">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map(entry => {
                        const meta = ACTION_META[entry.action];
                        const entityLabel = ENTITY_LABEL[entry.entityType] ?? entry.entityType;
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                              {new Date(entry.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={TONE_CLASS[meta?.tone ?? "neutral"]} title={entry.action}>
                                {meta?.label ?? entry.action}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                              {entry.entityType === "application" ? (
                                <Link
                                  to={`/applications/${entry.entityId}`}
                                  className="text-primary underline-offset-2 hover:underline"
                                >
                                  {entityLabel} #{entry.entityId}
                                </Link>
                              ) : (
                                <span>{entityLabel} #{entry.entityId}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-700">{entry.actorName}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t px-6 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Menampilkan {offset + 1} sampai {offset + entries.length}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={!hasPrev || auditQuery.isFetching}
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!hasNext || auditQuery.isFetching}
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                    >
                      Berikutnya
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
