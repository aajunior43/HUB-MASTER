import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { db } from "@/integrations/db/client";
import { cn } from "@/lib/utils";

const REQUISITOS = [
  { label: "Mínimo 6 caracteres", test: (senha: string) => senha.length >= 6 },
  { label: "Uma letra maiúscula", test: (senha: string) => /[A-Z]/.test(senha) },
  { label: "Uma letra minúscula", test: (senha: string) => /[a-z]/.test(senha) },
  { label: "Um número", test: (senha: string) => /[0-9]/.test(senha) },
];

const SENHAS_COMUNS = new Set([
  "123456", "senha", "password", "12345678", "qwerty", "admin", "12345",
  "abcdef", "abc123", "123456789", "123123", "000000", "111111", "inaja",
]);

interface ChangePasswordDialogProps {
  className?: string;
  showLabel?: boolean;
}

export function ChangePasswordDialog({ className, showLabel = false }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarAtual, setMostrarAtual] = useState(false);
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const limparFormulario = () => {
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmacao("");
    setMostrarAtual(false);
    setMostrarNova(false);
    setMostrarConfirmacao(false);
    setErro(null);
  };

  const alterarAbertura = (aberto: boolean) => {
    setOpen(aberto);
    if (!aberto) limparFormulario();
  };

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro(null);

    if (!senhaAtual) {
      setErro("Informe sua senha atual.");
      return;
    }
    if (!novaSenha) {
      setErro("Informe a nova senha.");
      return;
    }
    if (SENHAS_COMUNS.has(novaSenha.toLowerCase())) {
      setErro("A nova senha é muito comum. Escolha outra.");
      return;
    }
    if (novaSenha.length > 128) {
      setErro("A nova senha deve ter no máximo 128 caracteres.");
      return;
    }
    if (REQUISITOS.some((requisito) => !requisito.test(novaSenha))) {
      setErro("A nova senha não atende todos os requisitos abaixo.");
      return;
    }
    if (senhaAtual === novaSenha) {
      setErro("A nova senha deve ser diferente da senha atual.");
      return;
    }
    if (!confirmacao) {
      setErro("Confirme a nova senha.");
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }

    setSalvando(true);
    try {
      const { data, error } = await db.rpc("usuario_alterar_senha", {
        _senha_atual: senhaAtual,
        _nova_senha: novaSenha,
      });
      if (error) {
        setErro(error.message);
        return;
      }
      if (!data || (data as { ok?: boolean }).ok !== true) {
        setErro("Não foi possível alterar sua senha.");
        return;
      }
      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
      setOpen(false);
      limparFormulario();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={alterarAbertura}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={showLabel ? "sm" : "icon"}
          variant="outline"
          title="Alterar senha"
          aria-label="Alterar senha"
          className={cn(showLabel && "sm:w-auto sm:px-3", className)}
        >
          <LockKeyhole className={cn("h-4 w-4", showLabel && "sm:mr-2")} />
          {showLabel && <span className="hidden sm:inline">Alterar senha</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            Confirme sua senha atual e defina uma nova senha para sua conta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <div className="relative">
              <Input
                id="senha-atual"
                type={mostrarAtual ? "text" : "password"}
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(event) => { setSenhaAtual(event.target.value); setErro(null); }}
                className="pr-10"
                maxLength={128}
              />
              <button type="button" onClick={() => setMostrarAtual((valor) => !valor)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted-foreground" aria-label={mostrarAtual ? "Ocultar senha atual" : "Mostrar senha atual"}>
                {mostrarAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <div className="relative">
              <Input
                id="nova-senha"
                type={mostrarNova ? "text" : "password"}
                autoComplete="new-password"
                value={novaSenha}
                onChange={(event) => { setNovaSenha(event.target.value); setErro(null); }}
                className="pr-10"
                maxLength={128}
              />
              <button type="button" onClick={() => setMostrarNova((valor) => !valor)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted-foreground" aria-label={mostrarNova ? "Ocultar nova senha" : "Mostrar nova senha"}>
                {mostrarNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {novaSenha && (
              <ul className="space-y-1 pt-1 text-[11px] text-muted-foreground">
                {REQUISITOS.map((requisito) => (
                  <li key={requisito.label} className={cn("flex items-center gap-1", requisito.test(novaSenha) && "text-emerald-600 dark:text-emerald-400")}>
                    {requisito.test(novaSenha) ? <CheckCircle2 className="h-3 w-3" /> : <span className="inline-block h-3 w-3" />}
                    {requisito.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar-nova-senha">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="confirmar-nova-senha"
                type={mostrarConfirmacao ? "text" : "password"}
                autoComplete="new-password"
                value={confirmacao}
                onChange={(event) => { setConfirmacao(event.target.value); setErro(null); }}
                className="pr-10"
                maxLength={128}
              />
              <button type="button" onClick={() => setMostrarConfirmacao((valor) => !valor)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted-foreground" aria-label={mostrarConfirmacao ? "Ocultar confirmação" : "Mostrar confirmação"}>
                {mostrarConfirmacao ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={salvando}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Salvar nova senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
