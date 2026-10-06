import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/integrations/db/client";
import { parseModulosDisponiveis, useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  LogIn, KeyRound, ArrowLeft, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, ChevronLeft, Lock
} from "lucide-react";

type Step =
  | { t: "username" }
  | { t: "login"; username: string }
  | { t: "criar"; username: string }
  | { t: "recuperar"; username: string };

type FieldError = string | null;

interface SenhaRequisito {
  label: string;
  test: (s: string) => boolean;
}

const REQUISITOS: SenhaRequisito[] = [
  { label: "Mínimo 6 caracteres", test: (s) => s.length >= 6 },
  { label: "Uma letra maiúscula", test: (s) => /[A-Z]/.test(s) },
  { label: "Uma letra minúscula", test: (s) => /[a-z]/.test(s) },
  { label: "Um número", test: (s) => /[0-9]/.test(s) },
];

const SENHAS_COMUNS = new Set([
  "123456", "senha", "password", "12345678", "qwerty", "admin", "12345",
  "abcdef", "abc123", "123456789", "123123", "000000", "111111", "inaja",
]);

function calcularForca(s: string): { nivel: number; cor: string; texto: string } {
  if (!s) return { nivel: 0, cor: "bg-muted", texto: "" };
  const ok = REQUISITOS.filter((r) => r.test(s)).length;
  if (ok <= 1) return { nivel: 1, cor: "bg-red-500", texto: "Fraca" };
  if (ok <= 3) return { nivel: 2, cor: "bg-yellow-500", texto: "Média" };
  if (ok === 4 && s.length >= 8) return { nivel: 3, cor: "bg-green-500", texto: "Forte" };
  if (ok === 4) return { nivel: 3, cor: "bg-green-500", texto: "Forte" };
  return { nivel: 1, cor: "bg-red-500", texto: "Fraca" };
}

const inputBase =
  "h-12 w-full rounded-xl bg-background/80 backdrop-blur-sm px-4 text-base shadow-sm border border-input transition-all placeholder:text-muted-foreground/60 focus-visible:bg-background focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";

const inputErro = "border-destructive ring-2 ring-destructive/40 focus-visible:ring-destructive/30";

const linkAcao =
  "inline-flex items-center gap-1.5 rounded-lg py-1 px-2 text-xs font-semibold text-primary underline-offset-4 hover:bg-primary/10 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const botaoPrimario = "h-12 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 active:scale-[0.99]";

