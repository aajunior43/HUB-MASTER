import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpenCheck, Download, FileSearch, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";

type Modalidade = {
  id: number;
  descricao: string;
  pncp: number | null;
  tipo: number;
};

const modalidades: Modalidade[] = [
  { id: 4, descricao: "Concurso", pncp: 3, tipo: 1 },
  { id: 7, descricao: "Dispensa", pncp: 8, tipo: 1 },
  { id: 8, descricao: "Inexigibilidade", pncp: 9, tipo: 1 },
  { id: 11, descricao: "Diálogo competitivo", pncp: 2, tipo: 1 },
  { id: 13, descricao: "Especial — Startups", pncp: null, tipo: 1 },
  { id: 17, descricao: "Pregão — Eletrônico", pncp: 6, tipo: 1 },
  { id: 18, descricao: "Pregão — Presencial", pncp: 7, tipo: 1 },
  { id: 19, descricao: "Concorrência — Eletrônica", pncp: 4, tipo: 1 },
  { id: 20, descricao: "Concorrência — Presencial", pncp: 5, tipo: 1 },
  { id: 21, descricao: "Leilão Eletrônico", pncp: 1, tipo: 1 },
  { id: 22, descricao: "Leilão Presencial", pncp: 13, tipo: 1 },
  { id: 23, descricao: "Inaplicabilidade de Licitação", pncp: 14, tipo: 3 },
  { id: 24, descricao: "Credenciamento", pncp: 12, tipo: 2 },
  { id: 25, descricao: "Chamada Pública", pncp: 15, tipo: 2 },
  { id: 26, descricao: "Concorrência — Eletrônica Internacional", pncp: 16, tipo: 1 },
  { id: 27, descricao: "Concorrência — Presencial Internacional", pncp: 17, tipo: 1 },
  { id: 28, descricao: "Pregão — Eletrônico Internacional", pncp: 18, tipo: 1 },
  { id: 29, descricao: "Pregão — Presencial Internacional", pncp: 19, tipo: 1 },
];

export default function PrestacaoContas() {
  const navigate = useNavigate();
  const [submodulo, setSubmodulo] = useState<"inicio" | "modalidades">("inicio");
  const [busca, setBusca] = useState("");
  const resultados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return modalidades.filter((item) =>
      !termo || `${item.descricao} ${item.pncp ?? "sem código"}`.toLocaleLowerCase("pt-BR").includes(termo),
    );
  }, [busca]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader icon={BookOpenCheck} title="Prestação de contas" subtitle="Consultas e referências para envio de informações" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {submodulo === "inicio" ? (
          <section>
            <div className="mb-7 max-w-2xl"><h2 className="font-display text-2xl font-bold tracking-tight">Submódulos</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Referências organizadas para apoiar a prestação de contas e os registros mensais.</p></div>
            <div className="grid max-w-4xl gap-4 md:grid-cols-2">
              <Card className="group cursor-pointer border-primary/20 transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-card" onClick={() => setSubmodulo("modalidades")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSubmodulo("modalidades"); }}>
                <CardHeader><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileSearch className="h-5 w-5" /></div><div><CardTitle className="text-lg">Modalidades de licitação</CardTitle><CardDescription className="mt-1.5 leading-5">Códigos do SIM-AM e equivalências de contratação no PNCP.</CardDescription></div></div></CardHeader>
                <CardContent className="flex items-center justify-between gap-4"><span className="text-xs font-medium text-muted-foreground">18 modalidades cadastradas</span><Button size="sm" className="pointer-events-none">Consultar</Button></CardContent>
              </Card>
              <Card className="group cursor-pointer border-primary/20 transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-card" onClick={() => navigate("/prestacao-contas/demonstrativos-bb")} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate("/prestacao-contas/demonstrativos-bb"); }}>
                <CardHeader><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Download className="h-5 w-5" /></div><div><CardTitle className="text-lg">Demonstrativos BB</CardTitle><CardDescription className="mt-1.5 leading-5">Consulta e download dos demonstrativos da arrecadação federal.</CardDescription></div></div></CardHeader>
                <CardContent className="flex items-center justify-between gap-4"><span className="text-xs font-medium text-muted-foreground">Banco do Brasil · DAF</span><Button size="sm" className="pointer-events-none">Abrir</Button></CardContent>
              </Card>
            </div>
          </section>
        ) : (
          <section>
            <Button variant="ghost" size="sm" className="-ml-2 mb-5" onClick={() => setSubmodulo("inicio")}><ArrowLeft className="mr-1.5 h-4 w-4" />Submódulos</Button>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">SIM-AM · acompanhamento mensal</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Modalidades de licitação</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Consulte o código da modalidade no SIM-AM e sua correspondência para contratação no PNCP.</p></div><Badge variant="secondary" className="w-fit px-3 py-1.5">{resultados.length} de {modalidades.length} registros</Badge></div>
            <Card><CardContent className="p-4 sm:p-5"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(event) => setBusca(event.target.value)} className="pl-9" placeholder="Buscar por modalidade ou código PNCP" aria-label="Buscar modalidade" /></div></CardContent></Card>
            <Card className="mt-4 overflow-hidden"><Table><TableHeader className="bg-muted/55"><TableRow><TableHead className="font-semibold text-foreground">Modalidade de licitação</TableHead><TableHead className="w-52 font-semibold text-foreground">Código PNCP</TableHead></TableRow></TableHeader><TableBody>{resultados.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.descricao}</TableCell><TableCell>{item.pncp === null ? <span className="text-muted-foreground">Não informado</span> : <Badge variant="secondary">{item.pncp}</Badge>}</TableCell></TableRow>)}{resultados.length === 0 && <TableRow><TableCell colSpan={2} className="py-12 text-center text-sm text-muted-foreground">Nenhuma modalidade encontrada para esta consulta.</TableCell></TableRow>}</TableBody></Table></Card>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Fonte: Tribunal de Contas do Estado do Paraná — Sistema de Informações Municipais (SIM-AM), acompanhamento mensal, versão 1.0i.</p>
          </section>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
