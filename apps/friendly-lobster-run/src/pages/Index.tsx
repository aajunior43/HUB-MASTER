import * as React from "react";
import { OfxUpload } from "@/components/OfxUpload";
import { AccountSummary } from "@/components/AccountSummary";
import { TransactionTable } from "@/components/TransactionTable";
import { OfxData } from "@/types/ofx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { TransactionSummary } from "@/components/TransactionSummary";
import { TransactionChart } from "@/components/TransactionChart";
import { FileText, UploadCloud, SearchX } from "lucide-react";

const Index = () => {
  const [ofxData, setOfxData] = React.useState<OfxData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined,
  });

  const handleFileParsed = (data: OfxData) => {
    setOfxData(data);
    setError(null);
  };

  const handleError = (message: string) => {
    setError(message);
    setOfxData(null);
  };

  const filteredTransactions = React.useMemo(() => {
    if (!ofxData) return [];

    const parseOfxDate = (dateStr: string) => {
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1;
      const day = parseInt(dateStr.substring(6, 8), 10);
      return new Date(year, month, day);
    };

    return ofxData.body.transactions.filter((t) => {
      const transactionDate = parseOfxDate(t.date);
      const memoMatch = t.memo.toLowerCase().includes(searchTerm.toLowerCase());

      const fromDate = dateRange.from
        ? new Date(dateRange.from.setHours(0, 0, 0, 0))
        : null;
      const toDate = dateRange.to
        ? new Date(dateRange.to.setHours(23, 59, 59, 999))
        : null;

      const dateMatch =
        (!fromDate || transactionDate >= fromDate) &&
        (!toDate || transactionDate <= toDate);

      return memoMatch && dateMatch;
    });
  }, [ofxData, searchTerm, dateRange]);

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground p-3 rounded-lg">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Analisador de Extratos OFX
            </h1>
          </div>
        </div>
      </header>

      <main className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Carregar Arquivo</CardTitle>
          </CardHeader>
          <CardContent>
            <OfxUpload onFileParsed={handleFileParsed} onError={handleError} />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!ofxData && !error && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Aguardando arquivo</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Seus dados aparecerão aqui após o carregamento.
            </p>
          </div>
        )}

        {ofxData && (
          <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <AccountSummary data={ofxData} />
              <TransactionSummary transactions={ofxData.body.transactions} />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Filtros e Análise</CardTitle>
                <CardDescription>
                  Refine os resultados para encontrar transações específicas. O resumo e o gráfico abaixo serão atualizados.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <DatePicker
                  date={dateRange.from}
                  setDate={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                  placeholder="Data inicial"
                />
                <DatePicker
                  date={dateRange.to}
                  setDate={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                  placeholder="Data final"
                />
              </CardContent>
            </Card>
            
            {filteredTransactions.length > 0 ? (
              <>
                <TransactionChart transactions={filteredTransactions} />
                <TransactionTable transactions={filteredTransactions} />
              </>
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Nenhuma transação encontrada</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste os filtros ou verifique o arquivo carregado.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;