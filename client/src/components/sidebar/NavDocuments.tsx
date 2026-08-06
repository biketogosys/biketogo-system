import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DollarSign, FileText, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { usePapel } from "@/hooks/usePapel";

const documentItems = [
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: FileText, label: "Contratos", path: "/contratos" },
  { icon: Shield, label: "Auditoria", path: "/auditoria" },
];

export function NavDocuments() {
  const [location] = useLocation();
  const { podeVer } = usePapel();
  // Operador não vê Financeiro nem Auditoria: deixar o item no menu só para
  // dar erro no clique é pior que não mostrar.
  const itens = documentItems.filter((i) => podeVer(i.path));

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documentos</SidebarGroupLabel>
      <SidebarMenu>
        {itens.map((item) => {
          const isActive = location.startsWith(item.path);
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
    </SidebarGroup>
  );
}
