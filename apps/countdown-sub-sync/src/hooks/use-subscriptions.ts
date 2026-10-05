import { useState, useEffect } from 'react';
import { Subscription, SubscriptionFormData } from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';

const API_URL = `${window.location.protocol}//${window.location.hostname}:8766`;

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions`);
      const data = await res.json();
      
      const mappedSubscriptions: Subscription[] = data.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        price: parseFloat(sub.price.toString()),
        currency: sub.currency,
        renewalDate: sub.renewal_date,
        category: sub.category,
        description: sub.notes || '',
        isActive: Boolean(sub.is_active),
        billingPeriod: sub.billing_cycle === 'annual' ? 'anual' : 'mensal'
      }));

      setSubscriptions(mappedSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Erro ao carregar assinaturas",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async (data: SubscriptionFormData) => {
    try {
      if (!data.name?.trim()) throw new Error('Nome da assinatura é obrigatório');
      if (!data.price || data.price <= 0) throw new Error('Preço deve ser maior que zero');
      if (!data.renewalDate) throw new Error('Data de renovação é obrigatória');

      const res = await fetch(`${API_URL}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          price: Number(data.price),
          currency: data.currency || 'BRL',
          billing_cycle: data.billingPeriod === 'anual' ? 'annual' : 'monthly',
          renewal_date: data.renewalDate,
          category: data.category || 'other',
          color: '#6366f1',
          icon: '',
          is_active: true,
          notes: data.description?.trim() || ''
        })
      });

      if (!res.ok) throw new Error('Erro ao adicionar assinatura');

      const newSub = await res.json();

      const mappedSubscription: Subscription = {
        id: newSub.id,
        name: newSub.name,
        price: parseFloat(newSub.price.toString()),
        currency: newSub.currency,
        renewalDate: newSub.renewal_date,
        description: newSub.notes || '',
        isActive: Boolean(newSub.is_active),
        billingPeriod: newSub.billing_cycle === 'annual' ? 'anual' : 'mensal'
      };

      setSubscriptions(prev => [mappedSubscription, ...prev]);
      
      toast({
        title: "Assinatura adicionada",
        description: "Sua assinatura foi adicionada com sucesso!",
      });

    } catch (error) {
      console.error('Error adding subscription:', error);
      toast({
        title: "Erro ao adicionar assinatura",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSubscription = async (id: string, data: SubscriptionFormData) => {
    try {
      if (!data.name?.trim()) throw new Error('Nome da assinatura é obrigatório');
      if (!data.price || data.price <= 0) throw new Error('Preço deve ser maior que zero');
      if (!data.renewalDate) throw new Error('Data de renovação é obrigatória');

      const res = await fetch(`${API_URL}/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          price: Number(data.price),
          currency: data.currency || 'BRL',
          billing_cycle: data.billingPeriod === 'anual' ? 'annual' : 'monthly',
          renewal_date: data.renewalDate,
          category: data.category || 'other',
          notes: data.description?.trim() || ''
        })
      });

      if (!res.ok) throw new Error('Erro ao atualizar assinatura');

      setSubscriptions(prev => prev.map(sub => 
        sub.id === id 
          ? { ...sub, ...data, price: Number(data.price) }
          : sub
      ));
      
      toast({
        title: "Assinatura atualizada",
        description: "Sua assinatura foi atualizada com sucesso!",
      });

    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Erro ao atualizar assinatura",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Erro ao excluir assinatura');

      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
      
      toast({
        title: "Assinatura excluída",
        description: "Sua assinatura foi excluída com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: "Erro ao excluir assinatura",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return {
    subscriptions,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    refreshSubscriptions: fetchSubscriptions
  };
}
