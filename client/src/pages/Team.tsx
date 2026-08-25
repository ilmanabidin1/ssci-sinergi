import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, Shield, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Role = "maker" | "checker";

const roleLabel: Record<Role, string> = {
  maker: "Maker",
  checker: "Checker",
};

export default function Team() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

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
    onError: error => toast.error(`Gagal menambahkan anggota: ${error.message}`),
  });

  const setUserActive = trpc.organization.setUserActive.useMutation({
    onSuccess: async () => {
      await utils.organization.listUsers.invalidate();
      toast.success("Status anggota tim berhasil diperbarui");
    },
    onError: error => toast.error(`Gagal memperbarui status: ${error.message}`),
  });

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createUser.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      position: position.trim() || undefined,
      phone: phone.trim() || undefined,
      role,
    });
  };

  const handleToggle = (userId: number, active: boolean) => {
    setUserActive.mutate({ userId, active });
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
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-6 w-6" />
            <span className="text-xl font-bold">SSCI BPRS</span>
          </div>
          <ProfileMenu />
        </div>
      </nav>

      <main className="container max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Kelola Tim</h1>
          <p className="mt-1 text-slate-600">
            Tambahkan dan kelola akun maker/checker untuk tim pembiayaan BPRS Anda.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Tambah Anggota Tim
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
                  <Label htmlFor="password">Password (min. 6 karakter)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                    required
                  />
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
                  <Label>Peran</Label>
                  <Select value={role} onValueChange={value => setRole(value as Role)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maker">Maker</SelectItem>
                      <SelectItem value="checker">Checker</SelectItem>
                    </SelectContent>
                  </Select>
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

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Daftar Anggota Tim
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />Memuat anggota tim...
                </div>
              ) : users.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  Belum ada anggota tim. Tambahkan anggota pertama melalui formulir di samping.
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map(entry => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{entry.name}</p>
                          <Badge variant={entry.role === "maker" ? "default" : "secondary"}>
                            {roleLabel[entry.role as Role] ?? entry.role}
                          </Badge>
                          {entry.active === 1 ? (
                            <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                          ) : (
                            <Badge variant="outline">Nonaktif</Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">{entry.email}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                          <span>{entry.position || "Jabatan tidak diisi"}</span>
                          <span>{entry.phone || "Telepon tidak diisi"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                          {entry.active === 1 ? "Aktif" : "Nonaktif"}
                        </span>
                        <Switch
                          checked={entry.active === 1}
                          onCheckedChange={checked => handleToggle(entry.id, checked)}
                          disabled={setUserActive.isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
