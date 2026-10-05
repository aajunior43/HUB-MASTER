import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfxTransaction } from "@/types/ofx";
import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";

interface TransactionSummaryProps {
  transactions: OfxTransaction[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(amount);
}

export const TransactionSummary: React.FC<TransactionSummaryProps> = ({ transactions }) => {
  const summary = React.useMemo(() => {
    const credits = transactions
      .filter((t) => t.amount > 0)
      .reduce((acc, t) => acc + t.amount, 0);
    const debits = transactions
      .filter((t) => t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    return { credits, debits, net: credits - debits };
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo das Transações Visíveis</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
            <ArrowUpCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Total de Créditos</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.credits)}</p>
        </div>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
            <ArrowDownCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Total de Débitos</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.debits)}</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <MinusCircle className="mx-auto h-8 w-8 text-gray-500 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Saldo do Período</p>
            <p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(summary.net)}</p>
        </div>
      </CardContent>
    </Card>
  );
};