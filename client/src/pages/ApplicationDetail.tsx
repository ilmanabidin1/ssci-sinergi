import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Shield, FileText, TrendingUp, AlertCircle, CheckCircle, Download } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  
  const applicationId = parseInt(id || "0");
  
  const { data, isLoading } = trpc.assessments.getWithApplication.useQuery(
    { applicationId },
    { enabled: !!applicationId }
  );

  const assessMutation = trpc.applications.assess.useMutation({
    onSuccess: async data => {
      await utils.assessments.getWithApplication.invalidate({ applicationId });
      if (data.result.recommendationStatus === "rule_fallback") {
        toast.warning("Skor selesai. Narasi AI tidak tersedia; rekomendasi aturan digunakan.");
      } else {
        toast.success("Penilaian dan narasi pendukung berhasil dibuat");
      }
    },
    onError: (error) => {
      toast.error(`Gagal melakukan penilaian: ${error.message}`);
    },
  });

  const decideMutation = trpc.applications.decide.useMutation({
    onSuccess: async () => {
      await utils.assessments.getWithApplication.invalidate({ applicationId });
      toast.success("Keputusan checker berhasil disimpan");
    },
    onError: error => toast.error(`Gagal menyimpan keputusan: ${error.message}`),
  });

  const decide = (decision: "approved" | "rejected") => {
    const notes = window.prompt(
      decision === "approved" ? "Catatan persetujuan:" : "Alasan penolakan:"
    );
    if (!notes?.trim()) return;
    decideMutation.mutate({ applicationId, decision, notes: notes.trim() });
  };

  const handleExportPDF = async () => {
    try {
      const result = await utils.client.assessments.exportReport.mutate({ applicationId });
      
      // Create a Blob from HTML and trigger download
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
       link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
       toast.success("Laporan HTML aman berhasil diunduh dan dapat dicetak ke PDF.");
    } catch (error) {
      toast.error("Gagal mengekspor PDF");
    }
  };

  // Prototype mode: no login required

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.application) {
    return <div className="min-h-screen flex items-center justify-center"><p>Aplikasi tidak ditemukan</p></div>;
  }

  const { application, assessment } = data;

  const getClassificationBadge = (classification: string) => {
    const badges = {
      "Sangat Layak": <Badge className="score-excellent">Sangat Layak</Badge>,
      "Layak": <Badge className="score-good">Layak</Badge>,
      "Perlu Pengawasan": <Badge className="score-warning">Perlu Pengawasan</Badge>,
      "Tidak Layak": <Badge className="score-poor">Tidak Layak</Badge>,
    };
    return badges[classification as keyof typeof badges] || <Badge>{classification}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">SSCI</h1>
            </div>
          </div>
          <span className="text-sm text-gray-600">{user?.name || "Belum masuk"}</span>
        </div>
      </nav>

      <main className="container py-8 max-w-6xl">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{application.customerName}</h1>
            <p className="text-gray-600 mt-1">{application.businessName}</p>
          </div>
          <div className="flex gap-2">
            {assessment && (
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                 Unduh Laporan
              </Button>
            )}
            {assessment && application.status === "assessed" &&
              (user?.role === "checker" || user?.role === "admin") && (
                <>
                  <Button
                    variant="destructive"
                    disabled={decideMutation.isPending}
                    onClick={() => decide("rejected")}
                  >
                    Tolak
                  </Button>
                  <Button
                    disabled={decideMutation.isPending}
                    onClick={() => decide("approved")}
                  >
                    Setujui
                  </Button>
                </>
              )}
            {!assessment && (
              <Button
                onClick={() => assessMutation.mutate({ applicationId })}
                disabled={assessMutation.isPending}
            >
              {assessMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lakukan Penilaian SSCI
            </Button>
            )}
          </div>
        </div>

        {assessment && (
          <Card className="mb-6 border-2 border-primary">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                   <CardTitle className="text-2xl">Hasil Penilaian Berbasis Aturan SSCI</CardTitle>
                   <CardDescription>Rekomendasi pendukung, bukan keputusan pembiayaan final</CardDescription>
                </div>
                {getClassificationBadge(assessment.classification)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-6 mb-6">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-4xl font-bold text-primary">{Number(assessment.totalScore).toFixed(1)}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Skor</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{Number(assessment.sustainableFinanceScore).toFixed(1)}</div>
                   <div className="text-sm text-gray-600 mt-1">Kontribusi Keuangan /55</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{Number(assessment.shariaScore).toFixed(1)}</div>
                   <div className="text-sm text-gray-600 mt-1">Kontribusi Syariah /25</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{Number(assessment.legalScore).toFixed(1)}</div>
                   <div className="text-sm text-gray-600 mt-1">Kontribusi Legal /20</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-semibold">Kekuatan</div>
                      <p className="text-sm text-gray-600">{assessment.strengths}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <div className="font-semibold">Faktor Risiko</div>
                      <p className="text-sm text-gray-600">{assessment.riskFactors}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                     <div className="font-semibold text-blue-900">
                       {assessment.recommendationStatus === "generated"
                         ? "Narasi Pendukung AI"
                         : "Rekomendasi Berbasis Aturan"}
                     </div>
                     <p className="text-sm text-blue-800 mt-1">{assessment.recommendations}</p>
                   </div>
                 </div>
               </div>
              <div className="mt-4 border-t pt-4 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
                <span>Versi aturan: {assessment.modelVersion}</span>
                <span>
                  Model narasi: {assessment.recommendationModel || "Fallback aturan"}
                </span>
                <span>
                  Dinilai: {new Date(assessment.assessedAt).toLocaleString("id-ID")}
                </span>
                <span>Kelengkapan data: {Number(assessment.confidence).toFixed(0)}%</span>
              </div>
            </CardContent>
          </Card>
        )}

         <div className="grid md:grid-cols-2 gap-6">
          {(application.status === "approved" || application.status === "rejected") && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Keputusan Checker</CardTitle>
                <CardDescription>
                  Status: {application.status === "approved" ? "Disetujui" : "Ditolak"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">{application.decisionNotes}</CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Nasabah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-semibold">NIK:</span> {application.customerId}</div>
              <div><span className="font-semibold">Telepon:</span> {application.phone}</div>
              <div><span className="font-semibold">Email:</span> {application.email || "-"}</div>
              <div><span className="font-semibold">Alamat:</span> {application.address}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Usaha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-semibold">Jenis:</span> {application.businessType}</div>
              <div><span className="font-semibold">Lama Usaha:</span> {application.businessAge} bulan</div>
              <div><span className="font-semibold">Kepatuhan Syariah:</span> {application.businessShariaCompliant}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Keuangan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-semibold">Pendapatan:</span> Rp {Number(application.monthlyRevenue).toLocaleString()}</div>
              <div><span className="font-semibold">Pengeluaran:</span> Rp {Number(application.monthlyExpenses).toLocaleString()}</div>
               <div><span className="font-semibold">Angsuran existing/bulan:</span> Rp {Number(application.existingDebt).toLocaleString("id-ID")}</div>
              <div><span className="font-semibold">Agunan:</span> Rp {Number(application.collateralValue).toLocaleString()}</div>
               <div><span className="font-semibold">Pembiayaan Diajukan:</span> Rp {Number(application.requestedAmount).toLocaleString()}</div>
               <div><span className="font-semibold">Tenor:</span> {application.financingTenor} bulan</div>
               <div><span className="font-semibold">Total margin:</span> {Number(application.marginRate).toFixed(2)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tujuan Pembiayaan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{application.loanPurpose}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
