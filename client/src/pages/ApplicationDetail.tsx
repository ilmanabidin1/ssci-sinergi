import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Shield, FileText, TrendingUp, AlertCircle, CheckCircle, Download, Upload } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const orgQuery = trpc.organization.getSettings.useQuery();
  const orgName = orgQuery.data?.name;
  const orgLogo = orgQuery.data?.logoUrl;

  const applicationId = parseInt(id || "0");
  
  const { data, isLoading } = trpc.assessments.getWithApplication.useQuery(
    { applicationId },
    { enabled: !!applicationId }
  );

  const documentsQuery = trpc.documents.listDocuments.useQuery(
    { applicationId },
    { enabled: !!applicationId }
  );

  const commentsQuery = trpc.applications.listComments.useQuery(
    { applicationId },
    { enabled: !!applicationId }
  );

  const activityQuery = trpc.applications.listActivity.useQuery(
    { applicationId },
    { enabled: !!applicationId }
  );

  const [commentText, setCommentText] = useState("");

  const addCommentMutation = trpc.applications.addComment.useMutation({
    onSuccess: async () => {
      setCommentText("");
      await commentsQuery.refetch();
      toast.success("Catatan berhasil ditambahkan");
    },
    onError: error => toast.error(`Gagal menambahkan catatan: ${error.message}`),
  });

  const handleAddComment = () => {
    const content = commentText.trim();
    if (!content) {
      toast.error("Catatan tidak boleh kosong");
      return;
    }
    addCommentMutation.mutate({ applicationId, content });
  };

  const uploadMutation = trpc.documents.uploadDocument.useMutation({
    onSuccess: async () => {
      await documentsQuery.refetch();
      toast.success("Dokumen berhasil diunggah");
    },
    onError: error => toast.error(`Gagal mengunggah dokumen: ${error.message}`),
  });

  const verifyMutation = trpc.documents.verifyDocument.useMutation({
    onSuccess: async () => {
      await documentsQuery.refetch();
      toast.success("Status dokumen berhasil diperbarui");
    },
    onError: error => toast.error(`Gagal memperbarui dokumen: ${error.message}`),
  });

  const uploadDocument = (documentType: "KTP" | "NPWP" | "NIB", file?: File) => {
    if (!file) return;
    const contentTypes = ["application/pdf", "image/jpeg", "image/png"] as const;
    if (!contentTypes.includes(file.type as typeof contentTypes[number])) {
      toast.error("Format dokumen harus PDF, JPG, atau PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran dokumen maksimal 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      uploadMutation.mutate({ applicationId, documentType, originalName: file.name, contentType: file.type as typeof contentTypes[number], data: reader.result });
    };
    reader.onerror = () => toast.error("Dokumen tidak dapat dibaca");
    reader.readAsDataURL(file);
  };

  const verifyDocument = (id: number, status: "verified" | "rejected") => {
    const reason = status === "rejected" ? window.prompt("Alasan penolakan dokumen:")?.trim() : undefined;
    if (status === "rejected" && !reason) return;
    verifyMutation.mutate({ id, status, reason });
  };

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

  const cancelMutation = trpc.applications.cancel.useMutation({
    onSuccess: async () => {
      await utils.assessments.getWithApplication.invalidate({ applicationId });
      toast.success("Pengajuan berhasil dibatalkan");
    },
    onError: error => toast.error(`Gagal membatalkan: ${error.message}`),
  });

  const handleCancel = () => {
    const reason = window.prompt("Alasan pembatalan (opsional):")?.trim();
    if (window.confirm("Yakin ingin membatalkan pengajuan ini? Aksi tidak dapat dibatalkan.")) {
      cancelMutation.mutate({ applicationId, reason });
    }
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
  const canVerifyDocuments = user?.role === "checker" || user?.role === "admin";
  const documentTypes = ["KTP", "NPWP", "NIB"] as const;
  const statusLabels = { uploaded: "Diunggah", verified: "Terverifikasi", rejected: "Ditolak" } as const;

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
              <img src={orgLogo || "/logo-light-bg.png"} alt="Logo BPRS" className="h-8 w-auto object-contain" />
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary">SSCI</h1>
                {orgName && <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500 sm:inline">{orgName}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ProfileMenu />
          </div>
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
            {assessment && application.status === "assessed" && (
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
            {application.status === "pending" && (user?.role === "maker" || user?.role === "admin") && (
              <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
                Batalkan pengajuan
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

               {assessment.recommendedPlafon && (
                 <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                   <div className="flex items-start gap-2 mb-3">
                     <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5" />
                     <div>
                       <div className="font-semibold text-amber-900">Rekomendasi Plafon Otomatis</div>
                       <p className="text-xs text-amber-700 mt-0.5">Plafon ini adalah rekomendasi otomatis dan bersifat indikatif. Keputusan final plafon tetap pada komite BPRS.</p>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                     <div className="bg-white rounded p-2">
                       <div className="text-xl font-bold text-amber-800">Rp {(Number(assessment.recommendedPlafon) / 1_000_000).toFixed(0)}<span className="text-sm"> jt</span></div>
                       <div className="text-xs text-gray-500">Plafon Rekomendasi</div>
                     </div>
                     <div className="bg-white rounded p-2">
                       <div className="text-lg font-semibold text-gray-800">Rp {(Number(assessment.recommendedPlafon) * (1 + Number(data.application.marginRate) / 100) / Number(data.application.financingTenor) / 1_000_000).toFixed(1)}<span className="text-xs"> jt/bln</span></div>
                       <div className="text-xs text-gray-500">Cicilan Estimasi</div>
                     </div>
                     <div className="bg-white rounded p-2">
                       <div className="text-lg font-semibold text-gray-800">{Number(assessment.dscrRatio).toFixed(2)}x</div>
                       <div className="text-xs text-gray-500">DSCR (target 1.25)</div>
                     </div>
                     <div className="bg-white rounded p-2">
                       <div className="text-lg font-semibold text-gray-800">{Number(assessment.ltvRatio).toFixed(1)}%</div>
                       <div className="text-xs text-gray-500">LTV (maks 80%)</div>
                     </div>
                   </div>
                   <div className="mt-2 text-xs text-amber-600">
                     Asumsi: tenor {data.application.financingTenor} bulan, margin {Number(data.application.marginRate).toFixed(2)}%
                   </div>
                 </div>
               )}

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
           <Card className="md:col-span-2">
             <CardHeader>
               <CardTitle>Dokumen</CardTitle>
               <CardDescription>Unggah PDF, JPG, atau PNG dengan ukuran maksimal 5MB.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               {documentTypes.map(documentType => {
                 const document = documentsQuery.data?.find(item => item.documentType === documentType);
                 return (
                   <div key={documentType} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                     <div className="min-w-0">
                       <div className="font-semibold">{documentType}</div>
                       {document ? (
                         <div className="text-sm text-gray-600">
                           <span>{document.originalName}</span>{" "}
                           <Badge variant={document.status === "rejected" ? "destructive" : document.status === "verified" ? "default" : "secondary"}>
                             {statusLabels[document.status as keyof typeof statusLabels] || document.status}
                           </Badge>
                           {document.status === "rejected" && document.rejectionReason && <div className="mt-1 text-destructive">Alasan: {document.rejectionReason}</div>}
                         </div>
                       ) : <div className="text-sm text-gray-500">Belum diunggah</div>}
                     </div>
                     <div className="flex flex-wrap gap-2">
                       <label className="inline-flex cursor-pointer">
                         <Button type="button" variant="outline" asChild disabled={uploadMutation.isPending}>
                           <span><Upload className="mr-2 h-4 w-4" />Unggah</span>
                         </Button>
                         <input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => { uploadDocument(documentType, event.target.files?.[0]); event.target.value = ""; }} />
                       </label>
                       {canVerifyDocuments && document && document.status !== "verified" && (
                         <>
                           <Button size="sm" disabled={verifyMutation.isPending} onClick={() => verifyDocument(document.id, "verified")}>Verifikasi</Button>
                           <Button size="sm" variant="destructive" disabled={verifyMutation.isPending} onClick={() => verifyDocument(document.id, "rejected")}>Tolak</Button>
                         </>
                       )}
                     </div>
                   </div>
                 );
               })}
             </CardContent>
           </Card>
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

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Aktivitas & Catatan</CardTitle>
              <CardDescription>Catatan kolaborasi dan riwayat aktivitas pengajuan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-600">Catatan</h3>
                <textarea
                  className="w-full rounded-lg border p-3 text-sm"
                  rows={3}
                  placeholder="Tulis catatan atau komentar..."
                  value={commentText}
                  onChange={event => setCommentText(event.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={addCommentMutation.isPending || !commentText.trim()}
                  >
                    {addCommentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tambah Catatan
                  </Button>
                </div>
              </div>

              {commentsQuery.isLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat catatan...
                </div>
              ) : (commentsQuery.data ?? []).length === 0 ? (
                <p className="py-4 text-sm text-gray-500">Belum ada catatan.</p>
              ) : (
                <ul className="space-y-3">
                  {(commentsQuery.data ?? []).map(comment => (
                    <li key={comment.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                        <span className="font-semibold text-slate-700">User #{comment.authorUserId}</span>
                        <span>{new Date(comment.createdAt).toLocaleString("id-ID")}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Aktivitas</CardTitle>
              <CardDescription>Riwayat tindakan pada pengajuan ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {activityQuery.isLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat aktivitas...
                </div>
              ) : (activityQuery.data ?? []).length === 0 ? (
                <p className="py-4 text-sm text-gray-500">Belum ada aktivitas.</p>
              ) : (
                <ul className="space-y-2">
                  {(activityQuery.data ?? []).map(activity => (
                    <li key={activity.id} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-b-0">
                      <span className="text-gray-700">{activity.action}</span>
                      <span className="whitespace-nowrap text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleString("id-ID")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
