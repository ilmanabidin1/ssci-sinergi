import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { BarChart3, BookOpen, FileCheck, Shield, TrendingUp } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Prototype mode: show landing page for everyone
  if (false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <nav className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">SSCI</h1>
            </div>
            <Button asChild>
              <a href={getLoginUrl()}>Login</a>
            </Button>
          </div>
        </nav>

        <main className="container py-16">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900">
                Sustainable Sharia Creditworthiness Index
              </h1>
              <p className="text-xl text-gray-600">
                Sistem Pendukung Penilaian Pembiayaan Syariah Berbasis Aturan untuk Bank Perekonomian Rakyat Syariah (BPRS)
              </p>
              <div className="flex justify-center items-center gap-4 mt-6">
                <img src="/unisba-logo.png" alt="Universitas Islam Bandung" className="h-16" />
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Prototype untuk Proposal Program Hilirisasi Riset SINERGI 2026
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <Card>
                <CardHeader>
                  <TrendingUp className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Analisis Komprehensif</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Evaluasi mendalam berdasarkan 3 pilar: Keuangan Berkelanjutan (55%), Kepatuhan Syariah (25%), dan Legalitas (20%)
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-accent mb-2" />
                  <CardTitle>Kepatuhan Syariah</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Memastikan setiap pembiayaan sesuai dengan prinsip syariah dan regulasi OJK
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="h-10 w-10 text-blue-600 mb-2" />
                  <CardTitle>Skoring Transparan</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Aturan penilaian berversi dengan narasi rekomendasi berbantuan AI yang tidak mengubah skor
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 p-8 bg-white rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Untuk Analis Pembiayaan BPRS</h2>
              <p className="text-gray-600 mb-6">
                Login untuk mengakses sistem penilaian kelayakan pembiayaan, dashboard analitik, dan riwayat assessment
              </p>
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>Mulai Sekarang</a>
              </Button>
            </div>
          </div>
        </main>

        <footer className="border-t mt-16 py-8 bg-white">
          <div className="container text-center text-gray-600">
            <p>© 2024 SSCI - Sustainable Sharia Creditworthiness Index</p>
            <p className="text-sm mt-2">Universitas Islam Bandung - Prototype untuk Proposal SINERGI 2026</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">SSCI</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Halo, {user?.name || "Belum masuk"}</span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="container py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <img src="/unisba-logo.png" alt="Universitas Islam Bandung" className="h-20" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Selamat Datang di SSCI</h1>
            <p className="text-lg text-gray-600">
              Sustainable Sharia Creditworthiness Index: Sistem Penilaian Kelayakan Pembiayaan Syariah untuk Bank Perekonomian Rakyat Syariah
            </p>
            <div className="inline-block px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                🔬 Prototype untuk Proposal Program Hilirisasi Riset SINERGI 2026
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileCheck className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Penilaian Baru</CardTitle>
                <CardDescription>
                  Buat penilaian kelayakan pembiayaan untuk aplikasi nasabah baru
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/applications/new">Mulai Penilaian</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Dashboard Analitik</CardTitle>
                <CardDescription>
                  Lihat statistik dan visualisasi hasil penilaian
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/dashboard">Lihat Dashboard</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-accent mb-4" />
                <CardTitle>Riwayat Penilaian</CardTitle>
                <CardDescription>
                  Akses riwayat assessment dengan filter dan pencarian
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/assessments">Lihat Riwayat</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Tentang SSCI</CardTitle>
                <CardDescription>
                  Pelajari metodologi 3 pilar, bobot penilaian, dan dasar hukum syariah
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/tentang-ssci">Lihat Metodologi</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
