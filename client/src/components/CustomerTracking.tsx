import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, Lightbulb, Loader2, MessageSquareText, Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Explanation = {
  headline: string;
  factors: Array<{ aspect: string; level: "baik" | "cukup" | "perlu diperbaiki"; note: string }>;
  improvements: string[];
};

type CustomerRequest = {
  id: number;
  type: "pembaruan_data" | "peninjauan_keputusan";
  status: "open" | "resolved";
  createdAt: string | Date;
  resolvedAt: string | Date | null;
  resolutionNote: string | null;
};

const levelTone: Record<Explanation["factors"][number]["level"], string> = {
  baik: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cukup: "bg-[#eef2f8] text-navy-900 border-[#cfd8e8]",
  "perlu diperbaiki": "bg-amber-50 text-amber-900 border-amber-200",
};

const typeLabel: Record<CustomerRequest["type"], string> = {
  pembaruan_data: "Pembaruan data",
  peninjauan_keputusan: "Peninjauan ulang keputusan",
};

export function DecisionExplanation({ explanation }: { explanation: Explanation }) {
  return (
    <Card className="border-border shadow-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Scale className="h-5 w-5 text-gold-500" />Penjelasan hasil penilaian</CardTitle>
        <CardDescription>{explanation.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {explanation.factors.map(f => (
            <li key={f.aspect} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-3 text-sm">
              <div>
                <p className="font-semibold text-navy-900">{f.aspect}</p>
                <p className="text-xs text-muted-foreground">{f.note}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${levelTone[f.level]}`}>{f.level}</span>
            </li>
          ))}
        </ul>
        {explanation.improvements.length > 0 && (
          <div className="rounded-xl border border-gold-400/40 bg-gold-50 p-4 text-sm text-navy-900">
            <p className="mb-2 flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-gold-500" />Yang dapat Anda perbaiki</p>
            <ul className="list-disc space-y-1 pl-5">{explanation.improvements.map(i => <li key={i}>{i}</li>)}</ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Penilaian dibantu sistem SSCI berbasis aturan, dan keputusan akhir diambil oleh komite pembiayaan BPRS. Jika Anda merasa ada data yang keliru atau kondisi Anda belum tercermin, Anda dapat mengajukan peninjauan ulang di bawah.
        </p>
      </CardContent>
    </Card>
  );
}

export function CustomerRequestSection({
  ticketOrId,
  customerIdLast4,
  status,
  requests,
  onSubmitted,
}: {
  ticketOrId: string;
  customerIdLast4: string;
  status: string;
  requests: CustomerRequest[];
  onSubmitted: () => void;
}) {
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const mutation = trpc.applications.submitCustomerRequest.useMutation({
    onSuccess: () => {
      setMessage("");
      setPhone("");
      toast.success("Permintaan terkirim. Petugas BPRS akan meninjau dan menghubungi Anda.");
      onSubmitted();
    },
    onError: error => toast.error(error.message),
  });

  const type = status === "pending" ? "pembaruan_data" : status === "rejected" ? "peninjauan_keputusan" : null;
  const hasOpen = type ? requests.some(r => r.type === type && r.status === "open") : false;

  return (
    <Card className="border-border shadow-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><MessageSquareText className="h-5 w-5 text-gold-500" />Permintaan ke BPRS</CardTitle>
        <CardDescription>
          {type === "pembaruan_data" && "Pengajuan belum dinilai. Jika ada data yang perlu diperbaiki atau ditambahkan, sampaikan di sini sebelum penilaian dilakukan."}
          {type === "peninjauan_keputusan" && "Anda dapat meminta peninjauan ulang keputusan, misalnya jika ada data yang keliru atau kondisi usaha yang belum tercermin."}
          {!type && "Permintaan dapat diajukan sebelum penilaian (pembaruan data) atau setelah pengajuan belum disetujui (peninjauan ulang)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length > 0 && (
          <ul className="space-y-2">
            {requests.map(r => (
              <li key={r.id} className="rounded-xl border border-border bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-navy-900">{typeLabel[r.type]}</span>
                  {r.status === "open"
                    ? <span className="flex items-center gap-1 text-xs font-semibold text-amber-700"><Clock className="h-3.5 w-3.5" />Sedang diproses</span>
                    : <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Sudah ditanggapi</span>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Dikirim {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                {r.resolutionNote && <p className="mt-2 rounded-lg bg-ivory p-2 text-navy-900"><span className="font-semibold">Tanggapan BPRS: </span>{r.resolutionNote}</p>}
              </li>
            ))}
          </ul>
        )}

        {type && !hasOpen && (
          <form
            className="space-y-3"
            onSubmit={event => {
              event.preventDefault();
              mutation.mutate({ ticketOrId, customerIdLast4, type, message: message.trim(), ...(phone.trim() ? { contactPhone: phone.trim() } : {}) });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="request-message">{type === "pembaruan_data" ? "Data apa yang perlu diperbarui?" : "Alasan meminta peninjauan ulang"}</Label>
              <Textarea
                id="request-message"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={type === "pembaruan_data" ? "Contoh: Pendapatan bulanan yang tercatat Rp 8 juta, seharusnya Rp 12 juta karena ada cabang baru sejak Agustus." : "Contoh: Cicilan kendaraan saya sudah lunas bulan lalu, sehingga beban angsuran seharusnya lebih kecil."}
                required
              />
              <p className="text-xs text-muted-foreground">Minimal 20 karakter. Jangan menuliskan password atau PIN.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-phone">Nomor telepon yang bisa dihubungi (opsional)</Label>
              <Input id="request-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="max-w-xs" />
            </div>
            <Button type="submit" className="rounded-full bg-navy-900 text-white hover:bg-navy-800" disabled={mutation.isPending || message.trim().length < 20}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim permintaan
            </Button>
          </form>
        )}
        {type && hasOpen && <p className="text-sm text-muted-foreground">Permintaan Anda sedang diproses. Tanggapan BPRS akan muncul di halaman ini.</p>}
      </CardContent>
    </Card>
  );
}
