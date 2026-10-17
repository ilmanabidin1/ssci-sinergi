import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Errors = Partial<Record<"organizationName" | "organizationSlug" | "adminName" | "email" | "password", string>>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="flex items-center gap-1 text-sm font-medium text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{message}</p>;
}

export default function Register() {
  usePageTitle("Daftar BPRS");
  const [, setLocation] = useLocation();
  const [organizationName, setOrganizationName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const effectiveSlug = slugTouched ? slug : slugify(organizationName);

  const register = trpc.auth.registerBprs.useMutation({
    onSuccess: () => { toast.success("Pendaftaran diterima. Tunggu verifikasi administrator."); setLocation("/login"); },
    onError: error => {
      const fields = fieldErrors(error) as Errors;
      setErrors(fields);
      const message = errorMessage(error, "Pendaftaran gagal. Periksa kembali isian Anda.");
      setFormError(/slug/i.test(message) ? message.replace(/slug/gi, "kode singkat") : message);
      const first = (["organizationName", "organizationSlug", "adminName", "email", "password"] as const).find(key => fields[key]);
      if (first) document.getElementById(first)?.focus();
    },
  });

  const clear = (key: keyof Errors) => setErrors(current => (current[key] ? { ...current, [key]: undefined } : current));
  const invalid = (key: keyof Errors) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});

  return (
    <AuthShell
      eyebrow="Pendaftaran BPRS"
      title="Bergabung dengan SSCI"
      description="Ajukan akses portal SSCI untuk organisasi Anda."
    >
      <div className="mb-6 flex gap-3 rounded-xl border border-gold-400/40 bg-gold-50 p-4 text-sm text-navy-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden="true" />
        Pendaftaran ini menunggu verifikasi administrator. Anda belum dapat masuk sebelum organisasi disetujui.
      </div>
      <form
        className="space-y-4"
        noValidate
        onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const input = {
            organizationName: organizationName.trim(),
            organizationSlug: effectiveSlug,
            adminName: String(data.get("adminName") ?? "").trim(),
            email: String(data.get("email") ?? "").trim(),
            password: String(data.get("password") ?? ""),
          };
          const found: Errors = {};
          if (input.organizationName.length < 2) found.organizationName = "Nama BPRS minimal 2 karakter.";
          if (input.organizationSlug.length < 3) found.organizationSlug = "Kode singkat minimal 3 karakter.";
          else if (!SLUG_PATTERN.test(input.organizationSlug)) found.organizationSlug = "Gunakan huruf kecil, angka, dan tanda hubung saja.";
          if (input.adminName.length < 2) found.adminName = "Nama administrator minimal 2 karakter.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) found.email = "Masukkan alamat email yang valid. Contoh: nama@bprs.co.id.";
          if (input.password.length < 8) found.password = "Password minimal 8 karakter.";
          setErrors(found);
          setFormError("");
          const first = (Object.keys(found) as Array<keyof Errors>)[0];
          if (first) {
            document.getElementById(first)?.focus();
            return;
          }
          register.mutate(input);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="organizationName">Nama resmi BPRS</Label>
          <Input id="organizationName" name="organizationName" autoComplete="organization" required value={organizationName} onChange={e => { setOrganizationName(e.target.value); clear("organizationName"); if (!slugTouched) clear("organizationSlug"); }} placeholder="Contoh: BPRS Amanah Sejahtera" className="h-11 bg-white" {...invalid("organizationName")} />
          <FieldError id="organizationName-error" message={errors.organizationName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationSlug">Kode singkat organisasi</Label>
          <Input
            id="organizationSlug"
            name="organizationSlug"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={100}
            value={effectiveSlug}
            onChange={e => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").slice(0, 100)); clear("organizationSlug"); }}
            onBlur={() => { if (slugTouched) setSlug(current => slugify(current)); }}
            placeholder="bprs-amanah-sejahtera"
            className="h-11 bg-white font-mono"
            aria-invalid={errors.organizationSlug ? true : undefined}
            aria-describedby={`organizationSlug-help${errors.organizationSlug ? " organizationSlug-error" : ""}`}
          />
          <p id="organizationSlug-help" className="text-xs text-muted-foreground">
            Dibuat otomatis dari nama BPRS dan dapat diubah. Hanya huruf kecil, angka, dan tanda hubung. Pratinjau: <span className="font-mono text-navy-900">{effectiveSlug || "bprs-anda"}</span>
          </p>
          <FieldError id="organizationSlug-error" message={errors.organizationSlug} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminName">Nama administrator</Label>
          <Input id="adminName" name="adminName" autoComplete="name" required onChange={() => clear("adminName")} className="h-11 bg-white" {...invalid("adminName")} />
          <FieldError id="adminName-error" message={errors.adminName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required onChange={() => clear("email")} className="h-11 bg-white" {...invalid("email")} />
          <FieldError id="email-error" message={errors.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
              onChange={() => clear("password")}
              className="h-11 bg-white pr-12"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={`password-help${errors.password ? " password-error" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
              aria-controls="password"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-navy-900 focus-visible:ring-[3px] focus-visible:ring-gold-400/50"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p id="password-help" className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
          <FieldError id="password-error" message={errors.password} />
        </div>
        <div className="gold-rule !my-7 opacity-50" />
        <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Informasi tambahan (opsional)</p>
        <div className="space-y-2"><Label htmlFor="bprsAddress">Alamat BPRS</Label><Textarea id="bprsAddress" name="bprsAddress" rows={2} autoComplete="street-address" placeholder="Alamat kantor BPRS" className="bg-white" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="bprsPhone">Telepon BPRS</Label><Input id="bprsPhone" name="bprsPhone" type="tel" inputMode="tel" autoComplete="off" placeholder="022xxxxxxx" className="h-11 bg-white" /></div>
          <div className="space-y-2"><Label htmlFor="adminPhone">Telepon administrator</Label><Input id="adminPhone" name="adminPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" className="h-11 bg-white" /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="adminPosition">Jabatan administrator</Label><Input id="adminPosition" name="adminPosition" type="text" autoComplete="organization-title" placeholder="Misal: Direktur / Kepala Divisi" className="h-11 bg-white" /></div>
        {formError && <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{formError}</p>}
        <Button className="h-11 w-full rounded-full bg-navy-900 text-white shadow-premium hover:bg-navy-800" type="submit" disabled={register.isPending}>{register.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirim pendaftaran</Button>
        <p className="text-center text-sm text-muted-foreground">Sudah punya akun? <Link className="inline-flex min-h-11 items-center font-semibold text-navy-900 underline-offset-4 hover:underline" href="/login">Masuk</Link></p>
      </form>
    </AuthShell>
  );
}
