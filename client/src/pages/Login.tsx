import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: error => toast.error(error.message),
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 flex items-center justify-center">
      <Card className="w-full max-w-md border-slate-700 shadow-2xl">
        <div className="flex justify-end pt-3 pr-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white" asChild>
            <Link href="/" aria-label="Kembali ke beranda">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <CardHeader className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Portal SSCI</CardTitle>
            <CardDescription className="mt-2">
              Masuk menggunakan akun yang diberikan administrator BPRS.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              login.mutate({
                email: String(data.get("email")),
                password: String(data.get("password")),
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
           <Input id="password" name="password" type="password" autoComplete="current-password" minLength={4} required />
            </div>
            <Button className="w-full" type="submit" disabled={login.isPending}>
              {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              Akun Simulasi Pedoman BPRS (Klik untuk isi cepat):
            </div>
            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                className="w-full text-left p-2 rounded bg-slate-100 hover:bg-slate-200 transition flex items-center justify-between"
                onClick={() => {
                  const emailInput = document.getElementById("email") as HTMLInputElement;
                  const passInput = document.getElementById("password") as HTMLInputElement;
                  if (emailInput && passInput) {
                    emailInput.value = "analis@bprs.id";
                    passInput.value = "password123";
                  }
                }}
              >
                <div>
                  <span className="font-semibold text-slate-800">1. Analis / Account Officer (Maker)</span>
                  <div className="text-[11px] text-slate-500">analis@bprs.id (Input pengajuan & hitung kelayakan)</div>
                </div>
                <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-medium">Isi</span>
              </button>

              <button
                type="button"
                className="w-full text-left p-2 rounded bg-slate-100 hover:bg-slate-200 transition flex items-center justify-between"
                onClick={() => {
                  const emailInput = document.getElementById("email") as HTMLInputElement;
                  const passInput = document.getElementById("password") as HTMLInputElement;
                  if (emailInput && passInput) {
                    emailInput.value = "komite@bprs.id";
                    passInput.value = "password123";
                  }
                }}
              >
                <div>
                  <span className="font-semibold text-slate-800">2. Komite Pembiayaan (Checker)</span>
                  <div className="text-[11px] text-slate-500">komite@bprs.id (Persetujuan / Keputusan komite)</div>
                </div>
                <span className="rounded bg-indigo-100 text-indigo-800 px-1.5 py-0.5 text-[10px] font-medium">Isi</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
