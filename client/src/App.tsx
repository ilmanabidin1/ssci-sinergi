import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
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

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/applications/new"} component={NewApplication} />
      <Route path={"/applications/:id"} component={ApplicationDetail} />
      <Route path={"/assessments"} component={AssessmentHistory} />
      <Route path={"/tentang-ssci"} component={AboutSSCI} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/pengaturan"} component={Settings} />
      <Route path={"/tim"} component={Team} />
      <Route path={"/nasabah"} component={Customers} />
      <Route path={"/notifikasi"} component={Notifications} />
      <Route path={"/audit"} component={AuditLog} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useSessionTimeout();
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
