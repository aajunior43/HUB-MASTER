# AGENTS.md — Guia rápido para agentes de IA

> Resumo dos comandos e convenções para agentes automáticos trabalharem neste
> repositório. Em caso de dúvida, consulte `manual do projeto/`.

## Stack
- **Frontend:** Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + shadcn/ui.
- **Backend:** `node:sqlite` (Node 22+) — schema em `server/db.mjs`.
- **Auth:** LocalStorage — RPC valida senha; API `/api/*` sem token (interno).
- **Testes:** Vitest + Testing Library (frontend) · `node:test` + `node:sqlite` (backend).

## Comandos padrão (Windows / PowerShell)

| Tarefa | Comando |
|--------|---------|
| Tudo (typecheck + lint + test + build) | `npm run check` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Testes do frontend (Vitest) | `npm test` |
| Apenas um arquivo de teste | `npx vitest run src/pages/Empenhos.test.tsx` |
| Testes do backend (node:test) | `node --test server/db.empenhos.test.mjs` |
| Dev server (http://localhost:8080) | `rodar.bat` (Windows) ou `npm run dev` |
| Build produção | `npm run build` |
| Produção standalone | `npm start` (`node server/standalone.mjs`) |

## Convenções de código
- **Tipos em PascalCase**, funções/utilitários em camelCase.
- **Sem comentários** em código (a não ser que o usuário peça explicitamente).
- **Linhas novas** seguem o estilo do arquivo (geralmente 2 espaços, aspas duplas).
- Imports absolutos via alias `@/` (configurado em `vite.config.ts` e `tsconfig.app.json`).
- Componentes React em `src/components/` (shadcn/ui em `src/components/ui/`).
- Páginas em `src/pages/` com `export default function NomeDaPagina()`.

## Estrutura relevante

```
src/
├── App.tsx                          # Rotas
├── pages/                           # Páginas (uma por rota)
│   ├── Solicitacoes.tsx             # /solicitacoes
│   ├── Empenhos.tsx                 # /empenhos (dashboard, tabela, import CSV)
│   ├── CredoresFixos.tsx            # /credores-fixos
│   ├── Extratos.tsx                 # /extratos (contas e extratos bancários)
│   ├── Backup.tsx                   # /backup (admin: copiar SQLite + uploads)
│   ├── *.test.tsx                   # Testes Vitest
├── integrations/db/client.ts        # Cliente LOCAL (SQLite via /api): db.from / db.rpc
├── contexts/AuthContext.tsx         # useAuth + RequireAuth/RequireAdmin/RequireModulo
server/
├── db.mjs                           # Schema + runQuery + runRpc (SQLite)
├── telegram/                        # Bot Telegram (long polling, mesmo processo)
├── api.mjs                          # HTTP handler /api/*
├── db.*.test.mjs                    # Testes de integração backend
.github/workflows/ci.yml             # CI: typecheck + lint + test + build
manual do projeto/                   # ADRs e guias
```

**Auth:** admin acessa todos os módulos; usuários comuns só módulos em `usuario_modulos`.
Brasão estático: `public/brasao.png` (path `/brasao.png`).

## Antes de commitar
1. Rode `npm run check` — tem que passar 100%.
2. Rode `node --test server/db.empenhos.test.mjs` se mexeu em `server/db.mjs`.
3. Não adicione comentarios explicativos ao código (a menos que solicitado).

## Pontos de atenção (não quebrar)
- **`empenhos_importar`** exige `_caller` admin ativo — não remova a verificação.
- **`empenhos_orcamentarios`** é SQLite-only (sem migration Supabase) — ADR-013.
- **Importação substituir é atômica** (staging + DROP/RENAME) — falhas em chunk
  devem preservar a tabela original.
- **Brazilian number format** (`1.234,56`): use `parseBR` no backend e
  `toLocaleString("pt-BR", ...)` no frontend; não tente float direto.

## Executar lint/typecheck antes de finalizar
Sempre execute estes antes de declarar a tarefa concluída:
```powershell
npm run typecheck
npm run lint
npm test
node --test server/db.empenhos.test.mjs
```