import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { consumeReturnTo, useSessionTimeout } from "@/hooks/useSessionTimeout";
import NotFound from "@/pages/NotFound";
import { useEffect, type ComponentType } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { ProtectedRoute } from "./components/RouteGuard";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Platform from "./pages/Platform";
import { TwoFactorGate } from "./components/TwoFactorGate";
import NewApplication from "./pages/NewApplication";
import ApplicationDetail from "./pages/ApplicationDetail";
import AssessmentHistory from "./pages/AssessmentHistory";
import AuditLog from "./pages/AuditLog";
import Dashboard from "./pages/Dashboard";
import AboutSSCI from "./pages/AboutSSCI";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import Customers from "./pages/Customers";
import Notifications from "./pages/Notifications";

import TrackApplication from "./pages/TrackApplication";

/** Membungkus halaman internal dengan pelindung autentikasi (dan peran bila perlu). */
function guarded<P extends object>(Page: ComponentType<P>, require?: "admin" | "superadmin") {
  return function GuardedPage(props: P) {
    return (
      <ProtectedRoute require={require}>
        <Page {...props} />
      </ProtectedRoute>
    );
  };
}

const GuardedDashboard = guarded(Dashboard);
const GuardedNewApplication = guarded(NewApplication);
const GuardedApplicationDetail = guarded(ApplicationDetail);
const GuardedAssessmentHistory = guarded(AssessmentHistory);
const GuardedSettings = guarded(Settings);
const GuardedTeam = guarded(Team, "admin");
const GuardedCustomers = guarded(Customers);
const GuardedNotifications = guarded(Notifications);
const GuardedAuditLog = guarded(AuditLog, "admin");
const GuardedPlatform = guarded(Platform, "superadmin");

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/track"} component={TrackApplication} />
      <Route path={"/dashboard"} component={GuardedDashboard} />
      <Route path={"/applications/new"} component={GuardedNewApplication} />
      <Route path={"/applications/:id"} component={GuardedApplicationDetail} />
      <Route path={"/assessments"} component={GuardedAssessmentHistory} />
      <Route path={"/tentang-ssci"} component={AboutSSCI} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/pengaturan"} component={GuardedSettings} />
      <Route path={"/tim"} component={GuardedTeam} />
      <Route path={"/nasabah"} component={GuardedCustomers} />
      <Route path={"/notifikasi"} component={GuardedNotifications} />
      <Route path={"/audit"} component={GuardedAuditLog} />
      <Route path={"/platform"} component={GuardedPlatform} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Setelah login ulang (yang mendarat di /dashboard), kembalikan pengguna ke
 * halaman yang sedang dikerjakan saat sesinya berakhir.
 */
function ReturnToAfterLogin({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (!isAuthenticated || location !== "/dashboard") return;
    const target = consumeReturnTo();
    if (target && target !== "/dashboard") setLocation(target);
  }, [isAuthenticated, location, setLocation]);
  return null;
}

function SessionTimeoutDialog({
  open,
  secondsLeft,
  onStay,
  onLogout,
}: {
  open: boolean;
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={next => { if (!next) onStay(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sesi Anda akan segera berakhir</AlertDialogTitle>
          <AlertDialogDescription>
            Tidak ada aktivitas selama hampir 15 menit. Demi keamanan data nasabah, Anda akan keluar otomatis dalam{" "}
            <strong aria-live="polite" className="text-navy-900">{secondsLeft} detik</strong>. Isian yang belum disimpan
            dapat hilang.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onLogout}>Keluar sekarang</Button>
          <Button autoFocus onClick={onStay}>Tetap masuk</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function App() {
  const session = useSessionTimeout();
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <ConfirmProvider>
            <TwoFactorGate>
              <Router />
            </TwoFactorGate>
            <ReturnToAfterLogin isAuthenticated={session.isAuthenticated} />
            <SessionTimeoutDialog
              open={session.warningOpen}
              secondsLeft={session.secondsLeft}
              onStay={session.stayLoggedIn}
              onLogout={session.logoutNow}
            />
          </ConfirmProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
