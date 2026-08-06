import * as React from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { usePapel } from "@/hooks/usePapel";

const secondaryItems = [
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export function NavSecondary(
  props: React.ComponentPropsWithoutRef<typeof SidebarGroup>
) {
  const [location] = useLocation();
  const { podeVer } = usePapel();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {secondaryItems.filter((i) => podeVer(i.path)).map((item) => {
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
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
