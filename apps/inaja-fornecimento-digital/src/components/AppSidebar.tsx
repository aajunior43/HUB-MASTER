import { Archive, FileText, History, LayoutGrid, Package, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type SidebarView = 'form' | 'batch' | 'history' | 'data' | 'templates' | 'settings';

interface AppSidebarProps {
  activeView: SidebarView;
  onNavigate: (view: SidebarView) => void;
}

const items = [
  { id: 'form', title: 'Solicitação', icon: FileText },
  { id: 'batch', title: 'Solicitação em lote', icon: LayoutGrid },
  { id: 'history', title: 'Histórico', icon: History },
  { id: 'data', title: 'Dados salvos', icon: Archive },
  { id: 'templates', title: 'Modelos', icon: Package },
  { id: 'settings', title: 'Preferências', icon: Settings },
] as const;

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80 shadow-xl shadow-black/10">
      <SidebarHeader className="border-b border-sidebar-border/70 bg-sidebar/95 p-3">
        <div className={`flex ${collapsed ? 'justify-center' : 'items-center gap-3 px-1'}`}>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-sidebar-primary/25 blur-md" aria-hidden />
            <div className={`${collapsed ? 'h-9 w-9' : 'h-11 w-11'} relative rounded-full border border-sidebar-primary/50 bg-sidebar-accent/50 p-1 flex items-center justify-center overflow-hidden`}>
              <img
                src="/brasao.png"
                alt="Brasão da Prefeitura de Inajá"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-[9px] tracking-[0.22em] uppercase text-sidebar-primary font-semibold font-display">
                Módulo de
              </p>
              <h1 className="font-display font-bold text-base tracking-tight text-sidebar-foreground truncate">
                Solicitações
              </h1>
              <p className="text-[10px] text-sidebar-foreground/85 truncate">Prefeitura de Inajá - PR</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/85">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5 px-2">
              {items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onNavigate(item.id)}
                      isActive={isActive}
                      aria-current={isActive ? 'page' : undefined}
                      tooltip={item.title}
                      className={`
                        group relative h-10 rounded-lg border border-transparent font-medium text-sm transition-colors
                        group-data-[collapsible=icon]:justify-center
                        ${isActive
                          ? 'border-sidebar-primary/40 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary/90'
                          : 'text-sidebar-foreground hover:border-sidebar-border/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}
                      `}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        {!collapsed ? (
          <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/85 font-display font-bold">
              Desenvolvido por
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold tracking-wide text-sidebar-primary">
              Aleksandro Alves
            </p>
          </div>
        ) : (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-primary/50 bg-sidebar-accent/40 text-[9px] font-bold text-sidebar-primary">
            AA
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
