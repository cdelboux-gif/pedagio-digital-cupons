import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, Boxes, Handshake, LayoutDashboard, LogOut, PanelLeft, ShieldCheck, Store, TicketPercent, UserCog, Webhook } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { visibleModules, type PermissionModule } from "@shared/permissions";

const menuItems: Array<{ icon: typeof LayoutDashboard; label: string; path: string; module: PermissionModule }> = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/", module: "dashboard" },
  { icon: Handshake, label: "Parceiros", path: "/parceiros", module: "partners" },
  { icon: TicketPercent, label: "Cupons", path: "/cupons", module: "coupons" },
  { icon: Activity, label: "Utilizações", path: "/utilizacoes", module: "uses" },
  { icon: Store, label: "Lojas", path: "/lojas", module: "stores" },
  { icon: Boxes, label: "Entidades", path: "/entidades", module: "entities" },
  { icon: Webhook, label: "Integrações", path: "/integracoes", module: "integrations" },
  { icon: UserCog, label: "Acessos", path: "/acessos", module: "access" },
];

const SIDEBAR_WIDTH_KEY = "pedagio-sidebar-width";
const DEFAULT_WIDTH = 264;
const MIN_WIDTH = 224;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? Number(saved) : DEFAULT_WIDTH;
  });
  const { loading, user, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <AccessGate
        title="Acesso controlado"
        description="Este ambiente é exclusivo para a operação de backoffice da Pedágio Digital. Entre com sua conta corporativa para continuar."
        actionLabel="Entrar no backoffice"
        onAction={() => startLogin()}
      />
    );
  }

  if (!user.accessLevel) {
    return (
      <AccessGate
        title="Permissão necessária"
        description="Sua conta está autenticada, mas ainda não possui um nível de acesso configurado. Solicite a liberação ao responsável pelo backoffice."
        actionLabel="Sair da conta"
        onAction={logout}
        secondary
      />
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function accessLevelLabel(level?: string | null) {
  return level === "admin" ? "Administrador" : level === "manager" ? "Gestor" : level === "operator" ? "Operação" : "Consulta";
}

function AccessGate({
  title,
  description,
  actionLabel,
  onAction,
  secondary,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondary?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#f7f7f3] p-6 sm:p-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center rounded-[2rem] bg-[#111418] p-8 shadow-2xl sm:p-14">
        <div className="max-w-xl text-center text-white">
          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Pedágio Digital</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/65 sm:text-base">{description}</p>
          <Button onClick={onAction} className="mt-9 h-11 px-6 font-bold" variant={secondary ? "outline" : "default"}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </main>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const effectiveLevel = user?.role === "admin" ? "admin" : user?.accessLevel;
  const visibleMenuItems = menuItems.filter(item => visibleModules(effectiveLevel as "admin" | "manager" | "operator" | "viewer").includes(item.module));
  const activeMenuItem = visibleMenuItems.find(item => item.path === location) ?? visibleMenuItems[0];

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarHeader className="h-24 px-3 pt-5">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleSidebar}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/7 text-white/80 transition-colors hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Alternar menu"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Pedágio Digital</p>
                  <p className="mt-0.5 truncate text-sm font-extrabold tracking-tight text-white">Backoffice</p>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3">
            {!isCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Operação</p>}
            <SidebarMenu className="gap-1">
              {visibleMenuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-11 rounded-xl px-3 text-[13px] font-semibold text-white/60 transition-colors hover:bg-white/8 hover:text-white data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-[0_8px_24px_rgba(246,218,0,0.18)]"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Avatar className="h-9 w-9 border-0 bg-primary text-primary-foreground">
                      <AvatarFallback className="bg-primary text-xs font-extrabold text-primary-foreground">
                        {user?.name?.charAt(0).toUpperCase() ?? "A"}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">{user?.name ?? "Administrador"}</p>
                        <p className="mt-0.5 truncate text-[10px] text-white/45">{accessLevelLabel(user?.role === "admin" ? "admin" : user?.accessLevel)}</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-semibold">{user?.name ?? "Administrador"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{user?.email ?? ""}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/40 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => setIsResizing(true)}
        />
      </div>

      <SidebarInset className="bg-[#f7f7f3]">
        {isMobile && (
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/5 bg-[#f7f7f3]/95 px-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-xl bg-white shadow-sm" />
              <span className="text-sm font-extrabold tracking-tight">{activeMenuItem.label}</span>
            </div>
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          </header>
        )}
        <main className="min-h-screen p-4 sm:p-7 lg:p-9">{children}</main>
      </SidebarInset>
    </>
  );
}
