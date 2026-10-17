import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useConfirm } from "@/components/ConfirmDialog";
import { AccessDenied, PageSkeleton } from "@/components/RouteGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Loader2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Role = "maker" | "checker";

/** Sama dengan kebijakan ganti password di Pengaturan dan validasi server. */
const MIN_PASSWORD_LENGTH = 8;
const passwordIssue = (value: string) => {
  if (value.length === 0) return null;
  if (value.length < MIN_PASSWORD_LENGTH) return `Minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) return "Harus mengandung minimal satu huruf dan satu angka.";
  return null;
};

const roleLabel: Record<Role, string> = {
  maker: "Maker",
  checker: "Checker",
};

export default function Team() {
  usePageTitle("Kelola tim");
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const { confirm } = useConfirm();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("maker");

  const usersQuery = trpc.organization.listUsers.useQuery(undefined, {
    enabled: isAdmin,
  });
  const users = usersQuery.data ?? [];

  const createUser = trpc.organization.createUser.useMutation({
    onSuccess: async () => {
      await utils.organization.listUsers.invalidate();
      setName("");
      setEmail("");
      setPassword("");
      setPosition("");
      setPhone("");
      setRole("maker");
      toast.success("Anggota tim berhasil ditambahkan");
    },
    onError: error => toast.error("Gagal menambahkan anggota", { description: errorMessage(error) }),
  });

  const setUserActive = trpc.organization.setUserActive.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.organization.listUsers.invalidate();
      const target = users.find(entry => entry.id === variables.userId);
      const name = target?.name ?? "Anggota";
      if (variables.active) {
        toast.success(`${name} diaktifkan kembali`);
      } else {
        toast.success(`${name} dinonaktifkan`, {
          description: "Anggota tidak dapat masuk sampai diaktifkan kembali.",
          action: { label: "Urungkan", onClick: () => setUserActive.mutate({ userId: variables.userId, active: true }) },
        });
      }
    },
    onError: error => toast.error("Gagal memperbarui status", { description: errorMessage(error) }),
  });

  const resetTwoFactor = trpc.organization.resetUserTwoFactor.useMutation({
    onSuccess: async () => {
      await utils.organization.listUsers.invalidate();
      toast.success("2FA anggota tim berhasil direset. Anggota perlu mengatur ulang dari halaman Pengaturan.");
    },
    onError: error => toast.error("Gagal mereset 2FA", { description: errorMessage(error) }),
  });

  const pwIssue = passwordIssue(password);

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordIssue(password) || password.length === 0) {
      toast.error("Password belum memenuhi syarat", { description: passwordIssue(password) ?? "Password wajib diisi." });
      return;
    }
    createUser.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      position: position.trim() || undefined,
      phone: phone.trim() || undefined,
      role,
    });
  };

  const handleToggle = async (entry: { id: number; name: string | null }, active: boolean) => {
    if (entry.id === user?.id) return;
    if (!active) {
      const ok = await confirm({
        title: `Nonaktifkan ${entry.name ?? "anggota ini"}?`,
        description: (
          <p>
            Anggota tidak dapat masuk ke SSCI sampai diaktifkan kembali. Pengajuan dan penilaian yang sudah dibuat tetap
            tersimpan, tetapi pekerjaan yang sedang berjalan perlu dilanjutkan anggota lain.
          </p>
        ),
        confirmLabel: "Nonaktifkan",
        destructive: true,
      });
      if (!ok) return;
    }
    setUserActive.mutate({ userId: entry.id, active });
  };

  const handleResetTwoFactor = async (entry: { id: number; name: string | null }) => {
    const ok = await confirm({
      title: `Reset 2FA untuk ${entry.name ?? "anggota ini"}?`,
      description: (
        <p>
          Gunakan hanya jika anggota kehilangan akses ke aplikasi authenticator. Setelah direset, anggota harus mengatur
          ulang 2FA dari halaman Pengaturan sebelum dapat bekerja kembali.
        </p>
      ),
      confirmLabel: "Reset 2FA",
      destructive: true,
    });
    if (ok) resetTwoFactor.mutate({ userId: entry.id });
  };

  if (loading || !user) return <PageSkeleton />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />

      <main id="main-content" tabIndex={-1} className="container max-w-6xl px-4 py-8 focus:outline-none sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-medium text-navy-900 sm:text-4xl">Kelola Tim</h1>
          <p className="mt-1 text-slate-600">
            Tambahkan dan kelola akun maker/checker untuk tim pembiayaan BPRS Anda.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit border-border shadow-premium">
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                Tambah anggota tim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama lengkap</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Nama lengkap"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="nama@bank.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password awal</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    aria-invalid={Boolean(pwIssue)}
                    aria-describedby="password-hint"
                    required
                  />
                  <p id="password-hint" className={`text-xs ${pwIssue ? "text-destructive" : "text-slate-600"}`}>
                    {pwIssue ?? `Minimal ${MIN_PASSWORD_LENGTH} karakter, mengandung huruf dan angka.`}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="position">Jabatan</Label>
                    <Input
                      id="position"
                      value={position}
                      onChange={event => setPosition(event.target.value)}
                      placeholder="Analis pembiayaan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telepon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={event => setPhone(event.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Peran</Label>
                  <Select value={role} onValueChange={value => setRole(value as Role)}>
                    <SelectTrigger id="role" className="w-full" aria-describedby="role-hint">
                      <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maker">Maker</SelectItem>
                      <SelectItem value="checker">Checker</SelectItem>
                    </SelectContent>
                  </Select>
                  <p id="role-hint" className="text-xs text-slate-600">
                    Maker menyiapkan pengajuan dan penilaian; checker meninjau dan memutuskan.
                  </p>
                </div>
                <Button type="submit" disabled={createUser.isPending} className="w-full">
                  {createUser.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Tambah anggota
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border shadow-premium">
            <CardHeader>
              <CardTitle as="h2" className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                Daftar anggota tim
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Memuat anggota tim...
                </div>
              ) : usersQuery.isError ? (
                <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center text-red-700">
                  <AlertCircle className="h-8 w-8" aria-hidden="true" />
                  <p>Daftar anggota tim tidak dapat dimuat. {errorMessage(usersQuery.error, "")}</p>
                  <Button variant="outline" onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching}>
                    Coba lagi
                  </Button>
                </div>
              ) : users.length === 0 ? (
                <div className="py-10 text-center text-slate-600">
                  Belum ada anggota tim. Tambahkan anggota pertama melalui formulir di samping.
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map(entry => {
                    const isSelf = entry.id === user?.id;
                    const isActive = entry.active === 1;
                    const rowPending = setUserActive.isPending && setUserActive.variables?.userId === entry.id;
                    const switchId = `active-${entry.id}`;
                    return (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{entry.name}</p>
                          {isSelf && <Badge variant="outline" className="border-navy-200 text-navy-900">Akun Anda</Badge>}
                          <Badge variant={entry.role === "maker" ? "default" : "secondary"}>
                            {roleLabel[entry.role as Role] ?? (entry.role === "admin" ? "Admin" : entry.role)}
                          </Badge>
                          {isActive ? (
                            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">Aktif</Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">Nonaktif</Badge>
                          )}
                          {entry.twoFactorEnabled === 1 ? (
                            <Badge variant="outline" className="border-navy-200 bg-navy-50 text-navy-900">2FA aktif</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-300 text-amber-800">Tanpa 2FA</Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-600">{entry.email}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600">
                          <span>{entry.position || "Jabatan tidak diisi"}</span>
                          <span>{entry.phone || "Telepon tidak diisi"}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                        {entry.twoFactorEnabled === 1 && !isSelf && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resetTwoFactor.isPending && resetTwoFactor.variables?.userId === entry.id}
                            onClick={() => void handleResetTwoFactor(entry)}
                          >
                            Reset 2FA
                          </Button>
                        )}
                        {isSelf ? (
                          <span className="text-sm text-slate-600">Akun Anda tidak dapat dinonaktifkan</span>
                        ) : (
                          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                            <Label htmlFor={switchId} className="text-sm font-normal text-slate-700">
                              {rowPending ? "Menyimpan..." : isActive ? "Aktif" : "Nonaktif"}
                            </Label>
                            <Switch
                              id={switchId}
                              checked={isActive}
                              onCheckedChange={checked => void handleToggle(entry, checked)}
                              disabled={rowPending}
                              aria-label={`Status aktif ${entry.name ?? entry.email ?? "anggota"}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
