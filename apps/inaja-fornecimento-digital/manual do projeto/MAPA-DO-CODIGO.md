# Mapa do Código

> Onde está cada responsabilidade no repositório. Essencial para IA que vai **alterar código**.

---

## Visão por camada

```
src/          → Interface (React)
server/       → API + SQLite
data/         → Persistência em disco
vite-plugin-* → Ponte dev server ↔ API
manual do projeto/ → Documentação
```

---

## Frontend — `src/`

### Entrada e roteamento

| Arquivo | Responsabilidade |
|---------|------------------|
| `main.tsx` | Monta React no DOM |
| `App.tsx` | Rotas, providers (Query, Auth, Toast) |
| `index.css` | Design tokens CSS (Emerald Prestige) |

### Páginas (`src/pages/`)

| Arquivo | Rota | Módulo |
|---------|------|--------|
| `Login.tsx` | `/login` | Autenticação em 3 etapas |
| `ModuleHub.tsx` | `/` | Hub com GlowCards |
| `Solicitacoes.tsx` | `/solicitacoes` | Solicitações (formulário + 6 views) |
| `Tarefas.tsx` | `/tarefas` | Shell do Kanban |
| `Diarias.tsx` | `/diarias` | Calculadora + PDF |
| `CredoresFixos.tsx` | `/credores-fixos` | Credores + empenhos mensais + PDF |
| `Empenhos.tsx` | `/empenhos` | Empenhos orçamentários: dashboard, tabela filtrável, importação CSV atômica (admin) |
| `Admin.tsx` | (na __UI__) | Painel admin (não roteado) |
| `NotFound.tsx` | `*` | 404 |

### Componentes de negócio (`src/components/`)

| Arquivo | Usado em | Função |
|---------|----------|--------|
| `AppSidebar.tsx` | Solicitações | Menu lateral 6 views |
| `KanbanBoard.tsx` | Tarefas | Quadro completo |
| `HistoryView.tsx` | Solicitações | Histórico + duplicar |
| `GlobalSearch.tsx` | Solicitações | Ctrl+K |
| `DataManager.tsx` | Solicitações | CRUD dados salvos |
| `TemplateManager.tsx` | Solicitações | Modelos |
| `BatchRequestManager.tsx` | Solicitações | Upload lote .txt |
| `AttachmentUploader.tsx` | Solicitações | Upload anexos |
| `SignaturePad.tsx` | Solicitações | Assinatura desenhada |
| `ComboboxInput.tsx` | Solicitações | Autocomplete |
| `FontSizeControl.tsx` | Solicitações | Preferências fonte |

### Hooks (`src/hooks/`)

| Arquivo | Função |
|---------|--------|
| `useDataManager.ts` | solicitantes, empresas, observações |
| `useTemplates.ts` | CRUD modelos no banco |
| `useBatchRequest.ts` | Estado do lote processado |
| `use-toast.ts` | Notificações |

### Bibliotecas (`src/lib/`)

| Arquivo | Função |
|---------|--------|
| `pdfGenerator.ts` | PDF solicitação e lote (jsPDF) |
| `batchParser.ts` | Parse linha a linha do .txt |
| `batchTemplates.ts` | Modelo e instruções de lote |
| `downloadUtils.ts` | Download de texto |
| `utils.ts` | `cn()` Tailwind merge |

### Integração dados (`src/integrations/db/`)

| Arquivo | Função |
|---------|--------|
| `client.ts` | **Cliente local** — emula Supabase via `/api` |
| `types.ts` | Tipos gerados (referência schema cloud) |

### Contexto

| Arquivo | Função |
|---------|--------|
| `contexts/AuthContext.tsx` | Sessão localStorage + `RequireAuth` |

### UI base (`src/components/ui/`)

Componentes shadcn/Radix: `button`, `card`, `dialog`, `sidebar`, `spotlight-card` (GlowCard), etc.

---

## Backend — `server/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `db.mjs` | SQLite: migrate, seed, `runQuery`, `runRpc`, paths |
| `api.mjs` | HTTP handler `/api/*` |
| `standalone.mjs` | Produção: `dist/` + API |

### Funções-chave em `db.mjs`

