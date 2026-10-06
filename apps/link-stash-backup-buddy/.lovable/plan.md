# Refatoração — modularizar sem mudar comportamento

## Diagnóstico

| Arquivo | Linhas | Problema |
|---|---:|---|
| `src/pages/Index.tsx` | **1017** | God component: fetch, filtros, pastas, DnD, bulk, modais, atalhos, render — tudo junto. Complexidade ciclomática alta. |
| `src/pages/Notes.tsx` | 226 | Fetch + autosave + UI misturados. |
| `src/pages/Reminders.tsx` | 203 | Form + list + cálculo de datas juntos. |
| `src/pages/Prompts.tsx` | 219 | Form + list + filtros juntos. |
| `src/pages/Vault.tsx` | 214 | Cripto + form + list juntos. |
| `src/components/StatsCard.tsx` (257), `LinkCard.tsx` (252), `AddLinkForm.tsx` (245) | | Componentes grandes com responsabilidades misturadas. |

Regras: **zero mudança funcional**, mesma UI, mesmas chamadas de rede, mesmos atalhos.

## Alvo 1 — quebrar `src/pages/Index.tsx`

Extrair em hooks (dados/estado) + componentes (apresentação):

```text
src/pages/Index.tsx  (agora ~180 linhas: só compõe)
├── hooks/
│   ├── useLinks.ts              // fetch, cache, CRUD, soft-delete
│   ├── useLinkFilters.ts        // busca, domínio, pasta, ordenação, memo do resultado
│   ├── useFolders.ts            // já existe parcial? consolidar CRUD + DnD helpers
│   ├── useLinksDnd.ts           // handlers @dnd-kit (sensores, onDragEnd)
│   ├── useBulkSelection.ts      // Set<id>, toggle, selectAll, clear
│   └── useKeyboardShortcuts.ts  // atalhos (/, n, esc, etc.)
└── components/links/
    ├── LinksHeader.tsx          // topbar + busca + view toggle
    ├── LinksSidebar.tsx         // árvore de pastas + contadores
    ├── LinksToolbar.tsx         // filtros ativos, chips, bulk bar
    ├── LinksGrid.tsx            // decide grid/list/compact + virtualização
    ├── LinksEmptyState.tsx      // usa EnhancedEmptyState existente
    └── LinkModals.tsx           // Add/Edit/Stats agrupados
```

## Alvo 2 — padrão CRUD reutilizável

Muita duplicação entre Notes / Prompts / Reminders (fetch → toast erro → setState → order). Extrair:

```text
src/hooks/useSupabaseTable.ts
  // genérico: <T> com { list, insert, update, remove, loading, error }
  // encapsula toast de erro e ordenação padrão
```

Aplicar em `Notes`, `Prompts`, `Reminders` → cada página cai para ~120 linhas focadas em UI/form.

Extrair também:
- `src/lib/date.ts` — `daysUntilNext`, formatação relativa (usado em Reminders + Notes).
- `src/components/PageHeader.tsx` — cabeçalho compartilhado (`ArrowLeft`, título, breadcrumb) usado por todas as sub‑páginas.
- `src/components/ConfirmDialog.tsx` — substitui `window.confirm(...)` disperso.

## Alvo 3 — componentes grandes

- `LinkCard.tsx` (252): extrair `<LinkCardActions />` e `<LinkCardMeta />`.
- `AddLinkForm.tsx` (245) e `EditLinkForm.tsx` (164): extrair `useLinkForm()` com validação, submissão e estado — os dois componentes passam a ser só JSX.
- `StatsCard.tsx` (257): separar cálculo em `src/lib/linkStats.ts` (puro, testável) do render.

## Convenções aplicadas

- Cada hook ≤ 120 linhas, uma responsabilidade.
- Cada componente ≤ 180 linhas.
- Early returns em vez de `if/else` aninhados → reduz ciclomática.
- Constantes mágicas (`600` ms autosave, `3` dias alerta) → `src/lib/constants.ts`.
- Tipos compartilhados em `src/types/` (`Link`, `Folder`, `Note`, etc.), eliminando `interface` duplicadas nas páginas.
- Nada de `any`; funções `async` retornam `Result` uniforme ou lançam.

## Garantias de "sem mudança funcional"

- Mesmas queries Supabase (mesmos `.select`, `.order`, `.eq`).
- Mesmos textos, mesmos ícones, mesmas classes Tailwind.
- Mesmas rotas em `App.tsx`.
- Verificação pós-refactor: build limpo + smoke test via Playwright nas rotas `/`, `/links`, `/notes`, `/reminders`, `/prompts`, `/vault` (login → navegar → criar item → apagar).

## Escopo e ordem de execução

Faço em 4 PRs internos (mensagens separadas), na ordem — cada um com build verde antes do próximo:

1. **Fundação** — `types/`, `lib/constants.ts`, `lib/date.ts`, `PageHeader`, `ConfirmDialog`, `useSupabaseTable`. Sem tocar páginas ainda.
2. **Páginas CRUD** — migrar `Notes`, `Prompts`, `Reminders`, `Vault` para os novos utilitários.
3. **Index.tsx parte A** — extrair hooks (`useLinks`, `useLinkFilters`, `useBulkSelection`, `useLinksDnd`, `useKeyboardShortcuts`).
4. **Index.tsx parte B** — extrair componentes (`LinksHeader`, `LinksSidebar`, `LinksToolbar`, `LinksGrid`, `LinkModals`); `Index.tsx` final vira orquestrador curto.

## Fora de escopo (para preservar comportamento)

- Trocar biblioteca de estado (fica com `useState` + `useMemo`, sem Zustand/Redux).
- Mudar estilo visual, layout, tokens do design system.
- Alterar schema Supabase, RLS ou edge functions.
- Introduzir testes unitários novos (posso propor depois se quiser).

Se aprovar, começo pelo passo 1.
