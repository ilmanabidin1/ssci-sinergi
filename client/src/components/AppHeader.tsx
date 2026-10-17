import { useAuth } from "@/_core/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { trpc } from "@/lib/trpc";
import { FilePlus2, History, LayoutDashboard, ScrollText, Users, UsersRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";

type NavLink = { href: string; label: string; Icon: LucideIcon; match: (path: string) => boolean };

const baseLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, match: path => path === "/dashboard" },
  { href: "/applications/new", label: "Pengajuan baru", Icon: FilePlus2, match: path => path === "/applications/new" },
  {
    href: "/assessments",
    label: "Riwayat",
    Icon: History,
    // Detail pengajuan dianggap bagian dari Riwayat agar orientasi tidak hilang.
    match: path => path.startsWith("/assessments") || (path.startsWith("/applications/") && path !== "/applications/new"),
  },
  { href: "/nasabah", label: "Nasabah", Icon: Users, match: path => path.startsWith("/nasabah") },
];

const adminLinks: NavLink[] = [
  { href: "/tim", label: "Tim", Icon: UsersRound, match: path => path.startsWith("/tim") },
  { href: "/audit", label: "Log audit", Icon: ScrollText, match: path => path.startsWith("/audit") },
];

const headerFocus = "outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900";

/** Tautan "Lewati ke konten utama"; halaman menandai kontennya dengan id="main-content". */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      onClick={event => {
        const target = document.getElementById("main-content");
        if (!target) return;
        event.preventDefault();
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus();
        target.scrollIntoView();
      }}
      className="sr-only rounded-full bg-gold-400 px-4 py-2 font-semibold text-navy-900 focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
    >
      Lewati ke konten utama
    </a>
  );
}

export function AppHeader() {
  const [location] = useLocation();
  const { user } = useAuth();
  const orgQuery = trpc.organization.getSettings.useQuery(undefined, { retry: false, enabled: !!user });
  const orgName = orgQuery.data?.name;
  const orgLogo = orgQuery.data?.logoUrl;
  const links = user?.role === "admin" ? [...baseLinks, ...adminLinks] : baseLinks;
  const displayName = orgName || "SSCI BPRS";

  return (
    <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-[0_8px_24px_-12px_rgb(11_20_40/0.5)]">
      <SkipToContent />
      <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.04]" />
      <div className="container relative flex h-16 items-center justify-between gap-4">
        <Link
          href="/dashboard"
          aria-label={`${displayName}: ke dashboard`}
          className={`flex min-w-0 items-center gap-3 rounded-lg pointer-coarse:min-h-11 ${headerFocus}`}
        >
          <img src={orgLogo || "/logo-dark-bg.png"} alt={orgLogo ? `Logo ${displayName}` : "SSCI"} className="h-10 w-auto shrink-0" />
          <span className="max-w-[40vw] truncate font-serif text-sm sm:text-lg md:max-w-xs">{displayName}</span>
        </Link>
        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
          {links.map(({ href, label, Icon, match }) => {
            const active = match(location);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${headerFocus} ${active ? "bg-white/10 text-gold-300" : "text-navy-200 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
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
      <nav aria-label="Navigasi utama" className="relative flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-1.5 lg:hidden">
        {links.map(({ href, label, Icon, match }) => {
          const active = match(location);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ${headerFocus} ${active ? "bg-white/10 text-gold-300" : "text-navy-200"}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
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
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-gold-700">
            <span className="h-px w-8 bg-gold-400" aria-hidden="true" />
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
