import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfxTransaction } from "@/types/ofx";

interface TransactionChartProps {
  transactions: OfxTransaction[];
}

const formatDateForChart = (dateString: string) => {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return new Date(`${year}-${month}-${day}`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatCurrencyForChart = (value: number) => {
    if (value === 0) return "R$ 0";
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

export const TransactionChart: React.FC<TransactionChartProps> = ({ transactions }) => {
    const chartData = React.useMemo(() => {
        const dailyData: { [key: string]: { credit: number; debit: number } } = {};

        transactions.forEach(t => {
            const date = formatDateForChart(t.date);
            if (!dailyData[date]) {
                dailyData[date] = { credit: 0, debit: 0 };
            }
            if (t.amount > 0) {
                dailyData[date].credit += t.amount;
            } else {
                dailyData[date].debit += Math.abs(t.amount);
            }
        });

        return Object.keys(dailyData).map(date => ({
            date,
            Créditos: dailyData[date].credit,
            Débitos: dailyData[date].debit,
        })).sort((a, b) => {
            const [dayA, monthA] = a.date.split('/');
            const [dayB, monthB] = b.date.split('/');
            const dateA = new Date(`2000-${monthA}-${dayA}`);
            const dateB = new Date(`2000-${monthB}-${dayB}`);
            return dateA.getTime() - dateB.getTime();
        });
    }, [transactions]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Movimentação por Dia</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={formatCurrencyForChart} />
                        <Tooltip formatter={(value: number) => formatCurrencyForChart(value)} />
                        <Legend />
                        <Bar dataKey="Créditos" fill="#22c55e" />
                        <Bar dataKey="Débitos" fill="#ef4444" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};