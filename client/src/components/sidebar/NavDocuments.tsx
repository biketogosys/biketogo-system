import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DollarSign, FileText, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";

const documentItems = [
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: FileText, label: "Contratos", path: "/contratos" },
  { icon: Shield, label: "Auditoria", path: "/auditoria" },
];

export function NavDocuments() {
  const [location] = useLocation();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documentos</SidebarGroupLabel>
      <SidebarMenu>
        {documentItems.map((item) => {
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
