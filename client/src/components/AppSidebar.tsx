import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Bike,
  Package,
  DollarSign,
  FileText,
  UserCog,
  Shield,
  Settings,
  LogOut,
  Sun,
  Moon,
  EllipsisVertical,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663031602743/9oQjN6PX9fNMedgfErUfQE/biketogo-logo_71a6645b.png";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Bike, label: "Bicicletas", path: "/bicicletas" },
  { icon: Package, label: "Acessórios", path: "/acessorios" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: FileText, label: "Contratos", path: "/contratos" },
  { icon: UserCog, label: "Usuários", path: "/usuarios" },
  { icon: Shield, label: "Auditoria", path: "/auditoria" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

function ThemeToggleMenuItem() {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;
  return (
    <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
      {theme === "dark" ? (
        <>
          <Sun className="mr-2 h-4 w-4" />
          <span>Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className="mr-2 h-4 w-4" />
          <span>Modo Escuro</span>
        </>
      )}
    </DropdownMenuItem>
  );
}

function NavUser() {
  const { user, logout } = useAuth();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                <AvatarFallback className="rounded-lg text-xs font-medium">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name || "—"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email || "—"}
                </span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarFallback className="rounded-lg text-xs font-medium">
                    {user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name || "—"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email || "—"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ThemeToggleMenuItem />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [location] = useLocation();

  return (
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
                  className="h-7 w-7 object-contain rounded-md shrink-0"
                />
                <span className="text-base font-semibold">BikeTogo</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* NavMain: 9 itens */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* NavUser: dropdown de usuário */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
