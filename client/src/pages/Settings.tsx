import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ImageUp, Info, Landmark, Loader2, Lock, Save, Settings2, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const DEFAULT_PRIMARY_COLOR = "#2458d6";

function LabelWithInfo({ label, info }: { label: string; info: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs leading-relaxed">{info}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

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

  const uploadLogo = trpc.organization.uploadLogo.useMutation({
    onSuccess: async () => {
      await utils.organization.getSettings.invalidate();
      toast.success("Logo BPRS berhasil diunggah");
    },
    onError: error => toast.error(`Gagal mengunggah logo: ${error.message}`),
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const creditPolicyQuery = trpc.organization.getCreditPolicy.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const [dscrMin, setDscrMin] = useState("1.25");
  const [ltvMax, setLtvMax] = useState("80");
  const [maxPlafon, setMaxPlafon] = useState("");

  useEffect(() => {
    if (creditPolicyQuery.data) {
      setDscrMin(String(creditPolicyQuery.data.dscrMin));
      setLtvMax(String(creditPolicyQuery.data.ltvMax));
      setMaxPlafon(
        creditPolicyQuery.data.maxPlafon !== null && creditPolicyQuery.data.maxPlafon !== undefined
          ? String(creditPolicyQuery.data.maxPlafon)
          : ""
      );
    }
  }, [creditPolicyQuery.data]);

  const updateCreditPolicy = trpc.organization.updateCreditPolicy.useMutation({
    onSuccess: async () => {
      await utils.organization.getCreditPolicy.invalidate();
      toast.success("Kebijakan kredit berhasil disimpan");
    },
    onError: error => toast.error(`Gagal menyimpan kebijakan kredit: ${error.message}`),
  });

  const handleCreditPolicySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateCreditPolicy.mutate({
      dscrMin: Number.parseFloat(dscrMin),
      ltvMax: Number.parseFloat(ltvMax),
      maxPlafon: maxPlafon.trim() === "" ? null : Number.parseFloat(maxPlafon),
    });
  };

  const handleLogoUpload = (file?: File) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Format logo harus PNG, JPG, atau SVG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran logo maksimal 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
      uploadLogo.mutate({ data: base64, contentType: file.type as "image/png" | "image/jpeg" | "image/svg+xml" });
    };
    reader.onerror = () => toast.error("Logo tidak dapat dibaca");
    reader.readAsDataURL(file);
  };

  const isAdmin = user?.role === "admin";
  const isAdminLoading = settingsQuery.isLoading;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password berhasil diubah");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: error => toast.error(`Gagal mengubah password: ${error.message}`),
  });

  const handleChangePassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Password baru dan konfirmasi tidak cocok");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

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
            <img src="/logo-light-bg.png" alt="SSCI" className="h-12 w-auto" />
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

                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Label>Logo BPRS</Label>
                    <div className="flex flex-wrap items-center gap-4">
                      {settingsQuery.data?.logoUrl ? (
                        <img
                          src={settingsQuery.data.logoUrl}
                          alt="Logo BPRS"
                          className="h-14 w-14 rounded-lg border border-slate-200 bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">
                          Belum ada
                        </div>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={event => {
                          handleLogoUpload(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadLogo.isPending}
                      >
                        {uploadLogo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                        {settingsQuery.data?.logoUrl ? "Ganti logo" : "Upload logo"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG, atau SVG. Maksimal 2 MB. Logo tampil di portal dan laporan.</p>
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

        {isAdmin && (
          <Card className="mb-6 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Kebijakan Kredit
              </CardTitle>
              <CardDescription>Atur batas minimum DSCR, LTV, dan plafon pembiayaan yang diterapkan pada penilaian.</CardDescription>
            </CardHeader>
            <CardContent>
              {creditPolicyQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />Memuat kebijakan kredit...
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleCreditPolicySubmit}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <LabelWithInfo
                        label="DSCR minimum"
                        info="Debt Service Coverage Ratio: perbandingan laba bersih bulanan terhadap total angsuran (existing + baru). Contoh 1.25 artinya laba bersih minimal 1.25x angsuran. Semakin tinggi semakin aman. Ini rasio risiko, bukan ketentuan syariah."
                      />
                      <Input
                        id="dscrMin"
                        name="dscrMin"
                        type="number"
                        step="0.01"
                        min="1"
                        max="10"
                        value={dscrMin}
                        onChange={event => setDscrMin(event.target.value)}
                        required
                      />
                      <p className="text-xs text-slate-500">Nilai default 1.25</p>
                    </div>
                    <div className="space-y-2">
                      <LabelWithInfo
                        label="LTV maksimal (%)"
                        info="Loan to Value: rasio pembiayaan terhadap nilai agunan. Contoh 80 artinya pembiayaan maksimal 80% dari nilai jaminan. Menilai kecukupan agunan; sejalan dengan prinsip jaminan (rahn) dalam syariah."
                      />
                      <Input
                        id="ltvMax"
                        name="ltvMax"
                        type="number"
                        step="1"
                        min="1"
                        max="100"
                        value={ltvMax}
                        onChange={event => setLtvMax(event.target.value)}
                        required
                      />
                      <p className="text-xs text-slate-500">Nilai default 80</p>
                    </div>
                    <div className="space-y-2">
                      <LabelWithInfo
                        label="Plafon maksimal (Rp)"
                        info="Batas atas jumlah pembiayaan yang direkomendasikan sistem. Rekomendasi otomatis tidak akan melebihi angka ini. Kosongkan jika tidak ingin ada batas."
                      />
                      <Input
                        id="maxPlafon"
                        name="maxPlafon"
                        type="number"
                        step="100000"
                        min="0"
                        placeholder="Opsional"
                        value={maxPlafon}
                        onChange={event => setMaxPlafon(event.target.value)}
                      />
                      <p className="text-xs text-slate-500">Kosongkan jika tidak ada batas</p>
                    </div>
                  </div>
                  <Button type="submit" disabled={updateCreditPolicy.isPending}>
                    {updateCreditPolicy.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Simpan kebijakan kredit
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

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Ubah Password
            </CardTitle>
            <CardDescription>Perbarui password akun Anda untuk keamanan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleChangePassword}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password saat ini</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={event => setCurrentPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password baru</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-slate-500">Minimal 8 karakter</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi password baru</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  {confirmPassword !== "" && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-600">Konfirmasi tidak cocok dengan password baru</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Ubah password
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
