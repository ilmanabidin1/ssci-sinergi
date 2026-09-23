import { ArrowLeft, FileCheck2, Scale, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";

const highlights = [
  { Icon: Scale, text: "Skor deterministik berbasis aturan yang dapat ditelusuri" },
  { Icon: ShieldCheck, text: "Selaras dengan fatwa DSN-MUI dan pedoman BPRS" },
  { Icon: FileCheck2, text: "Jejak audit lengkap untuk setiap keputusan" },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-ivory lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-gold-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-royal-600/20 blur-3xl" />

        <Link href="/" className="relative z-10 inline-flex w-fit">
          <img src="/logo-dark-bg.png" alt="SSCI" className="h-16 w-auto" />
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="gold-rule mb-8 w-24" />
          <p className="font-serif text-3xl leading-snug xl:text-4xl">
            Amanah dalam setiap <em className="text-gold-gradient">keputusan pembiayaan.</em>
          </p>
          <ul className="mt-10 space-y-4">
            {highlights.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-[#b9c4d8]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-400/30 bg-gold-400/10">
                  <Icon className="h-4 w-4 text-gold-400" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-[#8e9cb4]">
          <img src="/unisba-logo.png" alt="Universitas Islam Bandung" className="h-9 w-auto rounded bg-white/95 p-1" />
          <span>Dikembangkan bersama Universitas Islam Bandung</span>
        </div>
      </aside>

      <section className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden">
            <img src="/logo-light-bg.png" alt="SSCI" className="h-12 w-auto" />
          </Link>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-navy-900"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-500">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl font-medium text-navy-900">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">© 2026 SSCI · Sustainable Sharia Creditworthiness Index</p>
      </section>
    </main>
  );
}
