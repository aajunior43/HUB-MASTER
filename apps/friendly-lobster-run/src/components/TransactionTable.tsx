import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OfxTransaction } from "@/types/ofx";
import { cn } from "@/lib/utils";

interface TransactionTableProps {
  transactions: OfxTransaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
    const formatDate = (dateString: string) => {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return new Date(`${year}-${month}-${day}`).toLocaleDateString();
    };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right w-[150px]">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <TableRow key={transaction.fitId} className="hover:bg-muted/50">
                <TableCell>{formatDate(transaction.date)}</TableCell>
                <TableCell>{transaction.memo}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(transaction.amount)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center">
                Nenhuma transação encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};