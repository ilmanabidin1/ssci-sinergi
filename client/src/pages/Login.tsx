import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/dashboard");
    },
    onError: error => toast.error(error.message),
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 flex items-center justify-center">
      <Card className="w-full max-w-md border-slate-700 shadow-2xl">
        <div className="flex justify-end pt-3 pr-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white" asChild>
            <Link href="/" aria-label="Kembali ke beranda">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <CardHeader className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Portal SSCI</CardTitle>
            <CardDescription className="mt-2">
              Masuk menggunakan akun yang diberikan administrator BPRS.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              login.mutate({
                email: String(data.get("email")),
                password: String(data.get("password")),
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
           <Input id="password" name="password" type="password" autoComplete="current-password" minLength={4} required />
            </div>
            <Button className="w-full" type="submit" disabled={login.isPending}>
              {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
