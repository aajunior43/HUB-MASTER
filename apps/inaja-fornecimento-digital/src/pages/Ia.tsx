import { BrainCircuit, FileSearch, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppFooter } from "@/components/AppFooter";
import { PageHeader } from "@/components/PageHeader";
import { GlowCard } from "@/components/ui/spotlight-card";
import { useAuth } from "@/contexts/AuthContext";

const ferramentas = [
  {
    id: "assistente-empenho",
    titulo: "Assistente de empenho",
    descricao: "Extraia campos, gere descrições e revise empenhos com inteligência artificial.",
    caminho: "/assistente-empenho",
    Icon: FileSearch,
  },
  {
    id: "classificador-despesa",
    titulo: "Classificador de despesas",
    descricao: "Classifique itens de despesa pública com apoio de inteligência artificial.",
    caminho: "/classificador-despesa",
    Icon: BrainCircuit,
  },
];

export default function Ia() {
  const navigate = useNavigate();
  const { user, temModulo } = useAuth();
  const visiveis = ferramentas.filter((ferramenta) => temModulo(ferramenta.id));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader icon={Sparkles} title="IA" subtitle="Ferramentas inteligentes" username={user} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-foreground">Escolha uma ferramenta</h2>
          <p className="mt-1 text-sm text-muted-foreground">Apoio com IA para as rotinas de empenho e classificação de despesas.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {visiveis.map(({ id, titulo, descricao, caminho, Icon }) => (
            <GlowCard
              key={id}
              customSize
              onClick={() => navigate(caminho)}
              ariaLabel={`Abrir ${titulo}`}
              className="flex min-h-48 w-full flex-col justify-between bg-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold text-card-foreground">{titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{descricao}</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <span className="mt-5 text-sm font-semibold text-primary">Abrir ferramenta →</span>
            </GlowCard>
          ))}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
