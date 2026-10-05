import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { Subscription, SubscriptionFormData } from "@/types/subscription";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionFormProps {
  onSubmit: (data: SubscriptionFormData) => void;
  editingSubscription?: Subscription | null;
  onCancel?: () => void;
}

export function SubscriptionForm({ onSubmit, editingSubscription, onCancel }: SubscriptionFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SubscriptionFormData>({
    name: editingSubscription?.name || "",
    price: editingSubscription?.price || 0,
    currency: editingSubscription?.currency || "R$",
    renewalDate: editingSubscription?.renewalDate || "",
    category: editingSubscription?.category || "",
    description: editingSubscription?.description || "",
    billingPeriod: editingSubscription?.billingPeriod || 'mensal',
  });
  const { toast } = useToast();



  const categories = [
    "Streaming",
    "Software",
    "Música",
    "Jogos",
    "Produtividade",
    "Educação",
    "Saúde",
    "Outros"
  ];

  const currencies = ["R$", "US$", "€", "£"];

  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  // Função para formatar valor como moeda brasileira (em centavos)
  const formatCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Se não há números, retorna vazio
    if (!numbers) return '';
    
    // Converte para centavos
    const cents = parseInt(numbers);
    
    // Formata como moeda brasileira com vírgula
    const reais = Math.floor(cents / 100);
    const centavos = cents % 100;
    
    // Formata com separadores brasileiros
    const formattedReais = reais.toLocaleString('pt-BR');
    const formattedCentavos = centavos.toString().padStart(2, '0');
    
    return `${formattedReais},${formattedCentavos}`;
  };

  // Função para converter valor formatado para centavos
  const parseCurrency = (value: string): number => {
    if (!value) return 0;
    // Remove pontos e substitui vírgula por nada para obter centavos
    const cleanValue = value.replace(/\./g, '').replace(',', '');
    return parseInt(cleanValue) || 0;
  };

  // Estado para o valor formatado
  const [formattedPrice, setFormattedPrice] = useState<string>(
    editingSubscription?.price ? formatCurrency((editingSubscription.price * 100).toString()) : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.name?.trim()) {
      toast({
        title: "Erro",
        description: "O nome da assinatura é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price || formData.price <= 0) {
      toast({
        title: "Erro",
        description: "O preço deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }



    if (!formData.category) {
      toast({
        title: "Erro",
        description: "A categoria é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.billingPeriod) {
      toast({
        title: "Erro",
        description: "O período de cobrança é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let submission: SubscriptionFormData = { ...formData };

      // Validar data de renovação
      if (!formData.renewalDate) {
        toast({
          title: "Erro",
          description: "A data de renovação é obrigatória.",
          variant: "destructive",
        });
        return;
      }

      // Validar formato da data
      const renewalDate = new Date(formData.renewalDate);
      if (isNaN(renewalDate.getTime())) {
        toast({
          title: "Erro",
          description: "Data de renovação inválida.",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar se a data não é no passado
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Zerar horas para comparar apenas a data
      renewalDate.setHours(0, 0, 0, 0);
      
      if (renewalDate < now) {
        toast({
          title: "Aviso",
          description: "A data de renovação está no passado. Tem certeza?",
          variant: "destructive",
        });
      }

      // Usar a data selecionada com horário padrão (meio-dia)
      const finalDate = new Date(formData.renewalDate);
      finalDate.setHours(12, 0, 0, 0);
      submission.renewalDate = finalDate.toISOString();

      // Limpar e validar dados
      submission.name = submission.name.trim();
      submission.description = submission.description?.trim() || "";
      // Converter centavos para reais (dividir por 100)
      submission.price = Number(submission.price) / 100;

      await onSubmit(submission);
      
      // Resetar formulário apenas se não estiver editando
      if (!editingSubscription) {
        setFormData({
          name: "",
          price: 0,
          currency: "R$",
          renewalDate: "",
          category: "",
          description: "",
          billingPeriod: 'mensal',
        });
        setFormattedPrice('');
      }
      
      setOpen(false);
      
      if (onCancel) onCancel();
      
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a assinatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!editingSubscription;

  if (isEditing) {
    return (
      <div className="card-modern space-y-6 p-8">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-foreground">Editar Assinatura</h3>
          <p className="text-muted-foreground">Atualize as informações da sua assinatura</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Assinatura *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Netflix, Spotify..."
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
               <Label htmlFor="category">Categoria *</Label>
               <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                 <SelectTrigger className="bg-background">
                   <SelectValue placeholder="Selecione uma categoria" />
                 </SelectTrigger>
                 <SelectContent>
                   {categories.map((category) => (
                     <SelectItem key={category} value={category}>
                       {category}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

            <div className="space-y-2">
              <Label htmlFor="billingPeriod">Periodicidade *</Label>
              <Select value={formData.billingPeriod} onValueChange={(value) => setFormData({ ...formData, billingPeriod: value as 'mensal' | 'anual' })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a periodicidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                  <SelectItem value="anual">Anual (365 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço *</Label>
              <div className="flex gap-2">
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger className="w-20 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="price"
                  type="text"
                  value={formattedPrice}
                  onChange={(e) => {
                    const formatted = formatCurrency(e.target.value);
                    setFormattedPrice(formatted);
                    setFormData({ ...formData, price: parseCurrency(formatted) });
                  }}
                  placeholder="0,00"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="renewalDate">Data de Renovação *</Label>
              <Input
                id="renewalDate"
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Informações adicionais sobre a assinatura..."
              className="bg-background"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              className="gradient-button flex-1 py-3 text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="px-8 py-3">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-button py-3 px-6 text-base font-semibold shadow-purple-glow hover:scale-[1.02] transition-all duration-300">
          <Plus className="h-5 w-5 mr-2" />
          Nova Assinatura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl card-modern border-primary/20">
        <DialogHeader className="text-center space-y-3 pb-6">
          <DialogTitle className="text-2xl font-bold text-foreground">Adicionar Nova Assinatura</DialogTitle>
          <p className="text-muted-foreground">Cadastre uma nova assinatura para acompanhar seus vencimentos</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Assinatura *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Netflix, Spotify..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingPeriod">Periodicidade *</Label>
              <Select value={formData.billingPeriod} onValueChange={(value) => setFormData({ ...formData, billingPeriod: value as 'mensal' | 'anual' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a periodicidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                  <SelectItem value="anual">Anual (365 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço *</Label>
              <div className="flex gap-2">
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="price"
                  type="text"
                  value={formattedPrice}
                  onChange={(e) => {
                    const formatted = formatCurrency(e.target.value);
                    setFormattedPrice(formatted);
                    setFormData({ ...formData, price: parseCurrency(formatted) });
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="renewalDate">Data de Renovação *</Label>
              <Input
                id="renewalDate"
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Informações adicionais sobre a assinatura..."
            />
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-button py-4 text-lg font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Adicionando...
              </>
            ) : (
              "Adicionar Assinatura"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}