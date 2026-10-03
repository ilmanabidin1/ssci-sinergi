import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ChevronDown, FlaskConical, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const demoAccounts = [
  { email: "analis@bprs.id", role: "Analis / Account Officer", desc: "Input pengajuan dan hitung kelayakan", tag: "Maker" },
  { email: "komite@bprs.id", role: "Komite Pembiayaan", desc: "Persetujuan dan keputusan komite", tag: "Checker" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async data => {
      if (data.requiresTwoFactor) {
        setNeedsOtp(true);
        return;
      }
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: error => toast.error(error.message),
  });

  return (
    <AuthShell
      eyebrow="Portal SSCI"
      title="Selamat datang kembali"
      description="Masuk menggunakan akun yang diberikan administrator BPRS Anda."
    >
      <form
        className="space-y-5"
        onSubmit={event => {
          event.preventDefault();
          login.mutate({ email, password, ...(needsOtp ? { otp } : {}) });
        }}
      >
        {needsOtp ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-gold-400/40 bg-gold-50 p-4 text-sm text-navy-900">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" />
              <span>Akun ini memakai autentikasi dua faktor. Masukkan kode 6 digit dari aplikasi authenticator Anda.</span>
            </div>
            <Label htmlFor="otp">Kode autentikasi</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              className="h-12 bg-white text-center font-mono text-xl tracking-[.4em]"
              required
            />
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground hover:text-navy-900"
              onClick={() => { setNeedsOtp(false); setOtp(""); }}
            >
              Kembali ke email dan password
            </button>
          </div>
        ) : (
          <>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-11 bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            minLength={4}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-11 bg-white"
          />
        </div>
          </>
        )}
        <Button
          className="h-11 w-full rounded-full bg-navy-900 text-white shadow-premium hover:bg-navy-800"
          type="submit"
          disabled={login.isPending}
        >
          {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {needsOtp ? "Verifikasi dan masuk" : "Masuk"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Belum terdaftar?{" "}
        <Link href="/register" className="font-semibold text-navy-900 underline-offset-4 hover:underline">
          Daftarkan BPRS Anda
        </Link>
      </p>

      <div className="mt-8 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => setShowDemo(v => !v)}
          className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground transition-colors hover:text-navy-900"
          aria-expanded={showDemo}
        >
          <span className="inline-flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-gold-500" /> Mode demo
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showDemo ? "rotate-180" : ""}`} />
        </button>
        {showDemo && (
          <div className="mt-3 space-y-2">
            {demoAccounts.map(account => (
              <button
                key={account.email}
                type="button"
                className="hover-lift flex w-full items-center justify-between rounded-xl border border-border bg-white p-3 text-left"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("password123");
                }}
              >
                <div>
                  <span className="text-sm font-semibold text-navy-900">{account.role}</span>
                  <div className="text-[11px] text-muted-foreground">{account.desc}</div>
                </div>
                <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-semibold text-gold-500">
                  {account.tag}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AuthShell>
  );
}
