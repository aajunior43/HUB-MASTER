import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import ModuleHub from "./pages/ModuleHub";
import Login from "./pages/Login";
import { AuthProvider, RequireAuth, RequireAdmin, RequireModulo } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const Solicitacoes = lazy(() => import("./pages/Solicitacoes"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const Calculadoras = lazy(() => import("./pages/Calculadoras"));
const CredoresFixos = lazy(() => import("./pages/CredoresFixos"));
const Admin = lazy(() => import("./pages/Admin"));
const Empenhos = lazy(() => import("./pages/Empenhos"));
const PedidosDotacao = lazy(() => import("./pages/PedidosDotacao"));
const SitesUteis = lazy(() => import("./pages/SitesUteis"));
const Rpas = lazy(() => import("./pages/Rpas"));
const Cnpj = lazy(() => import("./pages/Cnpj"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Prazos = lazy(() => import("./pages/Prazos"));
const PrestacaoContas = lazy(() => import("./pages/PrestacaoContas"));
const DemonstrativosBb = lazy(() => import("./pages/DemonstrativosBb"));
const Ramais = lazy(() => import("./pages/Ramais"));
const Ia = lazy(() => import("./pages/Ia"));
const AssistenteEmpenho = lazy(() => import("./pages/AssistenteEmpenho"));
const ClassificadorDespesa = lazy(() => import("./pages/ClassificadorDespesa"));
const GestaoDocumentos = lazy(() => import("./pages/GestaoDocumentos"));
const Arquivos = lazy(() => import("./pages/Arquivos"));
const Superlog = lazy(() => import("./pages/Superlog"));
const PdfUtils = lazy(() => import("./pages/PdfUtils"));
const Extratos = lazy(() => import("./pages/Extratos"));
const Backup = lazy(() => import("./pages/Backup"));
const Autentique = lazy(() => import("./pages/Autentique"));
const Pncp = lazy(() => import("./pages/Pncp"));
const TcePr = lazy(() => import("./pages/TcePr"));
const Siconfi = lazy(() => import("./pages/Siconfi"));
const SaudePublica = lazy(() => import("./pages/SaudePublica"));
const Transferencias = lazy(() => import("./pages/Transferencias"));
const ComprasGov = lazy(() => import("./pages/ComprasGov"));
const Fnde = lazy(() => import("./pages/Fnde"));
const BeneficiosSociais = lazy(() => import("./pages/BeneficiosSociais"));
const DetectorAtos = lazy(() => import("./pages/DetectorAtos"));
const Obras = lazy(() => import("./pages/Obras"));
const Mcp = lazy(() => import("./pages/Mcp"));
const Manual = lazy(() => import("./pages/Manual"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>
);

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{node}</Suspense>
);

const withModulo = (modulo: string | string[], node: ReactNode) =>
  withSuspense(
    <RequireAuth>
      <RequireModulo modulo={modulo}>{node}</RequireModulo>
    </RequireAuth>,
  );

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
          attribute="class"
          defaultTheme="inaja"
          themes={[
            "inaja", "inaja-escuro", "alto-contraste", "spotify",
            "institucional-gov", "tesouro", "verde-cinza",
          ]}
          value={{
            inaja: "inaja",
            "inaja-escuro": "inaja-escuro",
            "alto-contraste": "alto-contraste",
            spotify: "spotify",
            "institucional-gov": "institucional-gov",
            tesouro: "tesouro",
            "verde-cinza": "verde-cinza",
          }}
          enableSystem={false}
          storageKey="inaja-theme"
        >
      <TooltipProvider>
        <Toaster />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<RequireAuth><ModuleHub /></RequireAuth>} />
              <Route path="/solicitacoes" element={withModulo("solicitacoes", <Solicitacoes />)} />
              <Route path="/tarefas" element={withModulo("tarefas", <Tarefas />)} />
              <Route path="/calculadoras" element={withModulo(["calculadoras", "diarias"], <Calculadoras />)} />
              <Route path="/diarias" element={withModulo(["calculadoras", "diarias"], <Navigate to="/calculadoras" replace />)} />
              <Route path="/credores-fixos" element={withModulo("credores-fixos", <CredoresFixos />)} />
              <Route path="/empenhos" element={withModulo("empenhos", <Empenhos />)} />
              <Route path="/pedidos-dotacao" element={withModulo("pedido-dotacao", <PedidosDotacao />)} />
              <Route path="/sites-uteis" element={withModulo("sites-uteis", <SitesUteis />)} />
              <Route path="/rpas" element={withModulo("rpas", <Rpas />)} />
              <Route path="/cnpj" element={withModulo("cnpj", <Cnpj />)} />
              <Route path="/calendario" element={withModulo("calendario", <Calendario />)} />
              <Route path="/prazos" element={withModulo("prazos", <Prazos />)} />
              <Route path="/obrigacoes" element={withModulo("prazos", <Prazos />)} />
              <Route path="/prestacao-contas" element={withModulo("prestacao-contas", <PrestacaoContas />)} />
              <Route path="/prestacao-contas/demonstrativos-bb" element={withModulo("prestacao-contas", <DemonstrativosBb />)} />
              <Route path="/ramais" element={withModulo("ramais", <Ramais />)} />
              <Route path="/ia" element={withModulo(["assistente-empenho", "classificador-despesa"], <Ia />)} />
              <Route path="/assistente-empenho" element={withModulo("assistente-empenho", <AssistenteEmpenho />)} />
              <Route path="/classificador-despesa" element={withModulo("classificador-despesa", <ClassificadorDespesa />)} />
              <Route path="/arquivos" element={withModulo("gestao-documentos", <Arquivos />)} />
              <Route path="/gestao-documentos" element={withModulo("gestao-documentos", <GestaoDocumentos />)} />
              <Route path="/pdf-utils" element={withModulo("pdf-utils", <PdfUtils />)} />
              <Route path="/extratos" element={withModulo("extratos", <Extratos />)} />
              <Route path="/backup" element={withSuspense(<RequireAdmin><Backup /></RequireAdmin>)} />
              <Route path="/autentique" element={withModulo("autentique", <Autentique />)} />
              <Route path="/pncp" element={withModulo("pncp", <Pncp />)} />
              <Route path="/tce-pr" element={withModulo("pncp", <TcePr />)} />
              <Route path="/siconfi" element={withModulo("prestacao-contas", <Siconfi />)} />
              <Route path="/saude-publica" element={withModulo("saude-publica", <SaudePublica />)} />
              <Route path="/transferencias" element={withModulo("transferencias", <Transferencias />)} />
              <Route path="/fnde" element={withModulo(["fnde", "transferencias"], <Fnde />)} />
              <Route path="/beneficios-sociais" element={withModulo(["beneficios-sociais", "transferencias"], <BeneficiosSociais />)} />
              <Route path="/compras-gov" element={withModulo("compras-gov", <ComprasGov />)} />
              <Route path="/detector-atos" element={withModulo("detector-atos", <DetectorAtos />)} />
              <Route path="/obras" element={withModulo(["pncp", "obras"], <Obras />)} />
              <Route path="/mcp" element={withSuspense(<RequireAdmin><Mcp /></RequireAdmin>)} />
              <Route path="/manual" element={withSuspense(<RequireAuth><Manual /></RequireAuth>)} />
              <Route path="/superlog" element={withSuspense(<RequireAdmin><Superlog /></RequireAdmin>)} />
              <Route path="/admin" element={withSuspense(<RequireAdmin><Admin /></RequireAdmin>)} />
              <Route path="*" element={withSuspense(<NotFound />)} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
