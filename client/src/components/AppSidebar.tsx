import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/sidebar/NavMain";
import { NavDocuments } from "@/components/sidebar/NavDocuments";
import { NavSecondary } from "@/components/sidebar/NavSecondary";
import { NavUser } from "@/components/sidebar/NavUser";
import { NewContractModal } from "@/components/NewContractModal";
import { Link } from "wouter";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031602743/9oQjN6PX9fNMedgfErUfQE/biketogo-logo_71a6645b.png";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [newContractOpen, setNewContractOpen] = React.useState(false);

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        {/* Header: logo + nome */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                className="data-[slot=sidebar-menu-button]:p-1.5!"
              >
                <Link href="/">
                  <img
                    src={LOGO_URL}
                    alt="Bike To Go"
                    className="size-7 object-contain rounded-md shrink-0"
                  />
                  <span className="text-base font-semibold">BikeTogo</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Conteúdo: NavMain + NavDocuments + NavSecondary */}
        <SidebarContent>
          <NavMain onNewContract={() => setNewContractOpen(true)} />
          <NavDocuments />
          <NavSecondary className="mt-auto" />
        </SidebarContent>

        {/* Footer: NavUser */}
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Modal de Novo Contrato — fora do Sidebar para evitar z-index issues */}
      <NewContractModal
        open={newContractOpen}
        onClose={() => setNewContractOpen(false)}
      />
    </>
  );
}
