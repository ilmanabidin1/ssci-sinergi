import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { Check, CheckCircle2, Copy, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function TwoFactorSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const enabled = Boolean(user?.twoFactorEnabled);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Kode rahasia disalin");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Tidak dapat menyalin otomatis. Pilih dan salin kode secara manual.");
    }
  };

  const setup = trpc.auth.setupTwoFactor.useMutation({
    onError: error => toast.error(errorMessage(error, "Pengaturan 2FA gagal dimulai. Coba lagi.")),
  });
  const enable = trpc.auth.enableTwoFactor.useMutation({
    onSuccess: async () => {
      setCode("");
      setup.reset();
      await utils.auth.me.invalidate();
      toast.success("Autentikasi dua faktor aktif. Kode dari aplikasi akan diminta setiap login.");
    },
    onError: error => toast.error(errorMessage(error, "Kode tidak dapat diverifikasi. Coba lagi.")),
  });
  const disable = trpc.auth.disableTwoFactor.useMutation({
    onSuccess: async () => {
      setCode("");
      setPassword("");
      await utils.auth.me.invalidate();
      toast.success("Autentikasi dua faktor dinonaktifkan.");
    },
    onError: error => toast.error(errorMessage(error, "2FA gagal dinonaktifkan. Periksa password dan kode Anda.")),
  });

  return (
    <Card className="mb-6 border-border shadow-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Autentikasi Dua Faktor (2FA)
        </CardTitle>
        <CardDescription>
          Selain password, login meminta kode 6 digit dari aplikasi authenticator di ponsel (Google Authenticator, Microsoft Authenticator, dan sejenisnya).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />2FA aktif untuk akun ini.
            </p>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              onSubmit={event => {
                event.preventDefault();
                disable.mutate({ password, code });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="tfa-password">Password saat ini</Label>
                <Input id="tfa-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tfa-disable-code">Kode 6 digit</Label>
                <Input id="tfa-disable-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required />
              </div>
              <Button type="submit" variant="outline" disabled={disable.isPending}>
                {disable.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Nonaktifkan 2FA
              </Button>
            </form>
          </>
        ) : setup.data ? (
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <img src={setup.data.qrDataUrl} alt="Kode QR untuk aplikasi authenticator" className="h-44 w-44 rounded-xl border border-border bg-white p-2" />
            <div className="min-w-0 space-y-3 text-sm">
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Buka aplikasi authenticator di ponsel, lalu pindai kode QR ini. Jika membuka halaman ini dari ponsel yang sama, tekan "Buka di aplikasi authenticator".</li>
                <li>Jika tidak bisa memindai, salin kode rahasia berikut dan masukkan secara manual.</li>
                <li>Masukkan kode 6 digit yang muncul untuk mengaktifkan.</li>
              </ol>
              <div className="flex items-center gap-2">
                <code id="tfa-secret" className="min-w-0 flex-1 break-all rounded-lg bg-ivory px-3 py-2 font-mono text-sm text-navy-900">{setup.data.secret}</code>
                <Button type="button" variant="outline" size="icon" aria-label={copied ? "Kode rahasia sudah disalin" : "Salin kode rahasia"} onClick={() => void copySecret(setup.data!.secret)}>
                  {copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {setup.data.otpauthUrl && (
                <Button asChild variant="link" className="h-auto min-h-11 px-0 text-navy-900">
                  <a href={setup.data.otpauthUrl}><ExternalLink className="mr-1.5 h-4 w-4" />Buka di aplikasi authenticator</a>
                </Button>
              )}
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={event => {
                  event.preventDefault();
                  enable.mutate({ code });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="tfa-enable-code">Kode 6 digit</Label>
                  <Input id="tfa-enable-code" autoFocus className="w-36 text-center font-mono tracking-[.3em]" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required />
                </div>
                <Button type="submit" disabled={enable.isPending || code.length !== 6}>
                  {enable.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Aktifkan 2FA
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <Button onClick={() => setup.mutate()} disabled={setup.isPending}>
            {setup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Atur 2FA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
