import { useState } from "react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Search, Loader2, Tags, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

type Classificacao = {
  codigo_completo: string;
  grupo: string;
  modalidade: string;
  elemento: string;
  subelemento_codigo: string;
  subelemento_nome: string;
  justificativa: string;
  ponto_atencao: string;
  confianca: number;
};

export default function ClassificadorDespesa() {
  const { user } = useAuth();
  const [item, setItem] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Classificacao | null>(null);
  const [historico, setHistorico] = useState<{ item: string; resultado: Classificacao }[]>([]);

  const classificar = async () => {
    if (!item.trim()) {
      toast({ title: "Item obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResultado(null);
    const { data, error } = await db.rpc("classificador_despesa_classificar", {
      _item: item.trim(), _caller: user,
    }) as unknown as { data: { item: string; json?: Classificacao } | null; error: { message: string } | null };
    setLoading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    if (data?.json) {
      setResultado(data.json);
      setHistorico(prev => [{ item: data.item, resultado: data.json! }, ...prev].slice(0, 20));
    }
  };

  const confiancaColor = (c: number) => {
    if (c >= 0.8) return "text-emerald-500";
    if (c >= 0.5) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={Tags} title="Classificador de despesa" subtitle="Classificação contábil de itens de despesa pública com IA" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Classificar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Ex: Locação de veículos para transporte escolar"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && classificar()}
                  className="text-base"
                />
              </div>
              <Button onClick={classificar} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Classificar
              </Button>
            </div>
          </CardContent>
        </Card>

        {resultado && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{resultado.codigo_completo}</CardTitle>
                  {resultado.subelemento_nome && (
                    <p className="text-sm text-muted-foreground mt-1">{resultado.subelemento_nome}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={confiancaColor(resultado.confianca)}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {Math.round(resultado.confianca * 100)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Grupo</span>
                  <span className="font-medium text-sm">{resultado.grupo || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Modalidade</span>
                  <span className="font-medium text-sm">{resultado.modalidade || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Elemento</span>
                  <span className="font-medium text-sm">{resultado.elemento || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Subelemento</span>
                  <span className="font-medium text-sm">{resultado.subelemento_codigo || "—"}</span>
                </div>
              </div>

              {resultado.justificativa && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Justificativa</span>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{resultado.justificativa}</p>
                </div>
              )}

              {resultado.ponto_atencao && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">{resultado.ponto_atencao}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {historico.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico ({historico.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {historico.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm hover:bg-accent/50 cursor-pointer"
                    onClick={() => { setItem(h.item); setResultado(h.resultado); }}>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{h.item}</p>
                      <p className="text-xs text-muted-foreground">{h.resultado.codigo_completo} — {h.resultado.subelemento_nome?.slice(0, 60)}</p>
                    </div>
                    <Badge variant="outline" className={`ml-2 shrink-0 text-[10px] ${confiancaColor(h.resultado.confianca)}`}>
                      {Math.round(h.resultado.confianca * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
