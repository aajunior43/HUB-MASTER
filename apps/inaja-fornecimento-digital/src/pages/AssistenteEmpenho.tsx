import { useRef, useState } from "react";
import { CheckCircle2, Copy, FileText, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";

export default function AssistenteEmpenho() {
  const { user } = useAuth();
  const [contexto, setContexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [extraindo, setExtraindo] = useState(false);
  const [nomeDocumento, setNomeDocumento] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const inputDocumento = useRef<HTMLInputElement>(null);

  const lerBase64 = (arquivo: File) => new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(",")[1] || "");
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });

  const extrairDocumento = async (arquivo: File) => {
    if (arquivo.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Envie um documento de até 20 MB.", variant: "destructive" });
      return;
    }
    setExtraindo(true);
    try {
      const resposta = await fetch("/api/ia/extrair-documento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: arquivo.name, mime: arquivo.type, contentBase64: await lerBase64(arquivo) }),
      });
      const corpo = await resposta.json() as { data?: { texto?: string; origem?: string }; error?: { message?: string } };
      if (!resposta.ok || !corpo.data?.texto) throw new Error(corpo.error?.message || "Não foi possível extrair o texto.");
      setContexto(corpo.data.texto);
      setNomeDocumento(arquivo.name);
      setResultado(null);
      toast({ title: "Texto extraído", description: corpo.data.origem === "ocr" ? "OCR aplicado ao documento." : "Conteúdo do documento carregado." });
    } catch (erro) {
      toast({ title: "Falha ao ler documento", description: erro instanceof Error ? erro.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setExtraindo(false);
    }
  };

  const gerarDescricao = async () => {
    if (!contexto.trim()) {
      toast({
        title: "Informe o texto",
        description: "Descreva o objeto, serviço ou aquisição que será empenhada.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResultado(null);
    const { data, error } = await db.rpc("empenho_assistente_executar", {
      _acao: "gerar_descricao",
      _contexto: contexto.trim(),
      _caller: user,
    }) as unknown as { data: { text: string } | null; error: { message: string } | null };
    setLoading(false);

    if (error) {
      toast({ title: "Não foi possível gerar a descrição", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.text) setResultado(data.text.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={Sparkles} title="Assistente de empenho" subtitle="Transforme informações em uma descrição adequada para o empenho" />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Gerar descrição de empenho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium">Informações para o empenho</label>
                <input
                  ref={inputDocumento}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.odt,.xls,.xlsx,.ods,.csv,.txt"
                  onChange={(event) => {
                    const arquivo = event.target.files?.[0];
                    event.target.value = "";
                    if (arquivo) void extrairDocumento(arquivo);
                  }}
                />
                <Button type="button" size="sm" variant="outline" disabled={extraindo} onClick={() => inputDocumento.current?.click()}>
                  {extraindo ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                  {extraindo ? "Extraindo texto..." : "Importar documento"}
                </Button>
              </div>
              <Textarea
                value={contexto}
                onChange={(event) => setContexto(event.target.value)}
                rows={8}
                placeholder="Ex.: contratação de empresa para manutenção preventiva e corretiva de aparelhos de ar-condicionado das unidades de saúde, conforme demanda, no mês de agosto de 2026."
              />
              <p className="mt-2 text-xs text-muted-foreground">{nomeDocumento ? `Texto extraído de ${nomeDocumento}. Você pode revisá-lo antes de gerar.` : "Digite ou importe PDF, imagem, Word, planilha ou texto. PDFs e imagens sem texto pesquisável passam por OCR."} Inclua, quando disponível, o objeto, quantidade, período, local, finalidade e fornecedor.</p>
            </div>

            <Button onClick={gerarDescricao} disabled={loading} size="lg" className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Gerar descrição
            </Button>
          </CardContent>
        </Card>

        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Descrição sugerida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-6">{resultado}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{resultado.length} caracteres</span>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(resultado); toast({ title: "Descrição copiada" }); }}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar descrição
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
