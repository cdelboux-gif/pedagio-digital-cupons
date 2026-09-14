import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Campaigns from "./pages/Campaigns";
import Coupons from "./pages/Coupons";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Partners from "./pages/Partners";
import Uses from "./pages/Uses";
import Integrations from "./pages/Integrations";
import Entities from "./pages/Entities";
import Stores from "./pages/Stores";
import Access from "./pages/Access";
import Invite from "./pages/Invite";
import Audit from "./pages/Audit";
import Emails from "./pages/Emails";
import Intelligence from "./pages/Intelligence";
import Notifications from "./pages/Notifications";
import Agents from "./pages/Agents";
import Login from "./pages/Login";

function ProtectedRouter() {
  return <DashboardLayout><Switch><Route path="/" component={Dashboard} /><Route path="/parceiros" component={Partners} /><Route path="/campanhas" component={Campaigns} /><Route path="/cupons" component={Coupons} /><Route path="/utilizacoes" component={Uses} /><Route path="/integracoes" component={Integrations} /><Route path="/entidades" component={Entities} /><Route path="/lojas" component={Stores} /><Route path="/acessos" component={Access} /><Route path="/auditoria" component={Audit} /><Route path="/emails" component={Emails} /><Route path="/notificacoes" component={Notifications} /><Route path="/inteligencia" component={Intelligence} /><Route path="/agentes" component={Agents} /><Route component={NotFound} /></Switch></DashboardLayout>;
}

function Router() {
  return <Switch><Route path="/login" component={Login} /><Route path="/convite" component={Invite} /><Route component={ProtectedRouter} /></Switch>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider><Toaster /><Router /></TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
