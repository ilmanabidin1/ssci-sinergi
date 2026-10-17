import { AppHeader } from "@/components/AppHeader";
import { PILLAR_THEME } from "@/components/pillarTheme";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Scale,
  Leaf,
   BookOpen,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Star,
  
  FileText,
} from "lucide-react";
import { SSCI_METHODOLOGY_VERSION } from "@shared/ssciMethodology";

const pillars = [
  {
    id: 1,
    icon: Leaf,
    theme: PILLAR_THEME.sfi,
    code: "SFI",
    title: "Indeks Keuangan Berkelanjutan",
    subtitle: "Sustainable Finance Index (SFI)",
    weight: 55,
    description:
      "Pilar ini mengevaluasi profitabilitas, kapasitas kewajiban, kemampuan pembayaran berdasarkan tenor dan margin akad, serta rasio pembiayaan terhadap agunan. Data ESG dikumpulkan sebagai informasi pendukung dan belum menambah skor pada versi aturan ini.",
    indicators: [
      {
        name: "Rasio Profitabilitas (Net Profit Margin)",
        weight: 30,
        desc: "Efisiensi usaha dalam menghasilkan laba bersih",
      },
      {
        name: "Kapasitas Kewajiban Existing",
        weight: 25,
        desc: "Perbandingan angsuran existing terhadap laba bersih bulanan",
      },
      {
        name: "Kemampuan Membayar Pembiayaan",
        weight: 25,
        desc: "Cakupan laba bersih terhadap angsuran existing dan estimasi angsuran baru",
      },
      {
        name: "Rasio Agunan (Loan to Value)",
        weight: 20,
        desc: "Perbandingan jumlah pembiayaan terhadap nilai agunan",
      },
    ],
    legalBasis: [
      "POJK No. 51/POJK.03/2017 tentang Penerapan Keuangan Berkelanjutan",
      "POJK No. 60/POJK.04/2017 tentang Penerbitan dan Persyaratan Efek Bersifat Utang Berwawasan Lingkungan",
      "Roadmap Keuangan Berkelanjutan OJK 2021–2025",
    ],
  },
  {
    id: 2,
    icon: Scale,
    theme: PILLAR_THEME.sci,
    code: "SCI",
    title: "Indeks Kepatuhan Syariah",
    subtitle: "Sharia Compliance Index (SCI)",
    weight: 25,
    description:
      "Pilar ini menilai sejauh mana profil usaha dan perilaku nasabah sesuai dengan prinsip-prinsip syariah Islam. Penilaian mengacu pada fatwa Dewan Syariah Nasional Majelis Ulama Indonesia (DSN-MUI) dan regulasi OJK terkait perbankan syariah, khususnya akad murabahah.",
    indicators: [
      {
        name: "Kepatuhan Bisnis",
        weight: 40,
        desc: "Pernyataan kepatuhan bisnis terhadap prinsip syariah",
      },
      {
        name: "Kepatuhan Transaksi",
        weight: 35,
        desc: "Pemeriksaan awal jenis usaha dan tujuan pembiayaan terhadap kata kunci aktivitas terlarang",
      },
      {
        name: "Dokumentasi Kepatuhan",
        weight: 25,
        desc: "Kelengkapan catatan kepatuhan untuk ditinjau lebih lanjut oleh analis atau DPS",
      },
    ],
    legalBasis: [
      "Fatwa DSN-MUI No. 04/DSN-MUI/IV/2000 tentang Murabahah",
      "Fatwa DSN-MUI No. 13/DSN-MUI/IX/2000 tentang Uang Muka dalam Murabahah",
      "Fatwa DSN-MUI No. 16/DSN-MUI/IX/2000 tentang Diskon dalam Murabahah",
      "POJK No. 24/POJK.03/2018 tentang Produk Bank Umum Syariah dan Unit Usaha Syariah",
      "UU No. 21 Tahun 2008 tentang Perbankan Syariah, Pasal 2 dan 3",
    ],
  },
  {
    id: 3,
    icon: FileText,
    theme: PILLAR_THEME.lci,
    code: "LCI",
    title: "Indeks Legalitas",
    subtitle: "Legal Compliance Index (LCI)",
    weight: 20,
    description:
      "Pilar ini mengevaluasi kelengkapan dan keabsahan dokumen hukum nasabah sebagai subjek hukum yang cakap untuk melakukan perikatan pembiayaan. Penilaian mengacu pada ketentuan hukum perdata, hukum bisnis, dan regulasi perizinan usaha yang berlaku di Indonesia.",
    indicators: [
      {
        name: "Lama Operasional Usaha",
        weight: 40,
        desc: "Maturitas usaha berdasarkan lama operasional yang dilaporkan",
      },
      {
        name: "Kelengkapan Dokumen",
        weight: 35,
        desc: "Status kelengkapan atau verifikasi KTP, NPWP, dan NIB tanpa menghitung dokumen duplikat",
      },
      {
        name: "Kepatuhan Perizinan",
        weight: 25,
        desc: "Ketersediaan NIB sebagai bukti awal perizinan usaha melalui OSS",
      },
    ],
    legalBasis: [
      "PP No. 5 Tahun 2021 tentang Penyelenggaraan Perizinan Berusaha Berbasis Risiko (OSS-RBA)",
      "UU No. 40 Tahun 2007 tentang Perseroan Terbatas",
      "KUH Perdata Pasal 1320 tentang Syarat Sah Perjanjian",
      "POJK No. 35/POJK.05/2018 tentang Penyelenggaraan Usaha Perusahaan Pembiayaan",
      "UU No. 21 Tahun 2008 tentang Perbankan Syariah, Pasal 36",
    ],
  },
];

