import { useAuth } from "@/_core/hooks/useAuth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CSSProperties } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { AppSidebar } from "./AppSidebar";
import { SiteHeader } from "./SiteHeader";
import { Button } from "./ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Acesso restrito
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Faça login para acessar o painel de gestão.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/login";
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Fazer login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3.5rem",
        } as CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-x-hidden">
          {/* Transição de rota: key por location remonta → @starting-style
              dispara o fade-in a cada navegação (repouso sempre visível). */}
          <div key={location} className="motion-fade">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
