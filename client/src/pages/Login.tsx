import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Bike, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663031602743/9oQjN6PX9fNMedgfErUfQE/biketogo-logo_71a6645b.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      meQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "E-mail ou senha incorretos.");
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (meQuery.data) {
      setLocation("/");
    }
  }, [meQuery.data, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Informe o e-mail.");
    if (!password.trim()) return toast.error("Informe a senha.");
    loginMutation.mutate({ email: email.trim(), password });
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, oklch(0.68 0.12 65) 1px, transparent 1px),
                          radial-gradient(circle at 75% 75%, oklch(0.68 0.12 65) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      <div className="relative w-full max-w-md mx-4">
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with logo */}
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="flex justify-center mb-6">
              <img
                src={LOGO_URL}
                alt="Bike To Go Floripa"
                className="h-16 w-auto object-contain"
              />
            </div>
            <h1
              className="text-xl font-bold text-foreground tracking-tight"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Sistema de Gestão
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Faça login para acessar o painel
            </p>
          </div>

          {/* Divider */}
          <div className="mx-8 border-t border-border" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                background: "oklch(0.68 0.12 65)",
                color: "oklch(0.10 0.005 240)",
              }}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50">
              <Bike className="w-3.5 h-3.5" />
              <span>Bike To Go Floripa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
