export default function Page() {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Como funciona</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Cada calculadora usa fórmulas matemáticas simples e apresenta a substituição
        dos valores que você inseriu. Por exemplo, "X% de Y = (X/100) × Y".
      </p>
      <ul className="list-disc pl-6 text-sm space-y-1">
        <li>Suporte a vírgula ou ponto como separador decimal.</li>
        <li>Mensagens claras e foco em acessibilidade e performance.</li>
        <li>Histórico local e possibilidade de compartilhar resultados (em breve).</li>
      </ul>
    </div>
  );
}