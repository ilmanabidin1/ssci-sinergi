import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { trpc } from "@/lib/trpc";
import { FilePlus2, History, Info, LayoutDashboard, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const links = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/applications/new", label: "Pengajuan baru", Icon: FilePlus2 },
  { href: "/assessments", label: "Riwayat", Icon: History },
  { href: "/nasabah", label: "Nasabah", Icon: Users },
  { href: "/tentang-ssci", label: "Tentang SSCI", Icon: Info },
];

export function AppHeader() {
  const [location] = useLocation();
  const orgQuery = trpc.organization.getSettings.useQuery(undefined, { retry: false });
  const orgName = orgQuery.data?.name;
  const orgLogo = orgQuery.data?.logoUrl;

  return (
    <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-[0_8px_24px_-12px_rgb(11_20_40/0.5)]">
      <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.04]" />
      <div className="container relative flex h-16 items-center justify-between gap-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <img src={orgLogo || "/logo-dark-bg.png"} alt="SSCI" className="h-10 w-auto shrink-0" />
          <span className="hidden truncate font-serif text-lg md:inline">{orgName || "SSCI BPRS"}</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(({ href, label, Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${active ? "bg-white/10 text-gold-300" : "text-[#b9c4d8] hover:bg-white/5 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-1 text-navy-900">
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
      <nav className="relative flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 lg:hidden">
        {links.map(({ href, label, Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${active ? "bg-white/10 text-gold-300" : "text-[#b9c4d8]"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="gold-rule absolute inset-x-0 bottom-0 opacity-60" />
    </header>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-gold-500">
            <span className="h-px w-8 bg-gold-400" />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-serif text-3xl font-medium text-navy-900 sm:text-4xl">{title}</h1>
        {description && <div className="mt-2 text-muted-foreground">{description}</div>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />
      {children}
    </div>
  );
}
