import { useAuth } from "@/_core/hooks/useAuth";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

const PUBLIC_PATHS = new Set(["/", "/track", "/login", "/register"]);

export function TwoFactorGate({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  if (!user?.needsTwoFactorSetup || PUBLIC_PATHS.has(location)) return <>{children}</>;

  return (
    <main className="min-h-screen bg-ivory px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <img src="/logo-light-bg.png" alt="SSCI" className="h-12 w-auto" />
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            <LogOut className="mr-2 h-4 w-4" />Keluar
          </Button>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-gold-400/50 bg-gold-50 p-5 text-navy-900">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-gold-500" />
          <div>
            <h1 className="font-serif text-2xl">Aktifkan autentikasi dua faktor</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Peran {user.role === "admin" ? "admin" : "checker"} memiliki wewenang menyetujui pembiayaan dan mengelola data nasabah, sehingga wajib menggunakan 2FA.
              Siapkan aplikasi authenticator di ponsel (Google Authenticator, Microsoft Authenticator, dan sejenisnya), lalu ikuti langkah di bawah.
            </p>
          </div>
        </div>
        <TwoFactorSettings />
      </div>
    </main>
  );
}
