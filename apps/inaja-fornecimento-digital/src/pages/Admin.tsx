import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, UserPlus, Users, UserCheck, KeyRound, Power, Loader2,
  CheckSquare2, Square, Crown, Eye, EyeOff, Settings, Wifi, WifiOff, Save, HardDrive, PlugZap, ScrollText, RefreshCw, Plus, Trash2, Copy,
  Send, Bot, CheckCircle2, AlertCircle, ExternalLink, Check, HelpCircle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { AppFooter } from "@/components/AppFooter";
import { PageHeader } from "@/components/PageHeader";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface UsuarioRow {
  id: string;
  username: string;
  is_admin: boolean;
  ativo: boolean;
  modulos: string[];
  created_at: string;
  mostrar_bloqueados: boolean;
}

// ─── Módulos disponíveis ───────────────────────────────────────────────────────
const MODULOS = [
  { id: "solicitacoes", label: "Solicitações de aquisição" },
  { id: "tarefas", label: "Mural de tarefas" },
  { id: "calculadoras", label: "Calculadoras (diárias e ISS)" },
  { id: "credores-fixos", label: "Credores recorrentes" },
  { id: "empenhos", label: "Empenhos" },
  { id: "pedido-dotacao", label: "Pedidos de dotação" },
  { id: "sites-uteis", label: "Sites úteis" },
  { id: "gestao-documentos", label: "Arquivos" },
  { id: "autentique", label: "Enviar para assinatura" },
  { id: "pncp", label: "Contratações públicas (PNCP)" },
  { id: "obras", label: "Controle de Obras Municipais" },
  { id: "compras-gov", label: "Compras.gov.br — Pesquisa de preços" },
  { id: "transferencias", label: "Transferências e convênios" },
  { id: "detector-atos", label: "Detector de Atos" },
  { id: "rpas", label: "RPA — Recibos de autônomos" },
  { id: "cnpj", label: "Consulta de CNPJ" },
  { id: "saude-publica", label: "Saúde pública — CNES" },
  { id: "calendario", label: "Calendário" },
  { id: "prazos", label: "Obrigações" },
  { id: "prestacao-contas", label: "Prestação de contas" },
  { id: "ramais", label: "Ramais e contatos" },
  { id: "assistente-empenho", label: "Assistente de empenho" },
  { id: "classificador-despesa", label: "Classificador de despesa" },
  { id: "pdf-utils", label: "Ferramentas PDF" },
  { id: "extratos", label: "Extratos bancários" },
  { id: "admin-config", label: "Configurações do administrador" },
];

// ─── Chaves de configuração que são segredos (write-only, nunca retornadas ao form) ─
const CHAVES_SEGREDO = new Set([
  "api_openrouter_key",
  "api_qwen_key",
  "api_stepfun_key",
  "api_key_cnpja",
  "telegram_bot_token",
]);

