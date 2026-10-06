import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, Settings, Download, RefreshCw, Upload, Bot, BotOff } from "lucide-react";
import { Subscription } from "@/types/subscription";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";

interface TelegramBackupProps {
  subscriptions: Subscription[];
  onRestoreBackup?: (subscriptions: Subscription[]) => void;
  onAddSubscription?: (subscription: Omit<Subscription, 'id'>) => void;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
  geminiApiKey: string;
  gmailApiKey: string;
  gmailClientId: string;
}

export function TelegramBackup({ subscriptions, onRestoreBackup, onAddSubscription }: TelegramBackupProps) {
  const [config, setConfig] = useLocalStorage<TelegramConfig>('telegramConfig', {
    botToken: '8275048279:AAFE4DKypfm6BpC_O_irY08gIsGA7EiqdPE',
    chatId: '942288759',
    geminiApiKey: 'AIzaSyBolH0TO1T4HLZ38hiwMyM7tsQHjTBy8l8',
    gmailApiKey: '',
    gmailClientId: ''
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [backupData, setBackupData] = useState('');
  const [isGettingChatId, setIsGettingChatId] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackupData, setLastBackupData] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [lastUpdateId, setLastUpdateId] = useState<number>(0);
  const [isProcessingWithAI, setIsProcessingWithAI] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationDays, setNotificationDays] = useState([7, 3, 1]); // Alertar 7, 3 e 1 dia antes
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [gmailAccessToken, setGmailAccessToken] = useState<string>('');
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(false);
  
  // Estados para conversação interativa
  const [conversationState, setConversationState] = useState<{
    [chatId: string]: {
      step: 'idle' | 'name' | 'price' | 'date' | 'description' | 'billing';
      data: Partial<Omit<Subscription, 'id'>>;
    }
  }>({});
  
  const { toast } = useToast();

  // Agendamento automático de verificações
  useEffect(() => {
    if (!isListening || !notificationsEnabled) return;

    // Verificar imediatamente ao ativar
    checkUpcomingRenewals();

    // Configurar verificação a cada 6 horas
    const interval = setInterval(() => {
      checkUpcomingRenewals();
    }, 6 * 60 * 60 * 1000); // 6 horas em millisegundos

    return () => clearInterval(interval);
  }, [isListening, notificationsEnabled, subscriptions]);

  // Verificação diária às 9h da manhã
  useEffect(() => {
    if (!isListening || !notificationsEnabled) return;

    const now = new Date();
    const next9AM = new Date();
    next9AM.setHours(9, 0, 0, 0);
    
    // Se já passou das 9h hoje, agendar para amanhã
    if (now.getHours() >= 9) {
      next9AM.setDate(next9AM.getDate() + 1);
    }

    const timeUntil9AM = next9AM.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      checkUpcomingRenewals();
      
      // Depois da primeira execução, repetir a cada 24 horas
      const dailyInterval = setInterval(() => {
        checkUpcomingRenewals();
      }, 24 * 60 * 60 * 1000);

      return () => clearInterval(dailyInterval);
    }, timeUntil9AM);

    return () => clearTimeout(timeout);
  }, [isListening, notificationsEnabled]);

  // Gerar dados de backup
  const generateBackupData = () => {
    const backupObj = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      subscriptions: subscriptions,
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.filter(s => s.isActive).length,
      totalMonthlySpending: subscriptions.reduce((sum, s) => s.billingPeriod === 'mensal' ? sum + s.price : sum, 0),
      totalAnnualSpending: subscriptions.reduce((sum, s) => s.billingPeriod === 'anual' ? sum + s.price : sum, 0)
    };
    
    return JSON.stringify(backupObj, null, 2);
  };

  // Gerar texto legível
  const generateReadableText = () => {
    const activeSubscriptions = subscriptions.filter(s => s.isActive);
    const monthlyTotal = subscriptions.reduce((sum, s) => s.billingPeriod === 'mensal' ? sum + s.price : sum, 0);
    const annualTotal = subscriptions.reduce((sum, s) => s.billingPeriod === 'anual' ? sum + s.price : sum, 0);
    
    let text = `📊 BACKUP DAS ASSINATURAS\n`;
    text += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    text += `📈 RESUMO:\n`;
    text += `• Total de assinaturas: ${subscriptions.length}\n`;
    text += `• Assinaturas ativas: ${activeSubscriptions.length}\n`;
    text += `• Gasto mensal: R$ ${monthlyTotal.toFixed(2)}\n`;
    text += `• Gasto anual: R$ ${annualTotal.toFixed(2)}\n`;
    text += `• Projeção anual: R$ ${(monthlyTotal * 12 + annualTotal).toFixed(2)}\n\n`;
    
    if (activeSubscriptions.length > 0) {
      text += `📋 ASSINATURAS ATIVAS:\n`;
      activeSubscriptions.forEach((sub, index) => {
        const renewalDate = new Date(sub.renewalDate).toLocaleDateString('pt-BR');
        text += `${index + 1}. ${sub.name}\n`;
        text += `   💰 ${sub.currency} ${sub.price.toFixed(2)} (${sub.billingPeriod})\n`;
        text += `   📅 Renovação: ${renewalDate}\n`;
        text += `   🏷️ Categoria: ${sub.category}\n`;
        if (sub.description) {
          text += `   📝 ${sub.description}\n`;
        }
        text += `\n`;
      });
    }
    
    const inactiveSubscriptions = subscriptions.filter(s => !s.isActive);
    if (inactiveSubscriptions.length > 0) {
      text += `❌ ASSINATURAS INATIVAS:\n`;
      inactiveSubscriptions.forEach((sub, index) => {
        text += `${index + 1}. ${sub.name} - ${sub.currency} ${sub.price.toFixed(2)}\n`;
      });
    }
    
    return text;
  };

  // Buscar Chat ID automaticamente
  const getChatId = async () => {
    if (!config.botToken) {
      toast({
        title: "Erro",
        description: "Configure o token do bot primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsGettingChatId(true);
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar atualizações');
      }
      
      const data = await response.json();
      
      if (data.result && data.result.length > 0) {
        // Pegar o chat ID da mensagem mais recente
        const lastMessage = data.result[data.result.length - 1];
        const chatId = lastMessage.message?.chat?.id || lastMessage.message?.from?.id;
        
        if (chatId) {
          setConfig({ ...config, chatId: chatId.toString() });
          toast({
            title: "✅ Chat ID encontrado!",
            description: `Chat ID: ${chatId}`
          });
        } else {
          toast({
            title: "⚠️ Nenhuma mensagem encontrada",
            description: "Envie uma mensagem para o bot primeiro e tente novamente.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "⚠️ Nenhuma mensagem encontrada",
          description: "Envie uma mensagem para o bot primeiro e tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar Chat ID:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar Chat ID. Verifique o token do bot.",
        variant: "destructive"
      });
    } finally {
      setIsGettingChatId(false);
    }
  };

  // Verificar se o bot pode acessar o chat
  const testBotAccess = async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: '🤖 Teste de conexão do bot'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`${errorData.description || 'Erro desconhecido'}`);
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  };

  // Enviar backup via Telegram
  const sendTelegramBackup = async () => {
    if (!config.botToken || !config.chatId) {
      toast({
        title: "Erro",
        description: "Configure o token do bot e o chat ID do Telegram primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    try {
      // Primeiro, testar se o bot pode acessar o chat
      await testBotAccess();
      
      const jsonData = generateBackupData();
      const textData = generateReadableText();
      
      // Enviar texto legível primeiro (mais simples)
      const textResponse = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: textData,
          parse_mode: 'HTML'
        })
      });
      
      if (!textResponse.ok) {
        const errorData = await textResponse.json();
        console.error('Erro da API Telegram (sendMessage):', errorData);
        throw new Error(`Erro ao enviar texto: ${textResponse.status} - ${errorData.description}`);
      }
      
      // Enviar arquivo JSON
      const jsonBlob = new Blob([jsonData], { type: 'application/json' });
      const formData = new FormData();
      formData.append('chat_id', config.chatId);
      formData.append('document', jsonBlob, `backup-assinaturas-${new Date().toISOString().split('T')[0]}.json`);
      formData.append('caption', '📄 Backup das assinaturas em formato JSON');
      
      const fileResponse = await fetch(`https://api.telegram.org/bot${config.botToken}/sendDocument`, {
        method: 'POST',
        body: formData
      });
      
      if (!fileResponse.ok) {
        const errorData = await fileResponse.json();
        console.error('Erro da API Telegram (sendDocument):', errorData);
        throw new Error(`Erro ao enviar arquivo JSON: ${fileResponse.status} - ${errorData.description}`);
      }

      
      toast({
        title: "✅ Backup enviado!",
        description: "Backup enviado com sucesso para o Telegram."
      });
      
    } catch (error) {
      console.error('Erro ao enviar backup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: `Erro ao enviar backup: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };



  // Buscar último backup do Telegram
  const getLastBackup = async () => {
    if (!config.botToken || !config.chatId) {
      toast({
        title: "Erro",
        description: "Configure o token do bot e o chat ID do Telegram primeiro.",
        variant: "destructive"
      });
      return;
    }

    setIsRestoring(true);
    
    try {
      // Buscar mensagens recentes do chat
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?limit=100`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar mensagens do Telegram');
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.description || 'Erro ao buscar mensagens');
      }
      
      // Filtrar mensagens do chat específico que contêm backup
      const backupMessages = data.result
        .filter((update: any) => 
          update.message && 
          update.message.chat.id.toString() === config.chatId &&
          update.message.text &&
          update.message.text.includes('"timestamp"') &&
          update.message.text.includes('"subscriptions"')
        )
        .sort((a: any, b: any) => b.message.date - a.message.date); // Mais recente primeiro
      
      if (backupMessages.length === 0) {
        toast({
          title: "Nenhum backup encontrado",
          description: "Não foram encontrados backups recentes no Telegram.",
          variant: "destructive"
        });
        return;
      }
      
      // Pegar o backup mais recente
      const lastMessage = backupMessages[0];
      const backupText = lastMessage.message.text;
      
      // Extrair JSON do texto
      const jsonMatch = backupText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Formato de backup inválido');
      }
      
      const backupData = JSON.parse(jsonMatch[0]);
      setLastBackupData(backupData);
      
      const backupDate = new Date(backupData.timestamp).toLocaleString('pt-BR');
      
      toast({
        title: "Backup encontrado!",
        description: `Backup de ${backupDate} com ${backupData.totalSubscriptions} assinaturas.`
      });
      
    } catch (error) {
      console.error('Erro ao buscar backup:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao buscar último backup.",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Restaurar backup
  const restoreBackup = () => {
    if (!lastBackupData || !onRestoreBackup) {
      toast({
        title: "Erro",
        description: "Nenhum backup disponível para restaurar.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const subscriptionsToRestore = lastBackupData.subscriptions;
      
      if (!Array.isArray(subscriptionsToRestore)) {
        throw new Error('Dados de backup inválidos');
      }
      
      onRestoreBackup(subscriptionsToRestore);
      
      toast({
        title: "Backup restaurado!",
        description: `${subscriptionsToRestore.length} assinaturas foram restauradas com sucesso.`
      });
      
      setLastBackupData(null);
      
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      toast({
        title: "Erro",
        description: "Erro ao restaurar backup. Verifique os dados.",
        variant: "destructive"
      });
    }
  };

  // Processar comando para adicionar assinatura
  const processAddSubscriptionCommand = (text: string) => {
    try {
      // Formato esperado: /add Nome|Preço|Data|Descrição|Periodicidade
      // Exemplo: /add Netflix|29.90|2024-01-15T10:00|Plano Premium|mensal
      
      if (!text.startsWith('/add ')) {
        return null;
      }
      
      const params = text.substring(5).split('|');
      
      if (params.length < 3) {
        throw new Error('Formato inválido. Use: /add Nome|Preço|Data|Descrição|Periodicidade');
      }
      
      const [name, priceStr, dateStr, description = '', billingPeriod = 'mensal'] = params;
      
      const price = parseFloat(priceStr.replace(',', '.'));
      
      if (isNaN(price) || price <= 0) {
        throw new Error('Preço inválido');
      }
      
      // Validar data
      const renewalDate = new Date(dateStr);
      if (isNaN(renewalDate.getTime())) {
        throw new Error('Data inválida. Use formato: YYYY-MM-DDTHH:MM');
      }
      

      
      // Validar periodicidade
      if (!['mensal', 'anual'].includes(billingPeriod)) {
        throw new Error('Periodicidade inválida. Use: mensal ou anual');
      }
      
      const subscription: Omit<Subscription, 'id'> = {
        name: name.trim(),
        price,
        currency: 'R$',
        renewalDate: renewalDate.toISOString(),

        description: description.trim(),
        isActive: true,
        billingPeriod: billingPeriod as 'mensal' | 'anual'
      };
      
      return subscription;
      
    } catch (error) {
      throw error;
    }
  };

  // Enviar mensagem para o Telegram
  const sendTelegramMessage = async (text: string, parseMode: 'Markdown' | 'HTML' | undefined = undefined) => {
    try {
      await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          parse_mode: parseMode
        })
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  // Calcular dias restantes até vencimento
  const calculateDaysUntilRenewal = (renewalDate: string): number => {
    const today = new Date();
    const renewal = new Date(renewalDate);
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Verificar assinaturas próximas do vencimento
  const checkUpcomingRenewals = async () => {
    if (!notificationsEnabled || !config.botToken || !config.chatId) {
      return;
    }

    const today = new Date();
    const upcomingRenewals: Array<{
      subscription: Subscription;
      daysLeft: number;
    }> = [];

    subscriptions.forEach(subscription => {
      if (!subscription.isActive) return;
      
      const daysLeft = calculateDaysUntilRenewal(subscription.renewalDate);
      
      // Verificar se está nos dias de notificação configurados
      if (notificationDays.includes(daysLeft) && daysLeft >= 0) {
        upcomingRenewals.push({ subscription, daysLeft });
      }
    });

    // Enviar notificações
    for (const { subscription, daysLeft } of upcomingRenewals) {
      await sendRenewalNotification(subscription, daysLeft);
    }
  };

  // Enviar notificação de vencimento
  const sendRenewalNotification = async (subscription: Subscription, daysLeft: number) => {
    let message = '';
    let emoji = '';
    
    if (daysLeft === 0) {
      emoji = '🚨';
      message = `${emoji} *VENCE HOJE!*\n\n`;
    } else if (daysLeft === 1) {
      emoji = '⚠️';
      message = `${emoji} *Vence amanhã!*\n\n`;
    } else {
      emoji = '📅';
      message = `${emoji} *Vence em ${daysLeft} dias*\n\n`;
    }
    
    message += `📝 *Assinatura:* ${subscription.name}\n`;
    message += `💰 *Valor:* R$ ${subscription.price.toFixed(2)}\n`;
    message += `📅 *Data de renovação:* ${new Date(subscription.renewalDate).toLocaleDateString('pt-BR')}\n`;
    message += `🏷️ *Categoria:* ${subscription.category}\n`;
    
    if (subscription.description) {
      message += `📝 *Descrição:* ${subscription.description}\n`;
    }
    
    message += `⏰ *Periodicidade:* ${subscription.billingPeriod}\n\n`;
    
    if (daysLeft <= 1) {
      message += `💡 *Dica:* Verifique se o pagamento está em dia para evitar interrupções no serviço.`;
    } else {
      message += `💡 *Lembrete:* Prepare-se para o pagamento que se aproxima.`;
    }
    
    await sendTelegramMessage(message, 'Markdown');
   };

  // Conectar com Gmail usando OAuth2
  const connectGmail = async () => {
    if (!config.gmailClientId) {
      toast({
        title: "Erro",
        description: "Configure o Client ID do Gmail primeiro",
        variant: "destructive"
      });
      return;
    }

    try {
      // Usar Google OAuth2 para obter token de acesso
      const scope = 'https://www.googleapis.com/auth/gmail.readonly';
      const redirectUri = window.location.origin;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${config.gmailClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=token&` +
        `access_type=offline`;
      
      // Abrir popup para autenticação
      const popup = window.open(authUrl, 'gmail-auth', 'width=500,height=600');
      
      // Aguardar resposta do popup
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Verificar se token foi obtido (implementação simplificada)
          const urlParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = urlParams.get('access_token');
          
          if (accessToken) {
            setGmailAccessToken(accessToken);
            setIsGmailConnected(true);
            toast({
              title: "Sucesso",
              description: "Gmail conectado com sucesso!"
            });
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao conectar Gmail:', error);
      toast({
        title: "Erro",
        description: "Falha ao conectar com Gmail",
        variant: "destructive"
      });
    }
  };

  // Buscar emails de faturas no Gmail
  const searchGmailInvoices = async () => {
    if (!isGmailConnected || !gmailAccessToken) {
      await sendTelegramMessage('❌ Gmail não conectado. Use a interface para conectar primeiro.');
      return;
    }

    try {
      await sendTelegramMessage('🔍 Buscando faturas no Gmail...');
      
      // Termos de busca para faturas
      const searchTerms = [
        'fatura',
        'invoice',
        'cobrança',
        'billing',
        'subscription',
        'assinatura',
        'renovação',
        'renewal'
      ];
      
      const query = searchTerms.map(term => `subject:${term}`).join(' OR ');
      
      // Buscar emails dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateQuery = `after:${thirtyDaysAgo.getFullYear()}/${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}/${thirtyDaysAgo.getDate().toString().padStart(2, '0')}`;
      
      const fullQuery = `(${query}) AND ${dateQuery}`;
      
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(fullQuery)}&maxResults=20`,
        {
          headers: {
            'Authorization': `Bearer ${gmailAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.messages || data.messages.length === 0) {
        await sendTelegramMessage('📧 Nenhuma fatura encontrada nos últimos 30 dias.');
        return;
      }
      
      // Processar emails encontrados
      const invoices = [];
      
      for (const message of data.messages.slice(0, 10)) { // Limitar a 10 emails
        try {
          const emailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: {
                'Authorization': `Bearer ${gmailAccessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const emailData = await emailResponse.json();
          const headers = emailData.payload.headers;
          
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
          const from = headers.find((h: any) => h.name === 'From')?.value || '';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';
          
          // Extrair corpo do email (simplificado)
          let body = '';
          if (emailData.payload.body?.data) {
            body = atob(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } else if (emailData.payload.parts) {
            const textPart = emailData.payload.parts.find((part: any) => part.mimeType === 'text/plain');
            if (textPart?.body?.data) {
              body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
          }
          
          invoices.push({
            subject,
            from,
            date,
            body: body.substring(0, 500) // Limitar tamanho
          });
          
        } catch (emailError) {
          console.error('Erro ao processar email:', emailError);
        }
      }
      
      // Enviar relatório de faturas encontradas
      if (invoices.length > 0) {
        let message = `📧 *Faturas encontradas (${invoices.length}):*\n\n`;
        
        invoices.forEach((invoice, index) => {
          message += `${index + 1}. *${invoice.subject}*\n`;
          message += `   📤 De: ${invoice.from}\n`;
          message += `   📅 Data: ${new Date(invoice.date).toLocaleDateString('pt-BR')}\n\n`;
        });
        
        message += `💡 *Dica:* Use a IA para processar essas faturas automaticamente:\n`;
        message += `"Processar fatura da Netflix de R$ 29,90"`;
        
        await sendTelegramMessage(message, 'Markdown');
      } else {
        await sendTelegramMessage('📧 Nenhuma fatura válida encontrada.');
      }
      
    } catch (error) {
      console.error('Erro ao buscar faturas:', error);
      await sendTelegramMessage(`❌ Erro ao buscar faturas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Processar fatura automaticamente com IA
  const processInvoiceWithAI = async (invoiceText: string) => {
    if (!config.geminiApiKey) {
      await sendTelegramMessage('❌ IA não configurada. Configure a chave do Gemini primeiro.');
      return;
    }

    try {
      await sendTelegramMessage('🤖 Processando fatura com IA...');
      
      const prompt = `
Você é um assistente especializado em extrair informações de faturas de assinaturas.

Analise o texto da fatura abaixo e extraia as seguintes informações:
- name (nome do serviço/empresa)
- price (valor da fatura, apenas números)
- renewalDate (próxima data de vencimento no formato ISO)
- category (categoria do serviço)
- description (descrição do plano/serviço)
- billingPeriod ("mensal" ou "anual")

Regras:
1. Se não conseguir identificar alguma informação, use valores padrão inteligentes
2. Para renewalDate, calcule baseado na data da fatura + período de cobrança
3. Sempre retorne currency como "R$" e isActive como true
4. Se o valor não estiver claro, retorne null

Retorne APENAS um JSON válido no formato:
{
  "name": "string",
  "price": number,
  "currency": "R$",
  "renewalDate": "YYYY-MM-DDTHH:MM:SS.000Z",
  "category": "string",
  "description": "string",
  "isActive": true,
  "billingPeriod": "mensal" | "anual"
}

Texto da fatura:
"${invoiceText}"`;
      
      const subscriptionData = await interpretWithGemini(prompt);
      
      if (subscriptionData) {
        // Confirmar dados extraídos da fatura
        const confirmationText = 
          `📧 *Fatura processada pela IA:*\n\n` +
          `📝 *Nome:* ${subscriptionData.name}\n` +
          `💰 *Preço:* R$ ${subscriptionData.price.toFixed(2)}\n` +
          `📅 *Próximo vencimento:* ${new Date(subscriptionData.renewalDate).toLocaleDateString('pt-BR')}\n` +

          `📝 *Descrição:* ${subscriptionData.description || 'Nenhuma'}\n` +
          `⏰ *Periodicidade:* ${subscriptionData.billingPeriod}\n\n` +
          `✅ Digite "confirmar" para adicionar\n` +
          `❌ Digite "cancelar" para cancelar`;
        
        await sendTelegramMessage(confirmationText, 'Markdown');
        
        // Armazenar para confirmação (usar sistema existente)
        // Esta parte se integraria com o sistema de confirmação já implementado
        
      } else {
        await sendTelegramMessage('❌ Não foi possível extrair informações válidas da fatura.');
      }
      
    } catch (error) {
      await sendTelegramMessage(`❌ Erro ao processar fatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Enviar relatório de vencimentos
  const sendRenewalReport = async () => {
    if (!config.botToken || !config.chatId) return;
    
    const activeSubscriptions = subscriptions.filter(s => s.isActive);
    if (activeSubscriptions.length === 0) {
      await sendTelegramMessage('📋 Nenhuma assinatura ativa encontrada.');
      return;
    }
    
    // Agrupar por período de vencimento
    const today = new Date();
    const next7Days: Subscription[] = [];
    const next30Days: Subscription[] = [];
    const later: Subscription[] = [];
    
    activeSubscriptions.forEach(sub => {
      const daysLeft = calculateDaysUntilRenewal(sub.renewalDate);
      
      if (daysLeft <= 7) {
        next7Days.push(sub);
      } else if (daysLeft <= 30) {
        next30Days.push(sub);
      } else {
        later.push(sub);
      }
    });
    
    let message = `📊 *Relatório de Vencimentos*\n\n`;
    
    if (next7Days.length > 0) {
      message += `🚨 *Próximos 7 dias (${next7Days.length}):*\n`;
      next7Days.forEach(sub => {
        const daysLeft = calculateDaysUntilRenewal(sub.renewalDate);
        const dateStr = new Date(sub.renewalDate).toLocaleDateString('pt-BR');
        message += `• ${sub.name} - ${daysLeft} dias (${dateStr})\n`;
      });
      message += '\n';
    }
    
    if (next30Days.length > 0) {
      message += `📅 *Próximos 30 dias (${next30Days.length}):*\n`;
      next30Days.forEach(sub => {
        const daysLeft = calculateDaysUntilRenewal(sub.renewalDate);
        const dateStr = new Date(sub.renewalDate).toLocaleDateString('pt-BR');
        message += `• ${sub.name} - ${daysLeft} dias (${dateStr})\n`;
      });
      message += '\n';
    }
    
    if (later.length > 0) {
      message += `📆 *Mais de 30 dias (${later.length}):*\n`;
      later.slice(0, 5).forEach(sub => {
        const daysLeft = calculateDaysUntilRenewal(sub.renewalDate);
        const dateStr = new Date(sub.renewalDate).toLocaleDateString('pt-BR');
        message += `• ${sub.name} - ${daysLeft} dias (${dateStr})\n`;
      });
      if (later.length > 5) {
        message += `• ... e mais ${later.length - 5} assinaturas\n`;
      }
    }
    
    const totalMonthly = activeSubscriptions
      .filter(s => s.billingPeriod === 'mensal')
      .reduce((sum, s) => sum + s.price, 0);
    
    const totalAnnual = activeSubscriptions
      .filter(s => s.billingPeriod === 'anual')
      .reduce((sum, s) => sum + s.price, 0);
    
    message += `\n💰 *Resumo financeiro:*\n`;
    message += `📅 Mensal: R$ ${totalMonthly.toFixed(2)}\n`;
    message += `📅 Anual: R$ ${totalAnnual.toFixed(2)}\n`;
    message += `📊 Total/mês: R$ ${(totalMonthly + totalAnnual/12).toFixed(2)}`;
    
    await sendTelegramMessage(message, 'Markdown');
  };

  // Interpretar mensagem com Gemini AI
  const interpretWithGemini = async (userMessage: string): Promise<Omit<Subscription, 'id'> | null> => {
    if (!config.geminiApiKey) {
      throw new Error('Chave da API do Gemini não configurada');
    }

    try {
      const prompt = `
Você é um assistente especializado em extrair informações de assinaturas de serviços a partir de mensagens em linguagem natural.

Extração de dados:
A partir da mensagem do usuário, extraia as seguintes informações para criar uma assinatura:
- name (nome do serviço)
- price (preço numérico, apenas números)
- renewalDate (data no formato ISO: YYYY-MM-DDTHH:MM:SS.000Z)
- category (uma das opções: Streaming, Software, Música, Jogos, Produtividade, Educação, Saúde, Outros)
- description (descrição opcional)
- billingPeriod ("mensal" ou "anual")

Regras importantes:
1. Se a data não for especificada, use o próximo mês (mesmo dia)
2. Se o preço não for especificado, retorne null
3. Se o nome não for especificado, retorne null
4. Se a categoria não for clara, use "Outros"
5. Se a periodicidade não for especificada, use "mensal"
6. Para o renewalDate, sempre adicione horário 10:00:00.000Z
7. Sempre retorne currency como "R$" e isActive como true

Formato de resposta:
Retorne APENAS um JSON válido no seguinte formato:
{
  "name": "string",
  "price": number,
  "currency": "R$",
  "renewalDate": "YYYY-MM-DDTHH:MM:SS.000Z",
  "category": "string",
  "description": "string",
  "isActive": true,
  "billingPeriod": "mensal" | "anual"
}

Se não conseguir extrair informações suficientes (pelo menos name e price), retorne: null

Mensagem do usuário: "${userMessage}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Gemini: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('Resposta vazia do Gemini');
      }

      // Extrair JSON da resposta
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      
      // Validar dados essenciais
      if (!extractedData.name || !extractedData.price || extractedData.price <= 0) {
        return null;
      }

      return extractedData;

    } catch (error) {
      console.error('Erro ao interpretar com Gemini:', error);
      throw error;
    }
  };

  // Processar mensagem com IA
  const processMessageWithAI = async (chatId: string, message: string) => {
    setIsProcessingWithAI(true);
    
    try {
      await sendTelegramMessage('🤖 Analisando sua mensagem com IA...');
      
      const subscriptionData = await interpretWithGemini(message);
      
      if (!subscriptionData) {
        await sendTelegramMessage(
          '❌ Não consegui extrair informações suficientes da sua mensagem.\n\n' +
          'Tente ser mais específico, incluindo pelo menos:\n' +
          '• Nome do serviço\n' +
          '• Preço\n\n' +
          'Exemplo: "Quero adicionar Netflix por R$ 29,90 mensal"\n\n' +
          'Ou use /nova para o modo conversacional.'
        );
        return;
      }

      // Confirmar dados extraídos
      const confirmationText = 
        `🎯 *Dados extraídos pela IA:*\n\n` +
        `📝 *Nome:* ${subscriptionData.name}\n` +
        `💰 *Preço:* R$ ${subscriptionData.price.toFixed(2)}\n` +
        `📅 *Renovação:* ${new Date(subscriptionData.renewalDate).toLocaleDateString('pt-BR')}\n` +
        `🏷️ *Categoria:* ${subscriptionData.category}\n` +
        `📝 *Descrição:* ${subscriptionData.description || 'Nenhuma'}\n` +
        `⏰ *Periodicidade:* ${subscriptionData.billingPeriod}\n\n` +
        `✅ Digite "confirmar" para adicionar\n` +
        `❌ Digite "cancelar" para cancelar\n` +
        `✏️ Digite "editar" para usar modo conversacional`;

      await sendTelegramMessage(confirmationText, 'Markdown');
      
      // Armazenar dados para confirmação
      setConversationState(prev => ({
        ...prev,
        [chatId]: {
          step: 'idle',
          data: { ...subscriptionData, pendingConfirmation: true }
        }
      }));
      
    } catch (error) {
      await sendTelegramMessage(
        `❌ Erro ao processar com IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\n` +
        'Tente novamente ou use /nova para o modo conversacional.'
      );
    } finally {
      setIsProcessingWithAI(false);
    }
  };

  // Processar confirmação de dados da IA
  const processAIConfirmation = async (chatId: string, message: string) => {
    const currentState = conversationState[chatId];
    if (!currentState?.data?.pendingConfirmation) {
      return false;
    }

    const response = message.toLowerCase().trim();
    
    if (response === 'confirmar' || response === 'sim' || response === 'ok') {
      // Confirmar e adicionar assinatura
      const { pendingConfirmation, ...subscriptionData } = currentState.data;
      
      if (onAddSubscription) {
        onAddSubscription(subscriptionData as Omit<Subscription, 'id'>);
      }
      
      // Limpar estado
      setConversationState(prev => {
        const newState = { ...prev };
        delete newState[chatId];
        return newState;
      });
      
      await sendTelegramMessage(
        `🎉 *Assinatura adicionada com sucesso!*\n\n` +
        `A assinatura "${subscriptionData.name}" foi adicionada à sua lista.`,
        'Markdown'
      );
      
      return true;
      
    } else if (response === 'cancelar' || response === 'não' || response === 'nao') {
      // Cancelar
      setConversationState(prev => {
        const newState = { ...prev };
        delete newState[chatId];
        return newState;
      });
      
      await sendTelegramMessage('❌ Operação cancelada.');
      return true;
      
    } else if (response === 'editar' || response === 'modificar') {
      // Iniciar modo conversacional
      await startAddConversation(chatId);
      return true;
    }
    
    // Resposta não reconhecida
    await sendTelegramMessage(
      'Por favor, responda com:\n' +
      '✅ "confirmar" para adicionar\n' +
      '❌ "cancelar" para cancelar\n' +
      '✏️ "editar" para modo conversacional'
    );
    
    return true;
  };

  // Iniciar conversa para adicionar assinatura
  const startAddConversation = async (chatId: string) => {
    setConversationState(prev => ({
      ...prev,
      [chatId]: {
        step: 'name',
        data: { currency: 'R$', isActive: true }
      }
    }));
    
    await sendTelegramMessage(
      '🎯 Vamos adicionar uma nova assinatura!\n\n' +
      '📝 *Passo 1/6:* Qual é o nome da assinatura?\n\n' +
      '_Exemplo: Netflix, Spotify, Adobe Creative Cloud_',
      'Markdown'
    );
  };

  // Processar resposta da conversa
  const processConversationStep = async (chatId: string, message: string) => {
    const currentState = conversationState[chatId];
    if (!currentState) return false;
    
    // Se está editando, usar função específica de edição
    if (currentState.data?.isEditing) {
      return await processEditStep(chatId, message);
    }
    
    const { step, data } = currentState;
    
    try {
      switch (step) {
        case 'name':
          if (!message.trim()) {
            await sendTelegramMessage('❌ Nome não pode estar vazio. Tente novamente:');
            return true;
          }
          
          setConversationState(prev => ({
            ...prev,
            [chatId]: {
              step: 'price',
              data: { ...data, name: message.trim() }
            }
          }));
          
          await sendTelegramMessage(
            `✅ Nome: *${message.trim()}*\n\n` +
            '💰 *Passo 2/6:* Qual é o preço da assinatura?\n\n' +
            '_Exemplo: 29.90 ou 29,90_',
            'Markdown'
          );
          return true;
          
        case 'price':
          const price = parseFloat(message.replace(',', '.'));
          if (isNaN(price) || price <= 0) {
            await sendTelegramMessage('❌ Preço inválido. Digite um número válido (ex: 29.90):');
            return true;
          }
          
          setConversationState(prev => ({
            ...prev,
            [chatId]: {
              step: 'date',
              data: { ...data, price }
            }
          }));
          
          await sendTelegramMessage(
            `✅ Preço: *R$ ${price.toFixed(2)}*\n\n` +
            '📅 *Passo 3/6:* Qual é a data de renovação?\n\n' +
            '_Formato: DD/MM/AAAA ou AAAA-MM-DD_\n' +
            '_Exemplo: 15/12/2024 ou 2024-12-15_',
            'Markdown'
          );
          return true;
          
        case 'date':
          let renewalDate: Date;
          
          // Tentar diferentes formatos de data
          if (message.includes('/')) {
            // Formato DD/MM/AAAA
            const [day, month, year] = message.split('/');
            renewalDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else if (message.includes('-')) {
            // Formato AAAA-MM-DD
            renewalDate = new Date(message);
          } else {
            await sendTelegramMessage('❌ Formato de data inválido. Use DD/MM/AAAA ou AAAA-MM-DD:');
            return true;
          }
          
          if (isNaN(renewalDate.getTime())) {
            await sendTelegramMessage('❌ Data inválida. Tente novamente (ex: 15/12/2024):');
            return true;
          }
          
          setConversationState(prev => ({
            ...prev,
            [chatId]: {
              step: 'description',
              data: { ...data, renewalDate: renewalDate.toISOString() }
            }
          }));
          
          await sendTelegramMessage(
            `✅ Data: *${renewalDate.toLocaleDateString('pt-BR')}*\n\n` +
            '📝 *Passo 4/5:* Adicione uma descrição (opcional)\n\n' +
            '_Exemplo: Plano Premium, Conta Familiar, etc._\n' +
            '_Ou digite "pular" para pular esta etapa_',
            'Markdown'
          );
          return true;
          

          
        case 'description':
          const description = message.toLowerCase() === 'pular' ? '' : message.trim();
          
          setConversationState(prev => ({
            ...prev,
            [chatId]: {
              step: 'billing',
              data: { ...data, description }
            }
          }));
          
          await sendTelegramMessage(
            `✅ Descrição: *${description || 'Nenhuma'}*\n\n` +
            '⏰ *Passo 5/5:* Qual é a periodicidade de cobrança?\n\n' +
            '1️⃣ Mensal\n' +
            '2️⃣ Anual\n\n' +
            '_Digite 1, 2, "mensal" ou "anual"_',
            'Markdown'
          );
          return true;
          
        case 'billing':
          let billingPeriod: 'mensal' | 'anual';
          
          if (message === '1' || message.toLowerCase() === 'mensal') {
            billingPeriod = 'mensal';
          } else if (message === '2' || message.toLowerCase() === 'anual') {
            billingPeriod = 'anual';
          } else {
            await sendTelegramMessage('❌ Opção inválida. Digite 1 (mensal) ou 2 (anual):');
            return true;
          }
          
          // Finalizar e criar assinatura
          const finalData = { ...data, billingPeriod };
          
          if (onAddSubscription) {
            onAddSubscription(finalData as Omit<Subscription, 'id'>);
          }
          
          // Limpar estado da conversa
          setConversationState(prev => {
            const newState = { ...prev };
            delete newState[chatId];
            return newState;
          });
          
          await sendTelegramMessage(
            `🎉 *Assinatura criada com sucesso!*\n\n` +
            `📝 *Nome:* ${finalData.name}\n` +
            `💰 *Preço:* R$ ${finalData.price?.toFixed(2)}\n` +
            `📅 *Renovação:* ${new Date(finalData.renewalDate!).toLocaleDateString('pt-BR')}\n` +

            `📝 *Descrição:* ${finalData.description || 'Nenhuma'}\n` +
            `⏰ *Periodicidade:* ${billingPeriod}\n\n` +
            '_A assinatura foi adicionada à sua lista!_',
            'Markdown'
          );
          return true;
      }
    } catch (error) {
      await sendTelegramMessage(`❌ Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return true;
    }
    
    return false;
  };

  // Cancelar conversa
  const cancelConversation = async (chatId: string) => {
    setConversationState(prev => {
      const newState = { ...prev };
      delete newState[chatId];
      return newState;
    });
    
    await sendTelegramMessage('❌ Conversa cancelada. Use /nova para começar novamente.');
  };

  // Listar todas as assinaturas
  const listAllSubscriptions = async () => {
    if (!subscriptions.length) {
      await sendTelegramMessage('📋 Nenhuma assinatura encontrada.\n\nUse /nova para adicionar uma assinatura.');
      return;
    }

    const activeSubscriptions = subscriptions.filter(s => s.isActive);
    const inactiveSubscriptions = subscriptions.filter(s => !s.isActive);
    
    let message = `📋 *Lista de Assinaturas (${subscriptions.length} total)*\n\n`;
    
    if (activeSubscriptions.length > 0) {
      message += `✅ *Ativas (${activeSubscriptions.length}):*\n`;
      activeSubscriptions.forEach((sub, index) => {
        const renewalDate = new Date(sub.renewalDate).toLocaleDateString('pt-BR');
        message += `${index + 1}. *${sub.name}*\n`;
        message += `   💰 R$ ${sub.price.toFixed(2)} (${sub.billingPeriod})\n`;
        message += `   📅 Renovação: ${renewalDate}\n`;

        if (sub.description) {
          message += `   📝 ${sub.description}\n`;
        }
        message += `   🆔 ID: \`${sub.id}\`\n\n`;
      });
    }
    
    if (inactiveSubscriptions.length > 0) {
      message += `❌ *Inativas (${inactiveSubscriptions.length}):*\n`;
      inactiveSubscriptions.forEach((sub, index) => {
        message += `${index + 1}. *${sub.name}* - R$ ${sub.price.toFixed(2)}\n`;
        message += `   🆔 ID: \`${sub.id}\`\n\n`;
      });
    }
    
    const totalMonthly = subscriptions
      .filter(s => s.isActive && s.billingPeriod === 'mensal')
      .reduce((sum, s) => sum + s.price, 0);
    
    const totalAnnual = subscriptions
      .filter(s => s.isActive && s.billingPeriod === 'anual')
      .reduce((sum, s) => sum + s.price, 0);
    
    message += `💰 *Resumo financeiro:*\n`;
    message += `📅 Mensal: R$ ${totalMonthly.toFixed(2)}\n`;
    message += `📅 Anual: R$ ${totalAnnual.toFixed(2)}\n`;
    message += `📊 Total/mês: R$ ${(totalMonthly + totalAnnual/12).toFixed(2)}`;
    
    await sendTelegramMessage(message, 'Markdown');
  };

  // Buscar assinatura por termo
  const searchSubscriptions = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      await sendTelegramMessage('❌ Digite um termo para buscar.\n\nExemplo: /buscar Netflix');
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const results = subscriptions.filter(sub => 
      sub.name.toLowerCase().includes(term) ||
      sub.category.toLowerCase().includes(term) ||
      sub.description?.toLowerCase().includes(term) ||
      sub.id.toLowerCase().includes(term)
    );
    
    if (results.length === 0) {
      await sendTelegramMessage(`🔍 Nenhuma assinatura encontrada para "${searchTerm}".\n\nUse /listar para ver todas as assinaturas.`);
      return;
    }
    
    let message = `🔍 *Resultados para "${searchTerm}" (${results.length}):*\n\n`;
    
    results.forEach((sub, index) => {
      const renewalDate = new Date(sub.renewalDate).toLocaleDateString('pt-BR');
      const status = sub.isActive ? '✅' : '❌';
      
      message += `${index + 1}. ${status} *${sub.name}*\n`;
      message += `   💰 R$ ${sub.price.toFixed(2)} (${sub.billingPeriod})\n`;
      message += `   📅 Renovação: ${renewalDate}\n`;
      message += `   🏷️ ${sub.category}\n`;
      if (sub.description) {
        message += `   📝 ${sub.description}\n`;
      }
      message += `   🆔 ID: \`${sub.id}\`\n\n`;
    });
    
    await sendTelegramMessage(message, 'Markdown');
  };

  // Iniciar edição de assinatura
  const startEditSubscription = async (chatId: string, subscriptionId: string) => {
    if (!subscriptionId.trim()) {
      await sendTelegramMessage('❌ Digite o ID da assinatura para editar.\n\nExemplo: /editar sub_123\n\nUse /listar para ver os IDs.');
      return;
    }
    
    const subscription = subscriptions.find(s => s.id === subscriptionId.trim());
    
    if (!subscription) {
      await sendTelegramMessage(`❌ Assinatura com ID "${subscriptionId}" não encontrada.\n\nUse /listar para ver todas as assinaturas e seus IDs.`);
      return;
    }
    
    // Iniciar conversa de edição
    setConversationState(prev => ({
      ...prev,
      [chatId]: {
        step: 'name',
        data: { 
          ...subscription,
          editingId: subscription.id,
          isEditing: true
        }
      }
    }));
    
    const currentData = 
      `📝 *Editando: ${subscription.name}*\n\n` +
      `*Dados atuais:*\n` +
      `💰 Preço: R$ ${subscription.price.toFixed(2)}\n` +
      `📅 Renovação: ${new Date(subscription.renewalDate).toLocaleDateString('pt-BR')}\n` +
      `🏷️ Categoria: ${subscription.category}\n` +
      `📝 Descrição: ${subscription.description || 'Nenhuma'}\n` +
      `⏰ Periodicidade: ${subscription.billingPeriod}\n` +
      `🔄 Status: ${subscription.isActive ? 'Ativa' : 'Inativa'}\n\n` +
      `✏️ *Passo 1/6:* Digite o novo nome ou pressione Enter para manter "${subscription.name}":`;
    
    await sendTelegramMessage(currentData, 'Markdown');
  };

  // Processar edição de assinatura
  const processEditStep = async (chatId: string, message: string) => {
    const currentState = conversationState[chatId];
    if (!currentState?.data?.isEditing) return false;
    
    const { step, data } = currentState;
    const originalData = subscriptions.find(s => s.id === data.editingId);
    
    if (!originalData) {
      await sendTelegramMessage('❌ Erro: Assinatura original não encontrada.');
      return true;
    }
    
    try {
      switch (step) {
        case 'name':
          const newName = message.trim() || originalData.name;
          
          setConversationState(prev => ({
            ...prev,
            [chatId]: {
              step: 'price',
              data: { ...data, name: newName }
            }
          }));
          
          await sendTelegramMessage(
            `✅ Nome: *${newName}*\n\n` +
            `✏️ *Passo 2/6:* Digite o novo preço ou pressione Enter para manter "R$ ${originalData.price.toFixed(2)}":`,
            'Markdown'
          );
          return true;
          
        case 'price':
          let newPrice = originalData.price;
          if (message.trim()) {
            const parsedPrice = parseFloat(message.replace(',', '.'));
            if (isNaN(parsedPrice) || parsedPrice <= 0) {
              await sendTelegramMessage('❌ Preço inválido. Digite um número válido ou pressione Enter para manter o atual:');
              return true;
            }
            newPrice = parsedPrice;
          }
          
          setConversationState(prev => ({
            ...prev,
            [chatId]: {
              step: 'date',
              data: { ...data, price: newPrice }
            }
          }));
          
          await sendTelegramMessage(
            `✅ Preço: *R$ ${newPrice.toFixed(2)}*\n\n` +
            `✏️ *Passo 3/6:* Digite a nova data de renovação ou pressione Enter para manter "${new Date(originalData.renewalDate).toLocaleDateString('pt-BR')}":\n` +
            `_Formato: DD/MM/AAAA ou AAAA-MM-DD_`,
            'Markdown'
          );
          return true;
          
        case 'date':
          let newDate = originalData.renewalDate;
          if (message.trim()) {
            let renewalDate: Date;
            
            if (message.includes('/')) {
              const [day, month, year] = message.split('/');
              renewalDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else if (message.includes('-')) {
              renewalDate = new Date(message);
            } else {
              await sendTelegramMessage('❌ Formato de data inválido. Use DD/MM/AAAA ou AAAA-MM-DD, ou pressione Enter para manter:');
              return true;
            }
            
            if (isNaN(renewalDate.getTime())) {
              await sendTelegramMessage('❌ Data inválida. Tente novamente ou pressione Enter para manter:');
              return true;
            }
            
            newDate = renewalDate.toISOString();
          }
          
          setConversationState(prev => ({
            ...prev,
            [chatId]: {
              step: 'description',
              data: { ...data, renewalDate: newDate }
            }
          }));
          
          await sendTelegramMessage(
            `✅ Data: *${new Date(newDate).toLocaleDateString('pt-BR')}*\n\n` +
            `✏️ *Passo 4/5:* Digite a nova descrição ou pressione Enter para manter "${originalData.description || 'Nenhuma'}":`,
            'Markdown'
          );
          return true;
          

          
        case 'description':
          const newDescription = message.trim() || originalData.description || '';
          
          setConversationState(prev => ({
            ...prev,
            [chatId]: {
              step: 'billing',
              data: { ...data, description: newDescription }
            }
          }));
          
          await sendTelegramMessage(
            `✅ Descrição: *${newDescription || 'Nenhuma'}*\n\n` +
            `✏️ *Passo 5/5:* Digite a nova periodicidade ou pressione Enter para manter "${originalData.billingPeriod}":\n\n` +
            `_Opções: mensal, anual_`,
            'Markdown'
          );
          return true;
          
        case 'billing':
          let newBillingPeriod = originalData.billingPeriod;
          if (message.trim()) {
            if (!['mensal', 'anual'].includes(message.toLowerCase())) {
              await sendTelegramMessage('❌ Periodicidade inválida. Use "mensal" ou "anual", ou pressione Enter para manter:');
              return true;
            }
            newBillingPeriod = message.toLowerCase() as 'mensal' | 'anual';
          }
          
          // Finalizar edição
          const { editingId, isEditing, pendingConfirmation, ...finalData } = {
            ...data,
            billingPeriod: newBillingPeriod
          };
          
          // Atualizar assinatura
          const updatedSubscriptions = subscriptions.map(sub =>
            sub.id === editingId ? { ...finalData as Subscription } : sub
          );
          
          // Usar a função de callback para atualizar
          if (onRestoreBackup) {
            onRestoreBackup(updatedSubscriptions);
          }
          
          // Limpar estado da conversa
          setConversationState(prev => {
            const newState = { ...prev };
            delete newState[chatId];
            return newState;
          });
          
          await sendTelegramMessage(
            `🎉 *Assinatura editada com sucesso!*\n\n` +
            `📝 *Nome:* ${finalData.name}\n` +
            `💰 *Preço:* R$ ${finalData.price?.toFixed(2)}\n` +
            `📅 *Renovação:* ${new Date(finalData.renewalDate!).toLocaleDateString('pt-BR')}\n` +

            `📝 *Descrição:* ${finalData.description || 'Nenhuma'}\n` +
            `⏰ *Periodicidade:* ${newBillingPeriod}\n\n` +
            `_As alterações foram salvas!_`,
            'Markdown'
          );
          return true;
      }
    } catch (error) {
      await sendTelegramMessage(`❌ Erro ao editar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return true;
    }
    
    return false;
  };

  // Enviar mensagem de ajuda
  const sendHelpMessage = async () => {
    const helpText = `🤖 *Comandos disponíveis:*\n\n` +
      `🧠 *Modo IA (Recomendado):*\n` +
      `Simplesmente escreva em linguagem natural!\n` +
      `_Exemplo: "Quero adicionar Netflix por R$ 29,90 mensal"_\n\n` +
      `📝 *Gerenciar assinaturas:*\n` +
      `/listar - Mostrar todas as assinaturas\n` +
      `/buscar [termo] - Buscar assinatura específica\n` +
      `/editar [id] - Modificar assinatura existente\n\n` +
      `📅 *Vencimentos e alertas:*\n` +
      `/vencimentos - Relatório de próximos vencimentos\n` +
      `/verificar - Verificar alertas de vencimento agora\n\n` +
      `📧 *Automação Gmail:*\n` +
      `/gmail - Buscar faturas no Gmail\n` +
      `/processar [texto] - Processar fatura com IA\n\n` +
      `📝 *Modo conversacional:*\n` +
      `/nova - Iniciar conversa guiada\n` +
      `/cancelar - Cancelar conversa atual\n\n` +
      `⚡ *Modo rápido:*\n` +
      `/add Nome|Preço|Data|Categoria|Descrição|Periodicidade\n\n` +
      `*Exemplo rápido:*\n` +
      `/add Netflix|29.90|2024-12-15T10:00|Streaming|Plano Premium|mensal\n\n` +
      `📋 *Categorias válidas:*\n` +
      `Streaming, Software, Música, Jogos, Produtividade, Educação, Saúde, Outros\n\n` +
      `⏰ *Periodicidade:*\n` +
      `mensal ou anual\n\n` +
      `💡 *Dica:* O modo IA entende mensagens como:\n` +
      `• "Adicionar Spotify Premium por 16,90 reais"\n` +
      `• "Quero cadastrar Adobe Creative Cloud anual"\n` +
      `• "Netflix 29,90 todo mês dia 15"`;
    
    await sendTelegramMessage(helpText, 'Markdown');
  };

  // Processar mensagens do Telegram
  const processMessages = async () => {
    if (!config.botToken || !config.chatId || !onAddSubscription) {
      return;
    }
    
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${lastUpdateId + 1}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar mensagens');
      }
      
      const data = await response.json();
      
      if (!data.ok || !data.result.length) {
        return;
      }
      
      for (const update of data.result) {
        if (update.update_id > lastUpdateId) {
          setLastUpdateId(update.update_id);
        }
        
        if (!update.message || !update.message.text) {
          continue;
        }
        
        const message = update.message;
        const text = message.text.trim();
        
        // Verificar se a mensagem é do chat correto
        if (message.chat.id.toString() !== config.chatId) {
          continue;
        }
        
        try {
            const chatId = message.chat.id.toString();
            
            // Verificar se há confirmação pendente da IA
            if (conversationState[chatId]?.data?.pendingConfirmation) {
              const processed = await processAIConfirmation(chatId, text);
              if (processed) continue;
            }
            
            // Verificar se há uma conversa ativa
            if (conversationState[chatId] && conversationState[chatId].step !== 'idle') {
              // Processar comandos especiais mesmo durante conversa
              if (text === '/cancelar' || text === '/cancel') {
                await cancelConversation(chatId);
                continue;
              }
              
              // Processar próximo passo da conversa
              const processed = await processConversationStep(chatId, text);
              if (processed) continue;
            }
            
            // Processar comandos normais
            if (text === '/nova' || text === '/new') {
              await startAddConversation(chatId);
            } else if (text === '/cancelar' || text === '/cancel') {
              if (conversationState[chatId]) {
                await cancelConversation(chatId);
              } else {
                await sendTelegramMessage('❌ Nenhuma conversa ativa para cancelar.');
              }
            } else if (text === '/listar' || text === '/list') {
              await listAllSubscriptions();
            } else if (text.startsWith('/buscar ') || text.startsWith('/search ')) {
              const searchTerm = text.replace(/^\/(?:buscar|search)\s+/, '');
              await searchSubscriptions(searchTerm);
            } else if (text.startsWith('/editar ') || text.startsWith('/edit ')) {
              const subscriptionId = text.replace(/^\/(?:editar|edit)\s+/, '');
              await startEditSubscription(chatId, subscriptionId);
            } else if (text === '/vencimentos' || text === '/renewals') {
              await sendRenewalReport();
            } else if (text === '/verificar' || text === '/check') {
              await checkUpcomingRenewals();
              await sendTelegramMessage('✅ Verificação de vencimentos concluída!');
            } else if (text === '/gmail' || text === '/faturas') {
              await searchGmailInvoices();
            } else if (text.startsWith('/processar ')) {
              const invoiceText = text.replace(/^\/processar\s+/, '');
              await processInvoiceWithAI(invoiceText);
            } else if (text.startsWith('/add ')) {
              const subscription = processAddSubscriptionCommand(text);
              if (subscription) {
                onAddSubscription(subscription);
                
                await sendTelegramMessage(
                  `✅ Assinatura "${subscription.name}" adicionada com sucesso!\n` +
                  `💰 Valor: R$ ${subscription.price.toFixed(2)}\n` +
                  `📅 Renovação: ${new Date(subscription.renewalDate).toLocaleDateString('pt-BR')}`
                );
              }
            } else if (text === '/help' || text === '/start') {
              await sendHelpMessage();
            } else if (text.startsWith('/')) {
              // Comando não reconhecido
              await sendTelegramMessage(
                '❓ Comando não reconhecido.\n\n' +
                'Use /help para ver os comandos disponíveis.'
              );
            } else {
              // Mensagem em linguagem natural - processar com IA
              await processMessageWithAI(chatId, text);
            }
          } catch (error) {
            await sendTelegramMessage(
              `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\n` +
              'Use /help para ver os comandos disponíveis.'
            );
          }
      }
    } catch (error) {
      console.error('Erro ao processar mensagens:', error);
    }
  };

  // Iniciar/parar escuta de mensagens
  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      toast({
        title: "Bot desativado",
        description: "O bot parou de escutar comandos."
      });
    } else {
      if (!config.botToken || !config.chatId || !onAddSubscription) {
        toast({
          title: "Erro",
          description: "Configure o bot primeiro e certifique-se de que a função de adicionar está disponível.",
          variant: "destructive"
        });
        return;
      }
      
      setIsListening(true);
      await sendHelpMessage();
      toast({
        title: "Bot ativado!",
        description: "O bot está escutando comandos. Use /help no Telegram para ver os comandos."
      });
    }
  };

  // Polling de mensagens
  React.useEffect(() => {
    if (!isListening) return;
    
    const interval = setInterval(processMessages, 2000); // Verifica a cada 2 segundos
    
    return () => clearInterval(interval);
  }, [isListening, lastUpdateId, config.botToken, config.chatId, onAddSubscription]);

  // Preparar dados de backup para visualização
  const prepareBackupData = () => {
    const data = generateBackupData();
    setBackupData(data);
    setIsBackupOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Backup via Telegram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Configurar Telegram */}
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurar Bot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Bot do Telegram</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="botToken">Token do Bot</Label>
                  <Input
                    id="botToken"
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={config.botToken}
                    onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtenha o token criando um bot com @BotFather no Telegram
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chatId">Chat ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="chatId"
                      placeholder="123456789"
                      value={config.chatId}
                      onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getChatId}
                      disabled={isGettingChatId || !config.botToken}
                      className="whitespace-nowrap"
                    >
                      {isGettingChatId ? 'Buscando...' : 'Buscar ID'}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Como obter seu Chat ID:</strong></p>
                    <p>1. Envie uma mensagem para seu bot</p>
                    <p>2. Clique em "Buscar ID" para encontrar automaticamente</p>
                    <p>3. Ou insira manualmente se souber o número</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="geminiApiKey">Chave da API Gemini</Label>
                  <Input
                    id="geminiApiKey"
                    type="password"
                    placeholder="AIzaSy..."
                    value={config.geminiApiKey}
                    onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                     <p><strong>🧠 IA para linguagem natural:</strong></p>
                     <p>• Permite que o bot entenda mensagens como "Adicionar Netflix R$ 29,90"</p>
                     <p>• Obtenha sua chave em: <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-600 underline">Google AI Studio</a></p>
                     <p>• {config.geminiApiKey ? '✅ Configurada' : '❌ Não configurada'}</p>
                   </div>
                 </div>
                 
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label htmlFor="notifications">Alertas de Vencimento</Label>
                     <input
                       id="notifications"
                       type="checkbox"
                       checked={notificationsEnabled}
                       onChange={(e) => setNotificationsEnabled(e.target.checked)}
                       className="rounded"
                     />
                   </div>
                   <div className="text-xs text-muted-foreground space-y-1">
                     <p><strong>📅 Notificações automáticas:</strong></p>
                     <p>• Alertas {notificationDays.join(', ')} dias antes do vencimento</p>
                     <p>• Verificação automática a cada 6 horas</p>
                     <p>• Relatório diário às 9h da manhã</p>
                     <p>• {notificationsEnabled ? '✅ Ativo' : '❌ Desativado'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gmailClientId">Gmail Client ID</Label>
                    <Input
                      id="gmailClientId"
                      type="password"
                      placeholder="123456789-abc.apps.googleusercontent.com"
                      value={config.gmailClientId}
                      onChange={(e) => setConfig({ ...config, gmailClientId: e.target.value })}
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>📧 Automação de faturas:</strong></p>
                      <p>• Detecta faturas automaticamente no Gmail</p>
                      <p>• Processa com IA para criar assinaturas</p>
                      <p>• Obtenha Client ID em: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-600 underline">Google Cloud Console</a></p>
                      <p>• {config.gmailClientId ? '✅ Configurado' : '❌ Não configurado'}</p>
                    </div>
                    
                    {config.gmailClientId && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={isGmailConnected ? "outline" : "default"}
                          size="sm"
                          onClick={connectGmail}
                          disabled={isGmailConnected}
                        >
                          {isGmailConnected ? '✅ Gmail Conectado' : '🔗 Conectar Gmail'}
                        </Button>
                        
                        {isGmailConnected && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={autoDetectionEnabled}
                              onChange={(e) => setAutoDetectionEnabled(e.target.checked)}
                              className="rounded"
                            />
                            <Label className="text-xs">Auto-detecção</Label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                 <Button 
                  onClick={() => setIsConfigOpen(false)}
                  className="w-full"
                >
                  Salvar Configuração
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Visualizar Backup */}
          <Dialog open={isBackupOpen} onOpenChange={setIsBackupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={prepareBackupData} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Visualizar Backup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Dados do Backup</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">

                <Textarea
                  value={backupData}
                  readOnly
                  className="min-h-[400px] font-mono text-xs"
                  placeholder="Dados do backup aparecerão aqui..."
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Enviar Backup */}
          <Button 
            onClick={sendTelegramBackup}
            disabled={isSending || !config.botToken || !config.chatId}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Enviando...' : 'Fazer Backup'}
          </Button>
        </div>

        {/* Seção de Restaurar Backup */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Restaurar Backup</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Buscar Último Backup */}
            <Button 
              onClick={getLastBackup}
              disabled={isRestoring || !config.botToken || !config.chatId}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
              {isRestoring ? 'Buscando...' : 'Buscar Último Backup'}
            </Button>

            {/* Restaurar Backup */}
            {lastBackupData && (
              <Button 
                onClick={restoreBackup}
                variant="default"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Restaurar Backup
              </Button>
            )}
          </div>

          {/* Informações do Backup Encontrado */}
          {lastBackupData && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Backup encontrado:</p>
              <p className="text-xs text-muted-foreground">
                📅 Data: {new Date(lastBackupData.timestamp).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">
                📊 Assinaturas: {lastBackupData.totalSubscriptions} ({lastBackupData.activeSubscriptions} ativas)
              </p>
              <p className="text-xs text-muted-foreground">
                💰 Gasto mensal: R$ {lastBackupData.totalMonthlySpending?.toFixed(2) || '0.00'}
              </p>
            </div>
          )}
        </div>

         {/* Seção de Bot de Comandos */}
         <div className="border-t pt-4">
           <h4 className="text-sm font-medium mb-3">Bot de Comandos</h4>
           <div className="flex flex-col gap-3">
             <Button 
               onClick={toggleListening}
               disabled={!config.botToken || !config.chatId || !onAddSubscription}
               variant={isListening ? "destructive" : "default"}
               className="flex items-center gap-2"
             >
               {isListening ? (
                 <>
                   <BotOff className="h-4 w-4" />
                   Desativar Bot
                 </>
               ) : (
                 <>
                   <Bot className="h-4 w-4" />
                   Ativar Bot
                 </>
               )}
             </Button>

             {/* Status do Bot */}
              <div className="text-xs text-muted-foreground space-y-1">
                 {isListening ? (
                   <>
                     <p className="text-green-600 font-medium">🤖 Bot ativo - Escutando comandos</p>
                      <p className="text-purple-600 font-medium">🧠 IA Gemini integrada - Entende linguagem natural</p>
                      {notificationsEnabled && (
                         <p className="text-blue-600 font-medium">📅 Alertas de vencimento ativos</p>
                       )}
                       {isGmailConnected && (
                         <p className="text-orange-600 font-medium">📧 Gmail conectado - Detecção automática</p>
                       )}
                       <p>• Escreva naturalmente: "Adicionar Netflix R$ 29,90"</p>
                       <p>• Use /listar, /buscar, /editar para gerenciar</p>
                       <p>• Use /vencimentos, /verificar para alertas</p>
                       <p>• Use /nova para modo conversacional</p>
                       <p>• Use /help para ver todos os comandos</p>
                   </>
                 ) : (
                   <>
                     <p className="text-gray-500">🤖 Bot inativo</p>
                     <p>• Clique em "Ativar Bot" para começar</p>
                     <p>• Inclui IA Gemini para linguagem natural</p>
                   </>
                 )}
                 
                 {isProcessingWithAI && (
                   <p className="text-blue-600 font-medium animate-pulse">🧠 Processando com IA...</p>
                 )}
               </div>

              {/* Conversas ativas */}
              {isListening && Object.keys(conversationState).length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <p className="font-medium text-blue-800 mb-1">💬 Conversas ativas:</p>
                  {Object.entries(conversationState).map(([chatId, state]) => (
                    <p key={chatId} className="text-blue-700">
                      • Chat {chatId}: {state.step === 'name' ? 'Aguardando nome' :
                        state.step === 'price' ? 'Aguardando preço' :
                        state.step === 'date' ? 'Aguardando data' :
                        state.step === 'category' ? 'Aguardando categoria' :
                        state.step === 'description' ? 'Aguardando descrição' :
                        state.step === 'billing' ? 'Aguardando periodicidade' : 'Processando'}
                    </p>
                  ))}
                </div>
              )}

              {/* Exemplos de comandos */}
               {isListening && (
                 <div className="mt-2 space-y-2">
                   <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                     <p className="font-medium text-purple-800 mb-1">🧠 Modo IA (Mais Fácil):</p>
                     <div className="space-y-1">
                       <code className="text-xs bg-white p-1 rounded border block">
                         Quero adicionar Netflix por R$ 29,90 mensal
                       </code>
                       <code className="text-xs bg-white p-1 rounded border block">
                         Spotify Premium 16,90 reais todo mês
                       </code>
                     </div>
                     <p className="text-purple-700 mt-1 text-xs">A IA entende linguagem natural e extrai os dados automaticamente</p>
                   </div>
                   
                   <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                     <p className="font-medium text-green-800 mb-1">🎯 Modo Conversacional:</p>
                     <code className="text-xs bg-white p-1 rounded border">/nova</code>
                     <p className="text-green-700 mt-1 text-xs">O bot vai perguntar cada informação passo a passo</p>
                   </div>
                   
                   <div className="p-2 bg-muted rounded text-xs">
                     <p className="font-medium mb-1">⚡ Modo Rápido:</p>
                     <code className="text-xs bg-background p-1 rounded">
                       /add Netflix|29.90|15/12/2024|Streaming|Premium|mensal
                     </code>
                   </div>
                 </div>
               )}
           </div>
         </div>

         {/* Status */}
        <div className="text-sm text-muted-foreground">
          {config.botToken && config.chatId ? (
            <p className="text-green-600">✅ Bot configurado - Pronto para backup</p>
          ) : (
            <p className="text-yellow-600">⚠️ Configure o bot e chat ID do Telegram primeiro</p>
          )}
          <p>Destino: {config.chatId}</p>
          <p>Total de assinaturas: {subscriptions.length}</p>
        </div>
      </CardContent>
    </Card>
  );
}