| Função | Uso |
|--------|-----|
| `openDatabase()` | Abre/cria banco, roda migrate+seed |
| `migrate(db)` | Cria todas as tabelas + índices + trigger |
| `criarIndicesEmpenhos(db)` | Recria índices de `empenhos_orcamentarios` (após DROP+RENAME) |
| `runQuery(db, body)` | CRUD genérico com whitelist |
| `runRpc(db, fn, args)` | Auth, admin e empenhos (ver abaixo) |
| `hashPassword` / `verifyPassword` | scrypt |
| `empenhosFiltrosDisponiveis(db)` | Lista opções de filtros (UNION ALL + cache 60s) |
| `invalidarCacheEmpenhosFiltros()` | Zera cache após importação |

### RPCs em `runRpc(db, fn, args)`

| `fn` | Uso | Autorização |
|------|-----|-------------|
| `usuario_status`, `usuario_login`, `usuario_set_senha` | Auth (3 etapas) | Pública (com username) |
| `usuario_modulos_disponiveis` | Lista módulos liberados + flags admin | Pública (com username) |
| `admin_listar_usuarios`, `admin_criar_usuario`, `admin_atualizar_usuario`, `admin_reset_senha` | CRUD de usuários | Apenas admin ativo |
| `empenhos_importar` | Importação CSV atômica (staging + DROP/RENAME) | Apenas admin ativo |
| `empenhos_limpar` | Apaga todos os empenhos orçamentários | Apenas admin ativo |
| `empenhos_stats` | Dashboard de totais | Logado |
| `empenhos_listar` | Lista paginada com filtros | Logado |
| `empenhos_get` | Detalhe de um empenho | Logado |
| `empenhos_filtros_disponiveis` | Listas para dropdowns de filtro | Logado |

> Autorização admin via `_caller` (username do usuário logado) — ver `verificarAdminEmpenhos()` em `db.mjs`.

### Constantes exportadas

```javascript
DATA_DIR    // .../data
UPLOADS_DIR // .../data/uploads
DB_PATH     // .../data/inaja.sqlite
```

---

## Infra de desenvolvimento

| Arquivo | Função |
|---------|--------|
| `vite.config.ts` | Porta 8080, alias `@`, plugins |
| `vite-plugin-local-db.mjs` | Injeta middleware API no Vite |
| `tailwind.config.ts` | Cores, fontes, animações |
| `package.json` | Scripts npm |

---

## Scripts e atalhos

| Arquivo | Função |
|---------|--------|
| `rodar.bat` | Dev no Windows |
| `configurar-env.bat` | Info banco local |
| `scripts/set-aleksandro-password.mjs` | Reset senha aleksandro |
| `scripts/backup-db.mjs` | Backup de `data/inaja.sqlite` + uploads |

---

## Dados persistentes — `data/`

| Caminho | Conteúdo |
|---------|----------|
| `inaja.sqlite` | Banco principal |
| `uploads/` | Anexos binários |
| `README.md` | Nota sobre persistência |

---

## Legado (não usado em runtime)

| Caminho | Nota |
|---------|------|
| `supabase/migrations/` | SQL original Postgres — referência |
| `src/integrations/db/client.ts` | Cliente local `db` (from/rpc/storage) |

---

## Fluxo: onde alterar o quê

| Quero… | Arquivo(s) |
|--------|------------|
| Nova página/rota | `App.tsx` + `src/pages/` |
| Novo módulo no hub | `ModuleHub.tsx` |
| Nova tabela no banco | `server/db.mjs` (migrate + whitelist) |
| Novo endpoint API | `server/api.mjs` + `client.ts` |
| Nova cor/estilo global | `src/index.css`, `tailwind.config.ts` |
| Novo formato PDF | `src/lib/pdfGenerator.ts` |
| Regra de lote | `src/lib/batchParser.ts` |
| Nova RPC auth | `server/db.mjs` + `Login.tsx` |
| Seed de usuários | `server/db.mjs` → `seed()` |
| Porta do servidor | `vite.config.ts`, `standalone.mjs` |

---

## Dependências críticas por feature

| Feature | Pacotes |
|---------|---------|
| PDF solicitação | `jspdf`, `html2canvas` |
| PDF diária/credores | `jspdf` |
| Word | `docx`, `file-saver` |
| Excel | `xlsx-js-style` |
| UI | `@radix-ui/*`, `tailwindcss`, `lucide-react` |
| Roteamento | `react-router-dom` |
| Banco (server) | `node:sqlite`, `node:crypto` |

---

*Atualizar este mapa ao criar arquivos ou mover responsabilidades.*