import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Info, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const requiredFields = [
  ["organizationName", "Nama resmi BPRS", "text"],
  ["organizationSlug", "Slug organisasi (contoh: bprs-amanah)", "text"],
  ["adminName", "Nama administrator", "text"],
  ["email", "Email", "email"],
] as const;

export default function Register() {
  const [, setLocation] = useLocation();
  const register = trpc.auth.registerBprs.useMutation({
    onSuccess: () => { toast.success("Pendaftaran diterima. Tunggu verifikasi administrator."); setLocation("/login"); },
    onError: error => toast.error(error.message),
  });
  return (
    <AuthShell
      eyebrow="Pendaftaran BPRS"
      title="Bergabung dengan SSCI"
      description="Ajukan akses portal SSCI untuk organisasi Anda."
    >
      <div className="mb-6 flex gap-3 rounded-xl border border-gold-400/40 bg-gold-50 p-4 text-sm text-navy-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
        Pendaftaran ini menunggu verifikasi administrator. Anda belum dapat masuk sebelum organisasi disetujui.
      </div>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); register.mutate({ organizationName: String(data.get("organizationName")), organizationSlug: String(data.get("organizationSlug")), adminName: String(data.get("adminName")), email: String(data.get("email")), password: String(data.get("password")) }); }}>
        {requiredFields.map(([name, label, type]) => <div className="space-y-2" key={name}><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} required className="h-11 bg-white" /></div>)}
        <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} required className="h-11 bg-white" /><p className="text-xs text-muted-foreground">Minimal 8 karakter.</p></div>
        <div className="gold-rule !my-7 opacity-50" />
        <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Informasi tambahan (opsional)</p>
        <div className="space-y-2"><Label htmlFor="bprsAddress">Alamat BPRS</Label><Textarea id="bprsAddress" name="bprsAddress" rows={2} placeholder="Alamat kantor BPRS" className="bg-white" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="bprsPhone">Telepon BPRS</Label><Input id="bprsPhone" name="bprsPhone" type="tel" className="h-11 bg-white" /></div>
          <div className="space-y-2"><Label htmlFor="adminPhone">Telepon administrator</Label><Input id="adminPhone" name="adminPhone" type="tel" className="h-11 bg-white" /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="adminPosition">Jabatan administrator</Label><Input id="adminPosition" name="adminPosition" type="text" placeholder="Misal: Direktur / Kepala Divisi" className="h-11 bg-white" /></div>
        <Button className="h-11 w-full rounded-full bg-navy-900 text-white shadow-premium hover:bg-navy-800" type="submit" disabled={register.isPending}>{register.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim pendaftaran</Button>
        <p className="text-center text-sm text-muted-foreground">Sudah punya akun? <Link className="font-semibold text-navy-900 underline-offset-4 hover:underline" href="/login">Masuk</Link></p>
      </form>
    </AuthShell>
  );
}
