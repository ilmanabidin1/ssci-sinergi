import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getLoginUrl } from "@/const";
import { useReveal } from "@/hooks/useReveal";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileSearch,
  LockKeyhole,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

const pillars = [
  { weight: "55%", title: "Keuangan berkelanjutan", copy: "Daya tahan usaha, arus kas, dan kemampuan memenuhi kewajiban.", color: "bg-royal-600" },
  { weight: "25%", title: "Kepatuhan syariah", copy: "Prinsip transaksi dan praktik usaha yang selaras dengan nilai syariah.", color: "bg-gold-400" },
  { weight: "20%", title: "Legalitas", copy: "Kelengkapan dokumen dan kepastian dasar hukum usaha nasabah.", color: "bg-[#7d8fae]" },
];

const steps = [
  { num: "01", title: "Input terstruktur", copy: "Kumpulkan informasi dan dokumen penting dalam satu alur yang rapi.", Icon: ClipboardList },
  { num: "02", title: "Skor transparan", copy: "Lihat bagaimana setiap jawaban berkontribusi pada skor berbasis aturan.", Icon: Scale },
  { num: "03", title: "Review bersama", copy: "Gunakan ringkasan sebagai bahan diskusi. Keputusan akhir tetap di tangan BPRS.", Icon: Users },
];

const stats = [
  { value: "3", label: "Pilar penilaian terpadu" },
  { value: "4", label: "Jenis akad didukung" },
  { value: "8", label: "Fatwa DSN-MUI dirujuk" },
  { value: "0-100", label: "Skala skor yang dapat ditelusuri" },
];

const navLinks = [
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#pilar", label: "Metodologi" },
  { href: "#keamanan", label: "Keamanan" },
];

export default function Home() {
  const { user, loading } = useAuth();
  const authenticated = Boolean(user);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && authenticated) setLocation("/dashboard");
  }, [authenticated, loading, setLocation]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-ivory"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" /></div>;
  }

  if (authenticated) return null;

  return <Landing />;
}

