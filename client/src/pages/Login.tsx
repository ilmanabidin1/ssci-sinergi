import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage } from "@/lib/errors";
import { AlertCircle, ChevronDown, Eye, EyeOff, FlaskConical, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const demoAccounts = [
  { email: "analis@bprs.id", role: "Analis / Account Officer", desc: "Input pengajuan dan hitung kelayakan", tag: "Maker" },
  { email: "komite@bprs.id", role: "Komite Pembiayaan", desc: "Persetujuan dan keputusan komite", tag: "Checker" },
];

export default function Login() {
  usePageTitle("Masuk");
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onMutate: () => setLoginError(""),
    onSuccess: async data => {
      if (data.requiresTwoFactor) {
        setNeedsOtp(true);
        return;
      }
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: error => setLoginError(errorMessage(error, "Gagal masuk. Periksa email dan password Anda.")),
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
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" aria-hidden="true" />
              <span>Akun ini memakai autentikasi dua faktor. Masukkan kode 6 digit dari aplikasi authenticator Anda.</span>
            </div>
            <Label htmlFor="otp">Kode autentikasi</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              autoFocus
              maxLength={6}
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setLoginError(""); }}
              aria-invalid={loginError ? true : undefined}
              aria-describedby={loginError ? "login-error" : undefined}
              className="h-12 bg-white text-center font-mono text-xl tracking-[.4em]"
              required
            />
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-muted-foreground outline-none hover:text-navy-900 focus-visible:ring-[3px] focus-visible:ring-gold-400/50"
              onClick={() => { setNeedsOtp(false); setOtp(""); setLoginError(""); }}
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
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            onChange={e => { setEmail(e.target.value); setLoginError(""); }}
            aria-invalid={loginError ? true : undefined}
            aria-describedby={loginError ? "login-error" : undefined}
            className="h-11 bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              minLength={4}
              required
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginError(""); }}
              aria-invalid={loginError ? true : undefined}
              aria-describedby={loginError ? "login-error password-hint" : "password-hint"}
              className="h-11 bg-white pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
              aria-controls="password"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-navy-900 focus-visible:ring-[3px] focus-visible:ring-gold-400/50"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p id="password-hint" className="text-sm text-muted-foreground">Lupa password? Hubungi administrator BPRS Anda untuk mengatur ulang password.</p>
        </div>
          </>
        )}
        {loginError && (
          <p id="login-error" role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{loginError}
          </p>
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
          className="flex min-h-11 w-full items-center justify-between rounded-md text-sm font-semibold text-muted-foreground outline-none transition-colors hover:text-navy-900 focus-visible:ring-[3px] focus-visible:ring-gold-400/50"
          aria-expanded={showDemo}
          aria-controls="demo-accounts"
        >
          <span className="inline-flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-gold-500" /> Mode demo
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showDemo ? "rotate-180" : ""}`} />
        </button>
        {showDemo && (
          <div id="demo-accounts" className="mt-3 space-y-2">
            {demoAccounts.map(account => (
              <button
                key={account.email}
                type="button"
                className="hover-lift flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-white p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-gold-400/50"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("password123");
                  setLoginError("");
                }}
              >
                <div>
                  <span className="text-sm font-semibold text-navy-900">{account.role}</span>
                  <div className="text-xs text-muted-foreground">{account.desc}</div>
                </div>
                <span className="shrink-0 rounded-full bg-gold-50 px-2 py-0.5 text-xs font-semibold text-navy-900 ring-1 ring-gold-400/50">
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
