import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Coupons from "./pages/Coupons";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Partners from "./pages/Partners";
import Uses from "./pages/Uses";
import Integrations from "./pages/Integrations";
import Entities from "./pages/Entities";
import Stores from "./pages/Stores";
import Access from "./pages/Access";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/parceiros" component={Partners} />
        <Route path="/cupons" component={Coupons} />
        <Route path="/utilizacoes" component={Uses} />
        <Route path="/integracoes" component={Integrations} />
        <Route path="/entidades" component={Entities} />
        <Route path="/lojas" component={Stores} />
        <Route path="/acessos" component={Access} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
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
