import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, KeyRound, PlugZap, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/db/client";
import { useConfirm } from "@/components/ConfirmDialog";

type McpToken = { id: string; nome: string; token_prefix: string; ativo: boolean; criado_em: string; ultimo_uso_em: string | null; expira_em: string | null; username: string };

const ferramentas = [
  ["Catálogo por módulos", "O servidor publica as ferramentas correspondentes aos módulos do usuário vinculado à chave."],
  ["RPCs integradas", "Inclui empenhos, documentos, calendário, RPA, IA, Autentique, financeiro, mural, CNPJ e backups."],
  ["Confirmações das RPCs", "Exclusões, cancelamentos, revogações e importações usam argumentos._confirmacao com o literal indicado pelo schema da ferramenta."],
  ["Confirmações diretas", "remover_tarefa, remover_credor, remover_empenho_mensal, remover_solicitacao e remover_obrigacao usam confirmacao: REMOVER no nível superior."],
  ["listar_tarefas / criar_tarefa", "Ferramentas do Mural de Tarefas, respeitando a permissão tarefas."],
  ["Backups", "Administradores têm backups diretos e RPCs de backup; o envio ao GitHub exige ENVIAR_BACKUP no nível correspondente."],
  ["PDF", "O processamento de PDF continua disponível no navegador e não faz parte do catálogo MCP."],
];

async function copiarTexto(texto: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.opacity = "0";
  document.body.appendChild(campo);
  campo.select();

  const copiado = document.execCommand("copy");
  campo.remove();
  if (!copiado) throw new Error("Seu navegador não permitiu copiar o conteúdo.");
}

export default function Mcp() {
  const { user } = useAuth();
  const { confirm, confirmElement } = useConfirm();
  const [copiado, setCopiado] = useState(false);
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState(user || "");
  const [expiraDias, setExpiraDias] = useState("90");
  const [novoToken, setNovoToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const carregarTokens = useCallback(async () => {
    const { data, error } = await db.rpc("mcp_token_listar", { _caller: user });
    if (error) return toast({ title: "Não foi possível carregar as chaves", description: error.message, variant: "destructive" });
    setTokens((data || []) as McpToken[]);
  }, [user]);

  useEffect(() => { void carregarTokens(); }, [carregarTokens]);

  const criarToken = async () => {
    if (!nome.trim() || !usuario.trim()) return toast({ title: "Informe o nome e o usuário da chave", variant: "destructive" });
    setCarregando(true);
    const { data, error } = await db.rpc("mcp_token_criar", { _caller: user, _nome: nome, _usuario: usuario, _expira_dias: Number(expiraDias) });
    setCarregando(false);
    if (error) return toast({ title: "Não foi possível gerar a chave", description: error.message, variant: "destructive" });
    setNovoToken((data as { token: string }).token);
    setNome("");
    setExpiraDias("90");
    await carregarTokens();
  };

  const revogarToken = async (id: string, nome: string) => {
    if (!(await confirm({ title: "Revogar chave MCP", description: `Revogar “${nome}”? Agentes de IA usando esta chave perdem o acesso imediatamente.`, confirmLabel: "Revogar" }))) return;
    const { error } = await db.rpc("mcp_token_revogar", { _caller: user, _id: id });
    if (error) return toast({ title: "Não foi possível revogar a chave", description: error.message, variant: "destructive" });
    toast({ title: "Chave revogada" });
    await carregarTokens();
  };

  const copiarGuia = async () => {
    try {
      const resposta = await fetch("/guia-mcp-mural-tarefas.md");
      if (!resposta.ok) throw new Error("Guia indisponível");
      await copiarTexto(await resposta.text());
      setCopiado(true);
      toast({ title: "Instruções copiadas", description: "Cole o conteúdo diretamente no seu agente de IA." });
      window.setTimeout(() => setCopiado(false), 2000);
    } catch (erro) {
      toast({ title: "Não foi possível copiar as instruções", description: erro instanceof Error ? erro.message : "Tente baixar o arquivo Markdown.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={PlugZap} title="MCP" subtitle="Integração de agentes de IA com os módulos da prefeitura" username={user} />
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-5">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Servidor MCP da Prefeitura</CardTitle>
                <CardDescription className="mt-1">Permite que uma IA autorizada consulte e execute operações nos módulos atribuídos ao usuário da chave.</CardDescription>
              </div>
              <Badge variant="secondary">Endpoint: /mcp</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Crie abaixo uma chave individual para a IA. Ela atua somente com as permissões do usuário escolhido, expira automaticamente e pode ser revogada a qualquer momento.</p>
            <p>Para acesso externo, publique o endpoint com HTTPS em um endereço público. Não compartilhe a chave em conversas, documentos ou tarefas.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Chaves de acesso</CardTitle><CardDescription>O valor completo só é mostrado imediatamente após a criação.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <input className="h-10 rounded-md border bg-background px-3 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da IA ou integração" maxLength={120} />
              <input className="h-10 rounded-md border bg-background px-3 text-sm" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Usuário do sistema" maxLength={120} />
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={expiraDias} onChange={(e) => setExpiraDias(e.target.value)} aria-label="Validade da chave">
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
                <option value="180">180 dias</option>
                <option value="365">365 dias</option>
              </select>
              <Button onClick={() => void criarToken()} disabled={carregando}>{carregando ? "Gerando..." : "Gerar chave"}</Button>
            </div>
            {novoToken && <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3"><p className="text-sm font-medium">Copie agora: esta chave não será exibida novamente.</p><code className="block break-all rounded bg-background p-2 text-xs">{novoToken}</code><Button size="sm" variant="outline" onClick={() => void copiarTexto(novoToken).then(() => toast({ title: "Chave copiada" })).catch((erro) => toast({ title: "Não foi possível copiar a chave", description: erro instanceof Error ? erro.message : "Selecione e copie a chave manualmente.", variant: "destructive" }))}>Copiar chave</Button></div>}
            <div className="space-y-2">
              {tokens.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma chave MCP criada.</p> : tokens.map((token) => <div key={token.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"><div><p className="font-medium">{token.nome} <span className="text-muted-foreground">· {token.username}</span></p><p className="text-xs text-muted-foreground">{token.token_prefix}… · criada em {new Date(token.criado_em).toLocaleString("pt-BR")}{token.expira_em ? ` · expira em ${new Date(token.expira_em).toLocaleString("pt-BR")}` : " · sem expiração"}{token.ultimo_uso_em ? ` · último uso ${new Date(token.ultimo_uso_em).toLocaleString("pt-BR")}` : ""}</p></div><Button size="sm" variant="outline" onClick={() => void revogarToken(token.id, token.nome)}><Trash2 className="mr-2 h-4 w-4" />Revogar</Button></div>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ferramentas disponíveis</CardTitle><CardDescription>As ações são registradas na auditoria com origem <code>mcp</code>.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {ferramentas.map(([nome, descricao]) => (
              <div key={nome} className="rounded-lg border p-3">
                <code className="font-semibold text-primary">{nome}</code>
                <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Guia para agentes de IA</CardTitle><CardDescription>Use este arquivo para instruir qualquer agente sobre as regras e o uso correto do MCP.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => void copiarGuia()}>{copiado ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copiado ? "Copiado" : "Copiar instruções"}</Button>
            <Button variant="outline" asChild><a href="/guia-mcp-mural-tarefas.md" download><Download className="mr-2 h-4 w-4" />Baixar arquivo .md</a></Button>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
      {confirmElement}
    </div>
  );
}
