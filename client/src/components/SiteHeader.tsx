import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLocation } from "wouter";

const menuItems = [
  { label: "Dashboard", path: "/" },
  { label: "Clientes", path: "/clientes" },
  { label: "Bicicletas", path: "/bicicletas" },
  { label: "Acessórios", path: "/acessorios" },
  { label: "Financeiro", path: "/financeiro" },
  { label: "Contratos", path: "/contratos" },
  { label: "Usuários", path: "/usuarios" },
  { label: "Auditoria", path: "/auditoria" },
  { label: "Configurações", path: "/configuracoes" },
];

export function SiteHeader() {
  const [location] = useLocation();
  const activeItem = menuItems.find((item) => item.path === location);
  const title = activeItem?.label ?? "BikeTogo";

  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b border-border transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[--header-height]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  );
}
