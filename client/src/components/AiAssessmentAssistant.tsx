import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BookOpenCheck, CheckCircle2, HelpCircle, Loader2, ScanSearch, Sparkles, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import type { ReactNode } from "react";

const severityTone: Record<string, string> = {
  tinggi: "bg-rose-50 text-rose-800 border-rose-200",
  sedang: "bg-amber-50 text-amber-900 border-amber-200",
  rendah: "bg-[#eef2f8] text-navy-900 border-[#cfd8e8]",
};

const verdictTone: Record<string, { label: string; className: string }> = {
  sesuai: { label: "Sesuai", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  perlu_klarifikasi: { label: "Perlu klarifikasi", className: "bg-amber-50 text-amber-900 border-amber-200" },
  tidak_sesuai: { label: "Tidak sesuai", className: "bg-rose-50 text-rose-800 border-rose-200" },
};

function RunPanel({ intro, running, onRun, hasResult, error, children, label }: {
  intro: string;
  running: boolean;
  onRun: () => void;
  hasResult: boolean;
  error?: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{intro}</p>
        <Button type="button" onClick={onRun} disabled={running}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {hasResult ? "Jalankan ulang" : label}
        </Button>
      </div>
      {error && <p className="flex items-center gap-1.5 text-sm text-red-600"><AlertTriangle className="h-4 w-4" />{error}</p>}
      {children}
    </div>
  );
}

function BulletBlock({ title, items, Icon, tone }: { title: string; items: string[]; Icon: typeof ThumbsUp; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] ${tone}`}><Icon className="h-4 w-4" />{title}</p>
      {items.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-navy-900">{items.map(i => <li key={i}>{i}</li>)}</ul> : <p className="text-sm text-muted-foreground">-</p>}
    </div>
  );
}

export function AiAssessmentAssistant({ applicationId }: { applicationId: number }) {
  const consistency = trpc.aiAssist.checkConsistency.useMutation();
  const sharia = trpc.aiAssist.checkSharia.useMutation();
  const brief = trpc.aiAssist.committeeBrief.useMutation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300"><Sparkles className="h-5 w-5" /></span>
          <div>
            <CardTitle className="text-xl">Asisten AI Penilaian</CardTitle>
            <CardDescription>Alat bantu analis dan komite. AI tidak mengubah skor SSCI dan tidak mengambil keputusan pembiayaan.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="consistency">
          <TabsList className="flex h-auto w-full flex-wrap sm:w-fit">
            <TabsTrigger value="consistency"><ScanSearch />Konsistensi data</TabsTrigger>
            <TabsTrigger value="sharia"><BookOpenCheck />Kesesuaian syariah</TabsTrigger>
            <TabsTrigger value="brief"><Users />Ringkasan komite</TabsTrigger>
          </TabsList>

          <TabsContent value="consistency">
            <RunPanel
              label="Periksa konsistensi"
              intro="Memeriksa data pengajuan yang tidak masuk akal atau saling bertentangan sebelum dinilai, dengan aturan otomatis ditambah AI."
              running={consistency.isPending}
              onRun={() => consistency.mutate({ applicationId })}
              hasResult={!!consistency.data}
              error={consistency.error?.message}
            >
              {consistency.data && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#eef2f8] p-4 text-sm text-navy-900">
                    {consistency.data.summary}
                    {consistency.data.aiStatus === "unavailable" && <span className="mt-1 block text-xs text-muted-foreground">AI tidak tersedia saat ini; hanya aturan otomatis yang dijalankan.</span>}
                  </div>
                  {consistency.data.issues.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />Tidak ditemukan ketidaksesuaian data.</p>
                  ) : (
                    <ul className="space-y-2">
                      {consistency.data.issues.map((issue, i) => (
                        <li key={i} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${severityTone[issue.severity]}`}>
                          <span className="mt-0.5 shrink-0 rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-bold uppercase">{issue.severity}</span>
                          <div className="flex-1">
                            <span className="font-semibold">{issue.field}: </span>{issue.message}
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold uppercase opacity-70">{issue.source === "ai" ? "AI" : "Aturan"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </RunPanel>
          </TabsContent>

          <TabsContent value="sharia">
            <RunPanel
              label="Periksa kesesuaian syariah"
              intro="Mengecek kecocokan jenis usaha dan tujuan pembiayaan dengan akad yang dipilih, merujuk teks fatwa DSN-MUI. Catatan pendukung pilar Kepatuhan Syariah, bukan fatwa."
              running={sharia.isPending}
              onRun={() => sharia.mutate({ applicationId })}
              hasResult={!!sharia.data}
              error={sharia.error?.message}
            >
              {sharia.data && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-white p-4">
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verdictTone[sharia.data.verdict].className}`}>{verdictTone[sharia.data.verdict].label}</span>
                    <p className="flex-1 text-sm text-navy-900">{sharia.data.summary}</p>
                  </div>
                  {sharia.data.findings.length > 0 && (
                    <ul className="space-y-2">
                      {sharia.data.findings.map((f, i) => (
                        <li key={i} className="rounded-xl border border-border bg-ivory p-3 text-sm">
                          <p className="text-navy-900">{f.point}</p>
                          <p className="mt-1 text-xs font-semibold text-gold-500">{f.reference}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {sharia.data.clarifications.length > 0 && <BulletBlock title="Perlu dikonfirmasi ke nasabah" items={sharia.data.clarifications} Icon={HelpCircle} tone="text-navy-900" />}
                  <p className="text-xs text-muted-foreground">Rujukan: {sharia.data.sources.join("; ") || "-"}</p>
                </div>
              )}
            </RunPanel>
          </TabsContent>

          <TabsContent value="brief">
            <RunPanel
              label="Buat ringkasan komite"
              intro="Menyusun ringkasan satu halaman untuk rapat komite: poin pendukung, risiko, dan pertanyaan yang perlu diklarifikasi sebelum memutuskan."
              running={brief.isPending}
              onRun={() => brief.mutate({ applicationId })}
              hasResult={!!brief.data}
              error={brief.error?.message}
            >
              {brief.data && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-navy-900 p-4 font-serif text-lg text-white">{brief.data.headline}</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <BulletBlock title="Poin pendukung" items={brief.data.pros} Icon={ThumbsUp} tone="text-emerald-700" />
                    <BulletBlock title="Risiko & kelemahan" items={brief.data.cons} Icon={ThumbsDown} tone="text-rose-700" />
                  </div>
                  <BulletBlock title="Pertanyaan untuk komite" items={brief.data.questions} Icon={HelpCircle} tone="text-gold-500" />
                </div>
              )}
            </RunPanel>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