const classifications = [
  {
    label: "Sangat Layak",
    range: "80 – 100",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    icon: Star,
    iconColor: "text-emerald-600",
    desc: "Kriteria awal terpenuhi dengan sangat baik dan dapat dilanjutkan ke review serta keputusan pejabat BPRS.",
  },
  {
    label: "Layak",
    range: "65 – <80",
    color: "text-royal-700",
    bg: "bg-muted",
    border: "border-royal-600/30",
    icon: CheckCircle2,
    iconColor: "text-royal-600",
    desc: "Kriteria awal terpenuhi dengan baik dan dapat dipertimbangkan dengan persyaratan atau pengawasan berkala.",
  },
  {
    label: "Perlu Pengawasan",
    range: "50 – <65",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    desc: "Terdapat beberapa kelemahan yang perlu diperhatikan. Pembiayaan dapat dipertimbangkan dengan pengawasan ketat, agunan tambahan, atau restrukturisasi.",
  },
  {
    label: "Tidak Layak",
    range: "<50",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-300",
    icon: XCircle,
    iconColor: "text-red-600",
    desc: "Kriteria awal belum terpenuhi. Hasil ini menjadi masukan bagi checker, bukan penolakan otomatis.",
  },
];

export default function AboutSSCI() {
  usePageTitle("Tentang SSCI");
  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-navy-900 px-5 py-12 sm:py-14 text-center text-white shadow-premium-lg sm:px-12">
          <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.05]" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl" />
          <div className="relative space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3.5 py-1.5 text-xs font-semibold text-gold-300">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400" /> Platform Penilaian Pembiayaan Syariah
            </span>
            <h1 className="mx-auto max-w-3xl font-serif text-3xl font-medium leading-tight sm:text-5xl">
              Sustainable Sharia <em className="text-gold-gradient">Creditworthiness Index</em>
            </h1>
            <div className="gold-rule mx-auto w-24" />
            <p className="mx-auto max-w-3xl text-base leading-8 text-white/80 sm:text-lg">
              Sistem pendukung penilaian pembiayaan murabahah berbasis aturan yang mengintegrasikan aspek keuangan, kepatuhan syariah, dan legalitas dalam satu indeks terpadu.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2 text-sm text-white/80">
              <img src="/unisba-logo.png" alt="" className="h-8 w-auto rounded bg-white/95 p-0.5" />
              <span>Universitas Islam Bandung</span>
            </div>
          </div>
        </section>

        {/* Latar Belakang */}
        <section className="bg-white rounded-2xl border border-border p-5 sm:p-8 shadow-premium">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
              <Info className="h-5 w-5 text-royal-600" />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-navy-900">Latar Belakang</h2>
              <p className="text-muted-foreground leading-relaxed">
                Bank Perekonomian Rakyat Syariah (BPRS) memainkan peran strategis dalam penyaluran pembiayaan kepada Usaha Mikro Kecil (UMK) yang tidak terlayani oleh perbankan konvensional. Pembiayaan murabahah (jual beli dengan margin keuntungan yang disepakati) mendominasi <strong>71,61%</strong> dari total pembiayaan BPRS secara nasional.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                SSCI menggabungkan tiga dimensi penilaian, yaitu keuangan, kepatuhan syariah, dan legalitas hukum, dalam aturan terstandarisasi yang dapat ditelusuri. AI hanya menyusun narasi rekomendasi dan tidak dapat mengubah skor, klasifikasi, atau keputusan analis.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Penelitian ini sejalan dengan <strong>SDGs</strong> (khususnya SDG 1, 8, 9, dan 10 tentang pengentasan kemiskinan, pertumbuhan ekonomi inklusif, dan pengurangan kesenjangan) serta <strong>Asta Cita</strong> Pemerintah Indonesia dalam menjadikan Indonesia sebagai pusat ekonomi syariah dunia.
              </p>
            </div>
          </div>
        </section>

        {/* Bobot Penilaian Visual */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-navy-900">Struktur Bobot Penilaian SSCI</h2>
          <p className="text-muted-foreground">Total skor SSCI dihitung dari tiga pilar dengan bobot yang telah ditetapkan berdasarkan kajian akademis dan konsultasi pakar syariah.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.id} className={`relative overflow-hidden rounded-2xl border-2 ${p.theme.border} ${p.theme.soft} p-5 sm:p-6 flex items-center gap-4 text-left sm:block sm:space-y-2 sm:text-center`}>
                <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${p.theme.dot}`} />
                <div className={`w-12 h-12 shrink-0 rounded-full bg-white border-2 ${p.theme.border} flex items-center justify-center sm:mx-auto`}>
                  <p.icon className={`h-6 w-6 ${p.theme.icon}`} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className={`text-3xl font-black sm:text-4xl ${p.theme.text}`}>{p.weight}%</div>
                  <div className="font-semibold text-navy-900 text-sm">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Bar visual */}
          <div className="bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <p className="text-sm font-medium text-navy-900 mb-3" id="weight-bar-label">Visualisasi Proporsi Bobot</p>
            <div role="img" aria-labelledby="weight-bar-label" aria-describedby="weight-bar-legend" className="flex h-10 w-full divide-x-2 divide-white overflow-hidden rounded-xl">
              {pillars.map(p => (
                <div key={p.id} className={`${p.theme.bar} flex items-center justify-center text-xs font-bold sm:text-sm`} style={{ width: `${p.weight}%` }}>
                  <span aria-hidden="true">{p.code} {p.weight}%</span>
                </div>
              ))}
            </div>
            <ul id="weight-bar-legend" className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              {pillars.map(p => (
                <li key={p.id} className="flex items-center gap-2">
                  <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-sm ${p.theme.dot}`} />
                  <span><span className="font-semibold text-navy-900">{p.code} {p.weight}%</span> {p.title.replace("Indeks ", "")}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Detail Tiga Pilar */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-navy-900">Detail Tiga Pilar Penilaian</h2>
          {pillars.map((pillar) => (
            <div key={pillar.id} className={`bg-white rounded-2xl border-2 ${pillar.theme.border} shadow-sm overflow-hidden`}>
              {/* Pillar Header */}
              <div className={`${pillar.theme.soft} px-5 py-5 sm:px-8 flex items-start gap-4 sm:items-center`}>
                <div className={`w-12 h-12 rounded-xl border-2 ${pillar.theme.border} bg-white flex items-center justify-center flex-shrink-0`}>
                  <pillar.icon className={`h-6 w-6 ${pillar.theme.icon}`} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-navy-900">{pillar.title}</h3>
                    <Badge className={pillar.theme.badge}>Bobot {pillar.weight}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{pillar.subtitle}</p>
                </div>
              </div>

              <div className="px-5 py-6 sm:px-8 space-y-6">
                {/* Deskripsi */}
                <p className="text-muted-foreground leading-relaxed">{pillar.description}</p>

                {/* Indikator */}
                <div>
                  <h4 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    Indikator Penilaian
                  </h4>
                  <div className="space-y-2">
                    {pillar.indicators.map((ind, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-ivory border border-border">
                        <div className={`mt-0.5 w-10 h-8 rounded-lg ${pillar.theme.soft} border ${pillar.theme.border} flex items-center justify-center flex-shrink-0 text-xs font-bold ${pillar.theme.text}`}>
                          {ind.weight}%
                        </div>
                        <div>
                          <p className="text-sm font-medium text-navy-900">{ind.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ind.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dasar Hukum */}
                <div>
                  <h4 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    Dasar Hukum & Regulasi
                  </h4>
                  <ul className="space-y-1.5">
                    {pillar.legalBasis.map((basis, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronRight className={`h-4 w-4 mt-0.5 flex-shrink-0 ${pillar.theme.icon}`} aria-hidden="true" />
                        {basis}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Klasifikasi Skor */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-navy-900">Klasifikasi Hasil Penilaian SSCI</h2>
          <p className="text-muted-foreground">Skor SSCI berkisar antara 0–100 dan diklasifikasikan ke dalam empat kategori kelayakan pembiayaan murabahah.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {classifications.map((cls, idx) => (
              <div key={idx} className={`rounded-2xl border-2 ${cls.border} ${cls.bg} p-5 sm:p-6 space-y-3`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <cls.icon className={`h-5 w-5 ${cls.iconColor}`} aria-hidden="true" />
                    <span className={`font-bold text-lg ${cls.color}`}>{cls.label}</span>
                  </div>
                  <Badge className={`bg-white ${cls.color} border ${cls.border} font-mono text-sm`}>
                    {cls.range}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{cls.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Formula */}
        <section className="bg-navy-900 rounded-2xl p-5 sm:p-8 text-white space-y-4">
          <h2 className="text-xl font-bold">Formula Perhitungan SSCI</h2>
          <div className="bg-navy-950 rounded-xl p-4 sm:p-5 font-mono text-sm space-y-2 overflow-x-auto">
            <p className="text-emerald-300">{"// Skor SSCI (0-100)"}</p>
            <p className="text-white">
              <span className="text-gold-300">SSCI</span>
              {" = "}
              <span className="text-sky-300">(SFI × 0.55)</span>
              {" + "}
              <span className="text-gold-300">(SCI × 0.25)</span>
              {" + "}
              <span className="text-slate-300">(LCI × 0.20)</span>
            </p>
            <Separator className="bg-white/15 my-2" />
            <p className="text-white/75 text-xs">SFI = Sustainable Finance Index (0–100)</p>
            <p className="text-white/75 text-xs">SCI = Sharia Compliance Index (0–100)</p>
            <p className="text-white/75 text-xs">LCI = Legal Compliance Index (0–100)</p>
          </div>
          <p className="text-white/80 text-sm">
            Skor dihitung secara deterministik menggunakan versi aturan <strong className="text-white">{SSCI_METHODOLOGY_VERSION}</strong>. OpenRouter dengan model <strong className="text-white">openai/gpt-6-luna</strong> hanya membantu menyusun narasi rekomendasi; keputusan pembiayaan final tetap menjadi kewenangan BPRS.
          </p>
        </section>

        {/* Tim & Institusi */}
        <section className="bg-white rounded-2xl border border-border p-5 sm:p-8 shadow-premium">
           <h2 className="text-xl font-bold text-navy-900 mb-6">Platform & Afiliasi</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Afiliasi Platform</p>
               <p className="font-semibold text-navy-900">Universitas Islam Bandung (UNISBA)</p>
               <p className="text-sm text-muted-foreground">SSCI dikembangkan bersama ekosistem akademik dan mitra untuk mendukung proses penilaian BPRS.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-6">
          <Button asChild size="lg" className="h-12 gap-2 px-8">
            <Link href="/applications/new">
              Mulai Penilaian SSCI
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-3">Hasil SSCI merupakan pendukung analisis, bukan keputusan pembiayaan final.</p>
        </section>

      </main>
    </div>
  );
}
