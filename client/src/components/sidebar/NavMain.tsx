import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  CirclePlus,
  LayoutDashboard,
  Users,
  Bike,
  Package,
  UserCog,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Bike, label: "Bicicletas", path: "/bicicletas" },
  { icon: Package, label: "Acessórios", path: "/acessorios" },
  { icon: UserCog, label: "Usuários", path: "/usuarios" },
];

interface NavMainProps {
  onNewContract: () => void;
}

export function NavMain({ onNewContract }: NavMainProps) {
  const [location] = useLocation();

  // Leads aguardando validação — badge no item Clientes (atualiza a cada 60s
  // e no refoco da janela; some quando zera)
  const { data: clientStats } = trpc.clients.stats.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const leads = clientStats?.leads ?? 0;

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {/* Linha de ação rápida: Novo Contrato + Sino */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Novo contrato"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              onClick={onNewContract}
            >
              <CirclePlus />
              <span>Novo contrato</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Itens de navegação principal */}
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location === "/"
                : location.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                  <Link href={item.path}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
                {item.path === "/clientes" && leads > 0 && (
                  <SidebarMenuBadge className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {leads}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
