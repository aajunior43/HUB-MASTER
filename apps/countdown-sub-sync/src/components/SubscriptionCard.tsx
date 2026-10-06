import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Edit, Trash2 } from "lucide-react";
import { Subscription } from "@/types/subscription";
import { useState, useEffect } from "react";
import { CircularCountdown } from "@/components/CircularCountdown";

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionCard({ subscription, onEdit, onDelete }: SubscriptionCardProps) {
  const [daysUntilRenewal, setDaysUntilRenewal] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const renewalDate = new Date(subscription.renewalDate);
      const timeDiff = renewalDate.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setDaysUntilRenewal(0);
        setTimeLeft("Vencida");
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      setDaysUntilRenewal(days);
      
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [subscription.renewalDate]);

  const getUrgencyColor = () => {
    if (daysUntilRenewal <= 0) return "destructive";
    if (daysUntilRenewal <= 3) return "destructive";
    if (daysUntilRenewal <= 7) return "default";
    return "secondary";
  };

  const totalDays = subscription.billingPeriod === 'mensal' ? 30 : 365;

  return (
    <Card className="card-modern hover-scale group animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
              {subscription.name}
            </CardTitle>
            <Badge variant="outline" className="text-xs font-medium bg-accent-purple/20 border-accent-purple text-accent-purple">
              {subscription.category}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(subscription)}
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200"
              aria-label={`Editar assinatura ${subscription.name}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(subscription.id)}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              aria-label={`Excluir assinatura ${subscription.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            <CircularCountdown totalDays={totalDays} remainingDays={daysUntilRenewal} />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {subscription.currency} {subscription.price.toFixed(2)}
                  </span>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {subscription.billingPeriod === 'mensal' ? 'Mensal' : 'Anual'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-info" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">Próxima cobrança</div>
                <div className="text-sm text-foreground">
                  {new Date(subscription.renewalDate).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-accent/50">
              <span className="text-sm font-medium text-foreground">Tempo restante</span>
              <Badge variant={getUrgencyColor()} className="font-semibold">{timeLeft}</Badge>
            </div>

            {subscription.description && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm text-muted-foreground leading-relaxed">{subscription.description}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}