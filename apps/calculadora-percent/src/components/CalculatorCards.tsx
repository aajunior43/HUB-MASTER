"use client";

import Link from "next/link";
import { Card } from "./ui/Card";
import { calculators } from "@/calculators/registry";
import { CalculatorIcon, Search, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

export function CalculatorCards() {
  const all = useMemo(() => Object.values(calculators), []);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) =>
      [c.title, c.description, c.slug].some((t) => t.toLowerCase().includes(q))
    );
  }, [all, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border rounded-lg pl-10 pr-3 py-2 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 ring-zinc-400/60 dark:ring-zinc-600/60"
          placeholder="Buscar calculadora (ex.: porcentagem, desconto, juros)"
          aria-label="Buscar calculadora"
        />
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden />
      </div>

      {list.length === 0 ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Nenhum resultado para "{query}". Tente um termo diferente.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <Link key={c.slug} href={`/calculator/${c.slug}`} aria-label={`Abrir ${c.title}`}>
              <Card className="group p-4 hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 ring-zinc-400 dark:ring-zinc-600">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-900">
                    <CalculatorIcon className="size-4" aria-hidden />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-medium flex items-center justify-between">
                      <span>{c.title}</span>
                      <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{c.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}