import { Button } from "@/components/ui/button";
import { AlertTriangle, LayoutDashboard, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-ivory p-6">
          <div role="alert" className="w-full max-w-xl rounded-2xl border border-border bg-white p-8 text-center shadow-premium">
            <AlertTriangle className="mx-auto mb-5 h-12 w-12 text-amber-600" aria-hidden="true" />
            <h1 className="font-serif text-2xl font-medium text-navy-900">Terjadi kendala pada halaman ini</h1>
            <p className="mt-3 text-slate-600">
              Data Anda yang sudah tersimpan tetap aman. Muat ulang halaman atau kembali ke dashboard.
              Jika kendala berulang, hubungi admin BPRS Anda.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">Detail teknis (mode pengembangan)</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-break-spaces text-muted-foreground">
                  {this.state.error.stack ?? this.state.error.message}
                </pre>
              </details>
            )}

            <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
              <Button onClick={() => window.location.reload()}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Muat ulang
              </Button>
              <Button variant="outline" asChild>
                <a href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Ke dashboard
                </a>
              </Button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