function Landing() {
  useReveal();

  return (
    <div className="min-h-screen overflow-hidden bg-ivory text-navy-900">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-ivory/85 backdrop-blur-md">
        <nav className="container flex h-[76px] items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo-light-bg.png" alt="SSCI" className="h-[58px] w-auto" />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#60708c] md:flex">
            {navLinks.map(link => <a key={link.href} href={link.href} className="transition-colors hover:text-navy-900">{link.label}</a>)}
            <Link href="/track" className="flex items-center gap-1.5 font-semibold text-navy-900 transition-colors hover:text-gold-500">
              <FileSearch className="h-3.5 w-3.5" /> Lacak Pengajuan
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-full text-navy-900 hover:bg-navy-900/5 sm:inline-flex"><a href={getLoginUrl()}>Masuk</a></Button>
            <Button asChild className="hidden rounded-full bg-navy-900 px-5 text-white shadow-premium hover:bg-navy-800 sm:inline-flex"><Link href="/register">Daftar BPRS <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <MobileMenu />
          </div>
        </nav>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-navy-900 text-white">
          <div className="pattern-islamic pointer-events-none absolute inset-0 -z-10 opacity-[0.05]" />
          <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[560px] w-[560px] rounded-full bg-gold-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-48 -left-32 -z-10 h-[480px] w-[480px] rounded-full bg-royal-600/25 blur-3xl" />
          <div className="absolute -right-20 -top-28 -z-10 h-[440px] w-[440px] rounded-full border border-white/10" />
          <div className="absolute right-20 top-10 -z-10 h-[250px] w-[250px] rounded-full border border-gold-400/20" />

          <div className="container grid gap-14 py-20 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-32">
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3.5 py-1.5 text-xs font-semibold text-gold-300"><span className="h-1.5 w-1.5 rounded-full bg-gold-400 shadow-[0_0_10px_#efb84b]" /> Platform penilaian pembiayaan BPRS</div>
              <h1 className="max-w-3xl font-serif text-5xl font-medium leading-[1.04] tracking-[-.03em] sm:text-7xl">Keputusan pembiayaan yang <em className="text-gold-gradient font-normal">lebih terang.</em></h1>
              <p className="mt-8 max-w-xl text-base leading-8 text-[#b9c4d8] sm:text-lg">SSCI membantu BPRS menilai kelayakan pembiayaan secara konsisten, transparan, dan tetap dalam kendali analis.</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full bg-gold-400 px-8 text-navy-900 shadow-[0_10px_30px_-8px_rgb(239_184_75/0.6)] transition-all hover:-translate-y-0.5 hover:bg-gold-300"><Link href="/register">Daftar sebagai BPRS<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/25 bg-white/5 px-8 text-white backdrop-blur hover:bg-white/10 hover:text-white"><a href={getLoginUrl()}>Masuk ke akun</a></Button>
              </div>
              <p className="mt-6 text-xs text-[#8e9cb4]">Untuk tim pembiayaan dan analis BPRS di Indonesia</p>
            </div>

            <div className="relative mx-auto w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-1000">
              <div className="absolute -inset-px rounded-[1.4rem] bg-gradient-to-br from-gold-300/60 via-white/10 to-transparent" />
              <div className="glass-card shadow-premium-lg relative rounded-[1.35rem] p-6 text-navy-900 sm:p-8">
                <div className="flex items-start justify-between border-b border-border pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#71809a]">Contoh ringkasan</p><h2 className="mt-2 font-serif text-2xl">PT Amanah Berkah</h2></div><span className="rounded-full bg-[#e7f5ed] px-3 py-1 text-xs font-bold text-[#238052]">Layak ditinjau</span></div>
                <div className="flex items-center gap-6 py-6">
                  <ScoreRing value={78} />
                  <div><p className="text-sm font-semibold">Skor SSCI</p><p className="mt-1 text-xs leading-5 text-[#71809a]">Dihitung dari aturan<br />yang dapat ditelusuri</p></div>
                </div>
                <div className="space-y-3 border-t border-border pt-5">{pillars.map(pillar => <div key={pillar.title} className="flex items-center gap-3"><span className={`h-2 w-2 rounded-full ${pillar.color}`} /><span className="flex-1 text-xs text-[#60708c]">{pillar.title}</span><span className="text-xs font-bold">{pillar.weight}</span></div>)}</div>
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-gold-50 px-3 py-2 text-[11px] text-[#60708c]"><Sparkles className="h-3.5 w-3.5 text-gold-500" /> AI membantu narasi, tidak mengubah skor</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-navy-950/40">
            <div className="container grid grid-cols-2 divide-white/10 md:grid-cols-4 md:divide-x">
              {stats.map(stat => (
                <div key={stat.label} className="px-2 py-8 text-center md:px-6">
                  <p className="font-serif text-4xl text-gold-300 sm:text-5xl">{stat.value}</p>
                  <p className="mt-2 text-xs text-[#8e9cb4] sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-white py-10">
          <div className="container flex flex-col items-center justify-center gap-5 text-center sm:flex-row sm:gap-8 sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#8e9cb4]">Dikembangkan bersama</p>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="flex items-center gap-4">
              <img src="/unisba-logo.png" alt="Universitas Islam Bandung" className="h-12 w-auto" />
              <div>
                <p className="font-serif text-lg leading-tight">Universitas Islam Bandung</p>
                <p className="text-xs text-muted-foreground">Riset penilaian pembiayaan syariah berkelanjutan</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-24 sm:py-32" id="cara-kerja">
          <div className="reveal max-w-2xl"><Eyebrow>Dibuat untuk alur kerja nyata</Eyebrow><h2 className="mt-4 font-serif text-4xl font-medium sm:text-5xl">Dari data nasabah ke percakapan yang lebih bermakna.</h2></div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map(({ num, title, copy, Icon }, i) => (
              <div key={num} className="reveal hover-lift group rounded-2xl border border-border bg-white p-7 shadow-premium" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="flex items-center justify-between"><span className="font-serif text-sm italic text-gold-500">{num}</span><span className="gold-rule w-12 opacity-60" /></div>
                <div className="mt-10 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-300 transition-transform duration-500 group-hover:scale-110"><Icon className="h-6 w-6" /></div>
                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#71809a]">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative bg-white py-24 sm:py-32" id="pilar">
          <div className="container">
            <div className="reveal grid gap-12 md:grid-cols-[.8fr_1.2fr] md:items-end"><div><Eyebrow>Kerangka penilaian</Eyebrow><h2 className="mt-4 font-serif text-4xl font-medium sm:text-5xl">Tiga lensa.<br /><em className="text-gold-gradient">Satu gambaran utuh.</em></h2></div><p className="max-w-lg text-sm leading-7 text-[#71809a]">Bobot ini memberi struktur pada penilaian, bukan menggantikan pertimbangan profesional. Setiap BPRS tetap memiliki ruang untuk melakukan review dan mengambil keputusan.</p></div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {pillars.map((pillar, i) => (
                <div key={pillar.title} className="reveal hover-lift relative overflow-hidden rounded-2xl border border-border bg-ivory p-7" style={{ transitionDelay: `${i * 120}ms` }}>
                  <span className={`absolute inset-x-0 top-0 h-1 ${pillar.color}`} />
                  <p className="font-serif text-6xl tracking-[-.04em] text-navy-900">{pillar.weight}</p>
                  <h3 className="mt-8 font-semibold">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#71809a]">{pillar.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container grid gap-12 py-24 sm:py-32 md:grid-cols-2 md:items-center" id="keamanan">
          <div className="reveal"><Eyebrow>Tenang dalam operasional</Eyebrow><h2 className="mt-4 font-serif text-4xl font-medium sm:text-5xl">Lebih sedikit tebakan. Lebih banyak waktu untuk nasabah.</h2><div className="mt-9 space-y-4">{["Alur penilaian konsisten antar analis", "Riwayat assessment lebih mudah ditinjau", "Narasi rekomendasi membantu komunikasi internal"].map(item => <div key={item} className="flex items-center gap-3 text-sm text-[#60708c]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-50 ring-1 ring-gold-400/40"><Check className="h-3.5 w-3.5 text-gold-500" /></span>{item}</div>)}</div></div>
          <div className="reveal relative overflow-hidden rounded-3xl bg-navy-900 p-8 text-white shadow-premium-lg sm:p-12">
            <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.05]" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/15 blur-3xl" />
            <div className="relative">
              <ShieldCheck className="h-9 w-9 text-gold-400" />
              <h3 className="mt-7 font-serif text-3xl">Jelas tentang teknologi dan batasnya.</h3>
              <p className="mt-4 text-sm leading-7 text-[#b9c4d8]">Skor SSCI bersifat deterministik dan rule-based. AI hanya membantu menyusun narasi dari hasil penilaian, bukan menilai ulang atau mengubah skor. Keputusan pembiayaan final tetap menjadi kewenangan BPRS.</p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs text-[#b9c4d8]"><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-gold-400" /> Akses berbasis akun</span><span className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-gold-400" /> Jejak penilaian</span></div>
            </div>
          </div>
        </section>

        <section className="container pb-24 sm:pb-32">
          <div className="reveal relative overflow-hidden rounded-3xl border border-gold-400/30 bg-gradient-to-br from-gold-50 via-white to-[#eaf0fc] px-8 py-14 shadow-premium sm:px-14">
            <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.07]" />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div><Eyebrow>Mulai dari fondasi yang jelas</Eyebrow><h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">Siap membuat penilaian lebih terstruktur?</h2></div>
              <Button asChild size="lg" className="h-12 shrink-0 rounded-full bg-navy-900 px-8 text-white shadow-premium transition-all hover:-translate-y-0.5 hover:bg-navy-800"><Link href="/register">Daftar BPRS<ChevronRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden bg-navy-900 pt-14 pb-10 text-[#b9c4d8]">
        <div className="gold-rule absolute inset-x-0 top-0 opacity-70" />
        <div className="container">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div>
              <img src="/logo-dark-bg.png" alt="SSCI" className="h-14 w-auto" />
              <p className="mt-5 max-w-sm text-sm leading-6">Sustainable Sharia Creditworthiness Index. Platform pendukung penilaian pembiayaan untuk BPRS.</p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm">
              <div className="space-y-3"><p className="text-xs font-bold uppercase tracking-[.16em] text-gold-400">Produk</p>{navLinks.map(link => <a key={link.href} href={link.href} className="block transition-colors hover:text-white">{link.label}</a>)}</div>
              <div className="space-y-3"><p className="text-xs font-bold uppercase tracking-[.16em] text-gold-400">Akses</p><a href={getLoginUrl()} className="block transition-colors hover:text-white">Masuk</a><Link href="/register" className="block transition-colors hover:text-white">Daftar BPRS</Link><Link href="/track" className="block transition-colors hover:text-white">Lacak pengajuan</Link></div>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:justify-between">
            <p>© 2026 SSCI · Universitas Islam Bandung</p>
            <p>Platform penilaian pembiayaan syariah</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-gold-500"><span className="h-px w-8 bg-gold-400" />{children}</p>;
}

function ScoreRing({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="score-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#14213d" />
            <stop offset="100%" stopColor="#2458d6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e6ebf3" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#score-gold)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-3xl">{value}</span><span className="mt-2 text-xs text-[#71809a]">/100</span>
      </div>
    </div>
  );
}

function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-navy-900 transition-colors hover:bg-navy-900/5 md:hidden" aria-label="Buka menu">
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] border-l-0 bg-navy-900 p-0 text-white">
        <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
        <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.05]" />
        <div className="relative flex h-full flex-col p-6">
          <img src="/logo-dark-bg.png" alt="SSCI" className="h-12 w-fit" />
          <div className="gold-rule my-6 w-16" />
          <nav className="flex flex-col gap-1">
            {navLinks.map(link => (
              <SheetClose asChild key={link.href}>
                <a href={link.href} className="rounded-lg px-3 py-3 font-serif text-xl transition-colors hover:bg-white/5">{link.label}</a>
              </SheetClose>
            ))}
            <SheetClose asChild>
              <Link href="/track" className="flex items-center gap-2 rounded-lg px-3 py-3 font-serif text-xl text-gold-300 transition-colors hover:bg-white/5"><FileSearch className="h-4 w-4" /> Lacak pengajuan</Link>
            </SheetClose>
          </nav>
          <div className="mt-auto space-y-3">
            <Button asChild className="h-11 w-full rounded-full bg-gold-400 text-navy-900 hover:bg-gold-300"><Link href="/register">Daftar BPRS <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" className="h-11 w-full rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"><a href={getLoginUrl()}>Masuk</a></Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
