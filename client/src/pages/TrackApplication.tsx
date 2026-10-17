import { CustomerRequestSection, DecisionExplanation } from "@/components/CustomerTracking";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, Ban, CheckCircle2, Circle, Clock, FileSearch, Loader2, ShieldCheck, XCircle } from "lucide-react";

const AKAD_LABELS: Record<string, string> = {
  murabahah: "Murabahah",
  mudharabah: "Mudharabah",
  qardh: "Al-Qardh",
  multijasa: "Ijarah Multijasa",
};

type FormErrors = { ticket?: string; nik4?: string };

export default function TrackApplication() {
  usePageTitle("Lacak Pengajuan");
  const [ticketInput, setTicketInput] = useState("");
  const [nikLast4, setNikLast4] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [searchParams, setSearchParams] = useState<{ ticketOrId: string; customerIdLast4: string } | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const trackQuery = trpc.applications.trackStatus.useQuery(
    searchParams!,
    {
      enabled: !!searchParams,
      retry: false,
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FormErrors = {};
    if (!ticketInput.trim()) errors.ticket = "Masukkan nomor tiket atau ID pengajuan.";
    if (nikLast4.length !== 4) errors.nik4 = nikLast4.length === 0 ? "Masukkan 4 digit terakhir NIK." : `Masukkan tepat 4 digit terakhir NIK (baru ${nikLast4.length} digit).`;
    setFormErrors(errors);
    if (errors.ticket) return document.getElementById("ticket")?.focus();
    if (errors.nik4) return document.getElementById("nik4")?.focus();
    // Tutup keyboard virtual agar hasil terlihat di ponsel.
    (document.activeElement as HTMLElement | null)?.blur();
    const next = { ticketOrId: ticketInput.trim().toUpperCase(), customerIdLast4: nikLast4 };
    if (searchParams && next.ticketOrId === searchParams.ticketOrId && next.customerIdLast4 === searchParams.customerIdLast4) void trackQuery.refetch();
    else setSearchParams(next);
  };

  const app = trackQuery.data;
  const showResult = !!searchParams && !trackQuery.isFetching && (trackQuery.isSuccess || trackQuery.isError);

  useEffect(() => {
    if (showResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showResult, trackQuery.dataUpdatedAt, trackQuery.errorUpdatedAt]);

  const isRejected = app?.status === "rejected";
  const isApproved = app?.status === "approved";
  const isCancelled = app?.status === "cancelled";
  const decided = isApproved || isRejected;
  const assessed = !!app?.assessedAt || app?.status === "assessed" || decided;
  const reviewed = !!app?.checkedAt || decided;

  // Tahapan: terdaftar, penilaian SSCI, telaah komite, keputusan.
  const steps = [
    {
      id: "submitted",
      title: "Berkas terdaftar",
      desc: "Permohonan telah diinput oleh Account Officer ke sistem BPRS.",
      isDone: !!app,
      isActive: false,
    },
    {
      id: "assessed",
      title: "Penilaian kelayakan SSCI",
      desc: "Analisis 3 pilar: Keuangan Berkelanjutan, Syariah, dan Legal.",
      isDone: assessed,
      isActive: !isCancelled && app?.status === "pending" && !app?.assessedAt,
    },
    {
      id: "review",
      title: "Telaah komite pembiayaan",
      desc: "Kajian kepatuhan, taksasi agunan, dan evaluasi limit kewenangan memutus.",
      isDone: reviewed,
      isActive: !isCancelled && assessed && !reviewed,
    },
    {
      id: "decision",
      title: "Keputusan final BPRS",
      desc: isRejected
        ? "Pengajuan belum dapat disetujui pada periode ini."
        : isApproved
        ? "Pengajuan disetujui. Petugas akan menyiapkan akad bersama Anda."
        : "Persetujuan pembiayaan dan persiapan akad resmi bersama nasabah.",
      isDone: decided,
      isActive: false,
      isRejected,
    },
  ];

  const statusBanner = isApproved
    ? { tone: "border-emerald-200 bg-emerald-50 text-emerald-900", text: "Pengajuan telah DISETUJUI oleh Komite Pembiayaan BPRS. Petugas AO akan menghubungi Anda untuk penandatanganan akad.", Icon: ShieldCheck }
    : isRejected
    ? { tone: "border-rose-200 bg-rose-50 text-rose-900", text: "Pengajuan belum dapat disetujui pada periode ini berdasarkan evaluasi komite.", Icon: XCircle }
    : isCancelled
    ? { tone: "border-slate-300 bg-slate-100 text-slate-800", text: "Pengajuan ini telah dibatalkan. Hubungi Account Officer BPRS Anda jika ingin mengajukan kembali.", Icon: Ban }
    : { tone: "border-border bg-muted text-navy-900", text: "Pengajuan sedang dalam proses telaah dan analisis kelayakan.", Icon: Clock };

  const detailRows: Array<[string, string, string?]> = app
    ? [
        ["Nama pemohon", app.customerName],
        ["Usaha / keperluan", app.businessName],
        ["Skema akad", AKAD_LABELS[app.financingAkad || "murabahah"] ?? String(app.financingAkad)],
        ["Plafon diajukan", `Rp ${app.requestedAmount.toLocaleString("id-ID")} (${app.financingTenor} bulan)`],
      ]
    : [];

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <nav aria-label="Navigasi utama" className="relative overflow-hidden bg-navy-900 text-white">
        <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.05]" />
        <div className="gold-rule absolute inset-x-0 bottom-0 opacity-60" />
        <div className="container relative mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Button variant="ghost" asChild className="text-white hover:bg-white/10 hover:text-white">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <img src="/logo-dark-bg.png" alt="SSCI" className="h-10 w-auto" />
            <span className="hidden font-serif text-lg text-gold-300 sm:inline">Portal Pelacakan</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-gold-300 shadow-premium">
            <FileSearch className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-2xl font-medium text-navy-900 sm:text-3xl">Lacak Status Pengajuan Pembiayaan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cek progres tahapan penilaian kelayakan pembiayaan Anda secara transparan
          </p>
        </div>

        {/* Form Cari */}
        <Card className="mb-6 border-border shadow-premium">
          <CardHeader className="pb-3">
            <CardTitle as="h2" className="text-base">Masukkan Nomor Tiket / ID Pengajuan</CardTitle>
            <CardDescription>
              Nomor tiket diberikan oleh Account Officer BPRS saat berkas pertama kali didaftarkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} noValidate className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket">Nomor Tiket / ID Pengajuan *</Label>
                  <Input
                    id="ticket"
                    placeholder="Contoh: SSCI-00001 atau 1"
                    value={ticketInput}
                    onChange={e => { setTicketInput(e.target.value); if (formErrors.ticket) setFormErrors(f => ({ ...f, ticket: undefined })); }}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={50}
                    aria-required="true"
                    aria-invalid={formErrors.ticket ? true : undefined}
                    aria-describedby={formErrors.ticket ? "ticket-error" : undefined}
                    className="h-11"
                  />
                  {formErrors.ticket && <p id="ticket-error" role="alert" className="flex items-center gap-1 text-sm font-medium text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{formErrors.ticket}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nik4">4 Digit Terakhir NIK Pemohon *</Label>
                  <Input
                    id="nik4"
                    placeholder="Contoh: 4581"
                    inputMode="numeric"
                    pattern="\d{4}"
                    autoComplete="off"
                    maxLength={4}
                    value={nikLast4}
                    onChange={e => { setNikLast4(e.target.value.replace(/\D/g, "").slice(0, 4)); if (formErrors.nik4) setFormErrors(f => ({ ...f, nik4: undefined })); }}
                    aria-required="true"
                    aria-invalid={formErrors.nik4 ? true : undefined}
                    aria-describedby={formErrors.nik4 ? "nik4-help nik4-error" : "nik4-help"}
                    className="h-11 tabular-nums tracking-widest"
                  />
                  <p id="nik4-help" className="text-xs text-muted-foreground">{nikLast4.length}/4 digit, hanya angka.</p>
                  {formErrors.nik4 && <p id="nik4-error" role="alert" className="flex items-center gap-1 text-sm font-medium text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{formErrors.nik4}</p>}
                </div>
              </div>

              <Button type="submit" className="h-11 w-full rounded-full bg-navy-900 text-white hover:bg-navy-800" disabled={trackQuery.isFetching}>
                {trackQuery.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {trackQuery.isFetching ? "Mencari pengajuan..." : "Lacak Status Pengajuan"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div ref={resultRef} tabIndex={-1} aria-live="polite" className="scroll-mt-4 outline-none">
        {/* Error State */}
        {trackQuery.isError && !trackQuery.isFetching && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800">
            <p className="font-medium">{errorMessage(trackQuery.error, "Pengajuan tidak dapat dilacak saat ini. Coba lagi beberapa saat.")}</p>
            <p className="mt-1 text-rose-700">Periksa kembali nomor tiket dan 4 digit NIK. Jika masih gagal, hubungi Account Officer BPRS Anda.</p>
          </div>
        )}

        {/* Hasil Pencarian */}
        {app && !trackQuery.isError && (
          <div className="space-y-6">
            <Card className="overflow-hidden border-border shadow-premium">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-navy-900 p-4 text-white">
                <div>
                  <div className="text-sm text-white/75">Nomor tiket / referensi</div>
                  <div className="font-serif text-xl text-gold-300">{app.ticketNumber}</div>
                </div>
                <div className="sm:text-right">
                  <div className="text-sm text-white/75">Mitra BPRS</div>
                  <div className="text-sm font-semibold">{app.bprsName}</div>
                </div>
              </div>

              <CardContent className="space-y-5 p-4">
                <h2 className="sr-only">Hasil pelacakan</h2>
                {/* Banner Status Terkini */}
                <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${statusBanner.tone}`}>
                  <statusBanner.Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-semibold">Status saat ini: </span>
                    {statusBanner.text}
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-3 border-b border-border pb-4 text-sm sm:grid-cols-2">
                  {detailRows.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-words font-semibold text-navy-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Timeline Progress */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy-900">
                    Tahapan proses pengajuan
                  </h3>

                  <ol className="relative space-y-4 before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-border">
                    {steps.map((step, index) => {
                      const stateLabel = step.isRejected ? "Tidak disetujui" : step.isDone ? "Selesai" : step.isActive ? "Sedang diproses" : isCancelled ? "Dihentikan" : "Menunggu";
                      return (
                        <li key={step.id} aria-current={step.isActive ? "step" : undefined} className="relative flex items-start gap-3">
                          <div
                            aria-hidden="true"
                            className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                              step.isRejected
                                ? "bg-rose-600 ring-4 ring-rose-100"
                                : step.isDone
                                ? "bg-emerald-600 ring-4 ring-emerald-100"
                                : step.isActive
                                ? "bg-gold-400 text-navy-900 ring-4 ring-gold-400/25"
                                : "border-2 border-border bg-white text-muted-foreground"
                            }`}
                          >
                            {step.isRejected ? (
                              <XCircle className="h-4 w-4" />
                            ) : step.isDone ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : step.isActive ? (
                              <Clock className="h-4 w-4 motion-safe:animate-pulse" />
                            ) : (
                              <Circle className="h-3 w-3" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className={`text-sm font-semibold ${step.isRejected ? "text-rose-700" : step.isDone || step.isActive ? "text-navy-900" : "text-muted-foreground"}`}>
                                <span className="sr-only">Tahap {index + 1}: </span>
                                <span aria-hidden="true">{index + 1}. </span>{step.title}
                              </span>
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                  step.isRejected
                                    ? "bg-rose-50 text-rose-700"
                                    : step.isDone
                                    ? "bg-emerald-50 text-emerald-800"
                                    : step.isActive
                                    ? "bg-gold-50 text-navy-900 ring-1 ring-gold-400/50"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {stateLabel}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </CardContent>
            </Card>

            {app.explanation && <DecisionExplanation explanation={app.explanation} />}

            {searchParams && (
              <CustomerRequestSection
                ticketOrId={searchParams.ticketOrId}
                customerIdLast4={searchParams.customerIdLast4}
                status={app.status}
                requests={app.requests}
                onSubmitted={() => void trackQuery.refetch()}
              />
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
