import React, { useRef, useState } from "react";
import { db } from "@/integrations/db/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileUp, CheckCircle2, RefreshCw, Upload } from "lucide-react";
import { parseCSV } from "@/lib/parseCSV";
import { useConfirm } from "@/components/ConfirmDialog";

interface AbaImportarProps {
  callerUsername: string;
}

export function AbaImportar({ callerUsername }: AbaImportarProps) {
  const { confirm, confirmElement } = useConfirm();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [rawData, setRawData] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Arquivo inválido", description: "Selecione um arquivo .csv", variant: "destructive" });
      return;
    }
    // Limite simples de tamanho: 25 MB para evitar travar o navegador.
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O limite é 25 MB.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setDone(false);
    setProgress(0);
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      let text = "";
      try {
        // Tenta decodificar como UTF-8 estrito. Se falhar, lança erro.
        const decoderUtf8 = new TextDecoder("utf-8", { fatal: true });
        text = decoderUtf8.decode(arrayBuffer);
      } catch (err) {
        // Se falhar (ex: contém sequências inválidas de UTF-8), decodifica como Windows-1252
        const decoderW1252 = new TextDecoder("windows-1252");
        text = decoderW1252.decode(arrayBuffer);
      }

      const parsed = parseCSV(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast({ title: "CSV vazio ou inválido", variant: "destructive" });
        return;
      }
      setRawData(parsed);
      setPreview(parsed.slice(0, 5));
      setTotal(parsed.length);
    };
    reader.onerror = () => {
      toast({ title: "Falha ao ler o arquivo", variant: "destructive" });
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Importação atômica via staging + DROP/RENAME.
  const importar = async (modo: "substituir" | "append") => {
    if (!rawData || rawData.length === 0) return;
    if (modo === "substituir") {
      const ok = await confirm({
        title: "Substituir base de empenhos",
        description: `Todos os registros da base atual serão descartados e substituídos pelos ${rawData.length.toLocaleString("pt-BR")} registros do arquivo. Esta ação não pode ser desfeita.`,
        confirmLabel: "Substituir base",
      });
      if (!ok) return;
    }
    setImporting(true);
    setProgress(0);

    const CHUNK = 200;
    let inseridos = 0;
    for (let i = 0; i < rawData.length; i += CHUNK) {
      const chunk = rawData.slice(i, i + CHUNK);
      const ultimo = i + CHUNK >= rawData.length;
      const primeiro = i === 0;
      const args: Record<string, unknown> = {
        _caller: callerUsername,
        _modo: modo,
        _dados: chunk,
        _continuar: !primeiro,
        _finalizar: ultimo,
      };
      const { error } = await db.rpc("empenhos_importar", args);
      if (error) {
        toast({
          title: "Erro na importação",
          description: error.message || "Falha ao importar. O banco original não foi alterado.",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }
      inseridos += chunk.length;
      setProgress(Math.round((inseridos / rawData.length) * 100));
    }

    setImporting(false);
    setDone(true);
    toast({ title: "Importação concluída!", description: `${inseridos.toLocaleString("pt-BR")} registros salvos.` });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
        }`}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <FileUp className={`w-12 h-12 transition-colors ${dragging ? "text-primary" : "text-muted-foreground"}`} />
        <div className="text-center">
          <p className="font-semibold">{fileName || "Arraste o CSV aqui ou clique para selecionar"}</p>
          <p className="text-xs text-muted-foreground mt-1">Arquivo: Relação de Empenho.csv</p>
        </div>
        {total > 0 && (
          <Badge variant="secondary">{total.toLocaleString("pt-BR")} registros detectados</Badge>
        )}
      </div>

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden w-full max-w-full">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prévia (5 primeiros registros)</p>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs">
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.numeroEmpenho || "—"}</td>
                    <td className="px-3 py-2 max-w-[250px] truncate">{row.nomeCredor || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.valorEmpenhadoBruto || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.modalidade || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Barra de progresso */}
      {importing && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Importando...</span><span>{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {done && !importing && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-500">
            {total.toLocaleString("pt-BR")} registros importados com sucesso!
          </p>
        </div>
      )}

      {/* Botões */}
      {rawData && !importing && (
        <div className="flex gap-3">
          <Button onClick={() => importar("substituir")} className="flex-1" disabled={!rawData}
            aria-label="Substituir a base atual pelo conteúdo do arquivo">
            <RefreshCw className="w-4 h-4 mr-2" /> Substituir base por arquivo
          </Button>
          <Button onClick={() => importar("append")} variant="outline" className="flex-1" disabled={!rawData}
            aria-label="Acrescentar registros do arquivo à base atual (substituindo ids iguais)">
            <Upload className="w-4 h-4 mr-2" /> Acrescentar (upsert por id)
          </Button>
        </div>
      )}
      {confirmElement}
    </div>
  );
}
