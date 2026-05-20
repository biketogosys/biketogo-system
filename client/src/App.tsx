import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Bikes from "./pages/Bikes";
import Rentals from "./pages/Rentals";
import Accessories from "./pages/Accessories";
import Financial from "./pages/Financial";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import PublicReservation from "./pages/PublicReservation";
import Contracts from "./pages/Contracts";
import AuditLog from "./pages/AuditLog";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import DashboardLayout from "./components/DashboardLayout";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/clientes" component={() => <ProtectedRoute component={Clients} />} />
      <Route path="/clientes/:id" component={() => <ProtectedRoute component={ClientProfile} />} />
      <Route path="/bicicletas" component={() => <ProtectedRoute component={Bikes} />} />
      <Route path="/alugueis" component={() => <ProtectedRoute component={Rentals} />} />
      <Route path="/acessorios" component={() => <ProtectedRoute component={Accessories} />} />
      <Route path="/financeiro" component={() => <ProtectedRoute component={Financial} />} />
      <Route path="/usuarios" component={() => <ProtectedRoute component={UserManagement} />} />
      <Route path="/configuracoes" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/contratos" component={() => <ProtectedRoute component={Contracts} />} />
      <Route path="/auditoria" component={() => <ProtectedRoute component={AuditLog} />} />
      <Route path="/reservar" component={PublicReservation} />
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const { theme } = useTheme();
  return (
    <TooltipProvider>
      <Toaster richColors theme={theme as "light" | "dark"} />
      <Router />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <AppInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
