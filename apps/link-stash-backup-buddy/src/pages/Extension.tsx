import { useState } from 'react';
import { Button } from '@/components/ui/button';

const steps = [
  'Baixe o arquivo ZIP e descompacte em uma pasta.',
  'Abra chrome://extensions no Chrome (ou Edge, Brave, Arc).',
  'Ative o "Modo do desenvolvedor" no canto superior direito.',
  'Clique em "Carregar sem compactação" e selecione a pasta descompactada.',
  'Clique no ícone da extensão, entre com sua conta e comece a salvar links.',
];

export default function Extension() {
  const [err, setErr] = useState<string | null>(null);

  const download = () => {
    setErr(null);
    fetch('/meus-links-extension.zip')
      .then((r) => {
        if (!r.ok) throw new Error(`Falha ao baixar (${r.status})`);
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'meus-links-extension.zip';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => setErr(e.message));
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-xs text-accent tracking-widest">EXTENSÃO • CHROME</p>
          <h1 className="text-3xl font-mono">Salve qualquer aba no Meus Links</h1>
          <p className="text-muted-foreground">
            Instale a extensão para salvar a página atual com um clique — pelo popup ou pelo menu do botão direito.
          </p>
        </header>

        <div className="rounded-2xl p-6 bg-card border border-border/40 space-y-4">
          <Button onClick={download} className="w-full sm:w-auto">Baixar extensão (.zip)</Button>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <section className="space-y-4">
          <h2 className="font-mono text-lg">Como instalar</h2>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent font-mono text-xs flex items-center justify-center">{i + 1}</span>
                <span className="text-sm">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <p className="text-xs text-muted-foreground">
          Você faz login com o mesmo email e senha que usa no app. A extensão salva direto na sua conta.
        </p>
      </div>
    </div>
  );
}
