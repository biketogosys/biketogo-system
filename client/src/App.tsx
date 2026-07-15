import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";

// Code-splitting por rota: cada página vira um chunk próprio. O lead que abre
// /reservar baixa só o chunk público — não o bundle inteiro do admin.
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const Bikes = lazy(() => import("./pages/Bikes"));
const Accessories = lazy(() => import("./pages/Accessories"));
const Financial = lazy(() => import("./pages/Financial"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicReservation = lazy(() => import("./pages/PublicReservation"));
const Contracts = lazy(() => import("./pages/Contracts"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));

// Fallback de rota inteira (regra da casa: skeleton, nunca spinner de página)
function RouteFallback() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

// Fallback de página dentro do app shell (sidebar permanece visível)
function PageFallback() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<PageFallback />}>
        <Component />
      </Suspense>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/clientes" component={() => <ProtectedRoute component={Clients} />} />
        <Route path="/clientes/:id" component={() => <ProtectedRoute component={ClientProfile} />} />
        <Route path="/bicicletas" component={() => <ProtectedRoute component={Bikes} />} />
        <Route path="/alugueis">{() => <Redirect to="/contratos" />}</Route>
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
    </Suspense>
  );
}

function AppInner() {
  const { theme } = useTheme();
  return (
    <TooltipProvider>
      <ConfirmProvider>
        <Toaster richColors theme={theme as "light" | "dark"} />
        <Router />
      </ConfirmProvider>
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
