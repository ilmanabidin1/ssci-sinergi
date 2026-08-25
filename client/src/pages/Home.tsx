import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  LockKeyhole,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { useLocation } from "wouter";

const pillars = [
  { weight: "55%", title: "Keuangan berkelanjutan", copy: "Daya tahan usaha, arus kas, dan kemampuan memenuhi kewajiban.", color: "bg-[#2458d6]" },
  { weight: "25%", title: "Kepatuhan syariah", copy: "Prinsip transaksi dan praktik usaha yang selaras dengan nilai syariah.", color: "bg-[#efb84b]" },
  { weight: "20%", title: "Legalitas", copy: "Kelengkapan dokumen dan kepastian dasar hukum usaha nasabah.", color: "bg-[#7d8fae]" },
];

export default function Home() {
  const { user, loading } = useAuth();
  const authenticated = Boolean(user);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && authenticated) setLocation("/dashboard");
  }, [authenticated, loading, setLocation]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2458d6] border-t-transparent" /></div>;
  }

  if (authenticated) return null;

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fb] text-[#14213d]">
      <header className="relative z-10 border-b border-[#dfe4ec] bg-[#f7f8fb]/95">
        <nav className="container flex h-[76px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-light-bg.png" alt="SSCI" className="h-11 w-auto" />
            <span><strong className="block text-lg tracking-[-.04em]">SSCI</strong><small className="block text-[9px] font-semibold uppercase tracking-[.18em] text-[#71809a]">Sustainable Sharia Index</small></span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#60708c] md:flex">
            <a href="#cara-kerja">Cara kerja</a><a href="#pilar">Metodologi</a><a href="#keamanan">Keamanan</a>
          </div>
          <div className="flex items-center gap-2">
            {authenticated ? <Button asChild className="rounded-full bg-[#2458d6] px-5 hover:bg-[#1945b0]"><Link href="/dashboard">Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link></Button> : <><Button asChild variant="ghost" className="hidden rounded-full text-[#14213d] sm:inline-flex"><a href={getLoginUrl()}>Masuk</a></Button><Button asChild className="rounded-full bg-[#2458d6] px-5 hover:bg-[#1945b0]"><Link href="/register">Daftar BPRS <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></>}
            <Menu className="ml-2 h-5 w-5 text-[#60708c] md:hidden" />
          </div>
        </nav>
      </header>

      <main>
        <section className="relative border-b border-[#dfe4ec] bg-[#14213d] text-white">
          <div className="absolute -right-20 -top-28 h-[440px] w-[440px] rounded-full border border-white/10" /><div className="absolute right-20 top-10 h-[250px] w-[250px] rounded-full border border-[#efb84b]/20" />
          <div className="container grid gap-14 py-20 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-28">
            <div className="relative z-10">
              <img src="/logo-dark-bg.png" alt="SSCI" className="mb-6 h-16 w-auto" />
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#efb84b]/40 bg-[#efb84b]/10 px-3 py-1.5 text-xs font-semibold text-[#f6cf78]"><span className="h-1.5 w-1.5 rounded-full bg-[#efb84b]" /> Platform penilaian pembiayaan BPRS</div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-.055em] sm:text-6xl">Keputusan pembiayaan yang <em className="font-serif font-normal text-[#efb84b]">lebih terang.</em></h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-[#b9c4d8] sm:text-lg">SSCI membantu BPRS menilai kelayakan pembiayaan secara konsisten, transparan, dan tetap dalam kendali analis.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="rounded-full bg-[#efb84b] px-7 text-[#14213d] hover:bg-[#f6cf78]"><Link href={authenticated ? "/applications/new" : "/register"}>{authenticated ? "Mulai penilaian" : "Daftar sebagai BPRS"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>{!authenticated && <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white"><a href={getLoginUrl()}>Masuk ke akun</a></Button>}</div>
              <p className="mt-5 text-xs text-[#8e9cb4]">Untuk tim pembiayaan dan analis BPRS di Indonesia</p>
            </div>
            <div className="relative mx-auto w-full max-w-[430px] rounded-2xl bg-[#f7f8fb] p-5 text-[#14213d] shadow-2xl shadow-black/20 sm:p-7">
              <div className="flex items-start justify-between border-b border-[#e1e5ec] pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#71809a]">Contoh ringkasan</p><h2 className="mt-2 font-serif text-xl">PT Amanah Berkah</h2></div><span className="rounded-full bg-[#e7f5ed] px-3 py-1 text-xs font-bold text-[#238052]">Layak ditinjau</span></div>
              <div className="flex items-center gap-6 py-6"><div className="flex h-24 w-24 items-center justify-center rounded-full border-[9px] border-[#2458d6] border-r-[#dce3f1] text-3xl font-bold">78<span className="text-sm text-[#71809a]">/100</span></div><div><p className="text-sm font-semibold">Skor SSCI</p><p className="mt-1 text-xs leading-5 text-[#71809a]">Dihitung dari aturan<br />yang dapat ditelusuri</p></div></div>
              <div className="space-y-3 border-t border-[#e1e5ec] pt-5">{pillars.map((pillar) => <div key={pillar.title} className="flex items-center gap-3"><span className={`h-2 w-2 rounded-full ${pillar.color}`} /><span className="flex-1 text-xs text-[#60708c]">{pillar.title}</span><span className="text-xs font-bold">{pillar.weight}</span></div>)}</div>
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#eef2f8] px-3 py-2 text-[10px] text-[#60708c]"><Sparkles className="h-3 w-3 text-[#2458d6]" /> AI membantu narasi, tidak mengubah skor</div>
            </div>
          </div>
        </section>

        <section className="container py-20 sm:py-28" id="cara-kerja"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2458d6]">Dibuat untuk alur kerja nyata</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Dari data nasabah ke percakapan yang lebih bermakna.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[["01","Input terstruktur", "Kumpulkan informasi dan dokumen penting dalam satu alur yang rapi.", ClipboardList], ["02","Skor transparan", "Lihat bagaimana setiap jawaban berkontribusi pada skor berbasis aturan.", Scale], ["03","Review bersama", "Gunakan ringkasan sebagai bahan diskusi. Keputusan akhir tetap di tangan BPRS.", Users]].map(([num,title,copy,Icon]) => <div key={num as string} className="rounded-2xl border border-[#dfe4ec] bg-white p-6"><span className="text-xs font-bold text-[#efb84b]">{num as string}</span><Icon className="mt-10 h-7 w-7 text-[#2458d6]" /><h3 className="mt-6 text-lg font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#71809a]">{copy as string}</p></div>)}</div></section>

        <section className="bg-white py-20 sm:py-28" id="pilar"><div className="container"><div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2458d6]">Kerangka penilaian</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Tiga lensa.<br />Satu gambaran utuh.</h2></div><p className="max-w-lg text-sm leading-7 text-[#71809a]">Bobot ini memberi struktur pada penilaian, bukan menggantikan pertimbangan profesional. Setiap BPRS tetap memiliki ruang untuk melakukan review dan mengambil keputusan.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3">{pillars.map((pillar) => <div key={pillar.title} className="border-t-4 border-[#2458d6] bg-[#f7f8fb] p-6"><p className="text-5xl font-semibold tracking-[-.06em] text-[#14213d]">{pillar.weight}</p><h3 className="mt-8 font-semibold">{pillar.title}</h3><p className="mt-2 text-sm leading-6 text-[#71809a]">{pillar.copy}</p></div>)}</div></div></section>

        <section className="container grid gap-12 py-20 sm:py-28 md:grid-cols-2 md:items-center" id="keamanan"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2458d6]">Tenang dalam operasional</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Lebih sedikit tebakan. Lebih banyak waktu untuk nasabah.</h2><div className="mt-8 space-y-4">{["Alur penilaian konsisten antar analis", "Riwayat assessment lebih mudah ditinjau", "Narasi rekomendasi membantu komunikasi internal"].map((item) => <div key={item} className="flex gap-3 text-sm text-[#60708c]"><Check className="h-5 w-5 shrink-0 text-[#238052]" />{item}</div>)}</div></div><div className="rounded-2xl bg-[#14213d] p-8 text-white sm:p-10"><ShieldCheck className="h-8 w-8 text-[#efb84b]" /><h3 className="mt-7 text-2xl font-semibold">Jelas tentang teknologi dan batasnya.</h3><p className="mt-4 text-sm leading-7 text-[#b9c4d8]">Skor SSCI bersifat deterministik dan rule-based. AI hanya membantu menyusun narasi dari hasil penilaian, bukan menilai ulang atau mengubah skor. Keputusan pembiayaan final tetap menjadi kewenangan BPRS.</p><div className="mt-7 flex gap-5 border-t border-white/10 pt-6 text-xs text-[#b9c4d8]"><LockKeyhole className="h-4 w-4 text-[#efb84b]" /> Akses berbasis akun <FileCheck2 className="ml-3 h-4 w-4 text-[#efb84b]" /> Jejak penilaian</div></div></section>

        <section className="bg-[#eaf0fc] py-16"><div className="container flex flex-col items-start justify-between gap-7 md:flex-row md:items-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#2458d6]">Mulai dari fondasi yang jelas</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em]">Siap membuat penilaian lebih terstruktur?</h2></div><Button asChild size="lg" className="rounded-full bg-[#14213d] px-7 hover:bg-[#2458d6]"><Link href={authenticated ? "/dashboard" : "/register"}>{authenticated ? "Buka dashboard" : "Daftar BPRS"}<ChevronRight className="ml-2 h-4 w-4" /></Link></Button></div></section>
      </main>
       <footer className="bg-[#14213d] py-10 text-[#b9c4d8]"><div className="container flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-3 text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efb84b] font-black text-[#14213d]">S</span><strong>SSCI</strong></div><p className="mt-4 max-w-sm text-xs leading-5">Sustainable Sharia Creditworthiness Index. Platform pendukung penilaian untuk BPRS.</p></div><div className="text-xs sm:text-right"><p className="font-semibold text-white">Platform penilaian pembiayaan syariah</p><p className="mt-2">© 2026 SSCI · Universitas Islam Bandung</p></div></div></footer>
    </div>
  );
}
