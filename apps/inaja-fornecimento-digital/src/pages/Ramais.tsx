import { useMemo, useState } from "react";
import { Clipboard, Copy, Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { toast } from "@/hooks/use-toast";

type Ramal = { local: string; ramal: string; numero?: string };

const ramais: Ramal[] = [
  { local: "Recepção", ramal: "1200", numero: "4431124320" },
  { local: "Gabinete", ramal: "1201" },
  { local: "Contabilidade", ramal: "1202" },
  { local: "Geise", ramal: "1203" },
  { local: "RH", ramal: "1204" },
  { local: "Licitação", ramal: "1205" },
  { local: "Tributação", ramal: "1206" },
  { local: "Tesouraria", ramal: "1207" },
  { local: "Assistência Social", ramal: "1208" },
  { local: "Jurídico", ramal: "1209" },
  { local: "Controle Interno", ramal: "1210" },
  { local: "Frotas", ramal: "1211" },
  { local: "Hospital", ramal: "2101", numero: "4431124321" },
  { local: "Hospital", ramal: "2102" },
  { local: "Recepção — Posto", ramal: "2201", numero: "4431124322" },
  { local: "Posto 2202", ramal: "2202" },
  { local: "Atendimento Posto 2", ramal: "2203", numero: "4431124328" },
  { local: "Posto 2204", ramal: "2204" },
  { local: "ESF — Recepção", ramal: "2301", numero: "4431124323" },
  { local: "ESF 2302", ramal: "2302" },
  { local: "Secretaria de Educação", ramal: "3101", numero: "4431124325" },
  { local: "3102", ramal: "3102" },
  { local: "Recepção — CMEI", ramal: "3201", numero: "4431124326" },
  { local: "CMEI 3202", ramal: "3202" },
  { local: "Escola", ramal: "3301", numero: "4431124327" },
  { local: "Escola 3302", ramal: "3302" },
  { local: "Recepção — CRAS", ramal: "4101", numero: "4431124318" },
  { local: "CRAS 4102", ramal: "4102" },
  { local: "CREAS — Recepção", ramal: "4201", numero: "4431124319" },
  { local: "CREAS 4202", ramal: "4202" },
];

export default function Ramais() {
  const [busca, setBusca] = useState("");
  const resultados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return ramais.filter((item) => !termo || `${item.local} ${item.ramal} ${item.numero ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo));
  }, [busca]);
  const copiar = async (valor: string, descricao: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      toast({ title: "Copiado", description: `${descricao} copiado para a área de transferência.` });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  return <div className="min-h-screen bg-background"><PageHeader icon={Phone} title="Ramais e contatos" subtitle="Diretório telefônico interno da Prefeitura de Inajá" maxWidth="max-w-5xl" /><main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-2xl font-bold tracking-tight">Diretório interno</h2><p className="mt-1 text-sm text-muted-foreground">Pesquise o local, ramal ou número de telefone.</p></div><span className="text-xs font-medium text-muted-foreground">{resultados.length} contatos</span></div><Card><CardContent className="p-4 sm:p-5"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(event) => setBusca(event.target.value)} className="pl-9" placeholder="Ex.: Hospital, 2101 ou Recepção" aria-label="Buscar ramal ou contato" /></div></CardContent></Card><Card className="mt-4 overflow-hidden"><Table><TableHeader className="bg-muted/55"><TableRow><TableHead className="font-semibold text-foreground">Local</TableHead><TableHead className="w-32 font-semibold text-foreground">Ramal</TableHead><TableHead className="w-64 font-semibold text-foreground">Telefone</TableHead></TableRow></TableHeader><TableBody>{resultados.map((item) => <TableRow key={`${item.local}-${item.ramal}`}><TableCell className="font-medium">{item.local}</TableCell><TableCell><Button variant="ghost" size="sm" className="-ml-2 font-mono font-semibold text-primary" onClick={() => void copiar(item.ramal, "Ramal")} title="Copiar ramal">{item.ramal}<Copy className="ml-1.5 h-3.5 w-3.5" /></Button></TableCell><TableCell>{item.numero ? <div className="flex flex-wrap items-center gap-1"><Button asChild variant="ghost" size="sm" className="-ml-2 font-mono text-foreground"><a href={`tel:+55${item.numero}`}><Phone className="mr-1.5 h-3.5 w-3.5 text-primary" />{item.numero}</a></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void copiar(item.numero!, "Telefone")} title="Copiar telefone" aria-label={`Copiar telefone de ${item.local}`}><Clipboard className="h-3.5 w-3.5" /></Button></div> : <span className="text-sm text-muted-foreground">—</span>}</TableCell></TableRow>)}{resultados.length === 0 && <TableRow><TableCell colSpan={3} className="py-12 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</TableCell></TableRow>}</TableBody></Table></Card><p className="mt-3 text-xs text-muted-foreground">Toque no ramal para copiá-lo. Os telefones externos podem ser acionados diretamente em dispositivos compatíveis.</p></main><AppFooter /></div>;
}
