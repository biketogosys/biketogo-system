import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch, Redirect } from "wouter";
import { useViewTransitionLocation } from "./hooks/useViewTransitionLocation";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { usePapel } from "@/hooks/usePapel";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Lock } from "lucide-react";

// Code-splitting por rota: cada página vira um chunk próprio. O lead que abre
// /reservar baixa só o chunk público — não o bundle inteiro do admin.
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const Bikes = lazy(() => import("./pages/Bikes"));
const Accessories = lazy(() => import("./pages/Accessories"));
const Financial = lazy(() => import("./pages/Financial"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicReservation = lazy(() => import("./pages/PublicReservation"));
const PublicContract = lazy(() => import("./pages/PublicContract"));
const Contracts = lazy(() => import("./pages/Contracts"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Updates = lazy(() => import("./pages/Updates"));
const PublishUpdates = lazy(() => import("./pages/PublishUpdates"));
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

function ProtectedRoute({
  component: Component,
  somenteAdmin = false,
}: { component: React.ComponentType; somenteAdmin?: boolean }) {
  const { isAuthenticated, loading } = useAuth();
  const { isAdmin, loading: carregandoPapel } = usePapel();

  if (loading || carregandoPapel) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Esconder o item do menu não basta: digitar /financeiro na barra de endereço
  // abriria a tela (que então falharia em cada query, com erro técnico).
  if (somenteAdmin && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <EmptyState
            icon={Lock}
            title="Área restrita ao administrador"
            description="Seu acesso é de operador: ele cobre a operação do dia a dia (contratos, clientes, bikes e acessórios). Financeiro, auditoria, usuários e configurações ficam com o administrador."
          />
        </div>
      </DashboardLayout>
    );
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
        <Route path="/agenda" component={() => <ProtectedRoute component={Agenda} />} />
        <Route path="/clientes" component={() => <ProtectedRoute component={Clients} />} />
        <Route path="/clientes/:id" component={() => <ProtectedRoute component={ClientProfile} />} />
        <Route path="/bicicletas" component={() => <ProtectedRoute component={Bikes} />} />
        <Route path="/alugueis">{() => <Redirect to="/contratos" />}</Route>
        <Route path="/acessorios" component={() => <ProtectedRoute component={Accessories} />} />
        <Route path="/financeiro" component={() => <ProtectedRoute component={Financial} somenteAdmin />} />
        <Route path="/usuarios" component={() => <ProtectedRoute component={UserManagement} somenteAdmin />} />
        <Route path="/configuracoes" component={() => <ProtectedRoute component={Settings} somenteAdmin />} />
        <Route path="/contratos" component={() => <ProtectedRoute component={Contracts} />} />
        <Route path="/auditoria" component={() => <ProtectedRoute component={AuditLog} somenteAdmin />} />
        <Route path="/atualizacoes" component={() => <ProtectedRoute component={Updates} />} />
        {/* Publicação do changelog: NÃO passa pelo ProtectedRoute e não aparece
            em menu nenhum. Tem login próprio (credencial de ambiente, fora de
            `admin_users`), então estar logado no sistema não dá acesso aqui. */}
        <Route path="/publicar-atualizacoes" component={PublishUpdates} />
        <Route path="/reservar" component={PublicReservation} />
        {/* Acompanhamento do contrato pelo cliente: público, autenticado pelo
            token assinado na URL (o link é a credencial). */}
        <Route path="/contrato/:token" component={PublicContract} />
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
        {/* hook custom = navegação embrulhada em View Transitions (M2) */}
        <WouterRouter hook={useViewTransitionLocation}>
          <Router />
        </WouterRouter>
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
