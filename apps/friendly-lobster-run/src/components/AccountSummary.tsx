import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfxData } from "@/types/ofx";

interface AccountSummaryProps {
  data: OfxData;
}

export const AccountSummary: React.FC<AccountSummaryProps> = ({ data }) => {
  const { balance, currency, startDate, endDate } = data.body.account;

  const formatDate = (dateString: string) => {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return new Date(`${year}-${month}-${day}`).toLocaleDateString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Resumo da Conta</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Final:</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: currency || "BRL",
              }).format(balance)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Período do Extrato:</p>
            <p className="text-base font-medium">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};