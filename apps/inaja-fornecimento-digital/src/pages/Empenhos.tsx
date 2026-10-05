import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Table2, Upload } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { PageHeader } from "@/components/PageHeader";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { AbaDashboard } from "@/components/empenhos/AbaDashboard";
import { AbaTabela } from "@/components/empenhos/AbaTabela";
import { AbaImportar } from "@/components/empenhos/AbaImportar";

export { parseCSV } from "@/lib/parseCSV";

type Tab = "dashboard" | "tabela" | "importar";

export default function Empenhos() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  const tabs: PageTab<Tab>[] = [
    { id: "dashboard", label: "Painel", icon: BarChart3 },
    { id: "tabela", label: "Empenhos", icon: Table2 },
    ...(isAdmin ? [{ id: "importar" as Tab, label: "Importar CSV", icon: Upload }] : []),
  ];

  useEffect(() => {
    if (!isAdmin && tab === "importar") {
      setTab("dashboard");
    }
  }, [isAdmin, tab]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={BarChart3}
        title="Empenhos"
        subtitle="Relação de empenhos orçamentários"
        username={user}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        <PageTabs tabs={tabs} value={tab} onChange={setTab} />

        <div className="pb-16">
          {tab === "dashboard" && <AbaDashboard />}
          {tab === "tabela"    && <AbaTabela />}
          {tab === "importar"  && <AbaImportar callerUsername={user || ""} />}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
