import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const [, setLocation] = useLocation();
  const register = trpc.auth.registerBprs.useMutation({
    onSuccess: () => { toast.success("Pendaftaran diterima. Tunggu verifikasi administrator."); setLocation("/login"); },
    onError: error => toast.error(error.message),
  });
  return <main className="min-h-screen bg-slate-950 px-4 py-8 flex items-center justify-center">
    <Card className="w-full max-w-lg border-slate-700 shadow-2xl">
      <CardHeader><div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center"><ShieldCheck className="h-7 w-7 text-white" /></div><CardTitle className="text-2xl">Daftar BPRS</CardTitle><CardDescription>Ajukan akses portal SSCI untuk organisasi Anda.</CardDescription></CardHeader>
      <CardContent><div className="mb-5 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Pendaftaran ini menunggu verifikasi administrator. Anda belum dapat masuk sebelum organisasi disetujui.</div>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); register.mutate({ organizationName: String(data.get("organizationName")), organizationSlug: String(data.get("organizationSlug")), adminName: String(data.get("adminName")), email: String(data.get("email")), password: String(data.get("password")) }); }}>
          {[['organizationName','Nama resmi BPRS','text'],['organizationSlug','Slug organisasi (contoh: bprs-amanah)','text'],['adminName','Nama administrator','text'],['email','Email','email']].map(([name,label,type]) => <div className="space-y-2" key={name}><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} required /></div>)}
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} required /><p className="text-xs text-slate-500">Minimal 8 karakter.</p></div>
          <Button className="w-full" type="submit" disabled={register.isPending}>{register.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim pendaftaran</Button>
          <p className="text-center text-sm text-slate-600"><a className="text-emerald-700 hover:underline" href="/login">Kembali ke login</a></p>
        </form>
      </CardContent>
    </Card>
  </main>;
}