function Brasao({ className }: { className?: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary ${className ?? ""}`}
        aria-hidden="true"
      >
        PMI
      </div>
    );
  }
  return <img src="/brasao.png" alt="" aria-hidden="true" className={className} onError={() => setFalhou(true)} />;
}

function CampoSenha({
  id,
  label,
  value,
  onChange,
  error,
  errorId,
  autoComplete,
  inputRef,
  maxLength = 128,
  novo = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: FieldError;
  errorId: string;
  autoComplete: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  maxLength?: number;
  novo?: boolean;
}) {
  const [mostrar, setMostrar] = useState(false);
  const descritores = [error ? errorId : null, novo ? `${id}-requisitos` : null].filter(Boolean);
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground/90 flex items-center justify-between">
        <span>{label}</span>
      </Label>
      <div className="relative mt-1.5">
        <Input
          ref={inputRef}
          id={id}
          type={mostrar ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••"
          className={`${inputBase} ${error ? inputErro : ""} pr-12`}
          aria-invalid={!!error}
          aria-describedby={descritores.length > 0 ? descritores.join(" ") : undefined}
          maxLength={maxLength}
        />
        <button
          type="button"
          onClick={() => setMostrar((v) => !v)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground/80 hover:bg-secondary/80 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={mostrar}
        >
          {mostrar ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-semibold text-destructive flex items-center gap-1 animate-in fade-in-50 duration-200">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function RequisitosSenha({ id, senha, forca }: { id: string; senha: string; forca: { nivel: number; cor: string; texto: string } }) {
  return (
    <div id={id} className="mt-2.5 space-y-2">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${forca.nivel >= n ? forca.cor : "bg-muted"}`} />
        ))}
        <span className="ml-1 w-10 text-[11px] font-medium text-muted-foreground">{forca.texto}</span>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {REQUISITOS.map((r) => {
          const ok = r.test(senha);
          return (
            <li
              key={r.label}
              className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-emerald-600 dark:text-emerald" : "text-muted-foreground"}`}
            >
              {ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" aria-hidden="true" />
              )}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Login() {
  const [step, setStep] = useState<Step>({ t: "username" });
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState<FieldError>(null);
  const [errorSenha, setErrorSenha] = useState<FieldError>(null);
  const [errorSenha2, setErrorSenha2] = useState<FieldError>(null);
  const [errorGeral, setErrorGeral] = useState<FieldError>(null);
  const [codigoRec, setCodigoRec] = useState("");
  const [stepRec, setStepRec] = useState<"solicitar" | "codigo" | "nova">("solicitar");
  const [bloqueadoPor, setBloqueadoPor] = useState(0);
  const bloqueadoRef = useRef(0);

  useEffect(() => {
    if (bloqueadoPor <= 0) return;
    bloqueadoRef.current = bloqueadoPor;
    const id = setInterval(() => {
      bloqueadoRef.current--;
      setBloqueadoPor(bloqueadoRef.current);
      if (bloqueadoRef.current <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [bloqueadoPor]);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const usernameRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);
  const senha2Ref = useRef<HTMLInputElement>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step.t === "username") usernameRef.current?.focus();
      else if (step.t === "login") senhaRef.current?.focus();
      else if (step.t === "criar") senha2Ref.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [step]);

  const limparErros = () => {
    setErrorUsuario(null);
    setErrorSenha(null);
    setErrorSenha2(null);
    setErrorGeral(null);
  };

  const finalizarLogin = async (u: string) => {
    const { data: modData, error: modErr } = await db.rpc(
      "usuario_modulos_disponiveis",
      { _username: u },
    );

    if (modErr) {
      setErrorGeral("Não foi possível carregar permissões.");
      return false;
    }

    const parsed = parseModulosDisponiveis(modData);
    if (!parsed.ok) {
      setErrorGeral("Usuário sem permissões. Contate o administrador.");
      return false;
    }

    login(u, parsed.isAdmin, parsed.modulos, parsed.mostrarBloqueados, Boolean((Array.isArray(modData) ? modData[0] : modData)?.is_contador));
    navigate(from, { replace: true });
    return true;
  };

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = step.t === "login" ? step.username : username.trim().toLowerCase();
    if (!u) {
      setErrorUsuario("Digite seu usuário.");
      usernameRef.current?.focus();
      return;
    }
    if (bloqueadoPor > 0) return;
    if (!senha) {
      limparErros();
      setLoading(true);
      try {
        const { data: status } = await db.rpc("usuario_status", { _username: u }) as unknown as { data: { tem_senha: boolean }[] | null };
        if (Array.isArray(status) && status[0] && status[0].tem_senha === false) {
          setUsername(u);
          setStep({ t: "criar", username: u });
          return;
        }
      } catch {
        setErrorGeral("Erro de conexão. Tente novamente.");
        return;
      } finally {
        setLoading(false);
      }
      setErrorSenha("Digite sua senha.");
      senhaRef.current?.focus();
      return;
    }
    limparErros();
    setLoading(true);
    try {
      const { data, error } = await db.rpc("usuario_login", {
        _username: u,
        _senha: senha,
      }) as unknown as { data: { ok: boolean; precisa_criar: boolean; bloqueado: boolean; bloqueadoPor: number; tentativasRestantes: number } | null; error: { message: string } | null };

      if (error) {
        setErrorGeral(error.message);
        return;
      }
      if (!data) {
        setErrorSenha("Credenciais inválidas.");
        senhaRef.current?.focus();
        return;
      }
      if (data.bloqueado) {
        setBloqueadoPor(data.bloqueadoPor);
        setErrorGeral(`Conta temporariamente bloqueada. Tente novamente em ${data.bloqueadoPor}s.`);
        return;
      }
      if (data.precisa_criar) {
        setSenha("");
        setUsername(u);
        setStep({ t: "criar", username: u });
        return;
      }
      if (!data.ok) {
        setErrorSenha("Credenciais inválidas.");
        if (data.tentativasRestantes <= 3 && data.tentativasRestantes > 0) {
          setErrorGeral(`Tentativas restantes: ${data.tentativasRestantes}`);
        }
        senhaRef.current?.focus();
        return;
      }
      await finalizarLogin(u);
    } catch {
      setErrorGeral("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const criarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    limparErros();
    let hasError = false;

    if (!senha) {
      setErrorSenha("Crie uma senha.");
      senhaRef.current?.focus();
      hasError = true;
    } else if (SENHAS_COMUNS.has(senha.toLowerCase())) {
      setErrorSenha("Esta senha é muito comum. Escolha outra.");
      senhaRef.current?.focus();
      hasError = true;
    } else if (senha.length > 128) {
      setErrorSenha("Senha muito longa (máx. 128 caracteres).");
      senhaRef.current?.focus();
      hasError = true;
    } else {
      const falhos = REQUISITOS.filter((r) => !r.test(senha));
      if (falhos.length > 0) {
        setErrorSenha("A senha não atende todos os requisitos abaixo.");
        senhaRef.current?.focus();
        hasError = true;
      }
    }

    if (!senha2) {
      setErrorSenha2("Confirme sua senha.");
      if (!hasError) senha2Ref.current?.focus();
      hasError = true;
    } else if (senha !== senha2) {
      setErrorSenha2("As senhas não conferem.");
      if (!hasError) senha2Ref.current?.focus();
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const { data, error } = await db.rpc("usuario_set_senha", {
        _username: step.t === "criar" ? step.username : username,
        _senha: senha,
      });
      if (error) {
        setErrorGeral(error.message);
        return;
      }
      if (!data) {
        setErrorGeral("Não foi possível criar a senha. Já definida?");
        return;
      }
      toast({ title: "Senha criada", description: `Bem-vindo!` });
      await finalizarLogin(step.t === "criar" ? step.username : username);
    } catch {
      setErrorGeral("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const solicitarRecuperacao = async () => {
    limparErros();
    const u = step.t === "recuperar" ? step.username : username.trim().toLowerCase();
    if (!u) {
      setErrorUsuario("Informe seu usuário.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await db.rpc("usuario_solicitar_recuperacao", { _username: u });
      if (error) {
        setErrorGeral(error.message);
        return;
      }
      const d = data as { enviado?: boolean } | null;
      if (d?.enviado) {
        setCodigoRec("");
        setStepRec("codigo");
        toast({
          title: "Código de recuperação gerado",
          description: "Válido por 30 minutos. Solicite o código ao administrador pelo WhatsApp (44) 99184-2415.",
        });
      }
    } catch {
      setErrorGeral("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const validarCodigo = async () => {
    limparErros();
    if (!codigoRec) {
      setErrorSenha("Digite o código de recuperação.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await db.rpc("usuario_validar_codigo_recuperacao", {
        _username: step.t === "recuperar" ? step.username : username,
        _codigo: codigoRec,
      }) as unknown as { data: { valido: boolean } };
      if (data?.valido) {
        setStepRec("nova");
        setSenha("");
        setSenha2("");
      } else {
        setErrorSenha("Código inválido ou expirado.");
      }
    } catch {
      setErrorGeral("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const resetarSenha = async () => {
    limparErros();
    let hasError = false;

    if (!senha) {
      setErrorSenha("Digite a nova senha.");
      hasError = true;
    } else if (SENHAS_COMUNS.has(senha.toLowerCase())) {
      setErrorSenha("Senha muito comum.");
      hasError = true;
    } else {
      const falhos = REQUISITOS.filter((r) => !r.test(senha));
      if (falhos.length) {
        setErrorSenha("A senha não atende todos os requisitos.");
        hasError = true;
      }
    }
    if (!senha2) {
      setErrorSenha2("Confirme a senha.");
      hasError = true;
    } else if (senha !== senha2) {
      setErrorSenha2("Senhas não conferem.");
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      const { data, error } = await db.rpc("usuario_resetar_senha", {
        _username: step.t === "recuperar" ? step.username : username,
        _codigo: codigoRec,
        _senha: senha,
      });
      if (error) {
        setErrorGeral(error.message);
        return;
      }
      toast({ title: "Senha redefinida com sucesso!" });
      setStep({ t: "login", username: step.t === "recuperar" ? step.username : username });
      setSenha("");
      setSenha2("");
      setStepRec("solicitar");
    } catch {
      setErrorGeral("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const forca = calcularForca(senha);

  const tituloAcesso = step.t === "recuperar"
    ? "Recupere seu acesso"
    : step.t === "criar"
      ? "Crie sua senha"
      : step.t === "login"
        ? "Bem-vindo de volta"
        : "Acesse o sistema";
  const descricaoAcesso = step.t === "recuperar"
    ? "Siga as etapas para redefinir sua senha com segurança."
    : step.t === "criar"
      ? "Defina uma senha forte para concluir seu primeiro acesso."
      : step.t === "login"
        ? "Informe sua senha para continuar no ambiente administrativo."
        : "Entre com suas credenciais para continuar.";

  return (
    <div className="relative min-h-dvh flex flex-col justify-between overflow-clip bg-background" style={{ backgroundImage: "var(--gradient-emerald)" }}>
      {/* Elementos decorativos de fundo com animação suave e profundidade */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-accent/20 blur-[100px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[32rem] w-[32rem] rounded-full bg-primary/30 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full bg-emerald-500/10 blur-[140px]" aria-hidden="true" />

      {/* Barra superior discreta para alternância de tema */}
      <header className="relative z-20 flex items-center justify-end px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <div className="rounded-full bg-black/20 p-0.5 backdrop-blur-md border border-white/10">
          <ThemeToggle variant="onDark" />
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 items-center justify-center p-3 sm:p-6 my-auto">
        <main className="w-full">
          <Card className="rounded-2xl sm:rounded-[32px] border border-border/80 bg-card/95 p-5 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10 transition-all">
              {/* Identificação Municipal */}
              <div className="flex flex-col items-center text-center">
                <div className="relative flex h-14 sm:h-16 max-w-[180px] sm:max-w-[200px] items-center justify-center rounded-2xl border border-primary/15 bg-secondary/50 px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm">
                  <Brasao className="h-full w-auto object-contain" />
                </div>
                <div className="mt-3">
                  <p className="font-display text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                    Prefeitura Municipal de Inajá
                  </p>
                  <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mt-0.5">
                    Plataforma de Gestão Municipal
                  </p>
                </div>
              </div>

              {/* Título da Etapa */}
              <div className="mt-4 sm:mt-6 border-t border-border/60 pt-4 sm:pt-5 text-left">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">{tituloAcesso}</h1>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{descricaoAcesso}</p>
              </div>

              {/* Alerta de Segurança Institucional */}
              <div className="mt-3.5 sm:mt-4 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs text-foreground/80">
                <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Acesso exclusivo para servidores autorizados.</span>
              </div>

              {errorGeral && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="text-sm font-medium">{errorGeral}</p>
                </div>
              )}

              {step.t === "username" && (
                <form onSubmit={fazerLogin} className="mt-5 space-y-4" noValidate>
                  <div>
                    <Label htmlFor="login-usuario" className="text-sm font-medium text-foreground/90">Usuário</Label>
                    <div className="mt-1.5">
                      <Input
                        ref={usernameRef}
                        id="login-usuario"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setErrorUsuario(null); }}
                        placeholder="seu.usuario"
                        className={`${inputBase} ${errorUsuario ? inputErro : ""}`}
                        aria-invalid={!!errorUsuario}
                        aria-describedby={errorUsuario ? "err-usuario" : undefined}
                        maxLength={100}
                      />
                    </div>
                    {errorUsuario && (
                      <p id="err-usuario" role="alert" className="mt-1.5 text-xs font-semibold text-destructive flex items-center gap-1 animate-in fade-in-50 duration-200">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errorUsuario}
                      </p>
                    )}
                  </div>

                  <CampoSenha
                    id="login-senha-inicial"
                    label="Senha"
                    value={senha}
                    onChange={(v) => { setSenha(v); setErrorSenha(null); }}
                    error={errorSenha}
                    errorId="err-senha-inicial"
                    autoComplete="current-password"
                    inputRef={senhaRef}
                    maxLength={256}
                  />

                  <Button type="submit" className={`mt-1 ${botaoPrimario}`} disabled={loading || bloqueadoPor > 0}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
                    {bloqueadoPor > 0 ? `Aguarde ${bloqueadoPor}s` : "Entrar"}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const u = username.trim().toLowerCase();
                        if (!u) {
                          setErrorUsuario("Informe seu usuário para recuperar a senha.");
                          usernameRef.current?.focus();
                          return;
                        }
                        setStep({ t: "recuperar", username: u });
                        setStepRec("solicitar");
                        limparErros();
                      }}
                      className={linkAcao}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </form>
              )}

              {step.t === "login" && (
                <form onSubmit={fazerLogin} className="mt-5 space-y-4" noValidate>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Olá, <strong className="font-semibold text-primary">{step.username}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => { setStep({ t: "username" }); setSenha(""); setErrorGeral(null); limparErros(); }}
                      className={linkAcao}
                    >
                      <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Trocar usuário
                    </button>
                  </div>

                  <CampoSenha
                    id="login-senha"
                    label="Senha"
                    value={senha}
                    onChange={(v) => { setSenha(v); setErrorSenha(null); }}
                    error={errorSenha}
                    errorId="err-senha"
                    autoComplete="current-password"
                    inputRef={senhaRef}
                    maxLength={256}
                  />

                  <Button type="submit" className={botaoPrimario} disabled={loading || bloqueadoPor > 0}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
                    {bloqueadoPor > 0 ? `Aguarde ${bloqueadoPor}s` : "Entrar"}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setStep({ t: "recuperar", username: step.username });
                        setStepRec("solicitar");
                        limparErros();
                      }}
                      className={linkAcao}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </form>
              )}

              {step.t === "criar" && (
                <form onSubmit={criarSenha} className="mt-5 space-y-4" noValidate>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Primeiro acesso de <strong className="font-semibold text-primary">{step.username}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => { setStep({ t: "username" }); setSenha(""); setSenha2(""); setErrorGeral(null); limparErros(); }}
                      className={linkAcao}
                    >
                      <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Trocar usuário
                    </button>
                  </div>

                  <div>
                    <CampoSenha
                      id="criar-senha"
                      label="Nova senha"
                      value={senha}
                      onChange={(v) => { setSenha(v); setErrorSenha(null); }}
                      error={errorSenha}
                      errorId="err-criar-senha"
                      autoComplete="new-password"
                      inputRef={senhaRef}
                      novo
                    />
                    {senha && <RequisitosSenha id="criar-senha-requisitos" senha={senha} forca={forca} />}
                  </div>

                  <div>
                    <CampoSenha
                      id="criar-senha2"
                      label="Confirmar senha"
                      value={senha2}
                      onChange={(v) => { setSenha2(v); setErrorSenha2(null); }}
                      error={errorSenha2}
                      errorId="err-criar-senha2"
                      autoComplete="new-password"
                      inputRef={senha2Ref}
                    />
                    {senha && senha2 && senha !== senha2 && (
                      <p role="alert" className="mt-1.5 text-xs font-semibold text-destructive flex items-center gap-1 animate-in fade-in-50 duration-200">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        As senhas não conferem.
                      </p>
                    )}
                  </div>

                  <Button type="submit" className={botaoPrimario} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
                    Criar e entrar
                  </Button>
                </form>
              )}

              {step.t === "recuperar" && (
                <div className="mt-5 space-y-4">
                  <button
                    type="button"
                    onClick={() => { setStep({ t: "login", username: step.username }); setCodigoRec(""); setStepRec("solicitar"); limparErros(); }}
                    className={linkAcao}
                  >
                    <ChevronLeft className="h-3 w-3" aria-hidden="true" /> Voltar ao login
                  </button>

                  {stepRec === "solicitar" && (
                    <div className="space-y-4">
                      <p className="text-sm leading-6 text-muted-foreground">
                        Vamos gerar um código de recuperação para <strong className="font-semibold text-primary">{step.username}</strong>.
                      </p>
                      <Button type="button" onClick={solicitarRecuperacao} className={botaoPrimario} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Gerar código de recuperação
                      </Button>
                    </div>
                  )}

                  {stepRec === "codigo" && (
                    <div className="space-y-4">
                      <p className="text-sm leading-6 text-muted-foreground">
                        O código foi enviado ao administrador (válido por 30 minutos). Digite abaixo os 6 dígitos recebidos.
                      </p>
                      <div>
                        <Label htmlFor="rec-codigo" className="text-sm font-medium text-foreground/90">Código de 6 dígitos</Label>
                        <div className="mt-1.5">
                          <Input
                            id="rec-codigo"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={codigoRec}
                            onChange={(e) => { setCodigoRec(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrorSenha(null); }}
                            placeholder="000000"
                            className={`${inputBase} ${errorSenha ? inputErro : ""} tracking-[0.5em] text-center font-mono font-bold text-lg`}
                            maxLength={6}
                            aria-invalid={!!errorSenha}
                            aria-describedby={errorSenha ? "err-rec-codigo" : undefined}
                          />
                        </div>
                        {errorSenha && (
                          <p id="err-rec-codigo" role="alert" className="mt-1.5 text-xs font-semibold text-destructive flex items-center gap-1 animate-in fade-in-50 duration-200">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {errorSenha}
                          </p>
                        )}
                      </div>
                      <Button type="button" onClick={validarCodigo} className={botaoPrimario} disabled={loading || codigoRec.length < 6}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Validar código
                      </Button>
                    </div>
                  )}

                  {stepRec === "nova" && (
                    <form onSubmit={(e) => { e.preventDefault(); resetarSenha(); }} className="space-y-4" noValidate>
                      <div>
                        <CampoSenha
                          id="rec-senha"
                          label="Nova senha"
                          value={senha}
                          onChange={(v) => { setSenha(v); setErrorSenha(null); }}
                          error={errorSenha}
                          errorId="err-rec-senha"
                          autoComplete="new-password"
                          novo
                        />
                        {senha && <RequisitosSenha id="rec-senha-requisitos" senha={senha} forca={forca} />}
                      </div>
                      <div>
                        <CampoSenha
                          id="rec-senha2"
                          label="Confirmar senha"
                          value={senha2}
                          onChange={(v) => { setSenha2(v); setErrorSenha2(null); }}
                          error={errorSenha2}
                          errorId="err-rec-senha2"
                          autoComplete="new-password"
                        />
                      </div>
                      <Button type="submit" className={botaoPrimario} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
                        Redefinir senha
                      </Button>
                    </form>
                  )}
                </div>
              )}

              <div className="mt-6 sm:mt-8 space-y-1.5 border-t border-border/60 pt-4 sm:pt-5 text-center">
                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/90 tracking-wide uppercase">
                  Sistema Integrado · Uso Restrito & Autenticado
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 text-xs text-muted-foreground">
                  <span>Dúvidas ou suporte?</span>
                  <a
                    href="https://wa.me/5544991842415"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-primary underline-offset-4 hover:underline hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    WhatsApp (44) 99184-2415
                  </a>
                </div>
              </div>
            </Card>
        </main>
      </div>
    </div>
  );
}
