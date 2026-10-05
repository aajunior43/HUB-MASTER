import { useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, CheckCircle2, Wallet, Clock } from "lucide-react";
import { TotaisEmpenhos as Totais, moeda } from "@/lib/empenhos";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { BarraSimples } from "@/components/BarraSimples";

interface DashboardStats {
  totais: Totais;
  porModalidade: { modalidade: string; qtd: number; total: number }[];
  porNatureza: { natureza: string; qtd: number; total: number }[];
  topCredores: { nome_credor: string; qtd: number; total: number }[];
}

export function AbaDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(null);
    db.rpc("empenhos_stats", { _caller: user }).then(({ data, error }) => {
      if (cancelado) return;
      if (error) {
        setErro(error.message || "Erro ao carregar dashboard");
        toast({ title: "Erro ao carregar dashboard", description: error.message, variant: "destructive" });
      } else {
        setStats(data as DashboardStats);
      }
      setLoading(false);
    });
    return () => {
      cancelado = true;
    };
  }, [user]);

  if (loading) return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );

  if (erro) return (
    <EmptyState
      icon={BarChart3}
      title="Não foi possível carregar o dashboard"
      description={erro}
    />
  );

  if (!stats || !stats.totais || !stats.totais.total_registros) return (
    <EmptyState
      icon={BarChart3}
      title="Nenhum dado importado ainda"
      description="Vá para a aba Importar para carregar o CSV."
    />
  );

  const { totais, porModalidade, porNatureza, topCredores } = stats;
  const maxMod = Math.max(...porModalidade.map(m => m.total), 1);
  const maxNat = Math.max(...porNatureza.map(n => n.total), 1);
  const maxCred = Math.max(...topCredores.map(c => c.total), 1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Empenhado" value={moeda(totais.total_empenhado)} icon={TrendingUp} variant="primary" />
        <StatCard label="Total Liquidado" value={moeda(totais.total_liquidado)} icon={CheckCircle2} variant="success" />
        <StatCard label="Total Pago" value={moeda(totais.total_pago)} icon={Wallet} variant="info" />
        <StatCard label="Saldo a Pagar" value={moeda(totais.total_saldo_pagar)} icon={Clock} variant="warning" />
      </div>

      <div className="text-xs text-muted-foreground">
        {totais.total_registros.toLocaleString("pt-BR")} registros importados
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-display font-semibold text-sm">Por Modalidade</h3>
          <div className="space-y-3">
            {porModalidade.map(m => (
              <BarraSimples key={m.modalidade} label={m.modalidade} value={m.total} max={maxMod} cor="primary" />
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-display font-semibold text-sm">Por Natureza de Despesa</h3>
          <div className="space-y-3">
            {porNatureza.map(n => (
              <BarraSimples key={n.natureza} label={n.natureza} value={n.total} max={maxNat} cor="emerald" />
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-display font-semibold text-sm">Top Credores</h3>
          <div className="space-y-3">
            {topCredores.map(c => (
              <BarraSimples key={c.nome_credor} label={c.nome_credor} value={c.total} max={maxCred} cor="blue" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
