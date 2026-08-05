import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    // `client/**` entrou em 2026-08-03 para cobrir helpers PUROS de tela (o
    // primeiro é o `lib/auditoria.ts`). Não há teste de componente aqui: o
    // visual continua sendo verificado no dev:local, como manda a casa.
    include: [
      "server/**/*.test.ts", "server/**/*.spec.ts",
      "client/**/*.test.ts", "client/**/*.spec.ts",
    ],
  },
});
