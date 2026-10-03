import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
      toast.success("Tanggapan tersimpan dan dapat dilihat nasabah di halaman Lacak Pengajuan.");
    },
    onError: error => toast.error(error.message),
  });
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={event => {
        event.preventDefault();
        mutation.mutate({ id, resolutionNote: note.trim() });
      }}
    >
      <Textarea
        rows={2}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Tanggapan untuk nasabah, misalnya: Data pendapatan sudah diperbarui setelah verifikasi mutasi rekening."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={note.trim().length < 10 || mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Tandai selesai
        </Button>
        <span className="text-xs text-muted-foreground">Tanggapan ini terlihat oleh nasabah. Jangan menulis catatan internal.</span>
      </div>
    </form>
  );
}

export function CustomerRequestsPanel({ applicationId }: { applicationId: number }) {
  const query = trpc.applications.listCustomerRequests.useQuery({ applicationId });
  const requests = query.data ?? [];
  if (requests.length === 0) return null;
  const openCount = requests.filter(r => r.status === "open").length;

  return (
    <Card className={openCount > 0 ? "border-gold-400/60" : undefined}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-300"><MessageSquareText className="h-5 w-5" /></span>
          <div>
            <CardTitle className="text-xl">Permintaan Nasabah {openCount > 0 && <span className="ml-2 rounded-full bg-gold-400 px-2 py-0.5 align-middle text-xs font-bold text-navy-900">{openCount} terbuka</span>}</CardTitle>
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
            <p className="mt-2 whitespace-pre-line text-navy-900">{r.message}</p>
            {r.contactPhone && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{r.contactPhone}</p>}
            {r.status === "open" ? (
              <ResolveForm id={r.id} applicationId={applicationId} />
            ) : (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-ivory p-2 text-navy-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span><span className="font-semibold">Tanggapan: </span>{r.resolutionNote}</span>
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
