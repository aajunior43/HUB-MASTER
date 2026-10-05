import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Subscription } from "@/types/subscription";
import { BarChart3, PieChart, TrendingUp, Calendar } from "lucide-react";

interface AnalyticsChartProps {
  subscriptions: Subscription[];
}

export function AnalyticsChart({ subscriptions }: AnalyticsChartProps) {
  // Calcular estatísticas
  const activeSubscriptions = subscriptions.filter(sub => sub.isActive);
  
  // Gastos por categoria
  const categorySpending = activeSubscriptions.reduce((acc, sub) => {
    const category = sub.category;
    if (!acc[category]) {
      acc[category] = { total: 0, count: 0 };
    }
    acc[category].total += sub.price;
    acc[category].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  // Gastos mensais vs anuais
  const monthlyTotal = activeSubscriptions
    .filter(sub => sub.billingPeriod === 'mensal')
    .reduce((sum, sub) => sum + sub.price, 0);
  
  const annualTotal = activeSubscriptions
    .filter(sub => sub.billingPeriod === 'anual')
    .reduce((sum, sub) => sum + sub.price, 0);

  // Projeção anual
  const projectedAnnualSpending = (monthlyTotal * 12) + annualTotal;

  // Assinaturas que vencem nos próximos 30 dias
  const upcomingRenewals = activeSubscriptions.filter(sub => {
    const renewalDate = new Date(sub.renewalDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return renewalDate <= thirtyDaysFromNow && renewalDate >= new Date();
  });

  // Categoria mais cara
  const mostExpensiveCategory = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b.total - a.total)[0];

  // Criar dados para gráfico de barras simples (usando CSS)
  const categoryData = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 5); // Top 5 categorias

  const maxCategorySpending = Math.max(...categoryData.map(([,data]) => data.total));

  return (
    <div className="space-y-6">
      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {monthlyTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {activeSubscriptions.filter(s => s.billingPeriod === 'mensal').length} assinaturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Anual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {annualTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {activeSubscriptions.filter(s => s.billingPeriod === 'anual').length} assinaturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projeção Anual</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {projectedAnnualSpending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Baseado nos gastos atuais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renovações (30d)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingRenewals.length}</div>
            <p className="text-xs text-muted-foreground">
              R$ {upcomingRenewals.reduce((sum, sub) => sum + sub.price, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Gastos por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Gastos por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <div className="space-y-4">
              {categoryData.map(([category, data]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category}</span>
                      <Badge variant="secondary">{data.count}</Badge>
                    </div>
                    <span className="font-bold">R$ {data.total.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(data.total / maxCategorySpending) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma assinatura ativa para análise
            </p>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {mostExpensiveCategory && (
        <Card>
          <CardHeader>
            <CardTitle>💡 Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Categoria com maior gasto:</strong> {mostExpensiveCategory[0]} 
                  (R$ {mostExpensiveCategory[1].total.toFixed(2)})
                </p>
              </div>
              
              {monthlyTotal > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Economia potencial:</strong> Considere assinaturas anuais para economizar 
                    até {((monthlyTotal * 12 * 0.15)).toFixed(2)} por ano (15% de desconto médio)
                  </p>
                </div>
              )}
              
              {upcomingRenewals.length > 0 && (
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Atenção:</strong> {upcomingRenewals.length} assinatura(s) vence(m) nos próximos 30 dias. 
                    Revise se ainda são necessárias.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}