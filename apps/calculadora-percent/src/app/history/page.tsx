"use client";

import Link from "next/link";
import { useHistory } from "@/utils/history";

export default function HistoryPage() {
  const { items, clear, remove } = useHistory();

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Histórico</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Últimos cálculos realizados neste dispositivo.</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-sm px-3 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Limpar histórico
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Nenhum item salvo ainda.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="border border-zinc-200 dark:border-zinc-800 rounded-md p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  <Link className="hover:underline" href={`/calculator/${it.slug}`}>{it.title}</Link>
                </div>
                <time className="text-xs text-zinc-500">
                  {new Date(it.ts).toLocaleString()}
                </time>
              </div>
              <div className="mt-2 grid sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-zinc-500">Entradas</div>
                  <div className="font-mono break-all">
                    {Object.entries(it.inputs).map(([k, v]) => (
                      <span key={k} className="inline-block mr-2">{k}: {v}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Resultado</div>
                  <div className="font-mono break-all">{it.result}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Fórmula</div>
                  <div className="font-mono break-all">{it.formula}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700" onClick={() => copy(it.result)}>Copiar resultado</button>
                <Link href={`/calculator/${it.slug}`} className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700">Abrir calculadora</Link>
                <button className="ml-auto text-xs px-2 py-1 rounded bg-red-600 text-white" onClick={() => remove(it.id)}>Remover</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}