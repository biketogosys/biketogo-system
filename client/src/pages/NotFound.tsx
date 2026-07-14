import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="motion-enter w-full max-w-lg">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2 tabular-nums">404</h1>

          <h2 className="text-xl font-semibold text-foreground mb-4">
            Página não encontrada
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            A página que você procura não existe.
            <br />
            Ela pode ter sido movida ou removida.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setLocation("/")}>
              <Home className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
