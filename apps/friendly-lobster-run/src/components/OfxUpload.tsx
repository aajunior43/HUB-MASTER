import * as React from "react";
import * as ofx from "ofx-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfxData } from "@/types/ofx";
import { showError, showSuccess } from "@/utils/toast";

interface OfxUploadProps {
  onFileParsed: (data: OfxData) => void;
  onError: (message: string) => void;
}

export const OfxUpload: React.FC<OfxUploadProps> = ({ onFileParsed, onError }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        const data = (await ofx.parse(content)) as OfxData;
        
        // Remap transactions to a more consistent structure if needed
        const transactions = data.body.transactions.map(t => ({
          ...t,
          date: t.date,
          amount: Number(t.amount)
        }));

        const parsedData = {
            ...data,
            body: {
                ...data.body,
                transactions,
                account: {
                    ...data.body.account,
                    balance: Number(data.body.account.balance)
                }
            }
        }

        onFileParsed(parsedData);
        showSuccess("Arquivo OFX processado com sucesso!");
      } catch (error) {
        console.error("Erro ao processar o arquivo OFX:", error);
        onError("Não foi possível ler o arquivo. Verifique se é um arquivo OFX válido.");
        showError("Erro ao processar o arquivo.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="ofx-file">Selecione o arquivo OFX</Label>
      <Input id="ofx-file" type="file" accept=".ofx" onChange={handleFileChange} />
    </div>
  );
};