// ─── Checkbox de módulo ────────────────────────────────────────────────────────
function ModuloCheck({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      {checked ? <CheckSquare2 className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
      {label}
    </button>
  );
}

// ─── Linha de usuário ──────────────────────────────────────────────────────────
function UsuarioCard({
  usuario,
  callerUsername,
  onRefresh,
}: {
  usuario: UsuarioRow;
  callerUsername: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [modulos, setModulos] = useState<string[]>(usuario.modulos);
  const [isAdmin, setIsAdmin] = useState(usuario.is_admin);
  const [ativo, setAtivo] = useState(usuario.ativo);
  const [mostrarBloqueados, setMostrarBloqueados] = useState(usuario.mostrar_bloqueados ?? false);
  const [saving, setSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const toggleModulo = (id: string, val: boolean) => {
    setModulos((prev) => (val ? [...prev, id] : prev.filter((m) => m !== id)));
  };

  const salvar = async () => {
    setSaving(true);
    const { error } = await db.rpc("admin_atualizar_usuario", {
      _caller: callerUsername,
      _id: usuario.id,
      _is_admin: isAdmin,
      _ativo: ativo,
      _modulos: modulos,
      _mostrar_bloqueados: mostrarBloqueados,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário atualizado" });
      setEditing(false);
      onRefresh();
    }
  };

  const resetSenha = async () => {
    setResetDialogOpen(false);
    setResetting(true);
    const { error } = await db.rpc("admin_reset_senha", {
      _caller: callerUsername,
      _id: usuario.id,
    });
    setResetting(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha resetada", description: `${usuario.username} deverá criar uma nova senha.` });
    }
  };

  return (
    <div
      className={`rounded-xl border bg-card transition-all duration-200 ${
        editing ? "border-primary/50 shadow-lg shadow-primary/5" : "border-border"
      } ${!usuario.ativo ? "opacity-60" : ""}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 text-sm font-bold uppercase text-primary">
            {usuario.username[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold">{usuario.username}</span>
            {usuario.is_admin && (
              <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                <Crown className="w-3 h-3" /> Admin
              </span>
            )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={usuario.ativo ? "default" : "secondary"} className="h-5 px-2 text-[10px]">
                {usuario.ativo ? "Ativo" : "Inativo"}
              </Badge>
              <span className="text-xs text-muted-foreground">{usuario.modulos.length} módulos liberados</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setResetDialogOpen(true)}
            disabled={resetting}
            title="Resetar senha"
            aria-label="Resetar senha"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          </Button>
          <AlertDialog open={resetDialogOpen} onOpenChange={(o) => !o && setResetDialogOpen(false)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar senha?</AlertDialogTitle>
                <AlertDialogDescription>
                  A senha de <strong>{usuario.username}</strong> será removida. Será necessário criar uma nova no próximo acesso.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={resetSenha}>Resetar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="sm"
            variant={editing ? "default" : "outline"}
            className="h-9 text-xs"
            onClick={() => {
              if (editing) {
                setModulos(usuario.modulos);
                setIsAdmin(usuario.is_admin);
                setAtivo(usuario.ativo);
                setMostrarBloqueados(usuario.mostrar_bloqueados ?? false);
                setEditing(false);
              } else {
                setEditing(true);
              }
            }}
          >
            {editing ? "Cancelar" : "Editar"}
          </Button>
        </div>
      </div>

      {/* Formulário de edição inline */}
      {editing && (
        <div className="space-y-5 border-t border-border bg-muted/10 px-4 pb-5 pt-4">
          {/* Toggle ativo */}
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className="text-xs text-muted-foreground">Usuários inativos não conseguem entrar</p>
            </div>
            <button
              type="button"
              onClick={() => setAtivo((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                ativo
                  ? "border-emerald/50 bg-emerald/10 text-emerald"
                  : "border-destructive/50 bg-destructive/10 text-destructive"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {ativo ? "Ativo" : "Inativo"}
            </button>
          </div>

          {/* Toggle admin */}
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Papel</p>
              <p className="text-xs text-muted-foreground">Admins podem gerenciar outros usuários</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdmin((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isAdmin
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              {isAdmin ? "Administrador" : "Usuário"}
            </button>
          </div>

          {/* Módulos */}
          <div className="rounded-lg border border-border/70 bg-card/70 p-3">
            <p className="mb-3 text-sm font-medium">Módulos liberados</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODULOS.map((m) => (
                <ModuloCheck
                  key={m.id}
                  id={m.id}
                  label={m.label}
                  checked={modulos.includes(m.id)}
                  onChange={(v) => toggleModulo(m.id, v)}
                />
              ))}
            </div>
          </div>

          {/* Toggle mostrar bloqueados */}
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Módulos bloqueados</p>
              <p className="text-xs text-muted-foreground">Como os módulos sem acesso aparecem para este usuário</p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarBloqueados((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                mostrarBloqueados
                  ? "border-blue-400/60 bg-blue-400/10 text-blue-400"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {mostrarBloqueados ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {mostrarBloqueados ? "Mostrar com cadeado" : "Ocultar bloqueados"}
            </button>
          </div>

          <Button onClick={salvar} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar alterações
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Formulário de novo usuário ────────────────────────────────────────────────
function NovoUsuarioForm({
  callerUsername,
  onCreated,
}: {
  callerUsername: string;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [modulos, setModulos] = useState<string[]>(MODULOS.map((m) => m.id));
  const [mostrarBloqueados, setMostrarBloqueados] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleModulo = (id: string, val: boolean) => {
    setModulos((prev) => (val ? [...prev, id] : prev.filter((m) => m !== id)));
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!u) return toast({ title: "Informe um nome de usuário", variant: "destructive" });
    setSaving(true);
    const { error } = await db.rpc("admin_criar_usuario", {
      _caller: callerUsername,
      _username: u,
      _is_admin: isAdmin,
      _modulos: modulos,
      _mostrar_bloqueados: mostrarBloqueados,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário criado!", description: `${u} poderá criar sua senha no primeiro acesso.` });
      setUsername("");
      setIsAdmin(false);
      setModulos(MODULOS.map((m) => m.id));
      setMostrarBloqueados(false);
      onCreated();
    }
  };

  return (
    <form onSubmit={criar} className="space-y-5">
      <div>
        <Label htmlFor="novo-username">Nome de usuário</Label>
        <Input
          id="novo-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="joao.silva"
          className="mt-1"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Será convertido para letras minúsculas. O usuário cria a senha no primeiro acesso.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
        <div>
          <p className="text-sm font-medium">Papel</p>
          <p className="text-xs text-muted-foreground">Admins gerenciam outros usuários</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdmin((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isAdmin
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
              }`}
        >
          <Crown className="w-3.5 h-3.5" />
          {isAdmin ? "Administrador" : "Usuário comum"}
        </button>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Módulos liberados</p>
        <div className="flex flex-wrap gap-2">
          {MODULOS.map((m) => (
            <ModuloCheck
              key={m.id}
              id={m.id}
              label={m.label}
              checked={modulos.includes(m.id)}
              onChange={(v) => toggleModulo(m.id, v)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
        <div>
          <p className="text-sm font-medium">Módulos bloqueados</p>
          <p className="text-xs text-muted-foreground">Como os módulos sem acesso aparecem</p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarBloqueados((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            mostrarBloqueados
              ? "border-blue-400/60 bg-blue-400/10 text-blue-400"
              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
          }`}
        >
          {mostrarBloqueados ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {mostrarBloqueados ? "Mostrar com cadeado" : "Ocultar bloqueados"}
        </button>
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4 mr-2" />
        )}
        Criar usuário
      </Button>
    </form>
  );
}

// ─── Painel de Configurações ────────────────────────────────────────────────────
function ConfiguracoesPanel({ callerUsername }: { callerUsername: string }) {
  const { confirm, confirmElement } = useConfirm();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testando, setTestando] = useState(false);
  const [conexaoOk, setConexaoOk] = useState<boolean | null>(null);
  const [modelosDisponiveis, setModelosDisponiveis] = useState<{ id: string; nome: string; contexto: number | null }[]>([]);
  const [carregandoModelos, setCarregandoModelos] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupPasswordConfigured, setBackupPasswordConfigured] = useState<boolean | null>(null);
  const [modulosManutencao, setModulosManutencao] = useState<string[]>([]);
  const [autentiqueTokens, setAutentiqueTokens] = useState<{ id: string; nome: string; token_mascarado: string; ativo: boolean; ultimo_uso_em: string | null; ultimo_erro: string | null }[]>([]);
  const [autentiqueNome, setAutentiqueNome] = useState("");
  const [autentiqueToken, setAutentiqueToken] = useState("");
  const [autentiqueBusy, setAutentiqueBusy] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookConfigurado, setWebhookConfigurado] = useState(false);
  const [webhookUltimo, setWebhookUltimo] = useState<{ tipo: string; recebido_em: string; processado_em: string | null; erro: string | null } | null>(null);
  const [portalApiKey, setPortalApiKey] = useState("");
  const [portalApiKeyConfigurada, setPortalApiKeyConfigurada] = useState<boolean | null>(null);
  const [secretStatus, setSecretStatus] = useState<Record<string, boolean>>({});

  const carregarAutentiqueTokens = useCallback(async () => {
    const { data, error } = await db.rpc("autentique_tokens_listar", { _caller: callerUsername });
    if (error) toast({ title: "Erro ao carregar tokens de assinatura", description: error.message, variant: "destructive" });
    else setAutentiqueTokens((data as typeof autentiqueTokens) || []);
  }, [callerUsername]);

  useEffect(() => { void carregarAutentiqueTokens(); }, [carregarAutentiqueTokens]);

  const adicionarAutentiqueToken = async () => {
    setAutentiqueBusy("novo");
    const { error } = await db.rpc("autentique_token_adicionar", { _caller: callerUsername, _nome: autentiqueNome, _token: autentiqueToken });
    setAutentiqueBusy(null);
    if (error) {
      toast({ title: "Não foi possível salvar o token", description: error.message, variant: "destructive" });
      return;
    }
    setAutentiqueNome("");
    setAutentiqueToken("");
    toast({ title: "Token adicionado à rotação" });
    void carregarAutentiqueTokens();
  };

  const testarAutentiqueToken = async (id: string) => {
    setAutentiqueBusy(id);
    const { data, error } = await db.rpc("autentique_token_testar", { _caller: callerUsername, _id: id });
    setAutentiqueBusy(null);
    if (error) toast({ title: "Token recusado", description: error.message, variant: "destructive" });
    else {
      const conta = data as { name?: string; email?: string };
      toast({ title: "Token válido", description: conta.name || conta.email || "Conta identificada" });
      void carregarAutentiqueTokens();
    }
  };

  const alternarAutentiqueToken = async (id: string, ativo: boolean) => {
    setAutentiqueBusy(id);
    const { error } = await db.rpc("autentique_token_alternar", { _caller: callerUsername, _id: id, _ativo: ativo });
    setAutentiqueBusy(null);
    if (error) toast({ title: "Não foi possível alterar o token", description: error.message, variant: "destructive" });
    else void carregarAutentiqueTokens();
  };

  const excluirAutentiqueToken = async (id: string, nome: string) => {
    if (!(await confirm({ title: "Excluir token de assinatura", description: `Excluir “${nome}”? Os documentos vinculados deixarão de usar este token.`, confirmLabel: "Excluir" }))) return;
    setAutentiqueBusy(id);
    const { error } = await db.rpc("autentique_token_excluir", { _caller: callerUsername, _id: id });
    setAutentiqueBusy(null);
    if (error) toast({ title: "Não foi possível excluir", description: error.message, variant: "destructive" });
    else void carregarAutentiqueTokens();
  };

  const carregarModelos = useCallback(async (provedor: "openrouter" | "qwen" | "stepfun") => {
    setCarregandoModelos(true);
    const { data, error } = await db.rpc("ia_modelos_listar", { _caller: callerUsername, _provedor: provedor });
    setCarregandoModelos(false);
    if (error) {
      setModelosDisponiveis([]);
      toast({ title: "Não foi possível consultar os modelos", description: error.message, variant: "destructive" });
      return;
    }
    const resultado = data as { modelos?: { id: string; nome: string; contexto: number | null }[] } | null;
    setModelosDisponiveis(resultado?.modelos || []);
  }, [callerUsername]);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const [configsResult, passwordStatusResult, webhookStatusResult, portalApiKeyStatusResult] = await Promise.all([
      db.rpc("config_listar", { _caller: callerUsername }),
      db.rpc("backup_senha_status", { _caller: callerUsername }),
      db.rpc("autentique_webhook_status", { _caller: callerUsername }),
      db.rpc("portal_transparencia_api_key_status", { _caller: callerUsername }),
    ]);
    setLoading(false);
    const { data, error } = configsResult;
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      return;
    }
    const rows = (data as { chave: string; valor: string }[]) ?? [];
    const segStatus: Record<string, boolean> = {};
    const map: Record<string, string> = {};
    for (const r of rows) {
      if (CHAVES_SEGREDO.has(r.chave)) {
        segStatus[r.chave] = String(r.valor ?? "").trim().length > 0;
      } else {
        map[r.chave] = r.valor;
      }
    }
    setSecretStatus(segStatus);
    setEdits(map);
    const provedorInicial = map.api_ia_provedor === "qwen" ? "qwen" : map.api_ia_provedor === "stepfun" ? "stepfun" : "openrouter";
    void carregarModelos(provedorInicial);
    try {
      const parsed = JSON.parse(map.modulos_manutencao || "[]");
      setModulosManutencao(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
    } catch {
      setModulosManutencao([]);
    }
    if (passwordStatusResult.error) {
      toast({ title: "Erro ao consultar senha do backup", description: passwordStatusResult.error.message, variant: "destructive" });
      return;
    }
    const passwordStatus = passwordStatusResult.data as { configurada: boolean };
    setBackupPasswordConfigured(passwordStatus.configurada);
    if (!webhookStatusResult.error) {
      const webhookStatus = webhookStatusResult.data as { configurado: boolean; ultimo: typeof webhookUltimo };
      setWebhookConfigurado(webhookStatus.configurado);
      setWebhookUltimo(webhookStatus.ultimo);
    }
    if (!portalApiKeyStatusResult.error) {
      setPortalApiKeyConfigurada(Boolean((portalApiKeyStatusResult.data as { configurada?: boolean })?.configurada));
    }
  }, [callerUsername, carregarModelos]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const salvar = async (chave: string) => {
    if (CHAVES_SEGREDO.has(chave) && !(edits[chave] ?? "").trim()) {
      return;
    }
    setSaving(chave);
    const { error } = chave === "portal_transparencia_api_key"
      ? await db.rpc("portal_transparencia_api_key_definir", { _caller: callerUsername, _chave: portalApiKey })
      : await db.rpc("config_set", { _caller: callerUsername, _chave: chave, _valor: edits[chave] ?? "" });
    setSaving(null);
    if (!error && chave === "portal_transparencia_api_key") {
      setPortalApiKey("");
      setPortalApiKeyConfigurada(Boolean(portalApiKey.trim()));
    }
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração salva!" });
      fetchConfigs();
    }
  };

  const salvarSenhaBackup = async () => {
    setSaving("backup_senha");
    const { error } = await db.rpc("backup_senha_definir", {
      _caller: callerUsername,
      _senha: backupPassword,
    });
    setSaving(null);
    if (error) {
      toast({ title: "Erro ao salvar senha do backup", description: error.message, variant: "destructive" });
      return;
    }
    setBackupPassword("");
    setBackupPasswordConfigured(true);
    toast({ title: "Senha de backup atualizada" });
  };

  const salvarWebhookSecret = async () => {
    setSaving("autentique_webhook_secret");
    const { error } = await db.rpc("autentique_webhook_definir", { _caller: callerUsername, _segredo: webhookSecret });
    setSaving(null);
    if (error) {
      toast({ title: "Erro ao salvar segredo do webhook", description: error.message, variant: "destructive" });
      return;
    }
    setWebhookSecret("");
    setWebhookConfigurado(true);
    toast({ title: "Webhook configurado" });
    void fetchConfigs();
  };

  const salvarManutencao = async () => {
    setSaving("modulos_manutencao");
    const { error } = await db.rpc("config_set", {
      _caller: callerUsername,
      _chave: "modulos_manutencao",
      _valor: JSON.stringify(modulosManutencao),
    });
    setSaving(null);
    if (error) {
      toast({ title: "Erro ao salvar manutenção", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Manutenção dos módulos atualizada" });
    fetchConfigs();
  };

  const testarConexao = async () => {
    setTestando(true);
    setConexaoOk(null);
    const { error } = await db.rpc("ia_chat", {
      _caller: callerUsername,
      _messages: [{ role: "user", content: "Olá" }],
      _max_tokens: 5,
      _cache: false,
    });
    setTestando(false);
    setConexaoOk(!error);
    if (error) {
      toast({ title: "Falha na conexão", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conexão com IA OK!" });
    }
  };

  const chavesConfig = [
    { chave: "api_openrouter_key", label: "Chave OpenRouter", placeholder: "sk-or-v1-...", type: "password" },
    { chave: "api_openrouter_modelo", label: "Modelo OpenRouter", placeholder: "openai/gpt-4o-mini", type: "text" },
    { chave: "api_qwen_key", label: "Chave Qwen Cloud", placeholder: "sk-...", type: "password" },
    { chave: "api_qwen_modelo", label: "Modelo Qwen", placeholder: "qwen-plus", type: "text" },
    { chave: "api_qwen_endpoint", label: "Endpoint Qwen", placeholder: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", type: "text" },
    { chave: "api_stepfun_key", label: "Chave StepFun", placeholder: "Chave da plataforma StepFun", type: "password" },
    { chave: "api_stepfun_modelo", label: "Modelo StepFun", placeholder: "step-3.5-flash", type: "text" },
    { chave: "api_stepfun_endpoint", label: "Endpoint StepFun", placeholder: "https://api.stepfun.ai/step_plan/v1", type: "text" },
    { chave: "api_key_cnpja", label: "Chave CNPJá", placeholder: "Chave da API CNPJá", type: "password" },
    { chave: "portal_transparencia_api_key", label: "Portal da Transparência — chave da API", placeholder: "Token recebido após cadastro no Portal", type: "password" },
    { chave: "pncp_cnpj", label: "PNCP — CNPJ do órgão", placeholder: "76.970.318/0001-67", type: "text" },
    { chave: "pncp_anos", label: "PNCP — anos para consultar", placeholder: "2025, 2026", type: "text" },
    { chave: "pncp_sincronizacao_horas", label: "PNCP — intervalo automático (horas)", placeholder: "24", type: "text" },
    { chave: "tcepr_cnpj", label: "TCE-PR — CNPJ do órgão", placeholder: "76.970.318/0001-67", type: "text" },
    { chave: "tcepr_ibge", label: "TCE-PR — código IBGE do município", placeholder: "4110300", type: "text" },
    { chave: "tcepr_anos", label: "TCE-PR — anos de licitações", placeholder: "2025, 2026", type: "text" },
    { chave: "tcepr_sincronizacao_horas", label: "TCE-PR — intervalo automático (horas)", placeholder: "24", type: "text" },
    { chave: "siconfi_ibge", label: "SICONFI — código IBGE do município", placeholder: "4110300", type: "text" },
    { chave: "siconfi_anos", label: "SICONFI — exercícios para consultar", placeholder: "2025, 2026", type: "text" },
    { chave: "siconfi_sincronizacao_horas", label: "SICONFI — intervalo automático (horas)", placeholder: "24", type: "text" },
    { chave: "transferegov_cnpj", label: "Transferegov — CNPJ beneficiário", placeholder: "76.970.318/0001-67", type: "text" },
    { chave: "transferegov_sincronizacao_horas", label: "Transferegov — intervalo automático (horas)", placeholder: "24", type: "text" },
  ];

  type TelegramRuntimeState = {
    running: boolean;
    botUsername: string | null;
    lastError: string | null;
    hasToken?: boolean;
    tokenSource?: "db" | "env" | null;
    enabled?: boolean;
  };

  const [tgCodigo, setTgCodigo] = useState<string | null>(null);
  const [tgVinculos, setTgVinculos] = useState<
    { id: string; chat_id: string; username: string; username_tg: string | null; ativo: boolean; is_admin: boolean }[]
  >([]);
  const [tgBusy, setTgBusy] = useState(false);
  const [tgRuntime, setTgRuntime] = useState<TelegramRuntimeState | null>(null);
  const [tgTokenInput, setTgTokenInput] = useState("");
  const [tgMostrarToken, setTgMostrarToken] = useState(false);
  const [tgGuiaAberto, setTgGuiaAberto] = useState(false);
  const [copiouCodigo, setCopiouCodigo] = useState(false);

  const carregarTelegram = useCallback(async () => {
    const [v, rt] = await Promise.all([
      db.rpc("telegram_listar_vinculos", { _caller: callerUsername }),
      db.rpc("telegram_status_runtime", { _caller: callerUsername }),
    ]);
    if (!v.error && Array.isArray(v.data)) setTgVinculos(v.data as typeof tgVinculos);
    if (!rt.error && rt.data) setTgRuntime(rt.data as TelegramRuntimeState);
  }, [callerUsername]);

  useEffect(() => {
    carregarTelegram();
  }, [carregarTelegram]);

  const gerarCodigoTg = async () => {
    setTgBusy(true);
    const { data, error } = await db.rpc("telegram_gerar_codigo", {
      _caller: callerUsername,
      _username: callerUsername,
    });
    setTgBusy(false);
    if (error) {
      toast({ title: "Erro ao gerar código", description: error.message, variant: "destructive" });
      return;
    }
    const d = data as { codigo: string; expira_em: string };
    setTgCodigo(d.codigo);
    toast({ title: "Código gerado", description: `Válido 10 min: ${d.codigo}` });
  };

  const testarTelegram = async () => {
    const token = tgTokenInput.trim();
    if (!token && !tgRuntime?.hasToken) {
      toast({ title: "Informe o token", description: "Digite ou cole o token do BotFather antes de testar.", variant: "destructive" });
      return;
    }
    setTgBusy(true);
    const { data, error } = await db.rpc("telegram_testar_token", {
      _caller: callerUsername,
      _token: token || undefined,
    });
    setTgBusy(false);
    if (error) {
      toast({ title: "Token inválido", description: error.message, variant: "destructive" });
      return;
    }
    const me = data as { username: string; first_name?: string };
    toast({ title: "Bot autenticado com sucesso!", description: `@${me.username}${me.first_name ? ` (${me.first_name})` : ""}` });
  };

  const salvarEIniciarBot = async () => {
    const token = tgTokenInput.trim();
    if (!token && !tgRuntime?.hasToken) {
      toast({ title: "Informe o token", description: "Insira o token fornecido pelo @BotFather para ativar o bot.", variant: "destructive" });
      return;
    }
    setTgBusy(true);
    const { data, error } = await db.rpc("telegram_salvar_config", {
      _caller: callerUsername,
      _token: token || undefined,
      _enabled: "1",
      _iniciar: true,
    });
    setTgBusy(false);
    if (error) {
      toast({ title: "Falha ao ativar bot", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as { ok?: boolean; username?: string; reason?: string; error?: string };
    if (r.ok) {
      setTgTokenInput("");
      toast({ title: "Bot Telegram Ativado!", description: `Online e pronto para uso: @${r.username}` });
    } else {
      toast({
        title: "Bot salvo, mas não iniciou",
        description: r.error || (r.reason === "no_token" ? "Nenhum token fornecido" : r.reason) || "Verifique o token",
        variant: "destructive",
      });
    }
    carregarTelegram();
  };

  const pausarBot = async () => {
    setTgBusy(true);
    const { error } = await db.rpc("telegram_salvar_config", {
      _caller: callerUsername,
      _enabled: "0",
    });
    setTgBusy(false);
    if (error) {
      toast({ title: "Erro ao pausar bot", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bot pausado", description: "O bot do Telegram foi desativado." });
      carregarTelegram();
    }
  };

  const reiniciarBot = async () => {
    setTgBusy(true);
    const { data, error } = await db.rpc("telegram_reiniciar_bot", { _caller: callerUsername });
    setTgBusy(false);
    if (error) {
      toast({ title: "Falha ao reiniciar bot", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as { ok?: boolean; username?: string; reason?: string };
    toast({
      title: r.ok ? "Bot reiniciado" : "Bot não subiu",
      description: r.ok ? `@${r.username}` : r.reason || "Verifique o token",
    });
    carregarTelegram();
  };

  const copiarCodigo = (codigo: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(codigo);
      setCopiouCodigo(true);
      setTimeout(() => setCopiouCodigo(false), 2000);
      toast({ title: "Código copiado!", description: "Envie no chat do bot no Telegram." });
    }
  };

  const desativarVinculo = async (id: string) => {
    const { error } = await db.rpc("telegram_desvincular_id", { _caller: callerUsername, _id: id });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Vínculo desativado" });
      carregarTelegram();
    }
  };

  const provedorIA: "openrouter" | "qwen" | "stepfun" = edits.api_ia_provedor === "qwen" ? "qwen" : edits.api_ia_provedor === "stepfun" ? "stepfun" : "openrouter";
  const nomeProvedorIA = provedorIA === "qwen" ? "Qwen Cloud" : provedorIA === "stepfun" ? "StepFun" : "OpenRouter";

  return (
    <div className="grid max-w-3xl gap-4 pb-16 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Tokens de envio para assinatura</p>
            <p className="mt-1 text-xs text-muted-foreground">Cadastre vários tokens ativos. O sistema alterna o uso e passa ao próximo quando houver limite, saldo insuficiente ou falha de autenticação.</p>
          </div>
          <Badge variant="secondary">{autentiqueTokens.filter((item) => item.ativo).length} ativo(s)</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-[0.8fr_1.5fr_auto]">
          <Input value={autentiqueNome} onChange={(event) => setAutentiqueNome(event.target.value)} placeholder="Nome do token" maxLength={80} />
          <Input type="password" value={autentiqueToken} onChange={(event) => setAutentiqueToken(event.target.value)} placeholder="Cole o token da API" autoComplete="new-password" className="font-mono text-xs" />
          <Button onClick={adicionarAutentiqueToken} disabled={autentiqueBusy === "novo" || !autentiqueNome.trim() || autentiqueToken.trim().length < 16}>
            {autentiqueBusy === "novo" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {autentiqueTokens.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhum token cadastrado pela Administração.</p>}
          {autentiqueTokens.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{item.nome}</span><code className="text-xs text-muted-foreground">{item.token_mascarado}</code><Badge variant={item.ativo ? "default" : "outline"}>{item.ativo ? "Ativo" : "Pausado"}</Badge></div>
                <p className={`mt-1 truncate text-xs ${item.ultimo_erro ? "text-destructive" : "text-muted-foreground"}`}>{item.ultimo_erro || (item.ultimo_uso_em ? `Último uso: ${new Date(item.ultimo_uso_em).toLocaleString("pt-BR")}` : "Ainda não utilizado")}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void testarAutentiqueToken(item.id)} disabled={autentiqueBusy === item.id}>Testar</Button>
                <Button size="sm" variant="outline" onClick={() => void alternarAutentiqueToken(item.id, !item.ativo)} disabled={autentiqueBusy === item.id}>{item.ativo ? "Pausar" : "Ativar"}</Button>
                <Button size="icon" variant="ghost" aria-label={`Excluir ${item.nome}`} onClick={() => void excluirAutentiqueToken(item.id, item.nome)} disabled={autentiqueBusy === item.id}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Atualização automática das assinaturas</p>
            <p className="mt-1 text-xs text-muted-foreground">Cadastre esta URL e o segredo correspondente no painel da plataforma para receber visualizações, assinaturas, recusas e conclusões em tempo real.</p>
          </div>
          <Badge variant={webhookConfigurado ? "default" : "outline"}>{webhookConfigurado ? "Segredo configurado" : "Não configurado"}</Badge>
        </div>
        <div className="flex gap-2">
          <Input readOnly value={`${window.location.origin}/api/autentique/webhook`} className="font-mono text-xs" aria-label="URL do webhook" />
          <Button type="button" size="icon" variant="outline" aria-label="Copiar URL do webhook" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/api/autentique/webhook`); toast({ title: "URL copiada" }); }}><Copy className="h-4 w-4" /></Button>
        </div>
        {/localhost|127\.0\.0\.1/i.test(window.location.hostname) && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">A plataforma precisa alcançar uma URL HTTPS pública. Endereços localhost funcionam apenas na sua máquina.</p>}
        <div className="flex gap-2">
          <Input type="password" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder={webhookConfigurado ? "Informe somente para substituir o segredo" : "Cole o segredo fornecido ao criar o webhook"} autoComplete="new-password" className="font-mono text-xs" />
          <Button onClick={salvarWebhookSecret} disabled={saving === "autentique_webhook_secret" || webhookSecret.trim().length < 16}>
            {saving === "autentique_webhook_secret" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
          </Button>
        </div>
        {webhookUltimo && <p className={`text-xs ${webhookUltimo.erro ? "text-destructive" : "text-muted-foreground"}`}>Último evento: {webhookUltimo.tipo} · {new Date(webhookUltimo.recebido_em).toLocaleString("pt-BR")}{webhookUltimo.erro ? ` · ${webhookUltimo.erro}` : webhookUltimo.processado_em ? " · processado" : " · aguardando processamento"}</p>}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Provedor padrão da inteligência artificial</p>
            <p className="mt-1 text-xs text-muted-foreground">A escolha vale para o assistente de empenho, classificador e demais recursos de IA.</p>
          </div>
          <Badge variant="secondary">{nomeProvedorIA}</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button type="button" variant={provedorIA === "openrouter" ? "default" : "outline"} onClick={() => { setEdits((prev) => ({ ...prev, api_ia_provedor: "openrouter" })); void carregarModelos("openrouter"); }}>OpenRouter</Button>
          <Button type="button" variant={edits.api_ia_provedor === "qwen" ? "default" : "outline"} onClick={() => { setEdits((prev) => ({ ...prev, api_ia_provedor: "qwen" })); void carregarModelos("qwen"); }}>Qwen Cloud</Button>
          <Button type="button" variant={edits.api_ia_provedor === "stepfun" ? "default" : "outline"} onClick={() => { setEdits((prev) => ({ ...prev, api_ia_provedor: "stepfun" })); void carregarModelos("stepfun"); }}>StepFun</Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="flex-1" onClick={() => salvar("api_ia_provedor")} disabled={saving === "api_ia_provedor"}>
            {saving === "api_ia_provedor" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar provedor
          </Button>
          <Button type="button" variant="outline" onClick={() => void carregarModelos(provedorIA)} disabled={carregandoModelos}>
            <RefreshCw className={`mr-2 h-4 w-4 ${carregandoModelos ? "animate-spin" : ""}`} />
            {carregandoModelos ? "Consultando..." : `Atualizar modelos${modelosDisponiveis.length ? ` (${modelosDisponiveis.length})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Indicador de conexão */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-2">
        <div className="flex items-center gap-3">
          {testando ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : conexaoOk === true ? (
            <Wifi className="w-5 h-5 text-emerald-400" />
          ) : conexaoOk === false ? (
            <WifiOff className="w-5 h-5 text-red-400" />
          ) : (
            <Wifi className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Conexão com a IA</p>
            <p className="text-xs text-muted-foreground">
              {testando ? "Testando..." : conexaoOk === true ? "Conectado" : conexaoOk === false ? "Falha" : `Não testado · ${nomeProvedorIA}`}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={testarConexao} disabled={testando} className="text-xs">
          {testando ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Testar
        </Button>
      </div>

      {/* Configurações */}
      {loading ? (
        <div className="flex items-center justify-center py-8 lg:col-span-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        chavesConfig.map((cfg) => {
          const isPortalApiKey = cfg.chave === "portal_transparencia_api_key";
          const valor = isPortalApiKey ? portalApiKey : edits[cfg.chave] ?? "";
          const configurada = isPortalApiKey ? Boolean(portalApiKeyConfigurada) : Boolean(secretStatus[cfg.chave]);
          const campoModeloAtivo = provedorIA === "qwen" ? "api_qwen_modelo" : provedorIA === "stepfun" ? "api_stepfun_modelo" : "api_openrouter_modelo";
          const usarSugestoes = cfg.chave === campoModeloAtivo && modelosDisponiveis.length > 0;
          return (
            <div key={cfg.chave} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
              <div>
                <p className="text-sm font-medium">{cfg.label}</p>
                <p className="text-xs text-muted-foreground">{cfg.chave}</p>
                {cfg.type === "password" && (
                  <p className={`text-xs ${configurada ? "text-emerald-600" : "text-muted-foreground"}`}>
                    Configurada: {configurada ? "sim" : "não"}{configurada ? " — informe uma nova para substituir" : ""}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type={cfg.type}
                  list={usarSugestoes ? "modelos-ia-disponiveis" : undefined}
                  value={valor}
                  onChange={(e) => isPortalApiKey ? setPortalApiKey(e.target.value) : setEdits((prev) => ({ ...prev, [cfg.chave]: e.target.value }))}
                  placeholder={cfg.placeholder}
                  className="flex-1 text-xs font-mono"
                  autoComplete={cfg.type === "password" ? "new-password" : undefined}
                />
                {usarSugestoes && <datalist id="modelos-ia-disponiveis">{modelosDisponiveis.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.nome}{modelo.contexto ? ` · ${modelo.contexto.toLocaleString("pt-BR")} tokens` : ""}</option>)}</datalist>}
                <Button
                  size="sm"
                  onClick={() => salvar(cfg.chave)}
                  disabled={saving === cfg.chave || (cfg.type === "password" && !valor.trim())}
                  aria-label={`Salvar ${cfg.label}`}
                >
                  {saving === cfg.chave ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          );
        })
      )}

      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-2">
        <div>
          <p className="text-sm font-medium">Módulos em manutenção</p>
          <p className="text-xs text-muted-foreground">
            Usuários não administradores ficam impedidos de abrir os módulos selecionados.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MODULOS.filter((modulo) => modulo.id !== "admin-config").map((modulo) => (
            <ModuloCheck
              key={modulo.id}
              id={modulo.id}
              label={modulo.label}
              checked={modulosManutencao.includes(modulo.id)}
              onChange={(checked) =>
                setModulosManutencao((current) =>
                  checked ? [...current, modulo.id] : current.filter((id) => id !== modulo.id),
                )
              }
            />
          ))}
        </div>
        <Button onClick={salvarManutencao} disabled={saving === "modulos_manutencao"} className="w-full">
          {saving === "modulos_manutencao" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Salvar manutenção
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <div>
          <p className="text-sm font-medium">Senha do backup enviado pelo Telegram</p>
          <p className="text-xs text-muted-foreground">
            {backupPasswordConfigured ? "Configurada. Informe uma nova senha apenas para substituí-la." : "Ainda não configurada."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A senha não pode ser consultada nem é enviada ao Telegram. O ZIP temporário usa AES-256 e só é entregue a administrador vinculado em chat privado.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="password"
            autoComplete="new-password"
            value={backupPassword}
            onChange={(event) => setBackupPassword(event.target.value)}
            placeholder="Nova senha do arquivo criptografado"
            className="flex-1 text-xs font-mono"
          />
          <Button
            size="sm"
            onClick={salvarSenhaBackup}
            disabled={saving === "backup_senha" || !backupPassword}
            aria-label="Salvar senha do backup"
          >
            {saving === "backup_senha" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-400">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">Bot Telegram</h3>
                {tgRuntime?.running ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium text-xs flex items-center gap-1.5 py-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online {tgRuntime.botUsername ? `@${tgRuntime.botUsername}` : ""}
                  </Badge>
                ) : tgRuntime?.hasToken ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 font-medium text-xs flex items-center gap-1.5 py-0.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Pausado / Aguardando Ativação
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground border-border bg-muted/40 font-medium text-xs flex items-center gap-1.5 py-0.5">
                    Aguardando Token
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Assistente virtual da Prefeitura no Telegram: alertas, empenhos, certidões e backups seguros.
              </p>
              {tgRuntime?.lastError && (
                <p className="mt-1.5 text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{tgRuntime.lastError}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tgRuntime?.running && tgRuntime.botUsername && (
              <a
                href={`https://t.me/${tgRuntime.botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-600 transition hover:bg-sky-500/20 dark:text-sky-400"
              >
                <Bot className="h-3.5 w-3.5" />
                Abrir no Telegram
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTgGuiaAberto((prev) => !prev)}
              className="text-xs"
            >
              <HelpCircle className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {tgGuiaAberto ? "Ocultar instruções" : "Como obter o token"}
            </Button>
          </div>
        </div>

        {tgGuiaAberto && (
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-xs space-y-2">
            <p className="font-semibold text-sky-700 dark:text-sky-300">
              Como criar seu bot no Telegram em 1 minuto:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
              <li>
                Abra a conversa oficial com o{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-sky-600 underline dark:text-sky-400 inline-flex items-center gap-0.5"
                >
                  @BotFather <ExternalLink className="h-3 w-3 inline" />
                </a>{" "}
                no seu Telegram.
              </li>
              <li>
                Envie o comando <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">/newbot</code> e informe o nome de exibição (ex.: <em>Prefeitura Inajá</em>) e um usuário único terminado em <em>bot</em> (ex.: <em>inaja_pm_bot</em>).
              </li>
              <li>
                O BotFather gerará seu token de API (exemplo: <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">7123456789:AAFlkjhsdf...</code>).
              </li>
              <li>
                Cole o token no campo abaixo e clique em <strong>Salvar e Iniciar Bot</strong>.
              </li>
            </ol>
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3.5">
          <Label className="text-xs font-medium">Token de Acesso do Bot (@BotFather)</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Input
                type={tgMostrarToken ? "text" : "password"}
                autoComplete="new-password"
                value={tgTokenInput}
                onChange={(e) => setTgTokenInput(e.target.value)}
                placeholder={tgRuntime?.hasToken ? "Token já configurado · digite aqui apenas para substituir" : "Ex: 7123456789:AAFlkjhsdf..."}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setTgMostrarToken((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={tgMostrarToken ? "Ocultar token" : "Exibir token"}
              >
                {tgMostrarToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={tgBusy || (!tgTokenInput.trim() && !tgRuntime?.hasToken)}
                onClick={testarTelegram}
                className="text-xs"
              >
                {tgBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />}
                Testar token
              </Button>
              <Button
                size="sm"
                disabled={tgBusy || (!tgTokenInput.trim() && !tgRuntime?.hasToken)}
                onClick={salvarEIniciarBot}
                className="text-xs"
              >
                {tgBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                {tgRuntime?.running ? "Atualizar e Reiniciar" : "Salvar e Iniciar Bot"}
              </Button>
              {tgRuntime?.running && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={tgBusy}
                  onClick={pausarBot}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  Pausar bot
                </Button>
              )}
            </div>
          </div>
          {tgRuntime?.hasToken && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="h-3 w-3" />
              Token configurado ({tgRuntime.tokenSource === "env" ? "arquivo de ambiente .env" : "banco de dados do sistema"}).
            </p>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-3">
            <div>
              <p className="text-xs font-semibold">Vínculo de Usuário e Permissões</p>
              <p className="text-xs text-muted-foreground">
                Gere um código de 6 dígitos e envie no chat privado com o bot para vincular sua conta e receber alertas e relatórios.
              </p>
            </div>
            <Button
              size="sm"
              disabled={tgBusy || !tgRuntime?.running}
              onClick={gerarCodigoTg}
              className="text-xs shrink-0"
            >
              {tgBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
              Gerar código de vínculo
            </Button>
          </div>

          {!tgRuntime?.running && (
            <p className="text-[11px] text-muted-foreground italic">
              * O bot precisa estar iniciado para gerar e validar códigos de vínculo no Telegram.
            </p>
          )}

          {tgCodigo && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3.5">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Código de emparelhamento (válido por 10 minutos)
                </span>
                <div className="font-mono text-2xl font-bold tracking-widest text-primary">
                  {tgCodigo}
                </div>
                <p className="text-xs text-muted-foreground">
                  No chat privado com o bot, clique no botão <strong>Vínculo</strong> e envie estes seis dígitos.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copiarCodigo(tgCodigo)}
                className="text-xs shrink-0"
              >
                {copiouCodigo ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                {copiouCodigo ? "Copiado!" : "Copiar código"}
              </Button>
            </div>
          )}

          {tgVinculos.length > 0 && (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden mt-2">
              <div className="bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                Usuários vinculados ao bot ({tgVinculos.filter((v) => v.ativo).length} ativo(s))
              </div>
              {tgVinculos.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-semibold">{v.username}</span>
                    {v.is_admin && <Badge className="text-[10px] py-0" variant="secondary">admin</Badge>}
                    <span className="text-muted-foreground">chat {v.chat_id}</span>
                    {v.username_tg && <span className="text-muted-foreground">· @{v.username_tg}</span>}
                    {!v.ativo && <span className="text-destructive font-medium">(inativo)</span>}
                  </div>
                  {v.ativo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive h-7 text-xs hover:bg-destructive/10"
                      onClick={() => desativarVinculo(v.id)}
                    >
                      Desativar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {confirmElement}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
type Tab = "usuarios" | "novo" | "config";
type UsuarioOnline = { username: string; perfil: string; entrou_em: string; ultimo_acesso: string };

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<UsuarioOnline[]>([]);

  const fetchUsuarios = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await db.rpc("admin_listar_usuarios", {
      _caller: user,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
    } else {
      setUsuarios((data as UsuarioRow[]) ?? []);
    }
  }, [user]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const fetchOnline = useCallback(async () => {
    if (!user) return;
    const { data, error } = await db.rpc("admin_usuarios_online", { _caller: user });
    if (error || !Array.isArray(data)) return;
    setOnline(data as UsuarioOnline[]);
  }, [user]);

  useEffect(() => {
    fetchOnline();
    const timer = window.setInterval(fetchOnline, 30000);
    return () => window.clearInterval(timer);
  }, [fetchOnline]);

  const handleCreated = () => {
    setTab("usuarios");
    fetchUsuarios();
  };

  const ativos = usuarios.filter((usuario) => usuario.ativo).length;
  const administradores = usuarios.filter((usuario) => usuario.is_admin).length;

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        icon={ShieldCheck}
        title="Administração"
        subtitle="Usuários e permissões"
        username={user}
        maxWidth="max-w-5xl"
      />

      {/* Tabs */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Centro de controle</p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Gestão de acesso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Administre usuários, permissões e integrações do sistema em um único lugar.</p>
          </div>
          <div className="rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground shadow-card">
            <span className="font-semibold text-foreground">{user ?? "admin"}</span> · acesso administrativo
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-3" aria-label="Resumo administrativo">
          {[
            { label: "Usuários cadastrados", value: usuarios.length, icon: Users, tone: "text-primary" },
            { label: "Usuários ativos", value: ativos, icon: UserCheck, tone: "text-emerald" },
            { label: "Administradores", value: administradores, icon: Crown, tone: "text-gold" },
          ].map((metric) => {
            const MetricIcon = metric.icon;
            return (
              <div key={metric.label} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">{loading ? "—" : metric.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted/70 ${metric.tone}`}>
                  <MetricIcon className="h-5 w-5" />
                </div>
              </div>
            );
          })}
        </section>

        <div className="mb-8 overflow-x-auto border-b border-border" role="tablist" aria-label="Seções administrativas">
          <div className="flex min-w-max gap-1">
          <button
            type="button"
            onClick={() => setTab("usuarios")}
            role="tab"
            aria-selected={tab === "usuarios"}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === "usuarios"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" /> Usuários
          </button>
          <button
            type="button"
            onClick={() => setTab("novo")}
            role="tab"
            aria-selected={tab === "novo"}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === "novo"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </button>
          <button
            type="button"
            onClick={() => setTab("config")}
            role="tab"
            aria-selected={tab === "config"}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === "config"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Settings className="w-4 h-4" /> Configurações
          </button>
          </div>
        </div>

        {/* Aba: Usuários */}
        {tab === "usuarios" && (
          <section role="tabpanel" className="space-y-3 pb-16">
            <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Usuários com o sistema aberto</h2><p className="text-xs text-muted-foreground">Atualização automática a cada 30 segundos.</p></div><div className="flex items-center gap-2"><Badge className="bg-emerald-600">{online.length} online</Badge><Button size="sm" variant="outline" onClick={fetchOnline}>Atualizar</Button></div></div>
              {online.length > 0 ? <div className="mt-3 divide-y rounded-lg border">{online.map(u => <div key={u.username} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"><div><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" /><span className="font-medium">{u.username}</span><Badge variant="outline" className="ml-2 text-[10px]">{u.perfil}</Badge></div><span className="text-xs text-muted-foreground">Entrou {new Date(u.entrou_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · visto {new Date(u.ultimo_acesso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Nenhum usuário está ativo no momento.</p>}
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Nenhum usuário encontrado</p>
                <p className="mt-1 text-xs text-muted-foreground">Crie o primeiro usuário na aba ao lado.</p>
              </div>
            ) : (
              usuarios.map((u) => (
                <UsuarioCard
                  key={u.id}
                  usuario={u}
                  callerUsername={user!}
                  onRefresh={fetchUsuarios}
                />
              ))
            )}
          </section>
        )}

        {/* Aba: Novo usuário */}
        {tab === "novo" && (
          <section role="tabpanel" className="max-w-3xl pb-16">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserPlus className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Criar novo usuário</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Defina o acesso inicial e as permissões do novo usuário.</p>
                </div>
              </div>
              <NovoUsuarioForm callerUsername={user!} onCreated={handleCreated} />
            </div>
          </section>
        )}

        {/* Aba: Configurações */}
        {tab === "config" && (
          <section role="tabpanel" className="pb-16">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Settings className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-lg font-semibold">Configurações do sistema</h2>
                <p className="mt-1 text-sm text-muted-foreground">Gerencie as integrações usadas pelos módulos administrativos.</p>
              </div>
            </div>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => navigate("/superlog")}
                className="group flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105"><ScrollText className="h-5 w-5" /></span>
                <span><span className="block font-semibold">Auditoria / Logs</span><span className="mt-0.5 block text-xs text-muted-foreground">Consulte as ações registradas no sistema.</span></span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/backup")}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><HardDrive className="h-5 w-5" /></span>
                <span><span className="block font-semibold">Backup</span><span className="mt-0.5 block text-xs text-muted-foreground">Banco de dados, anexos e histórico de backups.</span></span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/mcp")}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><PlugZap className="h-5 w-5" /></span>
                <span><span className="block font-semibold">MCP</span><span className="mt-0.5 block text-xs text-muted-foreground">Integrações de agentes de IA e chaves de acesso.</span></span>
              </button>
            </div>
            <ConfiguracoesPanel callerUsername={user!} />
          </section>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
