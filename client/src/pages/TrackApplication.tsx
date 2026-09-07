import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Clock, FileSearch, Loader2, ShieldCheck, XCircle } from "lucide-react";

export default function TrackApplication() {
  const [ticketInput, setTicketInput] = useState("");
  const [nikLast4, setNikLast4] = useState("");
  const [searchParams, setSearchParams] = useState<{ ticketOrId: string; customerIdLast4: string } | null>(null);

  const trackQuery = trpc.applications.trackStatus.useQuery(
    searchParams!,
    {
      enabled: !!searchParams,
      retry: false,
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim() || nikLast4.trim().length !== 4) return;
    setSearchParams({
      ticketOrId: ticketInput.trim(),
      customerIdLast4: nikLast4.trim(),
    });
  };

  const app = trackQuery.data;

  // Lifecycle steps: submitted -> verification/survey -> assessed -> committee review -> decision
  const steps = [
    {
      id: "submitted",
      title: "1. Berkas Terdaftar",
      desc: "Permohonan telah diinput oleh Account Officer ke sistem BPRS.",
      isDone: !!app,
      isActive: app?.status === "pending" && !app?.assessedAt,
    },
    {
      id: "assessed",
      title: "2. Penilaian Kelayakan SSCI",
      desc: "Analisis otomatis 3 pilar: Keuangan Berkelanjutan, Syariah, dan Legal.",
      isDone: !!app?.assessedAt || app?.status === "approved" || app?.status === "rejected",
      isActive: app?.status === "assessed" && !app?.checkedAt,
    },
    {
      id: "review",
      title: "3. Telaah Komite Pembiayaan",
      desc: "Kajian kepatuhan, taksasi agunan, dan evaluasi limit kewenangan memutus.",
      isDone: !!app?.checkedAt,
      isActive: app?.status === "assessed" && !app?.checkedAt,
    },
    {
      id: "decision",
      title: "4. Keputusan Final BPRS",
      desc: "Persetujuan pembiayaan dan persiapan akad resmi bersama nasabah.",
      isDone: app?.status === "approved" || app?.status === "rejected",
      isActive: false,
      isRejected: app?.status === "rejected",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between py-4 px-4 max-w-5xl">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <img src="/logo-light-bg.png" alt="SSCI" className="h-10 w-auto" />
            <span className="text-base font-bold text-[#2458d6]">SSCI Tracking Portal</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
            <FileSearch className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pelacakan Status Pengajuan Pembiayaan</h1>
          <p className="mt-1 text-sm text-gray-600">
            Cek progres tahapan penilaian kelayakan pembiayaan Anda secara transparan
          </p>
        </div>

        {/* Form Cari */}
        <Card className="shadow-sm border-slate-200 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Masukkan Nomor Tiket / ID Pengajuan</CardTitle>
            <CardDescription className="text-xs">
              Nomor tiket diberikan oleh Account Officer BPRS saat berkas pertama kali didaftarkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket">Nomor Tiket / ID Pengajuan *</Label>
                  <Input
                    id="ticket"
                    placeholder="Contoh: SSCI-00001 atau 1"
                    value={ticketInput}
                    onChange={e => setTicketInput(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nik4">4 Digit Terakhir NIK Pemohon *</Label>
                  <Input
                    id="nik4"
                    placeholder="Contoh: 4581"
                    maxLength={4}
                    value={nikLast4}
                    onChange={e => setNikLast4(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#2458d6] hover:bg-[#1945b0]" disabled={trackQuery.isFetching}>
                {trackQuery.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lacak Status Pengajuan
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error State */}
        {trackQuery.isError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 text-center">
            {trackQuery.error.message}
          </div>
        )}

        {/* Hasil Pencarian */}
        {app && (
          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-400">Nomor Tiket / Referensi:</div>
                  <div className="text-lg font-bold text-amber-400">{app.ticketNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Mitra BPRS:</div>
                  <div className="font-semibold text-sm">{app.bprsName}</div>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs border-b pb-3">
                  <div>
                    <span className="text-gray-500">Nama Pemohon:</span>
                    <div className="font-semibold text-gray-800">{app.customerName}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Usaha / Keperluan:</span>
                    <div className="font-semibold text-gray-800">{app.businessName}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Skema Akad:</span>
                    <div className="font-semibold uppercase text-primary">{app.financingAkad || "murabahah"}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Plafon Diajukan:</span>
                    <div className="font-semibold text-gray-800">Rp {app.requestedAmount.toLocaleString("id-ID")} ({app.financingTenor} bln)</div>
                  </div>
                </div>

                {/* Timeline Progress */}
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Tahapan Proses Pengajuan:
                  </div>

                  <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                    {steps.map(step => {
                      const isCompleted = step.isDone;
                      const isRejected = step.isRejected;
                      return (
                        <div key={step.id} className="relative flex items-start gap-3">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 text-white text-xs ${
                              isRejected
                                ? "bg-rose-600 ring-4 ring-rose-100"
                                : isCompleted
                                ? "bg-emerald-600 ring-4 ring-emerald-100"
                                : "bg-slate-300"
                            }`}
                          >
                            {isRejected ? (
                              <XCircle className="h-4 w-4" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  isRejected
                                    ? "text-rose-700"
                                    : isCompleted
                                    ? "text-gray-900"
                                    : "text-gray-400"
                                }`}
                              >
                                {step.title}
                              </span>
                              {isCompleted && (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                  Selesai
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Banner Status Terkini */}
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    app.status === "approved"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : app.status === "rejected"
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-blue-50 border-blue-200 text-blue-900"
                  }`}
                >
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-semibold">Status Saat Ini: </span>
                    {app.status === "approved"
                      ? "Pengajuan telah DISETUJUI oleh Komite Pembiayaan BPRS. Petugas AO akan menghubungi Anda untuk penandatanganan akad."
                      : app.status === "rejected"
                      ? "Pengajuan belum dapat disetujui pada periode ini berdasarkan evaluasi komite."
                      : "Pengajuan sedang dalam proses telaah dan analisis kelayakan."}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
