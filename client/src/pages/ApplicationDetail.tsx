import { CustomerRequestsPanel } from "@/components/CustomerRequestsPanel";
import { ExitGatePanel, OverridePanel, SensitivityPanel } from "@/components/HumanReview";
import { AssessButtonWithDataCheck, DataChecksPanel } from "@/components/DataChecks";
import { AiAssessmentAssistant } from "@/components/AiAssessmentAssistant";
import { BprsWorkbookPanel } from "@/components/BprsWorkbookPanel";
import { WorkflowStatus, type DetailTab } from "@/components/WorkflowStatus";
import { DecisionDialog, type CheckerDecision } from "@/components/DecisionDialog";
import { DocumentPreviewDialog, documentUrl, type PreviewDocument } from "@/components/DocumentPreviewDialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { errorMessage } from "@/lib/errors";
import { Loader2, Shield, FileText, TrendingUp, AlertCircle, CheckCircle, Download, Upload, Camera, Sparkles, Trash2, Eye, Ban, ChevronDown, RotateCw } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

const rupiah = (value: unknown) => `Rp ${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;
const decimal = (value: unknown, digits: number) =>
  (Number(value) || 0).toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const millions = (value: number, digits: number) =>
  (value / 1_000_000).toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const ACTION_LABELS: Record<string, string> = {
  APPLICATION_CREATED: "Pengajuan dibuat",
  APPLICATION_CANCELLED: "Pengajuan dibatalkan",
  APPLICATION_APPROVED: "Pengajuan disetujui",
  APPLICATION_REJECTED: "Pengajuan ditolak",
  ASSESSMENT_CREATED: "Penilaian SSCI dibuat",
  ASSESSMENT_DELETED: "Penilaian SSCI dihapus",
  CLASSIFICATION_OVERRIDDEN: "Klasifikasi ditinjau checker",
  CLASSIFICATION_OVERRIDE_CLEARED: "Peninjauan klasifikasi dibatalkan",
  REPORT_EXPORTED: "Laporan PDF diunduh",
  NIK_REVEALED: "NIK ditampilkan",
  CUSTOMER_REQUEST_CREATED: "Permintaan nasabah diterima",
  CUSTOMER_REQUEST_RESOLVED: "Permintaan nasabah ditanggapi",
  BPRS_PROFILE_UPDATED: "Isian Format Excel BPRS disimpan",
  BPRS_EXCEL_EXPORTED: "Excel BPRS diunduh",
};

const statusLabels = { uploaded: "Menunggu verifikasi", verified: "Terverifikasi", rejected: "Ditolak" } as const;

/** Fokus tombol ikon dan tautan kustom, selaras dengan primitif Button. */
const focusRing = "rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("File tidak dapat dibaca")));
    reader.onerror = () => reject(new Error("File tidak dapat dibaca"));
    reader.readAsDataURL(file);
  });
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />
      <main className="container max-w-6xl py-16">{children}</main>
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { confirm, promptReason } = useConfirm();

  const applicationId = parseInt(id || "0") || 0;

  const { data, isLoading, isError, error, refetch, isRefetching } = trpc.assessments.getWithApplication.useQuery(
    { applicationId },
    { enabled: !!applicationId, retry: (count, err) => err.data?.code !== "NOT_FOUND" && count < 2 }
  );

  const documentsQuery = trpc.documents.listDocuments.useQuery(
    { applicationId },
    { enabled: !!applicationId }
  );

  const surveyPhotosQuery = trpc.survey.list.useQuery(
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

  // Syarat persetujuan diangkat ke halaman agar tombol Setujui dapat dikunci dari tab mana pun.
  const gateQuery = trpc.applications.exitGate.useQuery(
    { applicationId },
    { enabled: !!applicationId && data?.application?.status === "assessed" }
  );

  const [tab, setTab] = useState<DetailTab>("ringkasan");
  const [tabChosen, setTabChosen] = useState(false);
  const [justAssessed, setJustAssessed] = useState(false);
  const chooseTab = (next: DetailTab) => {
    setTab(next);
    setTabChosen(true);
  };
  // Dari panel alur kerja: pindah tab, gulir ke konten, dan pindahkan fokus agar terasa di ponsel.
  const navigateToTab = (next: DetailTab) => {
    chooseTab(next);
    window.setTimeout(() => {
      document.getElementById("detail-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelector<HTMLElement>('#detail-tabs [role="tab"][data-state="active"]')?.focus({ preventScroll: true });
    }, 30);
  };
  // Pengajuan yang belum dinilai dibuka langsung di tab dokumen, karena itu langkah berikutnya.
  useEffect(() => {
    if (tabChosen || !data?.application) return;
    setTab(!data.assessment && data.application.status === "pending" ? "data" : "ringkasan");
  }, [data, tabChosen]);
  const [commentText, setCommentText] = useState("");
  const [surveyCaption, setSurveyCaption] = useState("");
  const [analyzingPhotoId, setAnalyzingPhotoId] = useState<number | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [decision, setDecision] = useState<CheckerDecision | null>(null);
  const surveyInputRef = useRef<HTMLInputElement>(null);

  /** Menandai satu baris/aksi sedang diproses, sehingga baris lain tetap dapat dipakai. */
  const runBusy = async (key: string, task: () => Promise<unknown>) => {
    setBusy(prev => ({ ...prev, [key]: true }));
    try {
      await task();
      return true;
    } catch {
      // Pesan error sudah ditampilkan oleh onError mutasi.
      return false;
    } finally {
      setBusy(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const refreshProgress = async () => {
    await Promise.all([
      utils.applications.workflow.invalidate({ applicationId }),
      utils.applications.exitGate.invalidate({ applicationId }),
      utils.applications.listActivity.invalidate({ applicationId }),
    ]);
  };

  const uploadPhotoMutation = trpc.survey.uploadPhoto.useMutation({
    onSuccess: async () => {
      setSurveyCaption("");
      await surveyPhotosQuery.refetch();
      await refreshProgress();
      toast.success("Foto survei berhasil diunggah");
    },
    onError: error => toast.error(errorMessage(error, "Gagal mengunggah foto survei.")),
  });

  const analyzeMutation = trpc.survey.analyze.useMutation({
    onMutate: ({ photoId }) => setAnalyzingPhotoId(photoId),
    onSettled: async () => {
      setAnalyzingPhotoId(null);
      await surveyPhotosQuery.refetch();
    },
    onSuccess: () => toast.success("Analisis AI selesai"),
    onError: error => toast.error(errorMessage(error, "Gagal menganalisis foto.")),
  });

  const deletePhotoMutation = trpc.survey.deletePhoto.useMutation({
    onSuccess: async () => {
      await surveyPhotosQuery.refetch();
      await refreshProgress();
      toast.success("Foto survei berhasil dihapus");
    },
    onError: error => toast.error(errorMessage(error, "Gagal menghapus foto.")),
  });

  const handleDeletePhoto = async (photoId: number, caption?: string | null) => {
    const ok = await confirm({
      title: "Hapus foto survei?",
      description: caption ? `Foto "${caption}" dan hasil analisisnya akan dihapus permanen.` : "Foto ini dan hasil analisisnya akan dihapus permanen.",
      confirmLabel: "Ya, hapus foto",
      cancelLabel: "Kembali",
      destructive: true,
    });
    if (!ok) return;
    await runBusy(`photo-delete:${photoId}`, () => deletePhotoMutation.mutateAsync({ photoId }));
  };

  const handleSurveyPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Format foto harus JPG atau PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5MB");
      return;
    }
    await runBusy("photo-upload", async () => {
      let dataUrl: string;
      try {
        dataUrl = await readDataUrl(file);
      } catch {
        toast.error("Foto tidak dapat dibaca");
        return;
      }
      await uploadPhotoMutation.mutateAsync({
        applicationId,
        contentType: file.type as "image/jpeg" | "image/png",
        data: dataUrl,
        caption: surveyCaption.trim() || undefined,
      });
    });
  };

  const addCommentMutation = trpc.applications.addComment.useMutation({
    onSuccess: async () => {
      setCommentText("");
      await commentsQuery.refetch();
      toast.success("Catatan berhasil ditambahkan");
    },
    onError: error => toast.error(errorMessage(error, "Gagal menambahkan catatan.")),
  });

  const handleAddComment = () => {
    const content = commentText.trim();
    if (!content) {
      toast.error("Catatan tidak boleh kosong");
      return;
    }
    if (addCommentMutation.isPending) return;
    addCommentMutation.mutate({ applicationId, content });
  };

  const uploadMutation = trpc.documents.uploadDocument.useMutation({
    onSuccess: async () => {
      await documentsQuery.refetch();
      await refreshProgress();
      toast.success("Dokumen berhasil diunggah");
    },
    onError: error => toast.error(errorMessage(error, "Gagal mengunggah dokumen.")),
  });

  const verifyMutation = trpc.documents.verifyDocument.useMutation({
    onSuccess: async (_data, variables) => {
      await documentsQuery.refetch();
      await refreshProgress();
      toast.success(variables.status === "verified" ? "Dokumen terverifikasi" : "Dokumen ditolak dan pengunggah diberi tahu");
    },
    onError: error => toast.error(errorMessage(error, "Gagal memperbarui status dokumen.")),
  });

  const uploadDocument = async (documentType: string, file?: File, replacingVerified = false) => {
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
    if (replacingVerified) {
      const ok = await confirm({
        title: `Ganti dokumen ${documentType} yang sudah terverifikasi?`,
        description: "Dokumen ini sudah diverifikasi checker. Mengganti file membuat statusnya kembali menunggu verifikasi, dan kelengkapan pengajuan akan turun sampai diverifikasi ulang.",
        confirmLabel: "Ya, ganti file",
        cancelLabel: "Kembali",
      });
      if (!ok) return;
    }
    await runBusy(`upload:${documentType}`, async () => {
      let dataUrl: string;
      try {
        dataUrl = await readDataUrl(file);
      } catch {
        toast.error("Dokumen tidak dapat dibaca");
        return;
      }
      await uploadMutation.mutateAsync({ applicationId, documentType: documentType as any, originalName: file.name, contentType: file.type as typeof contentTypes[number], data: dataUrl });
    });
  };

  const verifyDocument = (doc: { id: number }) =>
    runBusy(`verify:${doc.id}`, () => verifyMutation.mutateAsync({ id: doc.id, status: "verified" }));

  const rejectDocument = async (doc: { id: number; documentType: string; originalName: string }) => {
    const reason = await promptReason({
      title: `Tolak dokumen ${doc.documentType}?`,
      description: <>File <span className="break-all font-medium">{doc.originalName}</span> akan ditandai ditolak. Alasan ini dikirim ke pengunggah dan dicatat di audit.</>,
      label: `Alasan penolakan dokumen ${doc.documentType}`,
      placeholder: "Contoh: Foto KTP buram, NIK tidak terbaca. Mohon unggah ulang dengan pencahayaan cukup.",
      minLength: 5,
      confirmLabel: "Tolak dokumen",
      cancelLabel: "Kembali",
      destructive: true,
    });
    if (!reason) return false;
    return runBusy(`reject:${doc.id}`, () => verifyMutation.mutateAsync({ id: doc.id, status: "rejected", reason }));
  };

  const [revealedNik, setRevealedNik] = useState<string | null>(null);
  const revealNikMutation = trpc.applications.revealNik.useMutation({
    onSuccess: async data => {
      setRevealedNik(data.customerId);
      await utils.applications.listActivity.invalidate({ applicationId });
    },
    onError: error => toast.error(errorMessage(error, "NIK tidak dapat ditampilkan.")),
  });

  const assessMutation = trpc.applications.assess.useMutation({
    onSuccess: async data => {
      await utils.assessments.getWithApplication.invalidate({ applicationId });
      await utils.aiAssist.ruleCheck.invalidate({ applicationId });
      await refreshProgress();
      setJustAssessed(true);
      setTab("ringkasan");
      if (data.result.recommendationStatus === "rule_fallback") {
        toast.warning("Skor selesai. Narasi AI tidak tersedia; rekomendasi aturan digunakan.");
      } else {
        toast.success("Penilaian dan narasi pendukung berhasil dibuat");
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Gagal melakukan penilaian."));
    },
  });

  const decideMutation = trpc.applications.decide.useMutation({
    onSuccess: async () => {
      await utils.assessments.getWithApplication.invalidate({ applicationId });
      await refreshProgress();
      await utils.applications.listComments.invalidate({ applicationId });
      toast.success("Keputusan checker berhasil disimpan");
    },
  });

  const openDecision = (next: CheckerDecision) => {
    decideMutation.reset();
    setDecision(next);
    if (data?.application?.status === "assessed") void gateQuery.refetch();
  };

  const submitDecision = async (value: CheckerDecision, notes: string) => {
    try {
      await decideMutation.mutateAsync({ applicationId, decision: value, notes });
      setDecision(null);
      return true;
    } catch {
      // Dialog tetap terbuka; error ditampilkan di dalam dialog dan catatan tidak hilang.
      await gateQuery.refetch();
      return false;
    }
  };

  const cancelMutation = trpc.applications.cancel.useMutation({
    onSuccess: async () => {
      await utils.assessments.getWithApplication.invalidate({ applicationId });
      await refreshProgress();
      toast.success("Pengajuan berhasil dibatalkan");
    },
    onError: error => toast.error(errorMessage(error, "Gagal membatalkan pengajuan.")),
  });

  const handleCancel = async () => {
    if (cancelMutation.isPending) return;
    const reason = await promptReason({
      title: "Batalkan pengajuan ini?",
      description: "Pengajuan yang dibatalkan tidak dapat dilanjutkan atau dipulihkan. Nasabah akan melihat status Dibatalkan di halaman Lacak Pengajuan.",
      label: "Alasan pembatalan",
      required: false,
      maxLength: 500,
      placeholder: "Contoh: Nasabah mengundurkan diri karena sudah mendapat pembiayaan di tempat lain.",
      confirmLabel: "Ya, batalkan pengajuan",
      cancelLabel: "Kembali",
      destructive: true,
    });
    if (reason === null) return;
    cancelMutation.mutate({ applicationId, reason: reason || undefined });
  };

  const exportReport = trpc.assessments.exportReport.useMutation({
    onSuccess: result => {
      const byteCharacters = atob(result.pdf);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename.replace(/\.html$/i, ".pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      void utils.applications.listActivity.invalidate({ applicationId });
      toast.success("Laporan PDF berhasil diunduh.");
    },
    onError: error => toast.error(errorMessage(error, "Gagal menyiapkan laporan PDF.")),
  });

  const handleExportPDF = () => {
    if (exportReport.isPending) return;
    exportReport.mutate({ applicationId });
  };

  if (!applicationId) {
    return <NotFoundState />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ivory">
        <AppHeader />
        <main className="container max-w-6xl py-8">
          <div role="status" aria-live="polite" className="space-y-4">
            <span className="sr-only">Memuat pengajuan...</span>
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-navy-50" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-navy-50" />
            <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
            <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
          </div>
        </main>
      </div>
    );
  }

  if (isError && error?.data?.code === "NOT_FOUND") {
    return <NotFoundState />;
  }

  if (isError || !data) {
    return (
      <PageShell>
        <div role="alert" className="mx-auto max-w-lg text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-700" aria-hidden="true" />
          <h1 className="font-serif text-2xl text-navy-900">Pengajuan tidak dapat dimuat</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage(error)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => refetch()} disabled={isRefetching}>
              {isRefetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />}
              Coba lagi
            </Button>
            <Button variant="outline" asChild><Link href="/dashboard">Kembali ke daftar</Link></Button>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!data.application) {
    return <NotFoundState />;
  }

  const { application, assessment } = data;
  const canVerifyDocuments = user?.role === "checker" || user?.role === "admin";
  const canUpload = application.status !== "cancelled";
  const isOwnWork = !!user && (application.submittedBy === user.id || assessment?.assessedBy === user.id);
  const isChecker = user?.role === "checker" || user?.role === "admin";
  const canDecide = !!assessment && application.status === "assessed" && isChecker && !isOwnWork;
  const gate = gateQuery.data;
  const approveBlocked = !gate?.passed;
  const appLegalDocs = Array.isArray(data?.application?.legalDocuments)
    ? (data.application.legalDocuments as Array<{ type: string }>).map(d => d.type)
    : [];
  const documentTypes = Array.from(new Set(["KTP", "NPWP", "NIB", ...appLegalDocs]));
  const ticket = `SSCI-${application.id.toString().padStart(5, "0")}`;
  const activeClassification = assessment ? assessment.overrideClassification ?? assessment.classification : "";
  const previewDocument = previewId != null ? (documentsQuery.data ?? []).find(d => d.id === previewId) ?? null : null;
  const tenor = Number(application.financingTenor) || 0;

  const getClassificationBadge = (classification: string) => {
    const badges = {
      "Sangat Layak": <Badge className="score-excellent">Sangat Layak</Badge>,
      "Layak": <Badge className="score-good">Layak</Badge>,
      "Perlu Pengawasan": <Badge className="score-warning">Perlu Pengawasan</Badge>,
      "Tidak Layak": <Badge className="score-poor">Tidak Layak</Badge>,
    };
    return badges[classification as keyof typeof badges] || <Badge>{classification}</Badge>;
  };

  const kpbFlagged = !!data.bprsEvaluation && (
    data.bprsEvaluation.isRelatedParty || data.bprsEvaluation.needsComplianceOpinion || data.bprsEvaluation.needsLegalOpinion || !data.bprsEvaluation.isDsrCompliant
  );

  const exportButtonContent = (
    <>
      {exportReport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
      {exportReport.isPending ? "Menyiapkan PDF..." : "Unduh Laporan"}
    </>
  );

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />

      <main className="container py-8 max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words font-serif text-3xl font-medium text-navy-900 sm:text-4xl">{application.customerName}</h1>
              <span className="whitespace-nowrap rounded-full border border-gold-400/60 bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-navy-900">
                Tiket: {ticket}
              </span>
            </div>
            <p className="mt-1 break-words text-muted-foreground">{application.businessName}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-3 sm:justify-end">
              {assessment && (
                <Button variant="outline" onClick={handleExportPDF} disabled={exportReport.isPending} aria-busy={exportReport.isPending}>
                  {exportButtonContent}
                </Button>
              )}
              {assessment && application.status === "assessed" && isChecker && isOwnWork && (
                <span className="max-w-xs self-center text-xs text-muted-foreground">
                  Anda membuat atau menilai pengajuan ini. Keputusan harus diambil checker lain (pemisahan maker-checker).
                </span>
              )}
              {canDecide && (
                <>
                  <Button
                    variant="destructive"
                    disabled={decideMutation.isPending}
                    onClick={() => openDecision("rejected")}
                  >
                    Tolak
                  </Button>
                  <Button
                    disabled={decideMutation.isPending || approveBlocked}
                    aria-describedby="gate-hint"
                    onClick={() => openDecision("approved")}
                  >
                    {gateQuery.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Setujui
                  </Button>
                </>
              )}
              {!assessment && application.status !== "cancelled" && (
                <AssessButtonWithDataCheck
                  applicationId={applicationId}
                  pending={assessMutation.isPending}
                  onAssess={acknowledgement => {
                    if (assessMutation.isPending) return;
                    assessMutation.mutate({ applicationId, dataCheckAcknowledgement: acknowledgement });
                  }}
                />
              )}
              {application.status === "pending" && (user?.role === "maker" || user?.role === "admin") && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Ban className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {cancelMutation.isPending ? "Membatalkan..." : "Batalkan pengajuan"}
                </Button>
              )}
            </div>
            {canDecide && (
              <p id="gate-hint" className="max-w-md text-xs sm:text-right" aria-live="polite">
                {gateQuery.isLoading ? (
                  <span className="text-muted-foreground">Memeriksa syarat persetujuan...</span>
                ) : gateQuery.isError ? (
                  <span className="text-amber-800">
                    Syarat persetujuan tidak dapat dimuat, sehingga Setujui dikunci.{" "}
                    <button type="button" className={`font-semibold underline pointer-coarse:min-h-11 ${focusRing}`} onClick={() => gateQuery.refetch()}>Coba lagi</button>
                  </span>
                ) : gate && !gate.passed ? (
                  <span className="text-amber-800">Belum bisa disetujui: {gate.items.filter(i => !i.ok).map(i => i.label).join(", ")}.</span>
                ) : null}
              </p>
            )}
          </div>
        </div>

        <WorkflowStatus
          applicationId={application.id}
          status={application.status}
          role={user?.role}
          isOwnWork={isOwnWork}
          onNavigate={navigateToTab}
        />

        <Tabs id="detail-tabs" className="scroll-mt-20" value={tab} onValueChange={value => chooseTab(value as DetailTab)}>
          <TabsList className="mb-6 w-full justify-start" aria-label="Bagian detail pengajuan">
            <TabsTrigger value="ringkasan" className="flex-none sm:flex-1">Ringkasan</TabsTrigger>
            <TabsTrigger value="data" className="flex-none sm:flex-1">Data & Dokumen</TabsTrigger>
            <TabsTrigger value="penilaian" className="flex-none sm:flex-1">Analisis lanjutan</TabsTrigger>
            <TabsTrigger value="bprs" className="flex-none sm:flex-1">Format Excel BPRS</TabsTrigger>
            <TabsTrigger value="riwayat" className="flex-none sm:flex-1">Riwayat</TabsTrigger>
          </TabsList>

          {/* forceMount: isian dan hasil AI di tab tidak aktif tetap tersimpan saat berpindah tab. */}
          <TabsContent value="ringkasan" forceMount className="data-[state=inactive]:hidden">
        <div className="mb-6 empty:hidden">
          <CustomerRequestsPanel applicationId={application.id} />
        </div>

          {application.status === "cancelled" && (
            <Card className="mb-6 border-rose-200 bg-rose-50" role="status">
              <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-rose-900">
                  <Ban className="h-5 w-5" aria-hidden="true" />Pengajuan dibatalkan
                </CardTitle>
                <CardDescription className="text-rose-900">
                  Pengajuan ini tidak dapat dinilai atau diputuskan lagi.
                </CardDescription>
              </CardHeader>
              {application.decisionNotes && <CardContent className="text-sm text-rose-900"><span className="font-semibold">Alasan: </span>{application.decisionNotes}</CardContent>}
            </Card>
          )}

           {(application.status === "approved" || application.status === "rejected") && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle as="h2">Keputusan Checker</CardTitle>
                <CardDescription>
                  Status: {application.status === "approved" ? "Disetujui" : "Ditolak"}
                </CardDescription>
              </CardHeader>
              <CardContent className="whitespace-pre-line break-words text-sm">{application.decisionNotes}</CardContent>
            </Card>
          )}

        {application.status === "assessed" && <div className="mb-6"><ExitGatePanel applicationId={application.id} /></div>}

        {assessment && (
          <Card className="mb-6 border-2 border-primary">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                   <CardTitle as="h2" className="text-2xl">Hasil Penilaian Berbasis Aturan SSCI</CardTitle>
                   <CardDescription>Rekomendasi pendukung, bukan keputusan pembiayaan final</CardDescription>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  {getClassificationBadge(activeClassification)}
                  {assessment.overrideClassification && <span className="text-xs text-muted-foreground">Ditinjau checker (sistem: {assessment.classification})</span>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-8 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
                <div className="relative mx-auto flex flex-col items-center rounded-2xl bg-navy-900 px-8 py-6 text-white shadow-premium-lg">
                  <div className="pattern-islamic pointer-events-none absolute inset-0 rounded-2xl opacity-[0.05]" />
                  <ScoreRing value={Number(assessment.totalScore)} />
                  <div className="relative mt-3 text-xs font-bold uppercase tracking-[.18em] text-gold-300">Total Skor SSCI</div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Keuangan berkelanjutan", value: Number(assessment.sustainableFinanceScore), max: 55, bar: "bg-royal-600" },
                    { label: "Kepatuhan syariah", value: Number(assessment.shariaScore), max: 25, bar: "bg-gold-400" },
                    { label: "Legalitas", value: Number(assessment.legalScore), max: 20, bar: "bg-navy-700" },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-baseline justify-between text-sm">
                        <span className="font-medium text-navy-900">{item.label}</span>
                        <span className="text-muted-foreground"><span className="font-serif text-lg text-navy-900">{decimal(item.value, 1)}</span> / {item.max}</span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-navy-50"
                        role="progressbar"
                        aria-label={item.label}
                        aria-valuemin={0}
                        aria-valuemax={item.max}
                        aria-valuenow={Number(item.value.toFixed(1))}
                        aria-valuetext={`${decimal(item.value, 1)} dari ${item.max}`}
                      >
                        <div className={`h-full rounded-full ${item.bar} transition-all duration-700`} style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-navy-900">Kekuatan</h3>
                    <p className="text-sm text-muted-foreground">{assessment.strengths}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-navy-900">Faktor Risiko</h3>
                    <p className="text-sm text-muted-foreground">{assessment.riskFactors}</p>
                  </div>
                </div>
              </div>

              <DataChecksPanel dataChecks={assessment.dataChecks} />

              <div className="mt-4 rounded-lg bg-navy-100 p-4">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-royal-600" aria-hidden="true" />
                  <div className="min-w-0">
                     <h3 className="font-semibold text-navy-900">
                       {assessment.recommendationStatus === "generated"
                         ? "Narasi Pendukung AI"
                         : "Rekomendasi Berbasis Aturan"}
                     </h3>
                     <p className="mt-1 text-sm text-navy-800">{assessment.recommendations}</p>
                   </div>
                 </div>
               </div>

               {assessment.recommendedPlafon && (
                 <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                   <div className="flex items-start gap-2 mb-3">
                     <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                     <div>
                       <h3 className="font-semibold text-amber-900">Rekomendasi Plafon Otomatis</h3>
                       <p className="text-xs text-amber-800 mt-0.5">Plafon ini adalah rekomendasi otomatis dan bersifat indikatif. Keputusan final plafon tetap pada komite BPRS.</p>
                     </div>
                   </div>
                   <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                     <div className="bg-white rounded p-2">
                       <dd className="text-xl font-bold text-amber-900">Rp {millions(Number(assessment.recommendedPlafon), 0)}<span className="text-sm"> jt</span></dd>
                       <dt className="text-xs text-muted-foreground">Plafon Rekomendasi</dt>
                     </div>
                     <div className="bg-white rounded p-2">
                       <dd className="text-lg font-semibold text-navy-900">
                         {tenor > 0
                           ? <>Rp {millions(Number(assessment.recommendedPlafon) * (1 + Number(application.marginRate) / 100) / tenor, 1)}<span className="text-xs"> jt/bln</span></>
                           : "-"}
                       </dd>
                       <dt className="text-xs text-muted-foreground">Cicilan Estimasi</dt>
                     </div>
                     <div className="bg-white rounded p-2">
                       <dd className="text-lg font-semibold text-navy-900">{decimal(assessment.dscrRatio, 2)}x</dd>
                       <dt className="text-xs text-muted-foreground">DSCR (target 1,25)</dt>
                     </div>
                     <div className="bg-white rounded p-2">
                       <dd className="text-lg font-semibold text-navy-900">{decimal(assessment.ltvRatio, 1)}%</dd>
                       <dt className="text-xs text-muted-foreground">LTV (maks 80%)</dt>
                     </div>
                   </dl>
                   <div className="mt-2 text-xs text-amber-800">
                     Asumsi: tenor {application.financingTenor} bulan, margin {decimal(application.marginRate, 2)}%
                   </div>
                 </div>
               )}

               {data.bprsEvaluation && (
                 <details className="group mt-4 rounded-lg border border-border bg-white" open={kpbFlagged}>
                   <summary className={`flex cursor-pointer list-none items-center gap-2 p-4 pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden ${focusRing}`}>
                     <Shield className="h-5 w-5 shrink-0 text-royal-600" aria-hidden="true" />
                     <div className="min-w-0 flex-1">
                       <h3 className="font-semibold text-navy-900">Kesesuaian Pedoman Kebijakan Pembiayaan BPRS</h3>
                       <p className="text-xs text-muted-foreground">
                         Evaluasi otomatis berdasarkan Pedoman Kebijakan Pembiayaan BPRS (KPB 2025).
                         {" "}{kpbFlagged ? "Ada butir yang perlu perhatian." : "Tidak ada butir yang perlu perhatian."}
                       </p>
                     </div>
                     <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                   </summary>

                   <div className="px-4 pb-4">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                     <div className="rounded border border-border bg-ivory p-3">
                       <div className="text-xs font-medium text-muted-foreground">Kapasitas Angsuran (DSR)</div>
                       <div className="flex items-baseline gap-2 mt-1">
                         <span className={`text-xl font-bold ${data.bprsEvaluation.isDsrCompliant ? "text-emerald-700" : "text-rose-700"}`}>
                           {data.bprsEvaluation.dsrRatio}%
                         </span>
                         <span className="text-xs text-muted-foreground">(Maks 40%)</span>
                       </div>
                       <div className="mt-1 flex items-center gap-1.5 text-xs text-navy-900">
                         {data.bprsEvaluation.isDsrCompliant
                           ? <><CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />Sesuai batas DSR maksimal 40%</>
                           : <><AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />Melebihi batas maksimal 40%</>}
                       </div>
                     </div>

                     <div className="rounded border border-border bg-ivory p-3">
                       <div className="text-xs font-medium text-muted-foreground">Kewenangan Memutus</div>
                       <div className="mt-1 text-sm font-bold text-navy-900">
                         {data.bprsEvaluation.approvalAuthority.roleTitle}
                       </div>
                       <div className="mt-0.5 text-xs text-muted-foreground">
                         {data.bprsEvaluation.approvalAuthority.description}
                       </div>
                       <div className="mt-1 text-xs font-medium text-amber-800">
                         {data.bprsEvaluation.approvalAuthority.subordinateApprovalRequired}
                       </div>
                     </div>

                     <div className="rounded border border-border bg-ivory p-3">
                       <div className="text-xs font-medium text-muted-foreground">Ketentuan Taksasi Agunan</div>
                       <div className="mt-1 text-sm font-bold text-navy-900">
                         {data.bprsEvaluation.appraisalRequirement.label}
                       </div>
                       <div className="mt-0.5 text-xs text-muted-foreground">
                         {data.bprsEvaluation.appraisalRequirement.type === "KJPP_EKSTERNAL"
                           ? "Wajib Kantor Jasa Penilai Publik (Plafon >= Rp 500 Juta)"
                           : "Cukup taksasi oleh petugas intern BPRS (Plafon < Rp 500 Juta)"}
                       </div>
                     </div>
                   </div>

                   <div className="space-y-2 text-xs">
                     {data.bprsEvaluation.isRelatedParty && (
                       <div className="p-2.5 rounded border bg-rose-50 border-rose-200 text-rose-900 flex items-start gap-2">
                         <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                         <div>
                           <span className="font-bold">PERHATIAN PIHAK TERKAIT: </span>
                           <span>{data.bprsEvaluation.relatedPartyNote}</span>
                         </div>
                       </div>
                     )}
                     <div className={`p-2 rounded border flex flex-wrap items-start gap-x-2 ${data.bprsEvaluation.needsComplianceOpinion ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-white border-border text-muted-foreground"}`}>
                       <span className="font-semibold">Opini Kepatuhan & MR:</span>
                       <span>{data.bprsEvaluation.complianceOpinionNote}</span>
                     </div>
                     <div className={`p-2 rounded border flex flex-wrap items-start gap-x-2 ${data.bprsEvaluation.needsLegalOpinion ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-white border-border text-muted-foreground"}`}>
                       <span className="font-semibold">Opini Legal:</span>
                       <span>{data.bprsEvaluation.legalOpinionNote}</span>
                     </div>
                     {(data.bprsEvaluation.isRelatedParty || data.bprsEvaluation.needsComplianceOpinion || data.bprsEvaluation.needsLegalOpinion || Number(application.requestedAmount) >= 25_000_000) && (
                       <div className="flex flex-col gap-2 rounded border border-navy-200 bg-navy-100 p-2 text-navy-800 sm:flex-row sm:items-center sm:justify-between">
                         <span className="flex items-start gap-1.5 font-medium">
                           <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                           PDF Laporan mencakup Lembar Lampiran Disposisi Komite Pembiayaan & Kolom Opini Kepatuhan/Legal otomatis.
                         </span>
                         <Button variant="outline" className="shrink-0 bg-white" onClick={handleExportPDF} disabled={exportReport.isPending} aria-busy={exportReport.isPending}>
                           {exportReport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
                           {exportReport.isPending ? "Menyiapkan PDF..." : "Unduh PDF Lengkap"}
                         </Button>
                       </div>
                     )}
                   </div>
                   </div>
                 </details>
               )}

              <div className="mt-4 border-t pt-4 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
                <span>Versi aturan: {assessment.modelVersion}</span>
                <span>
                  Model narasi: {assessment.recommendationModel || "Fallback aturan"}
                </span>
                <span>
                  Dinilai: {new Date(assessment.assessedAt).toLocaleString("id-ID")}
                </span>
                <span>Kelengkapan data: {decimal(assessment.confidence, 0)}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!assessment && application.status !== "cancelled" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle as="h2">Belum dinilai</CardTitle>
              <CardDescription>Skor SSCI, ringkasan komite, dan pemeriksaan AI muncul di sini setelah penilaian. Lengkapi dokumen di tab Data & Dokumen, lalu tekan "Lakukan Penilaian SSCI".</CardDescription>
            </CardHeader>
          </Card>
        )}

        {assessment && (
          <div className="mb-6">
            <AiAssessmentAssistant applicationId={application.id} autoRun={justAssessed} />
          </div>
        )}
          </TabsContent>

          <TabsContent value="data" forceMount className="data-[state=inactive]:hidden">
         <div className="grid md:grid-cols-2 gap-6">
           <Card className="md:col-span-2">
             <CardHeader>
               <CardTitle as="h2">Dokumen</CardTitle>
               <CardDescription>Unggah PDF, JPG, atau PNG dengan ukuran maksimal 5MB. Pilih nama file untuk melihat isinya.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               {documentsQuery.isError && (
                 <p role="alert" className="text-sm text-rose-700">
                   Daftar dokumen tidak dapat dimuat.{" "}
                   <button type="button" className={`font-semibold underline pointer-coarse:min-h-11 ${focusRing}`} onClick={() => documentsQuery.refetch()}>Coba lagi</button>
                 </p>
               )}
               {documentTypes.map(documentType => {
                 const doc = documentsQuery.data?.find(item => item.documentType === documentType);
                 return (
                   <DocumentRow
                     key={documentType}
                     documentType={documentType}
                     doc={doc}
                     canUpload={canUpload}
                     canVerify={canVerifyDocuments}
                     uploading={!!busy[`upload:${documentType}`]}
                     verifying={!!doc && !!busy[`verify:${doc.id}`]}
                     rejecting={!!doc && !!busy[`reject:${doc.id}`]}
                     onSelectFile={file => uploadDocument(documentType, file, doc?.status === "verified")}
                     onPreview={() => doc && setPreviewId(doc.id)}
                     onVerify={() => doc && verifyDocument(doc)}
                     onReject={() => doc && rejectDocument(doc)}
                   />
                 );
               })}
             </CardContent>
           </Card>
           <Card className="md:col-span-2">
             <CardHeader>
               <CardTitle as="h2">Survei Lapangan</CardTitle>
               <CardDescription>Unggah foto survei lokasi usaha (JPG/PNG, maks 5MB) untuk dianalisis AI.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="space-y-3 rounded-lg border p-4">
                 <div className="space-y-1.5">
                   <Label htmlFor="survey-caption">Keterangan foto (opsional)</Label>
                   <Input
                     id="survey-caption"
                     value={surveyCaption}
                     onChange={event => setSurveyCaption(event.target.value)}
                     placeholder="Contoh: Tampak depan warung, stok etalase"
                     maxLength={255}
                   />
                 </div>
                 <Button
                   type="button"
                   disabled={!!busy["photo-upload"]}
                   onClick={() => surveyInputRef.current?.click()}
                 >
                   {busy["photo-upload"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="mr-2 h-4 w-4" aria-hidden="true" />}
                   {busy["photo-upload"] ? "Mengunggah..." : "Unggah Foto"}
                 </Button>
                 <input ref={surveyInputRef} hidden type="file" accept="image/jpeg,image/png" aria-label="Pilih foto survei" onChange={handleSurveyPhotoChange} />
               </div>

               {surveyPhotosQuery.isLoading ? (
                 <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                   <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                   Memuat foto survei...
                 </div>
               ) : surveyPhotosQuery.isError ? (
                 <p role="alert" className="py-4 text-sm text-rose-700">
                   Foto survei tidak dapat dimuat.{" "}
                   <button type="button" className={`font-semibold underline pointer-coarse:min-h-11 ${focusRing}`} onClick={() => surveyPhotosQuery.refetch()}>Coba lagi</button>
                 </p>
               ) : (surveyPhotosQuery.data ?? []).length === 0 ? (
                 <p className="py-4 text-sm text-muted-foreground">Belum ada foto survei.</p>
               ) : (
                 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                   {(surveyPhotosQuery.data ?? []).map(photo => {
                     const deleting = !!busy[`photo-delete:${photo.id}`];
                     const analyzing = analyzingPhotoId === photo.id;
                     return (
                      <div key={photo.id} className="space-y-2 rounded-lg border p-3">
                        <div className="relative">
                          <img
                            src={`/uploads/${photo.storedName}`}
                            alt={photo.caption || "Foto survei"}
                            loading="lazy"
                            className="h-40 w-full rounded-md object-cover bg-muted"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute right-2 top-2 size-11 shadow-md"
                            aria-label={`Hapus foto survei${photo.caption ? ` ${photo.caption}` : ""}`}
                            title="Hapus foto"
                            disabled={deleting}
                            onClick={() => handleDeletePhoto(photo.id, photo.caption)}
                          >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                          </Button>
                        </div>
                        {photo.caption && <p className="break-words text-sm text-navy-900">{photo.caption}</p>}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>{new Date(photo.createdAt).toLocaleString("id-ID")}</span>
                          <Badge variant={photo.status === "failed" ? "destructive" : photo.status === "analyzed" ? "default" : "secondary"}>
                            {photo.status === "uploaded" ? "Belum dianalisis" : photo.status === "analyzed" ? "Dianalisis AI" : "Analisis gagal"}
                          </Badge>
                        </div>
                       {(photo.status === "uploaded" || photo.status === "failed") && (
                         <div className="space-y-1" aria-live="polite">
                           {photo.status === "failed" && (
                             <p className="text-xs text-destructive">Analisis AI gagal. Coba analisis ulang beberapa saat lagi.</p>
                           )}
                           <Button
                             size="sm"
                             variant={photo.status === "failed" ? "outline" : "default"}
                             disabled={analyzingPhotoId !== null}
                             onClick={() => analyzeMutation.mutate({ photoId: photo.id })}
                           >
                             {analyzing ? (
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                             ) : photo.status === "failed" ? (
                               <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
                             ) : (
                               <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                             )}
                             {analyzing ? "Menganalisis..." : photo.status === "failed" ? "Analisis ulang" : "Analisis AI"}
                           </Button>
                         </div>
                       )}
                       {photo.status === "analyzed" && photo.analysisResult && (
                         <SurveyAnalysisBlock result={photo.analysisResult} />
                       )}
                     </div>
                     );
                   })}
                 </div>
               )}
             </CardContent>
           </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Informasi Nasabah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-2">
                <span aria-live="polite"><span className="font-semibold">NIK:</span> {revealedNik ?? application.customerId}</span>
                {!revealedNik && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0 py-1 text-royal-600"
                    disabled={revealNikMutation.isPending}
                    onClick={() => revealNikMutation.mutate({ applicationId })}
                  >
                    {revealNikMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Tampilkan NIK lengkap (tercatat di audit)
                  </Button>
                )}
              </div>
              <div><span className="font-semibold">Telepon:</span> {application.phone}</div>
              <div className="break-words"><span className="font-semibold">Email:</span> <span className="break-all">{application.email || "-"}</span></div>
              <div className="break-words"><span className="font-semibold">Alamat:</span> {application.address}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Informasi Usaha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-semibold">Jenis:</span> {application.businessType}</div>
              <div><span className="font-semibold">Lama Usaha:</span> {application.businessAge} bulan</div>
              <div><span className="font-semibold">Kepatuhan Syariah:</span> {application.businessShariaCompliant}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Data Keuangan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {application.financialDataNote && (
                <div className="rounded-lg bg-ivory p-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-navy-900">Sumber angka: </span>{application.financialDataNote}
                </div>
              )}
              <div><span className="font-semibold">Pendapatan:</span> {rupiah(application.monthlyRevenue)}</div>
              <div><span className="font-semibold">Pengeluaran:</span> {rupiah(application.monthlyExpenses)}</div>
               <div><span className="font-semibold">Angsuran existing/bulan:</span> {rupiah(application.existingDebt)}</div>
              <div><span className="font-semibold">Agunan:</span> {rupiah(application.collateralValue)}</div>
               <div><span className="font-semibold">Pembiayaan Diajukan:</span> {rupiah(application.requestedAmount)}</div>
               <div><span className="font-semibold">Tenor:</span> {application.financingTenor} bulan</div>
               <div><span className="font-semibold">Total margin / ujrah:</span> {decimal(application.marginRate, 2)}%</div>
               <div><span className="font-semibold">Skema Akad:</span> <span className="uppercase font-medium text-primary">{application.financingAkad || "murabahah"}</span></div>
               {application.financingAkad === "multijasa" && (
                 <div className="mt-2 space-y-1 rounded border border-navy-50 bg-navy-100 p-2.5 text-xs">
                   <div className="font-semibold text-navy-900">Rincian Ijarah Multijasa:</div>
                   <div>Penyedia Jasa: {application.multijasaServiceProvider || "-"}</div>
                   <div>Objek Jasa: {application.multijasaSourceObject || "-"}</div>
                   <div>Nilai Jasa: {rupiah(application.multijasaServiceCost || 0)}</div>
                   <div>Uang Muka (Hamish Jiddiyyah): {rupiah(application.multijasaDownPayment || 0)}</div>
                   <div>Ujrah Nominal: {rupiah(application.multijasaUjrahAmount || 0)}</div>
                 </div>
               )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Tujuan Pembiayaan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="break-words text-sm">{application.loanPurpose}</p>
            </CardContent>
          </Card>
        </div>
          </TabsContent>

          <TabsContent value="penilaian" forceMount className="data-[state=inactive]:hidden">
        {assessment ? (
          <div className="mb-6 grid gap-6">
            <OverridePanel
              applicationId={application.id}
              assessment={assessment}
              canReview={application.status === "assessed" && isChecker && !isOwnWork}
              blockedReason={
                application.status !== "assessed"
                  ? "Peninjauan hanya dapat dilakukan setelah penilaian dan sebelum keputusan."
                  : isOwnWork
                    ? "Anda membuat atau menilai pengajuan ini, sehingga peninjauan harus dilakukan checker lain."
                    : user?.role === "maker"
                      ? "Peninjauan dilakukan oleh checker atau admin."
                      : undefined
              }
            />
            <SensitivityPanel applicationId={application.id} />
          </div>
        ) : (
          <p className="mb-6 text-sm text-muted-foreground">Peninjauan klasifikasi dan uji sensitivitas tersedia setelah penilaian SSCI.</p>
        )}
        {!assessment && (
          <div className="mb-6">
            <AiAssessmentAssistant applicationId={application.id} />
          </div>
        )}
          </TabsContent>

          <TabsContent value="bprs" forceMount className="data-[state=inactive]:hidden">
        <div className="mb-6">
          <BprsWorkbookPanel
            applicationId={application.id}
            canEdit={user?.role === "maker" || user?.role === "admin"}
            ssciScore={assessment ? { totalScore: Number(assessment.totalScore), classification: activeClassification } : null}
          />
        </div>
          </TabsContent>

          <TabsContent value="riwayat" forceMount className="data-[state=inactive]:hidden">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle as="h2">Catatan</CardTitle>
              <CardDescription>Catatan kolaborasi antar analis dan checker pada pengajuan ini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                onSubmit={event => {
                  event.preventDefault();
                  handleAddComment();
                }}
              >
                <Label htmlFor="comment-text" className="mb-2">Tulis catatan</Label>
                <Textarea
                  id="comment-text"
                  rows={3}
                  maxLength={2000}
                  placeholder="Contoh: Sudah konfirmasi via telepon, nasabah akan mengirim NPWP besok."
                  value={commentText}
                  onChange={event => setCommentText(event.target.value)}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{commentText.trim().length}/2000 karakter</span>
                  <Button
                    type="submit"
                    disabled={addCommentMutation.isPending || !commentText.trim()}
                  >
                    {addCommentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Tambah Catatan
                  </Button>
                </div>
              </form>

              <div aria-live="polite">
              {commentsQuery.isLoading ? (
                <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Memuat catatan...
                </div>
              ) : commentsQuery.isError ? (
                <p role="alert" className="py-4 text-sm text-rose-700">
                  Catatan tidak dapat dimuat.{" "}
                  <button type="button" className={`font-semibold underline pointer-coarse:min-h-11 ${focusRing}`} onClick={() => commentsQuery.refetch()}>Coba lagi</button>
                </p>
              ) : (commentsQuery.data ?? []).length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Belum ada catatan.</p>
              ) : (
                <ul className="space-y-3">
                  {(commentsQuery.data ?? []).map(comment => (
                    <li key={comment.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-navy-900">{comment.authorName ?? `Pengguna #${comment.authorUserId}`}</span>
                        <span>{new Date(comment.createdAt).toLocaleString("id-ID")}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-navy-900">{comment.content}</p>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle as="h2">Aktivitas</CardTitle>
              <CardDescription>Riwayat tindakan pada pengajuan ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {activityQuery.isLoading ? (
                <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Memuat aktivitas...
                </div>
              ) : activityQuery.isError ? (
                <p role="alert" className="py-4 text-sm text-rose-700">
                  Aktivitas tidak dapat dimuat.{" "}
                  <button type="button" className={`font-semibold underline pointer-coarse:min-h-11 ${focusRing}`} onClick={() => activityQuery.refetch()}>Coba lagi</button>
                </p>
              ) : (activityQuery.data ?? []).length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Belum ada aktivitas.</p>
              ) : (
                <ul className="space-y-2">
                  {(activityQuery.data ?? []).map(activity => (
                    <li key={activity.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-b-0">
                      <span className="min-w-0 text-navy-900">
                        {ACTION_LABELS[activity.action] ?? activity.action}
                        <span className="text-muted-foreground">
                          {" "}oleh {activity.actorUserId === 0 ? "nasabah" : activity.actorName ?? `pengguna #${activity.actorUserId}`}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString("id-ID")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
          </TabsContent>
        </Tabs>
      </main>

      <DocumentPreviewDialog
        document={previewDocument as PreviewDocument | null}
        onOpenChange={open => { if (!open) setPreviewId(null); }}
        canVerify={canVerifyDocuments}
        verifying={!!previewDocument && !!busy[`verify:${previewDocument.id}`]}
        rejecting={!!previewDocument && !!busy[`reject:${previewDocument.id}`]}
        onVerify={async doc => {
          if (await verifyDocument(doc)) setPreviewId(null);
        }}
        onReject={async doc => {
          if (await rejectDocument(doc)) setPreviewId(null);
        }}
      />

      {assessment && (
        <DecisionDialog
          decision={decision}
          onClose={() => setDecision(null)}
          onSubmit={submitDecision}
          pending={decideMutation.isPending}
          error={decideMutation.error ? errorMessage(decideMutation.error) : null}
          gate={gate}
          gateLoading={gateQuery.isLoading || (gateQuery.isFetching && !gate)}
          summary={{
            customerName: application.customerName,
            businessName: application.businessName,
            ticket,
            plafon: rupiah(application.requestedAmount),
            tenor: `${application.financingTenor} bulan`,
            classification: activeClassification,
            systemClassification: assessment.overrideClassification ? assessment.classification : null,
            score: decimal(assessment.totalScore, 1),
          }}
        />
      )}
    </div>
  );
}

function NotFoundState() {
  return (
    <PageShell>
      <div className="mx-auto max-w-lg text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="font-serif text-2xl text-navy-900">Pengajuan tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pengajuan ini tidak ada, sudah dihapus, atau bukan milik organisasi Anda.</p>
        <Button className="mt-6" asChild><Link href="/dashboard">Kembali ke daftar</Link></Button>
      </div>
    </PageShell>
  );
}

type DocumentRowDoc = {
  id: number;
  documentType: string;
  originalName: string;
  storedName: string;
  contentType: string;
  status: string;
  rejectionReason: string | null;
};

function DocumentRow({
  documentType,
  doc,
  canUpload,
  canVerify,
  uploading,
  verifying,
  rejecting,
  onSelectFile,
  onPreview,
  onVerify,
  onReject,
}: {
  documentType: string;
  doc: DocumentRowDoc | undefined;
  canUpload: boolean;
  canVerify: boolean;
  uploading: boolean;
  verifying: boolean;
  rejecting: boolean;
  onSelectFile: (file: File | undefined) => void;
  onPreview: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = verifying || rejecting;
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="font-semibold text-navy-900">{documentType}</h3>
        {doc ? (
          <div className="text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onPreview}
                className={`inline-flex min-w-0 items-center gap-1 text-left font-medium text-royal-600 underline-offset-4 hover:underline pointer-coarse:min-h-11 ${focusRing}`}
              >
                <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="break-all">{doc.originalName}</span>
                <span className="sr-only"> (lihat dokumen {documentType})</span>
              </button>
              <Badge variant={doc.status === "rejected" ? "destructive" : doc.status === "verified" ? "default" : "secondary"}>
                {statusLabels[doc.status as keyof typeof statusLabels] || doc.status}
              </Badge>
              <a
                href={documentUrl(doc.storedName)}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs text-muted-foreground underline-offset-4 hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center ${focusRing}`}
              >
                Buka di tab baru
              </a>
            </div>
            {doc.status === "rejected" && doc.rejectionReason && <div className="mt-1 break-words text-destructive">Alasan: {doc.rejectionReason}</div>}
          </div>
        ) : <div className="text-sm text-muted-foreground">Belum diunggah</div>}
      </div>
      <div className="flex flex-wrap gap-3" aria-live="polite">
        {canUpload && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              aria-label={`${doc ? "Ganti file" : "Unggah"} dokumen ${documentType}`}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="mr-2 h-4 w-4" aria-hidden="true" />}
              {uploading ? "Mengunggah..." : doc ? "Ganti file" : "Unggah"}
            </Button>
            <input
              ref={inputRef}
              hidden
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              aria-label={`Pilih file dokumen ${documentType}`}
              onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = "";
                onSelectFile(file);
              }}
            />
          </>
        )}
        {canVerify && doc && doc.status !== "verified" && (
          <>
            <Button variant="outline" disabled={busy} onClick={onPreview} aria-label={`Periksa dan verifikasi dokumen ${documentType}`}>
              {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
              {verifying ? "Memverifikasi..." : "Periksa & verifikasi"}
            </Button>
            {doc.status !== "rejected" && (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={onReject} aria-label={`Tolak dokumen ${documentType}`}>
                {rejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Tolak
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type SurveyAnalysisResult = {
  activityLevel?: unknown;
  premisesCondition?: unknown;
  stockAdequacy?: unknown;
  equipmentCondition?: unknown;
  cleanliness?: unknown;
  observations?: unknown;
  overallAssessment?: unknown;
  confidence?: unknown;
};

function SurveyAnalysisBlock({ result }: { result: Record<string, unknown> }) {
  const analysis = result as SurveyAnalysisResult;
  const labels: { key: keyof SurveyAnalysisResult; label: string }[] = [
    { key: "activityLevel", label: "Tingkat aktivitas" },
    { key: "premisesCondition", label: "Kondisi tempat" },
    { key: "stockAdequacy", label: "Kecukupan stok" },
    { key: "equipmentCondition", label: "Kondisi peralatan" },
    { key: "cleanliness", label: "Kebersihan" },
  ];
  const confidence = Number(analysis.confidence ?? 0) * 100;
  const observations = Array.isArray(analysis.observations) ? analysis.observations as unknown[] : [];

  return (
    <div className="space-y-2 rounded-lg bg-navy-100 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-navy-900">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Hasil Analisis AI
        </div>
        <Badge className="score-good">Kepercayaan: {decimal(confidence, 0)}%</Badge>
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {labels.map(item => {
          const value = analysis[item.key];
          if (value == null) return null;
          return (
            <div key={item.key} className="flex items-start gap-1.5 text-xs">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="inline text-navy-800">{item.label}:</dt>{" "}
                <dd className="inline text-navy-900">{String(value)}</dd>
              </div>
            </div>
          );
        })}
      </dl>
      {observations.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-navy-900">Pengamatan</div>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-navy-900">
            {observations.map((obs, index) => (
              <li key={index}>{String(obs)}</li>
            ))}
          </ul>
        </div>
      )}
      {analysis.overallAssessment != null && (
        <div className="border-t border-navy-200 pt-2 text-xs text-navy-900">
          <span className="font-semibold">Penilaian keseluruhan: </span>
          {String(analysis.overallAssessment)}
        </div>
      )}
      <p className="text-xs text-navy-800">Hasil bersifat pendukung, bukan keputusan final.</p>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="detail-score" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-300)" />
            <stop offset="100%" stopColor="var(--color-gold-500)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#detail-score)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-4xl">{decimal(value, 1)}<span className="sr-only"> dari 100</span></span>
      </div>
    </div>
  );
}
