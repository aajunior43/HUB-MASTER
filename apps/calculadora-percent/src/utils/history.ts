import { useEffect, useState } from "react";

export type HistoryItem = {
  id: string;
  ts: number;
  slug: string;
  title: string;
  inputs: Record<string, string>;
  result: string;
  formula: string;
};

const KEY = "pct-history";
const MAX = 20;

function read(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: HistoryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setItems(read());
  }, []);

  function add(item: Omit<HistoryItem, "id" | "ts">) {
    const newItem: HistoryItem = { ...item, id: crypto.randomUUID(), ts: Date.now() };
    const list = [newItem, ...read()].slice(0, MAX);
    write(list);
    setItems(list);
  }

  function remove(id: string) {
    const list = read().filter((i) => i.id !== id);
    write(list);
    setItems(list);
  }

  function clear() {
    write([]);
    setItems([]);
  }

  return { items, add, remove, clear } as const;
}