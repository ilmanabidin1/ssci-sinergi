import { useAuth } from "@/_core/hooks/useAuth";
import { AppHeader, PageHeading } from "@/components/AppHeader";
import { useConfirm } from "@/components/ConfirmDialog";
import { AccessDenied, PageSkeleton } from "@/components/RouteGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ACTION_META, ENTITY_LABEL, TONE_CLASS } from "@/lib/auditLabels";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Building2, Loader2, ScrollText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Platform() {
  usePageTitle("Konsol SuperAdmin");
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { confirm } = useConfirm();
  const allowed = Boolean(user?.isSuperAdmin);
  const orgs = trpc.platform.listOrganizations.useQuery(undefined, { enabled: allowed, retry: false });
  const [orgFilter, setOrgFilter] = useState("all");
  const logs = trpc.platform.auditLogs.useQuery(orgFilter === "all" ? {} : { organizationId: Number(orgFilter) }, { enabled: allowed, retry: false });
  const setStatus = trpc.platform.setOrganizationStatus.useMutation({
    onSuccess: async (_d, v) => {
      await utils.platform.listOrganizations.invalidate();
      await utils.platform.auditLogs.invalidate();
      toast.success(v.status === "active" ? "BPRS disetujui dan dapat login." : "BPRS ditangguhkan; penggunanya tidak dapat mengakses sistem.");
    },
    onError: error => toast.error("Gagal mengubah status BPRS", { description: errorMessage(error) }),
  });

  if (loading || !user) return <PageSkeleton />;
  if (!allowed) return <AccessDenied message="Halaman ini khusus SuperAdmin platform." />;

  const suspend = async (org: { id: number; name: string }) => {
    const ok = await confirm({
      title: `Tangguhkan ${org.name}?`,
      description: <p>Semua pengguna BPRS ini tidak dapat mengakses sistem sampai diaktifkan kembali. Data pengajuan tetap tersimpan.</p>,
      confirmLabel: "Tangguhkan",
      destructive: true,
    });
    if (ok) setStatus.mutate({ organizationId: org.id, status: "pending" });
  };

  const loadError = orgs.error ?? logs.error;

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />
      <main id="main-content" tabIndex={-1} className="container max-w-6xl py-8 focus:outline-none">
        <PageHeading eyebrow="Konsol platform" title="SuperAdmin SSCI" description="Verifikasi pendaftaran BPRS dan pantau log audit seluruh organisasi. Halaman ini hanya untuk pengelola platform." />
        {loadError && !orgs.data && !logs.data ? (
          <Card>
            <CardContent role="alert" className="flex flex-col items-center gap-3 py-10 text-center text-sm text-red-700">
              <AlertCircle className="h-8 w-8" aria-hidden="true" />
              <p>{errorMessage(loadError, "Data platform tidak dapat dimuat.")}</p>
              <Button variant="outline" onClick={() => { void orgs.refetch(); void logs.refetch(); }} disabled={orgs.isFetching || logs.isFetching}>
                Coba lagi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="orgs">
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="orgs">
                <Building2 aria-hidden="true" />
                <span className="sm:hidden">Organisasi</span>
                <span className="hidden sm:inline">Organisasi BPRS</span>
              </TabsTrigger>
              <TabsTrigger value="logs">
                <ScrollText aria-hidden="true" />
                <span className="sm:hidden">Log audit</span>
                <span className="hidden sm:inline">Log audit platform</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orgs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Daftar BPRS</CardTitle>
                  <CardDescription>BPRS yang mendaftar sendiri berstatus menunggu verifikasi sampai disetujui di sini.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orgs.isLoading ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Memuat daftar BPRS...</p>
                  ) : orgs.isError ? (
                    <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center text-sm text-red-700">
                      <p>{errorMessage(orgs.error, "Daftar BPRS tidak dapat dimuat.")}</p>
                      <Button variant="outline" onClick={() => orgs.refetch()} disabled={orgs.isFetching}>Coba lagi</Button>
                    </div>
                  ) : (orgs.data ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Belum ada BPRS yang terdaftar.</p>
                  ) : (orgs.data ?? []).map(org => {
                    const rowPending = setStatus.isPending && setStatus.variables?.organizationId === org.id;
                    return (
                    <div key={org.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${org.registrationStatus === "pending" ? "border-gold-400/50 bg-gold-50" : "border-border bg-white"}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-semibold text-navy-900">{org.name}</h3>
                          {org.registrationStatus === "active"
                            ? <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">Aktif</Badge>
                            : <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">Belum aktif (menunggu verifikasi atau ditangguhkan)</Badge>}
                        </div>
                        <p className="break-words text-xs text-muted-foreground">{org.legalName} · {org.slug} · terdaftar {new Date(org.createdAt).toLocaleDateString("id-ID")}</p>
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          Admin: {org.admins.map(a => `${a.name ?? "-"} (${a.email ?? "-"})`).join(", ") || "-"} · {org.userCount} pengguna · {org.applicationCount} pengajuan
                        </p>
                      </div>
                      {org.id === user.organizationId ? (
                        <span className="text-xs text-muted-foreground">Organisasi Anda</span>
                      ) : org.registrationStatus === "pending" ? (
                        <Button size="sm" disabled={rowPending} onClick={() => setStatus.mutate({ organizationId: org.id, status: "active" })}>
                          {rowPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                          Setujui
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={rowPending} onClick={() => void suspend(org)}>
                          {rowPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                          Tangguhkan
                        </Button>
                      )}
                    </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle as="h2">Log audit seluruh BPRS</CardTitle>
                    <CardDescription>200 kejadian terbaru, termasuk login 2FA, ekspor data, pembukaan NIK, peninjauan, dan keputusan.</CardDescription>
                  </div>
                  <Select value={orgFilter} onValueChange={setOrgFilter}>
                    <SelectTrigger className="w-full sm:w-64" aria-label="Filter BPRS"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua BPRS</SelectItem>
                      {(orgs.data ?? []).map(org => <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {logs.isLoading ? (
                    <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Memuat log audit...</p>
                  ) : logs.isError ? (
                    <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center text-sm text-red-700">
                      <p>{errorMessage(logs.error, "Log audit tidak dapat dimuat.")}</p>
                      <Button variant="outline" onClick={() => logs.refetch()} disabled={logs.isFetching}>Coba lagi</Button>
                    </div>
                  ) : (logs.data ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Belum ada kejadian tercatat untuk filter ini.</p>
                  ) : (
                    <Table className="min-w-[720px]">
                      <TableHeader>
                        <TableRow><TableHead>Waktu</TableHead><TableHead>BPRS</TableHead><TableHead>Pelaku</TableHead><TableHead>Aksi</TableHead><TableHead>Objek</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {(logs.data ?? []).map(log => {
                          const meta = ACTION_META[log.action];
                          return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">{new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                            <TableCell className="min-w-40 whitespace-normal">{log.organizationName}</TableCell>
                            <TableCell className="min-w-32 whitespace-normal">{log.actorName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={TONE_CLASS[meta?.tone ?? "neutral"]} title={log.action}>{meta?.label ?? log.action}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{ENTITY_LABEL[log.entityType] ?? log.entityType} #{log.entityId}</TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
