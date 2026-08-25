import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Save, Settings2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const DEFAULT_PRIMARY_COLOR = "#2458d6";

export default function Settings() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const settingsQuery = trpc.organization.getSettings.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);

  const updateSettings = trpc.organization.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.organization.getSettings.invalidate();
      toast.success("Pengaturan branding berhasil disimpan");
    },
    onError: error => toast.error(`Gagal menyimpan pengaturan: ${error.message}`),
  });

  const updateOperatorProfile = trpc.organization.updateOperatorProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Profil operator berhasil disimpan");
    },
    onError: error => toast.error(`Gagal menyimpan profil: ${error.message}`),
  });

  const isAdmin = user?.role === "admin";
  const isAdminLoading = settingsQuery.isLoading;

  const handleBrandingSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateSettings.mutate({
      name: String(data.get("name") || "").trim(),
      legalName: String(data.get("legalName") || "").trim(),
      address: String(data.get("address") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      email: String(data.get("email") || "").trim() || null,
      primaryColor,
    });
  };

  const handleOperatorSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateOperatorProfile.mutate({
      name: String(data.get("operatorName") || "").trim(),
      position: String(data.get("position") || "").trim() || null,
      phone: String(data.get("operatorPhone") || "").trim() || null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">Pengaturan</h1>
            </div>
          </div>
          <span className="hidden text-sm text-slate-600 sm:inline">{user?.name || "Belum masuk"}</span>
        </div>
      </nav>

      <main className="container max-w-3xl py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Pengaturan</h1>
          <p className="mt-1 text-slate-600">Kelola branding BPRS dan profil operator Anda.</p>
        </div>

        {isAdmin && (
          <Card className="mb-6 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Branding BPRS
              </CardTitle>
              <CardDescription>Nama, identitas, dan warna yang ditampilkan pada portal SSCI.</CardDescription>
            </CardHeader>
            <CardContent>
              {isAdminLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />Memuat pengaturan...
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleBrandingSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nama tampilan</Label>
                      <Input id="name" name="name" defaultValue={settingsQuery.data?.name ?? ""} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legalName">Nama resmi (legal)</Label>
                      <Input id="legalName" name="legalName" defaultValue={settingsQuery.data?.legalName ?? ""} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Alamat</Label>
                    <Textarea id="address" name="address" rows={3} defaultValue={settingsQuery.data?.address ?? ""} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telepon</Label>
                      <Input id="phone" name="phone" type="tel" defaultValue={settingsQuery.data?.phone ?? ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" defaultValue={settingsQuery.data?.email ?? ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Warna utama</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="primaryColor"
                        name="primaryColor"
                        type="color"
                        className="h-10 w-16 cursor-pointer p-1"
                        value={primaryColor}
                        onChange={event => setPrimaryColor(event.target.value)}
                      />
                      <span className="text-sm text-slate-500">{primaryColor}</span>
                    </div>
                  </div>
                  <Button type="submit" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Simpan branding
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Profil Operator
            </CardTitle>
            <CardDescription>Perbarui nama, jabatan, dan telepon Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleOperatorSubmit}>
              <div className="space-y-2">
                <Label htmlFor="operatorName">Nama</Label>
                <Input id="operatorName" name="operatorName" defaultValue={user?.name ?? ""} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position">Jabatan</Label>
                  <Input id="position" name="position" defaultValue={user?.position ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operatorPhone">Telepon</Label>
                  <Input id="operatorPhone" name="operatorPhone" type="tel" defaultValue={user?.phone ?? ""} />
                </div>
              </div>
              <Button type="submit" disabled={updateOperatorProfile.isPending}>
                {updateOperatorProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan profil
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
