import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Bike, Lock } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.68 0.12 65) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 mb-4">
            <Bike className="w-8 h-8 text-primary" />
          </div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Bike To Go
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema de Gestão — Floripa</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Acesso Restrito
            </h2>
          </div>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Este painel é exclusivo para a equipe da Bike To Go Floripa. Faça login com a sua conta autorizada para continuar.
          </p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-150 active:scale-95"
            style={{
              background: "oklch(0.68 0.12 65)",
              color: "oklch(0.10 0.005 240)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.72 0.13 65)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.68 0.12 65)";
            }}
          >
            Entrar no sistema
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Bike To Go Floripa &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
