import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import MinimalistAPIKeyManager from '@/components/configuration/MinimalistAPIKeyManager';

const Admin = () => {
  const handleApiKeyChange = (_key: string) => {
    // Persistência já é feita dentro do componente (localStorage)
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground brutal-border bg-card px-3 py-1.5 hover:bg-secondary transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={3} />
            Voltar
          </Link>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.9] mb-4 uppercase">
            Admin
          </h1>
          <p className="text-foreground font-medium max-w-xl">
            Configure as chaves de API. Armazenadas <span className="font-black uppercase bg-secondary px-1">localmente</span> no navegador.
          </p>
        </div>


        <div className="editorial-rule mb-8" />

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-secondary brutal-border flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-secondary-foreground" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Chaves de API</h2>
          </div>

          <div className="brutal-border brutal-shadow bg-card p-5 sm:p-6">
            <MinimalistAPIKeyManager onApiKeyChange={handleApiKeyChange} />
          </div>
        </section>



      </div>
    </div>
  );
};

export default Admin;
