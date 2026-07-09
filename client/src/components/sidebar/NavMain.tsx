import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
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

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {/* Linha de ação rápida: Novo Contrato */}
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
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
