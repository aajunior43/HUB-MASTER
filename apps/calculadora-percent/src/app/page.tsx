import Image from "next/image";
import { CalculatorCards } from "@/components/CalculatorCards";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Hero Section */}
      <section className="relative text-center space-y-4 mb-8 overflow-hidden rounded-xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-100/60 to-transparent dark:from-zinc-900/60" />
        <div className="relative space-y-2 py-10">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-600 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 bg-clip-text text-transparent">
            Calculadoras de Porcentagem
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Ferramenta completa para todos os seus cálculos percentuais. Rápido, preciso e fácil de usar.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="#calculators" className="px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm">Começar agora</a>
            <a href="/history" className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm">Ver histórico</a>
          </div>
        </div>
        
        <div className="relative z-10 flex justify-center items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500 pb-6">
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div>13 Calculadoras</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>Histórico Local</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded-full"></div>Compartilhamento</span>
        </div>
      </section>

      {/* Calculators */}
      <section id="calculators" className="space-y-4">
        <h2 className="text-xl font-semibold">Escolha uma calculadora:</h2>
        <CalculatorCards />
      </section>
    </div>
  );
}
