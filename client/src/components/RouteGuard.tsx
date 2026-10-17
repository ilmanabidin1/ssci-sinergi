import { useAuth } from "@/_core/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";

type Requirement = "admin" | "superadmin";

/** Kerangka halaman internal selama status login atau data awal dimuat. */
export function PageSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <div className="min-h-screen bg-ivory" aria-busy="true">
      {withHeader ? (
        <div className="h-[7.5rem] bg-navy-900 lg:h-16" aria-hidden="true" />
      ) : null}
      <div className="container max-w-6xl space-y-6 py-8" role="status" aria-label="Memuat halaman">
        <span className="sr-only">Memuat halaman...</span>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />
      <main id="main-content" tabIndex={-1} className="container max-w-3xl py-16 text-center focus:outline-none">
        <ShieldX className="mx-auto h-10 w-10 text-slate-500" aria-hidden="true" />
        <h1 className="mt-4 font-serif text-3xl font-medium text-navy-900">Akses ditolak</h1>
        <p className="mt-2 text-slate-600">{message ?? "Halaman ini hanya dapat diakses oleh admin."}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </main>
    </div>
  );
}

/**
 * Pelindung rute internal: menunggu status login selesai dimuat sebelum
 * halaman dirender, sehingga tidak ada kilasan "Akses ditolak" atau angka 0
 * dan query halaman tidak ditembakkan sebelum sesi diketahui.
 */
export function ProtectedRoute({ children, require }: { children: ReactNode; require?: Requirement }) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  if (loading || !user) return <PageSkeleton />;
  if (require === "admin" && user.role !== "admin") return <AccessDenied />;
  if (require === "superadmin" && !user.isSuperAdmin) {
    return <AccessDenied message="Halaman ini khusus SuperAdmin platform." />;
  }
  return <>{children}</>;
}
