import { useAuth } from "@/_core/hooks/useAuth";
import { AppHeader, PageHeading } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Building2, Loader2, ScrollText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Platform() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
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
    onError: error => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />
      <main className="container max-w-6xl py-8">
        <PageHeading eyebrow="Konsol platform" title="SuperAdmin SSCI" description="Verifikasi pendaftaran BPRS dan pantau log audit seluruh organisasi. Halaman ini hanya untuk pengelola platform." />
        {!allowed ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Halaman ini khusus SuperAdmin platform.</CardContent></Card>
        ) : (orgs.error || logs.error) ? (
          <Card><CardContent className="py-10 text-center text-sm text-red-600">{(orgs.error ?? logs.error)?.message.replace("TWO_FACTOR_REQUIRED: ", "")}</CardContent></Card>
        ) : (
          <Tabs defaultValue="orgs">
            <TabsList>
              <TabsTrigger value="orgs"><Building2 />Organisasi BPRS</TabsTrigger>
              <TabsTrigger value="logs"><ScrollText />Log audit platform</TabsTrigger>
            </TabsList>

            <TabsContent value="orgs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar BPRS</CardTitle>
                  <CardDescription>BPRS yang mendaftar sendiri berstatus menunggu verifikasi sampai disetujui di sini.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orgs.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat...</p>}
                  {(orgs.data ?? []).map(org => (
                    <div key={org.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${org.registrationStatus === "pending" ? "border-gold-400/50 bg-gold-50" : "border-border bg-white"}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-navy-900">{org.name}</p>
                          {org.registrationStatus === "active"
                            ? <Badge className="bg-emerald-100 text-emerald-800">Aktif</Badge>
                            : <Badge className="bg-amber-100 text-amber-900">Menunggu / ditangguhkan</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{org.legalName} · {org.slug} · terdaftar {new Date(org.createdAt).toLocaleDateString("id-ID")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Admin: {org.admins.map(a => `${a.name ?? "-"} (${a.email ?? "-"})`).join(", ") || "-"} · {org.userCount} pengguna · {org.applicationCount} pengajuan
                        </p>
                      </div>
                      {org.id !== user?.organizationId && (
                        org.registrationStatus === "pending" ? (
                          <Button size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ organizationId: org.id, status: "active" })}>Setujui</Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={setStatus.isPending}
                            onClick={() => {
                              if (window.confirm(`Tangguhkan ${org.name}? Semua pengguna BPRS ini tidak dapat mengakses sistem sampai diaktifkan kembali.`)) {
                                setStatus.mutate({ organizationId: org.id, status: "pending" });
                              }
                            }}
                          >
                            Tangguhkan
                          </Button>
                        )
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Log audit seluruh BPRS</CardTitle>
                    <CardDescription>200 kejadian terbaru, termasuk login 2FA, ekspor data, pembukaan NIK, peninjauan, dan keputusan.</CardDescription>
                  </div>
                  <Select value={orgFilter} onValueChange={setOrgFilter}>
                    <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua BPRS</SelectItem>
                      {(orgs.data ?? []).map(org => <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Waktu</TableHead><TableHead>BPRS</TableHead><TableHead>Pelaku</TableHead><TableHead>Aksi</TableHead><TableHead>Objek</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {(logs.data ?? []).map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">{new Date(log.createdAt).toLocaleString("id-ID")}</TableCell>
                            <TableCell>{log.organizationName}</TableCell>
                            <TableCell>{log.actorName}</TableCell>
                            <TableCell><code className="rounded bg-ivory px-1.5 py-0.5 text-xs">{log.action}</code></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{log.entityType} #{log.entityId}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
