import { useEffect, useState } from 'react';
import { Subscription } from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettings {
  enabled: boolean;
  daysBeforeRenewal: number;
  browserNotifications: boolean;
}

export function useNotifications(subscriptions: Subscription[]) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    daysBeforeRenewal: 3,
    browserNotifications: false
  });
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Verificar permissão de notificação
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Salvar configurações no localStorage
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
  };

  // Solicitar permissão para notificações
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    }
    return false;
  };

  // Verificar assinaturas que estão próximas do vencimento
  const checkUpcomingRenewals = () => {
    if (!settings.enabled) return;

    const now = new Date();
    const alertDate = new Date(now.getTime() + settings.daysBeforeRenewal * 24 * 60 * 60 * 1000);

    const upcomingRenewals = subscriptions.filter(sub => {
      if (!sub.isActive) return false;
      
      const renewalDate = new Date(sub.renewalDate);
      return renewalDate <= alertDate && renewalDate >= now;
    });

    return upcomingRenewals;
  };

  // Enviar notificação do navegador
  const sendBrowserNotification = (subscription: Subscription) => {
    if (!settings.browserNotifications || permission !== 'granted') return;

    const renewalDate = new Date(subscription.renewalDate);
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    const notification = new Notification(`Assinatura ${subscription.name} vence em breve!`, {
      body: `Sua assinatura de ${subscription.name} vence em ${daysUntilRenewal} dia(s). Valor: ${subscription.currency} ${subscription.price.toFixed(2)}`,
      icon: '/favicon.ico',
      tag: `subscription-${subscription.id}`,
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-fechar após 10 segundos
    setTimeout(() => {
      notification.close();
    }, 10000);
  };

  // Enviar notificação toast
  const sendToastNotification = (subscription: Subscription) => {
    const renewalDate = new Date(subscription.renewalDate);
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    toast({
      title: `⚠️ Assinatura vencendo!`,
      description: `${subscription.name} vence em ${daysUntilRenewal} dia(s) - ${subscription.currency} ${subscription.price.toFixed(2)}`,
      duration: 8000,
    });
  };

  // Verificar e enviar notificações
  const checkAndNotify = () => {
    const upcomingRenewals = checkUpcomingRenewals();
    
    upcomingRenewals.forEach(subscription => {
      // Verificar se já notificamos hoje para esta assinatura
      const notificationKey = `notified-${subscription.id}-${new Date().toDateString()}`;
      const alreadyNotified = localStorage.getItem(notificationKey);
      
      if (!alreadyNotified) {
        sendToastNotification(subscription);
        
        if (settings.browserNotifications) {
          sendBrowserNotification(subscription);
        }
        
        // Marcar como notificado hoje
        localStorage.setItem(notificationKey, 'true');
      }
    });
  };

  // Verificar notificações periodicamente
  useEffect(() => {
    if (!settings.enabled) return;

    // Verificar imediatamente
    checkAndNotify();

    // Verificar a cada hora
    const interval = setInterval(checkAndNotify, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [subscriptions, settings]);

  // Limpar notificações antigas (mais de 7 dias)
  useEffect(() => {
    const cleanupOldNotifications = () => {
      const keys = Object.keys(localStorage);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      keys.forEach(key => {
        if (key.startsWith('notified-')) {
          const dateStr = key.split('-').slice(2).join('-');
          const notificationDate = new Date(dateStr);
          
          if (notificationDate < sevenDaysAgo) {
            localStorage.removeItem(key);
          }
        }
      });
    };

    cleanupOldNotifications();
    
    // Limpar a cada 24 horas
    const interval = setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    settings,
    updateSettings,
    permission,
    requestNotificationPermission,
    checkUpcomingRenewals,
    checkAndNotify
  };
}