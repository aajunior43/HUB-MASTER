import { useState } from 'react';
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { 
  Settings, 
  History, 
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { ConfigurationPanel } from '@/components/configuration/ConfigurationPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AppSidebarProps {
  onApiKeyChange: (geminiKey: string) => void;
  onAIConfigChange: (model: string) => void;
}

export function AppSidebar({ onApiKeyChange, onAIConfigChange }: AppSidebarProps) {
  const [activePanel, setActivePanel] = useState<'config' | 'history' | 'analytics' | null>('config');
  const [configOpen, setConfigOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const handlePanelToggle = (panel: 'config' | 'history' | 'analytics') => {
    if (panel === 'config') {
      setConfigOpen(!configOpen);
      if (!configOpen) {
        setHistoryOpen(false);
        setAnalyticsOpen(false);
        setActivePanel('config');
      } else {
        setActivePanel(null);
      }
    } else if (panel === 'history') {
      setHistoryOpen(!historyOpen);
      if (!historyOpen) {
        setConfigOpen(false);
        setAnalyticsOpen(false);
        setActivePanel('history');
      } else {
        setActivePanel(null);
      }
    } else if (panel === 'analytics') {
      setAnalyticsOpen(!analyticsOpen);
      if (!analyticsOpen) {
        setConfigOpen(false);
        setHistoryOpen(false);
        setActivePanel('analytics');
      } else {
        setActivePanel(null);
      }
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/30 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Settings className="h-4 w-4 text-primary" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-sm font-semibold">Painel de Controle</h2>
            <p className="text-xs text-muted-foreground">Configure e monitore</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarMenu>
            {/* Configuration Panel */}
            <SidebarMenuItem>
              <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => handlePanelToggle('config')}
                    className="w-full justify-between"
                    isActive={activePanel === 'config'}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">Configuração</span>
                    </div>
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${
                        configOpen ? 'rotate-90' : ''
                      }`} 
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                  <Card className="mt-2 border-border/30">
                    <CardContent className="p-3">
                      <ConfigurationPanel
                        onApiKeyChange={onApiKeyChange}
                        onAIConfigChange={onAIConfigChange}
                      />
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>

            {/* History Panel */}
            <SidebarMenuItem>
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => handlePanelToggle('history')}
                    className="w-full justify-between"
                    isActive={activePanel === 'history'}
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">Histórico</span>
                    </div>
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${
                        historyOpen ? 'rotate-90' : ''
                      }`} 
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                  <Card className="mt-2 border-border/30">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <HistoryPanel />
                        <p className="text-xs text-muted-foreground mt-2">
                          Visualize o histórico completo de renomeações
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>

            {/* Analytics Panel */}
            <SidebarMenuItem>
              <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => handlePanelToggle('analytics')}
                    className="w-full justify-between"
                    isActive={activePanel === 'analytics'}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">Analytics</span>
                    </div>
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden ${
                        analyticsOpen ? 'rotate-90' : ''
                      }`} 
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                  <Card className="mt-2 border-border/30">
                    <CardContent className="p-3">
                      <div className="text-center">
                        <AnalyticsDashboard />
                        <p className="text-xs text-muted-foreground mt-2">
                          Monitore métricas e performance
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}