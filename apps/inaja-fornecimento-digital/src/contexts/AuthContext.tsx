import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { db } from "@/integrations/db/client";

function GuardSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background" role="status" aria-live="polite">
      <img src="/brasao.png" alt="" className="h-14 w-14 opacity-90" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </div>
    </div>
  );
}

const STORAGE_KEY = "prefeitura_user";
const STORAGE_ADMIN = "prefeitura_is_admin";
const STORAGE_MODULOS = "prefeitura_modulos";
const STORAGE_BLOQUEADOS = "prefeitura_mostrar_bloqueados";

export type ModuloRow = {
  modulo_id: string | null;
  is_admin: boolean;
  is_contador?: boolean;
  mostrar_bloqueados: boolean;
  modulos_manutencao?: string[];
};

/** Extrai módulos e flags da resposta de usuario_modulos_disponiveis. */
export function parseModulosDisponiveis(data: unknown): {
  modulos: string[];
  isAdmin: boolean;
  isContador: boolean;
  mostrarBloqueados: boolean;
  modulosManutencao: string[];
  ok: boolean;
} {
  if (data == null) return { modulos: [], isAdmin: false, isContador: false, mostrarBloqueados: false, modulosManutencao: [], ok: false };
  const rows = Array.isArray(data) ? (data as ModuloRow[]) : [];
  if (rows.length === 0) {
    return { modulos: [], isAdmin: false, isContador: false, mostrarBloqueados: false, modulosManutencao: [], ok: false };
  }
  const first = rows[0];
  const modulos = rows
    .map((r) => r.modulo_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return {
    modulos,
    isAdmin: first.is_admin === true,
    isContador: first.is_contador === true,
    mostrarBloqueados: first.mostrar_bloqueados === true,
    modulosManutencao: first.modulos_manutencao ?? [],
    ok: true,
  };
}

interface AuthCtx {
  user: string | null;
  isAdmin: boolean;
  isContador: boolean;
  modulosLiberados: string[];
  mostrarBloqueados: boolean;
  modulosManutencao: string[];
  sessionChecked: boolean;
  permissionsChecked: boolean;
  temModulo: (moduloId: string | string[]) => boolean;
  login: (username: string, isAdmin: boolean, modulos: string[], mostrarBloqueados: boolean, isContador?: boolean) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  isAdmin: false,
  isContador: false,
  modulosLiberados: [],
  mostrarBloqueados: false,
  modulosManutencao: [],
  sessionChecked: false,
  permissionsChecked: false,
  temModulo: () => false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContador, setIsContador] = useState(false);
  const [modulosLiberados, setModulosLiberados] = useState<string[]>([]);
  const [mostrarBloqueados, setMostrarBloqueados] = useState(false);
  const [modulosManutencao, setModulosManutencao] = useState<string[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  const doLogout = useCallback(() => {
    void db.rpc("usuario_logout");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_ADMIN);
    localStorage.removeItem(STORAGE_MODULOS);
    localStorage.removeItem(STORAGE_BLOQUEADOS);
    setUser(null);
    setIsAdmin(false);
    setIsContador(false);
    setModulosLiberados([]);
    setMostrarBloqueados(false);
    setModulosManutencao([]);
    setPermissionsChecked(false);
  }, []);

  // Sincroniza logout entre abas via evento storage
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !e.newValue) {
        doLogout();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [doLogout]);

  // Valida sessão no servidor ao montar
  useEffect(() => {
    let cancelled = false;
    db.rpc("usuario_validar_sessao").then(({ data, error }) => {
      if (cancelled) return;
      const session = data as { valido?: boolean; username?: string | null } | null;
      if (error || !session?.valido || !session.username) {
        doLogout();
        setPermissionsChecked(true);
      } else {
        setUser(session.username);
      }
      setSessionChecked(true);
    }).catch(() => {
      if (cancelled) return;
      doLogout();
      setPermissionsChecked(true);
      setSessionChecked(true);
    });
    return () => { cancelled = true; };
  }, [doLogout]);

  // Recarrega permissões do servidor
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    db.rpc("usuario_modulos_disponiveis", { _username: user }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        doLogout();
        setPermissionsChecked(true);
        return;
      }
      const parsed = parseModulosDisponiveis(data);
      if (!parsed.ok) {
        doLogout();
        setPermissionsChecked(true);
        return;
      }
      setIsAdmin(parsed.isAdmin);
      setIsContador(Boolean((data as ModuloRow[])[0]?.is_contador));
      setModulosLiberados(parsed.modulos);
      setMostrarBloqueados(parsed.mostrarBloqueados);
      setModulosManutencao(parsed.modulosManutencao);
      localStorage.setItem(STORAGE_ADMIN, String(parsed.isAdmin));
      localStorage.setItem(STORAGE_MODULOS, JSON.stringify(parsed.modulos));
      localStorage.setItem(STORAGE_BLOQUEADOS, String(parsed.mostrarBloqueados));
      setPermissionsChecked(true);
    });
    return () => { cancelled = true; };
  }, [user, doLogout]);

  const temModulo = (moduloId: string | string[]) => {
    const modulos = Array.isArray(moduloId) ? moduloId : [moduloId];
    return isAdmin || modulos.some((id) => modulosLiberados.includes(id) && !modulosManutencao.includes(id));
  };

  const login = (username: string, adminFlag: boolean, modulos: string[], showBlocked: boolean, contadorFlag = false) => {
    localStorage.setItem(STORAGE_KEY, username);
    localStorage.setItem(STORAGE_ADMIN, String(adminFlag));
    localStorage.setItem(STORAGE_MODULOS, JSON.stringify(modulos));
    localStorage.setItem(STORAGE_BLOQUEADOS, String(showBlocked));
    setUser(username);
    setIsAdmin(adminFlag);
    setIsContador(contadorFlag);
    setModulosLiberados(modulos);
    setMostrarBloqueados(showBlocked);
    setSessionChecked(true);
    setPermissionsChecked(true);
  };

  const logout = doLogout;

  return (
    <Ctx.Provider value={{ user, isAdmin, isContador, modulosLiberados, mostrarBloqueados, modulosManutencao, sessionChecked, permissionsChecked, temModulo, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, sessionChecked, permissionsChecked } = useAuth();
  const location = useLocation();
  if (!sessionChecked || !permissionsChecked) return <GuardSplash />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, sessionChecked, permissionsChecked } = useAuth();
  const location = useLocation();
  if (!sessionChecked || !permissionsChecked) return <GuardSplash />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace state={{ acessoNegado: "admin" }} />;
  return <>{children}</>;
}

/** Exige login + módulo liberado (admin tem acesso a todos os módulos). */
export function RequireModulo({ modulo, children }: { modulo: string | string[]; children: ReactNode }) {
  const { user, isAdmin, temModulo, sessionChecked, permissionsChecked } = useAuth();
  const location = useLocation();
  if (!sessionChecked || !permissionsChecked) return <GuardSplash />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin && !temModulo(modulo)) {
    return <Navigate to="/" replace state={{ acessoNegado: modulo }} />;
  }
  return <>{children}</>;
}
