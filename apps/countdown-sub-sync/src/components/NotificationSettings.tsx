import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Settings } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Subscription } from "@/types/subscription";
import { useToast } from "@/hooks/use-toast";

interface NotificationSettingsProps {
  subscriptions: Subscription[];
}

export function NotificationSettings({ subscriptions }: NotificationSettingsProps) {
  const {
    settings,
    updateSettings,
    permission,
    requestNotificationPermission,
    checkUpcomingRenewals
  } = useNotifications(subscriptions);
  const { toast } = useToast();

  const upcomingRenewals = checkUpcomingRenewals();

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast({
          title: "Permissão negada",
          description: "Não foi possível ativar as notificações do navegador. Verifique as configurações do seu navegador.",
          variant: "destructive"
        });
        return;
      }
    }
    updateSettings({ browserNotifications: enabled });
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500">Permitido</Badge>;
      case 'denied':
        return <Badge variant="destructive">Negado</Badge>;
      default:
        return <Badge variant="secondary">Não solicitado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações de Notificações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status das notificações */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {settings.enabled ? 'Notificações Ativadas' : 'Notificações Desativadas'}
              </p>
              <p className="text-sm text-muted-foreground">
                {upcomingRenewals.length} assinatura(s) vencendo nos próximos {settings.daysBeforeRenewal} dias
              </p>
            </div>
          </div>
          {getPermissionBadge()}
        </div>

        {/* Configurações principais */}
        <div className="space-y-4">
          {/* Ativar/Desativar notificações */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications-enabled">Ativar notificações</Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas sobre vencimentos próximos
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {/* Dias antes do vencimento */}
          {settings.enabled && (
            <div className="space-y-2">
              <Label>Alertar quantos dias antes do vencimento?</Label>
              <Select
                value={settings.daysBeforeRenewal.toString()}
                onValueChange={(value) => updateSettings({ daysBeforeRenewal: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia antes</SelectItem>
                  <SelectItem value="2">2 dias antes</SelectItem>
                  <SelectItem value="3">3 dias antes</SelectItem>
                  <SelectItem value="5">5 dias antes</SelectItem>
                  <SelectItem value="7">7 dias antes</SelectItem>
                  <SelectItem value="14">14 dias antes</SelectItem>
                  <SelectItem value="30">30 dias antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notificações do navegador */}
          {settings.enabled && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="browser-notifications">Notificações do navegador</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações mesmo quando a aba não estiver ativa
                </p>
              </div>
              <Switch
                id="browser-notifications"
                checked={settings.browserNotifications}
                onCheckedChange={handleBrowserNotificationToggle}
              />
            </div>
          )}
        </div>

        {/* Assinaturas com vencimento próximo */}
        {settings.enabled && upcomingRenewals.length > 0 && (
          <div className="space-y-3">
            <Label>Vencimentos próximos ({upcomingRenewals.length})</Label>
            <div className="space-y-2">
              {upcomingRenewals.map((subscription) => {
                const renewalDate = new Date(subscription.renewalDate);
                const daysUntilRenewal = Math.ceil((renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={subscription.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div>
                      <p className="font-medium">{subscription.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.currency} {subscription.price.toFixed(2)} • {subscription.category}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/40">
                      {daysUntilRenewal === 0 ? 'Hoje' : `${daysUntilRenewal}d`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Botão para testar notificações */}
        {settings.enabled && (
          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "🔔 Teste de notificação",
                description: "As notificações estão funcionando corretamente!",
                duration: 3000,
              });
            }}
            className="w-full"
          >
            Testar notificação
          </Button>
        )}
      </CardContent>
    </Card>
  );
}