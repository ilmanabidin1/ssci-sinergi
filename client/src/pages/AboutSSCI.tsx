import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  Building2,
  FileText,
} from "lucide-react";
import { SSCI_METHODOLOGY_VERSION } from "@shared/ssciMethodology";

const pillars = [
  {
    id: 1,
    icon: Leaf,
    color: "emerald",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-600",
    badgeColor: "bg-emerald-100 text-emerald-800",
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
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    badgeColor: "bg-blue-100 text-blue-800",
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
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-600",
    badgeColor: "bg-purple-100 text-purple-800",
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
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: CheckCircle2,
    iconColor: "text-blue-600",
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
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-gray-600">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <Scale className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-800">Tentang SSCI</span>
            </div>
          </div>
          <Link href="/applications/new">
            <Button size="sm" className="gap-2">
              Mulai Penilaian
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">

        {/* Hero Section */}
        <section className="text-center space-y-4">
           <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-4 py-1 text-sm">
             Platform Penilaian Pembiayaan Syariah
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Sustainable Sharia Creditworthiness Index
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto">
            Sistem pendukung penilaian pembiayaan murabahah berbasis aturan yang mengintegrasikan aspek keuangan, kepatuhan syariah, dan legalitas dalam satu indeks terpadu.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span>Universitas Islam Bandung</span>
            </div>
          </div>
        </section>

        {/* Latar Belakang */}
        <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">Latar Belakang</h2>
              <p className="text-gray-600 leading-relaxed">
                Bank Perekonomian Rakyat Syariah (BPRS) memainkan peran strategis dalam penyaluran pembiayaan kepada Usaha Mikro Kecil (UMK) yang tidak terlayani oleh perbankan konvensional. Pembiayaan murabahah — jual beli dengan margin keuntungan yang disepakati — mendominasi <strong>71,61%</strong> dari total pembiayaan BPRS secara nasional.
              </p>
              <p className="text-gray-600 leading-relaxed">
                SSCI menggabungkan tiga dimensi penilaian — keuangan, kepatuhan syariah, dan legalitas hukum — dalam aturan terstandarisasi yang dapat ditelusuri. AI hanya menyusun narasi rekomendasi dan tidak dapat mengubah skor, klasifikasi, atau keputusan analis.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Penelitian ini sejalan dengan <strong>SDGs</strong> (khususnya SDG 1, 8, 9, dan 10 tentang pengentasan kemiskinan, pertumbuhan ekonomi inklusif, dan pengurangan kesenjangan) serta <strong>Asta Cita</strong> Pemerintah Indonesia dalam menjadikan Indonesia sebagai pusat ekonomi syariah dunia.
              </p>
            </div>
          </div>
        </section>

        {/* Bobot Penilaian Visual */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Struktur Bobot Penilaian SSCI</h2>
          <p className="text-gray-500">Total skor SSCI dihitung dari tiga pilar dengan bobot yang telah ditetapkan berdasarkan kajian akademis dan konsultasi pakar syariah.</p>
          <div className="grid grid-cols-3 gap-4">
            {pillars.map((p) => (
              <div key={p.id} className={`rounded-2xl border-2 ${p.borderColor} ${p.bgColor} p-6 text-center space-y-2`}>
                <div className={`w-12 h-12 rounded-full ${p.bgColor} border-2 ${p.borderColor} flex items-center justify-center mx-auto`}>
                  <p.icon className={`h-6 w-6 ${p.iconColor}`} />
                </div>
                <div className={`text-4xl font-black ${p.iconColor}`}>{p.weight}%</div>
                <div className="font-semibold text-gray-800 text-sm">{p.title}</div>
                <div className="text-xs text-gray-500">{p.subtitle}</div>
              </div>
            ))}
          </div>
          {/* Bar visual */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600 mb-3">Visualisasi Proporsi Bobot</p>
            <div className="flex rounded-xl overflow-hidden h-10 w-full">
              <div className="bg-emerald-500 flex items-center justify-center text-white text-sm font-bold" style={{ width: "55%" }}>
                SFI 55%
              </div>
              <div className="bg-blue-500 flex items-center justify-center text-white text-sm font-bold" style={{ width: "25%" }}>
                SCI 25%
              </div>
              <div className="bg-purple-500 flex items-center justify-center text-white text-sm font-bold" style={{ width: "20%" }}>
                LCI 20%
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Keuangan Berkelanjutan</span>
              <span>Kepatuhan Syariah</span>
              <span>Legalitas</span>
            </div>
          </div>
        </section>

        {/* Detail Tiga Pilar */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Detail Tiga Pilar Penilaian</h2>
          {pillars.map((pillar) => (
            <div key={pillar.id} className={`bg-white rounded-2xl border-2 ${pillar.borderColor} shadow-sm overflow-hidden`}>
              {/* Pillar Header */}
              <div className={`${pillar.bgColor} px-8 py-5 flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl border-2 ${pillar.borderColor} bg-white flex items-center justify-center flex-shrink-0`}>
                  <pillar.icon className={`h-6 w-6 ${pillar.iconColor}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{pillar.title}</h3>
                    <Badge className={pillar.badgeColor}>Bobot {pillar.weight}%</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{pillar.subtitle}</p>
                </div>
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* Deskripsi */}
                <p className="text-gray-600 leading-relaxed">{pillar.description}</p>

                {/* Indikator */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gray-500" />
                    Indikator Penilaian
                  </h4>
                  <div className="space-y-2">
                    {pillar.indicators.map((ind, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className={`mt-0.5 w-8 h-8 rounded-lg ${pillar.bgColor} border ${pillar.borderColor} flex items-center justify-center flex-shrink-0 text-xs font-bold ${pillar.iconColor}`}>
                          {ind.weight}%
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{ind.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{ind.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dasar Hukum */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    Dasar Hukum & Regulasi
                  </h4>
                  <ul className="space-y-1.5">
                    {pillar.legalBasis.map((basis, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <ChevronRight className={`h-4 w-4 mt-0.5 flex-shrink-0 ${pillar.iconColor}`} />
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
          <h2 className="text-2xl font-bold text-gray-900">Klasifikasi Hasil Penilaian SSCI</h2>
          <p className="text-gray-500">Skor SSCI berkisar antara 0–100 dan diklasifikasikan ke dalam empat kategori kelayakan pembiayaan murabahah.</p>
          <div className="grid grid-cols-2 gap-4">
            {classifications.map((cls, idx) => (
              <div key={idx} className={`rounded-2xl border-2 ${cls.border} ${cls.bg} p-6 space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <cls.icon className={`h-5 w-5 ${cls.iconColor}`} />
                    <span className={`font-bold text-lg ${cls.color}`}>{cls.label}</span>
                  </div>
                  <Badge className={`${cls.bg} ${cls.color} border ${cls.border} font-mono text-sm`}>
                    {cls.range}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{cls.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Formula */}
        <section className="bg-gray-900 rounded-2xl p-8 text-white space-y-4">
          <h2 className="text-xl font-bold">Formula Perhitungan SSCI</h2>
          <div className="bg-gray-800 rounded-xl p-5 font-mono text-sm space-y-2">
            <p className="text-emerald-400">{"// Skor SSCI (0-100)"}</p>
            <p className="text-white">
              <span className="text-yellow-300">SSCI</span>
              {" = "}
              <span className="text-emerald-400">(SFI × 0.55)</span>
              {" + "}
              <span className="text-blue-400">(SCI × 0.25)</span>
              {" + "}
              <span className="text-purple-400">(LCI × 0.20)</span>
            </p>
            <Separator className="bg-gray-700 my-2" />
            <p className="text-gray-400 text-xs">SFI = Sustainable Finance Index (0–100)</p>
            <p className="text-gray-400 text-xs">SCI = Sharia Compliance Index (0–100)</p>
            <p className="text-gray-400 text-xs">LCI = Legal Compliance Index (0–100)</p>
          </div>
          <p className="text-gray-400 text-sm">
            Skor dihitung secara deterministik menggunakan versi aturan <strong className="text-white">{SSCI_METHODOLOGY_VERSION}</strong>. OpenRouter dengan model <strong className="text-white">openai/gpt-5.6-luna</strong> hanya membantu menyusun narasi rekomendasi; keputusan pembiayaan final tetap menjadi kewenangan BPRS.
          </p>
        </section>

        {/* Tim & Institusi */}
        <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
           <h2 className="text-xl font-bold text-gray-900 mb-6">Platform & Afiliasi</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Afiliasi Platform</p>
               <p className="font-semibold text-gray-800">Universitas Islam Bandung (UNISBA)</p>
               <p className="text-sm text-gray-500">SSCI dikembangkan bersama ekosistem akademik dan mitra untuk mendukung proses penilaian BPRS.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-6">
          <Link href="/applications/new">
            <Button size="lg" className="gap-2 px-8">
               Mulai Penilaian SSCI
              <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-gray-400 mt-3">Hasil SSCI merupakan pendukung analisis, bukan keputusan pembiayaan final.</p>
        </section>

      </main>
    </div>
  );
}
