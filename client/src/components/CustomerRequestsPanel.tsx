import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, MessageSquareText, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const typeLabel = {
  pembaruan_data: "Pembaruan data",
  peninjauan_keputusan: "Peninjauan ulang keputusan",
} as const;

function ResolveForm({ id, applicationId }: { id: number; applicationId: number }) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const mutation = trpc.applications.resolveCustomerRequest.useMutation({
    onSuccess: async () => {
      setNote("");
      await utils.applications.listCustomerRequests.invalidate({ applicationId });
      await utils.applications.exitGate.invalidate({ applicationId });
      await utils.applications.workflow.invalidate({ applicationId });
      await utils.applications.listActivity.invalidate({ applicationId });
      toast.success("Tanggapan tersimpan dan dapat dilihat nasabah di halaman Lacak Pengajuan.");
    },
    onError: error => toast.error(errorMessage(error, "Tanggapan gagal disimpan.")),
  });
  const length = note.trim().length;
  const fieldId = `resolve-${id}`;
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={event => {
        event.preventDefault();
        if (length < 10 || mutation.isPending) return;
        mutation.mutate({ id, resolutionNote: note.trim() });
      }}
    >
      <Label htmlFor={fieldId}>Tanggapan untuk nasabah</Label>
      <Textarea
        id={fieldId}
        rows={3}
        maxLength={1000}
        aria-describedby={`${fieldId}-hint`}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Contoh: Data pendapatan sudah diperbarui setelah verifikasi mutasi rekening."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={length < 10 || mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Tandai selesai
        </Button>
        <span id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
          {length}/10 karakter minimum. Tanggapan ini terlihat oleh nasabah. Jangan menulis catatan internal.
        </span>
      </div>
    </form>
  );
}

export function CustomerRequestsPanel({ applicationId }: { applicationId: number }) {
  const query = trpc.applications.listCustomerRequests.useQuery({ applicationId });
  const requests = query.data ?? [];
  // Saat memuat tidak menampilkan apa pun: sebagian besar pengajuan tidak punya permintaan,
  // sehingga indikator memuat hanya menimbulkan kedipan. Kegagalan tetap ditampilkan di bawah.
  if (query.isLoading) return null;
  if (query.isError) {
    return (
      <p role="alert" className="flex flex-wrap items-center gap-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        Permintaan nasabah tidak dapat dimuat: {errorMessage(query.error)}
        <Button variant="link" size="sm" className="h-auto px-0 text-rose-800 underline" onClick={() => query.refetch()} disabled={query.isFetching}>Coba lagi</Button>
      </p>
    );
  }
  if (requests.length === 0) return null;
  const openCount = requests.filter(r => r.status === "open").length;

  return (
    <Card className={openCount > 0 ? "border-gold-400/60" : undefined}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300" aria-hidden="true"><MessageSquareText className="h-5 w-5" /></span>
          <div className="min-w-0">
            <CardTitle as="h2" className="text-xl">Permintaan Nasabah {openCount > 0 && <span className="ml-2 whitespace-nowrap rounded-full bg-gold-400 px-2 py-0.5 align-middle font-sans text-xs font-bold text-navy-900">{openCount} terbuka</span>}</CardTitle>
            <CardDescription>Dikirim nasabah dari halaman Lacak Pengajuan. Tindak lanjuti dengan memperbarui data atau meninjau ulang, lalu beri tanggapan.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className={`rounded-xl border p-4 text-sm ${r.status === "open" ? "border-gold-400/50 bg-gold-50" : "border-border bg-white"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-navy-900">{typeLabel[r.type]}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("id-ID")}</span>
            </div>
            <p className="mt-2 whitespace-pre-line break-words text-navy-900">{r.message}</p>
            {r.contactPhone && (
              <a href={`tel:${r.contactPhone}`} className="mt-1 inline-flex items-center gap-1 rounded text-xs text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:min-h-11">
                <Phone className="h-3 w-3" aria-hidden="true" /><span className="sr-only">Telepon nasabah: </span>{r.contactPhone}
              </a>
            )}
            {r.status === "open" ? (
              <ResolveForm id={r.id} applicationId={applicationId} />
            ) : (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-ivory p-2 text-navy-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="break-words"><span className="font-semibold">Tanggapan: </span>{r.resolutionNote}</span>
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
