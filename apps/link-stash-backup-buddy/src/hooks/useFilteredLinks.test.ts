import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFilteredLinks } from "@/hooks/useFilteredLinks";
import type { Link } from "@/types/link";

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();

const makeLink = (over: Partial<Link>): Link => ({
  id: over.id ?? "1",
  title: over.title ?? "Titulo",
  url: over.url ?? "https://example.com/a",
  created_at: over.created_at ?? daysAgo(1),
  updated_at: over.updated_at ?? daysAgo(1),
  category_id: null,
  folder_id: null,
  user_id: "u1",
  is_favorite: false,
  is_archived: false,
  is_pinned: false,
  deleted_at: null,
  description: null,
  tagIds: [],
  ...over,
});

const baseState = {
  searchTerm: "",
  showOnlyFavorites: false,
  domainFilter: "",
  selectedCategoryId: null as string | null,
  dateFilter: "all" as "all" | "week" | "month" | "3months",
  showArchive: false,
  showTrash: false,
  selectedTagId: "",
  sortBy: "date" as "date" | "title" | "domain",
  sortOrder: "desc" as "asc" | "desc",
};

const run = (links: Link[], state: Partial<typeof baseState> = {}) =>
  renderHook(() => useFilteredLinks(links, { ...baseState, ...state })).result.current;

describe("useFilteredLinks", () => {
  // Estado vazio
  it("retorna [] quando a lista é vazia", () => {
    expect(run([])).toEqual([]);
  });

  // Caso principal: filtra deletados e arquivados por padrão
  it("oculta links deletados e arquivados na visão padrão", () => {
    const links = [
      makeLink({ id: "ok" }),
      makeLink({ id: "del", deleted_at: daysAgo(1) }),
      makeLink({ id: "arch", is_archived: true }),
    ];
    expect(run(links).map(l => l.id)).toEqual(["ok"]);
  });

  it("showArchive=true mostra apenas arquivados", () => {
    const links = [makeLink({ id: "a" }), makeLink({ id: "b", is_archived: true })];
    expect(run(links, { showArchive: true }).map(l => l.id)).toEqual(["b"]);
  });

  it("showTrash=true mostra apenas deletados", () => {
    const links = [makeLink({ id: "a" }), makeLink({ id: "b", deleted_at: daysAgo(1) })];
    expect(run(links, { showTrash: true }).map(l => l.id)).toEqual(["b"]);
  });

  it("showOnlyFavorites filtra por favoritos", () => {
    const links = [makeLink({ id: "a" }), makeLink({ id: "b", is_favorite: true })];
    expect(run(links, { showOnlyFavorites: true }).map(l => l.id)).toEqual(["b"]);
  });

  it("domainFilter é case-insensitive e ignora www.", () => {
    const links = [
      makeLink({ id: "a", url: "https://www.example.com/x" }),
      makeLink({ id: "b", url: "https://other.com/y" }),
    ];
    expect(run(links, { domainFilter: "EXAMPLE.com" }).map(l => l.id)).toEqual(["a"]);
  });

  it("selectedCategoryId filtra por categoria", () => {
    const links = [
      makeLink({ id: "a", category_id: "c1" }),
      makeLink({ id: "b", category_id: "c2" }),
    ];
    expect(run(links, { selectedCategoryId: "c1" }).map(l => l.id)).toEqual(["a"]);
  });

  it("selectedTagId filtra pela tag", () => {
    const links = [
      makeLink({ id: "a", tagIds: ["t1"] }),
      makeLink({ id: "b", tagIds: ["t2"] }),
      makeLink({ id: "c" }),
    ];
    expect(run(links, { selectedTagId: "t1" }).map(l => l.id)).toEqual(["a"]);
  });

  it("dateFilter=week corta itens mais antigos que 7 dias", () => {
    const links = [
      makeLink({ id: "novo", created_at: daysAgo(2) }),
      makeLink({ id: "velho", created_at: daysAgo(30) }),
    ];
    expect(run(links, { dateFilter: "week" }).map(l => l.id)).toEqual(["novo"]);
  });

  it("busca por texto casa título, url e description", () => {
    const links = [
      makeLink({ id: "t", title: "React Hooks" }),
      makeLink({ id: "u", title: "x", url: "https://vue.js.org" }),
      makeLink({ id: "d", title: "x", description: "guia sobre svelte" }),
      makeLink({ id: "n", title: "nada" }),
    ];
    expect(run(links, { searchTerm: "REACT" }).map(l => l.id)).toEqual(["t"]);
    expect(run(links, { searchTerm: "vue" }).map(l => l.id)).toEqual(["u"]);
    expect(run(links, { searchTerm: "svelte" }).map(l => l.id)).toEqual(["d"]);
    expect(run(links, { searchTerm: "inexistente" })).toEqual([]);
  });

  it("ordena por título asc/desc", () => {
    const links = [makeLink({ id: "1", title: "Banana" }), makeLink({ id: "2", title: "Abacaxi" })];
    expect(run(links, { sortBy: "title", sortOrder: "asc" }).map(l => l.title))
      .toEqual(["Abacaxi", "Banana"]);
    expect(run(links, { sortBy: "title", sortOrder: "desc" }).map(l => l.title))
      .toEqual(["Banana", "Abacaxi"]);
  });

  it("ordena por data desc por padrão (mais novo primeiro)", () => {
    const links = [
      makeLink({ id: "velho", created_at: daysAgo(10) }),
      makeLink({ id: "novo", created_at: daysAgo(1) }),
    ];
    expect(run(links).map(l => l.id)).toEqual(["novo", "velho"]);
  });

  it("ordena por domínio", () => {
    const links = [
      makeLink({ id: "z", url: "https://zeta.com" }),
      makeLink({ id: "a", url: "https://alpha.com" }),
    ];
    expect(run(links, { sortBy: "domain", sortOrder: "asc" }).map(l => l.id))
      .toEqual(["a", "z"]);
  });

  // Validação de URL inválida — não deve quebrar
  it("não quebra com URL inválida no filtro de domínio", () => {
    const links = [makeLink({ id: "bad", url: "not a url" })];
    expect(() => run(links, { domainFilter: "example.com" })).not.toThrow();
    expect(run(links, { domainFilter: "example.com" })).toEqual([]);
  });

  // Memoização: mesma referência quando entradas não mudam
  it("memoiza: retorna a mesma referência entre renders sem mudanças", () => {
    const links = [makeLink({ id: "a" })];
    const { result, rerender } = renderHook(
      ({ l, s }) => useFilteredLinks(l, s),
      { initialProps: { l: links, s: { ...baseState } } }
    );
    const first = result.current;
    rerender({ l: links, s: { ...baseState } }); // novo objeto state, mesmos campos
    expect(result.current).toBe(first);
  });

  // Combinação de filtros
  it("combina múltiplos filtros (favorito + busca + tag)", () => {
    const links = [
      makeLink({ id: "match", title: "docs react", is_favorite: true, tagIds: ["t1"] }),
      makeLink({ id: "noFav", title: "docs react", tagIds: ["t1"] }),
      makeLink({ id: "noTag", title: "docs react", is_favorite: true }),
      makeLink({ id: "noText", title: "outro", is_favorite: true, tagIds: ["t1"] }),
    ];
    expect(
      run(links, { showOnlyFavorites: true, searchTerm: "react", selectedTagId: "t1" })
        .map(l => l.id)
    ).toEqual(["match"]);
  });
});
