import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, ScrollText, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const PAGE_SIZE = 50;

type ActionFilter = "all" | "create" | "update" | "delete" | "login" | "logout";

const actionOptions: { value: ActionFilter; label: string }[] = [
  { value: "all", label: "Semua aksi" },
  { value: "create", label: "Buat" },
  { value: "update", label: "Perbarui" },
  { value: "delete", label: "Hapus" },
  { value: "login", label: "Masuk" },
  { value: "logout", label: "Keluar" },
];

export default function AuditLog() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";
  const [action, setAction] = useState<ActionFilter>("all");
  const [offset, setOffset] = useState(0);

  const auditQuery = trpc.organization.auditLog.useQuery(
    {
      limit: PAGE_SIZE,
      offset,
      action: action === "all" ? undefined : action,
    },
    { enabled: isAdmin }
  );

  const entries = auditQuery.data ?? [];
  const hasNext = entries.length === PAGE_SIZE;
  const hasPrev = offset > 0;

  const handleActionChange = (value: string) => {
    setAction(value as ActionFilter);
    setOffset(0);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="border-b bg-white">
          <div className="container flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-6 w-6" />
              <span className="text-xl font-bold">SSCI BPRS</span>
            </div>
            <ProfileMenu />
          </div>
        </nav>
        <main className="container max-w-3xl py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Akses ditolak</h1>
          <p className="mt-2 text-slate-600">Halaman ini hanya dapat diakses oleh admin.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-6 w-6" />
              <span className="text-xl font-bold">SSCI BPRS</span>
            </div>
          </div>
          <ProfileMenu />
        </div>
      </nav>

      <main className="container max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Audit Log</h1>
          <p className="mt-1 text-slate-600">Riwayat tindakan penting di organisasi BPRS Anda.</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Riwayat Aktivitas
            </CardTitle>
            <Select value={action} onValueChange={handleActionChange}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Filter aksi">
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
              <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat audit log...
              </div>
            ) : auditQuery.isError ? (
              <div className="flex flex-col items-center gap-3 py-24 text-center text-red-600">
                <p>Data audit log tidak dapat dimuat.</p>
                <Button variant="outline" onClick={() => auditQuery.refetch()}>
                  Coba lagi
                </Button>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-24 text-center text-slate-500">
                Tidak ada catatan audit pada filter ini.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        {["Waktu", "Aksi", "Tipe Entitas", "ID Entitas", "Aktor"].map(label => (
                          <th key={label} className="px-6 py-4 font-semibold">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {new Date(entry.createdAt).toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{entry.action}</td>
                          <td className="px-6 py-4 text-slate-600">{entry.entityType}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {entry.entityType === "application" ? (
                              <Link
                                to={`/applications/${entry.entityId}`}
                                className="text-primary hover:underline"
                              >
                                #{entry.entityId}
                              </Link>
                            ) : (
                              entry.entityId
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600">User #{entry.actorUserId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Menampilkan {offset + 1}–{offset + entries.length}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasPrev}
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasNext}
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
