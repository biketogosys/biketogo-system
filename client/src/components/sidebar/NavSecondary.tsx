import * as React from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Settings, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { usePapel } from "@/hooks/usePapel";
import { trpc } from "@/lib/trpc";

const secondaryItems = [
  // Changelog do sistema. Fica aqui (não em Documentos) porque é leitura
  // ocasional, não ferramenta do dia a dia. Operador também vê: quem opera
  // precisa saber o que mudou tanto quanto quem administra.
  { icon: Sparkles, label: "Atualizações", path: "/atualizacoes" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export function NavSecondary(
  props: React.ComponentPropsWithoutRef<typeof SidebarGroup>
) {
  const [location] = useLocation();
  const { podeVer } = usePapel();

  // Badge de novidade em Atualizações — mesmo padrão do badge de leads em
  // Clientes (NavMain): atualiza sozinho a cada 60s, some quando zera.
  const { data: updatesStats } = trpc.updates.naoLidas.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const naoLidas = updatesStats?.count ?? 0;

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
                {item.path === "/atualizacoes" && naoLidas > 0 && (
                  <SidebarMenuBadge className="bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {naoLidas}
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
