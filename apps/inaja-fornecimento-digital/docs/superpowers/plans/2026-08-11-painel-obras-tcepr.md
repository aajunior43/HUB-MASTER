# Painel de Obras do TCE-PR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a aba Obras municipais do TCE-PR em um painel gerencial e de fiscalização com conciliação automática e auditável entre obras, licitações, PNCP e empenhos.

**Architecture:** Manter as fontes oficiais existentes e adicionar um serviço dedicado de conciliação, com funções puras para normalização, pontuação, vigência, finanças e alertas. Persistir vínculos aceitos, métricas correntes e execuções da conciliação para que as APIs façam apenas consultas rápidas; no frontend, extrair o painel e o detalhe de obras para componentes focados, preservando `TcePr.tsx` como orquestrador da página.

**Tech Stack:** Node.js ESM, SQLite (`node:sqlite`), React 18, TypeScript, Vite, Tailwind CSS, componentes UI existentes, Lucide, Node Test Runner, Vitest e Testing Library.

## Global Constraints

- O painel permanece na aba **Obras municipais** do módulo TCE-PR; não criar novo módulo ou rota principal.
- A conciliação é totalmente automática, persistente, idempotente e auditável.
- Não criar vínculo quando a confiança for insuficiente ou houver ambiguidade.
- Similaridade textual ou valor próximo, isoladamente, nunca aceitam um vínculo.
- Falha de conciliação não apaga o último resultado válido.
- Vigência usa contrato PNCP; sem contrato, usa data de início mais prazo de execução.
- Fiscalização fica desatualizada após 60 dias; inconsistência físico-financeira exige diferença superior a 20 pontos; contrato vencendo usa janela de 30 dias.
- Valor pago é `valor_baixado_bruto - valor_baixado_anulado`, seguindo a convenção já usada pelo sistema.
- Preservar permissões atuais: leitura para usuários do módulo e sincronização manual somente para administradores.
- Preservar todas as alterações locais não relacionadas; adicionar aos commits somente os arquivos de cada tarefa.
- Toda mudança de comportamento começa com teste falhando e termina com teste focado passando.
- Não adicionar dependências: usar Node, SQLite, React e os componentes já instalados.

---

## File map

- `server/db.mjs`: cria tabelas e índices idempotentes da conciliação; dispara nova análise ao finalizar importações de empenhos.
- `server/db.tcepr-obras.test.mjs`: prova schema, chaves estrangeiras, unicidade e índices da conciliação.
- `server/services/obras-conciliacao.mjs`: concentra normalização, pontuação, seleção segura, persistência, métricas, alertas, consultas e agendamento.
- `server/services/obras-conciliacao.test.mjs`: cobre funções puras, conciliação integrada, idempotência, rollback e agendamento.
- `server/services/tcepr.mjs`: agenda conciliação após sincronização do TCE-PR.
- `server/services/pncp.mjs`: agenda conciliação após sincronização do PNCP.
- `server/services/tcepr.test.mjs`, `server/services/pncp.test.mjs` e `server/db.empenhos.test.mjs`: cobrem os três gatilhos automáticos.
- `server/api.mjs`: usa consultas do novo serviço nos endpoints de status, listagem, detalhe e pendências.
- `server/api.tcepr.test.mjs`: cobre contrato HTTP, filtros, totais, detalhes, ambiguidade e autorização.
- `src/components/tcepr/obrasTypes.ts`: contrato TypeScript compartilhado entre painel, detalhe e página.
- `src/components/tcepr/ObrasPainel.tsx`: indicadores, filtros, alertas, tabela e paginação das obras.
- `src/components/tcepr/ObrasPainel.test.tsx`: comportamento e acessibilidade do painel.
- `src/components/tcepr/DetalheObra.tsx`: cadastro, cronologia, execução físico-financeira e memória do vínculo.
- `src/components/tcepr/DetalheObra.test.tsx`: conteúdo do detalhe e estados sem dados.
- `src/pages/TcePr.tsx`: orquestra busca, filtros, carregamento, sincronização e abertura do detalhe.
- `src/pages/TcePr.test.tsx`: integração da aba com as novas respostas da API.
- `package.json`: inclui os novos testes de servidor em `test:server`.

---

### Task 1: Persistência da conciliação de obras

**Files:**
- Modify: `server/db.mjs:648-693`
- Create: `server/db.tcepr-obras.test.mjs`
- Modify: `package.json:13`

**Interfaces:**
- Produces table `tcepr_obras_conciliacoes` for run history.
- Produces table `tcepr_obras_metricas` with one current row per work.
- Produces table `tcepr_obras_vinculos` with active and historical entity links.
- Entity types: `licitacao_tce`, `pncp`, `empenho`.
- Link states: `confiavel`, `inativo`.
- Metric link states: `confiavel`, `sem_correspondencia_segura`.

- [ ] **Step 1: Write the failing migration test.**

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./db.mjs";

describe("schema do painel de obras", () => {
  it("cria métricas, execuções e histórico de vínculos idempotentes", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    migrate(db);
    migrate(db);
    const names = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map((row) => row.name);
    assert.ok(names.includes("tcepr_obras_conciliacoes"));
    assert.ok(names.includes("tcepr_obras_metricas"));
    assert.ok(names.includes("tcepr_obras_vinculos"));
    const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'index'`).all().map((row) => row.name);
    assert.ok(indexes.includes("ux_tcepr_obra_vinculo_ativo"));
    assert.ok(indexes.includes("idx_tcepr_obra_metricas_alertas"));
    db.close();
  });
});
```

- [ ] **Step 2: Run `node --test server/db.tcepr-obras.test.mjs`.**

Expected: FAIL because the three tables do not exist.

- [ ] **Step 3: Add the schema inside `_migrate(db)`.**

```sql
CREATE TABLE IF NOT EXISTS tcepr_obras_conciliacoes (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('executando', 'concluido', 'parcial', 'erro')),
  versao_algoritmo TEXT NOT NULL,
  totais_json TEXT NOT NULL DEFAULT '{}',
  erros_json TEXT NOT NULL DEFAULT '[]',
  iniciado_em TEXT NOT NULL DEFAULT (datetime('now')),
  finalizado_em TEXT
);

CREATE TABLE IF NOT EXISTS tcepr_obras_metricas (
  obra_id TEXT PRIMARY KEY REFERENCES tcepr_obras(id) ON DELETE CASCADE,
  conciliacao_id TEXT REFERENCES tcepr_obras_conciliacoes(id) ON DELETE SET NULL,
  status_vinculo TEXT NOT NULL CHECK(status_vinculo IN ('confiavel', 'sem_correspondencia_segura')),
  pontuacao REAL,
  vigencia_inicio TEXT,
  vigencia_fim TEXT,
  vigencia_origem TEXT CHECK(vigencia_origem IN ('contrato', 'estimada') OR vigencia_origem IS NULL),
  valor_contratado REAL NOT NULL DEFAULT 0,
  valor_empenhado REAL NOT NULL DEFAULT 0,
  valor_liquidado REAL NOT NULL DEFAULT 0,
  valor_pago REAL NOT NULL DEFAULT 0,
  saldo_contratual REAL,
  percentual_financeiro REAL,
  alertas_json TEXT NOT NULL DEFAULT '[]',
  evidencias_json TEXT NOT NULL DEFAULT '{}',
  analisado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tcepr_obras_vinculos (
  id TEXT PRIMARY KEY,
  obra_id TEXT NOT NULL REFERENCES tcepr_obras(id) ON DELETE CASCADE,
  conciliacao_id TEXT REFERENCES tcepr_obras_conciliacoes(id) ON DELETE SET NULL,
  entidade_tipo TEXT NOT NULL CHECK(entidade_tipo IN ('licitacao_tce', 'pncp', 'empenho')),
  entidade_id TEXT NOT NULL,
  pontuacao REAL NOT NULL,
  evidencias_json TEXT NOT NULL DEFAULT '{}',
  versao_algoritmo TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0, 1)),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  desativado_em TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tcepr_obra_vinculo_ativo
  ON tcepr_obras_vinculos(obra_id, entidade_tipo, entidade_id) WHERE ativo = 1;
CREATE INDEX IF NOT EXISTS idx_tcepr_obra_vinculos_obra
  ON tcepr_obras_vinculos(obra_id, ativo, entidade_tipo);
CREATE INDEX IF NOT EXISTS idx_tcepr_obra_metricas_alertas
  ON tcepr_obras_metricas(status_vinculo, vigencia_fim, analisado_em);
```

- [ ] **Step 4: Add a foreign-key test that deletes one work and verifies metrics/links cascade, while reconciliation history remains.**

- [ ] **Step 5: Run `node --test server/db.tcepr-obras.test.mjs`.**

Expected: PASS with both schema tests.

- [ ] **Step 6: Add `server/db.tcepr-obras.test.mjs` to the `test:server` command in `package.json`.**

- [ ] **Step 7: Commit only the schema task.**

```powershell
git add -- server/db.mjs server/db.tcepr-obras.test.mjs package.json
git commit -m "feat: persistir conciliacao de obras"
```

---

### Task 2: Motor puro de pontuação, vigência, finanças e alertas

**Files:**
- Create: `server/services/obras-conciliacao.mjs`
- Create: `server/services/obras-conciliacao.test.mjs`
- Modify: `package.json:13`

**Interfaces:**
- `ALGORITHM_VERSION = "1"`.
- `MATCH_CONFIG = { minimumScore: 75, minimumMargin: 10, staleInspectionDays: 60, physicalFinancialGap: 20, expiringDays: 30 }`.
- `normalizarIdentificador(value): string`.
- `normalizarTexto(value): string`.
- `similaridadeTokens(left, right): number` returns `0..1`.
- `pontuarObraLicitacao(obra, licitacao): MatchCandidate`.
- `pontuarLicitacaoPncp(licitacao, registro): MatchCandidate`.
- `selecionarCandidato(candidates, options?): MatchDecision`.
- `calcularFinanceiro({ contrato, empenhos, valorObra }): FinancialMetrics`.
- `calcularVigencia({ contrato, dataInicio, prazoExecucao }): WorkValidity`.
- `calcularAlertas(input): WorkAlert[]`.

```js
// Shapes exported through JSDoc so Node tests and API consumers share names.
// MatchCandidate: { id, score, evidence: Record<string, unknown>, minimumEvidence: boolean }
// MatchDecision: { status: 'confiavel' | 'sem_correspondencia_segura', candidate: MatchCandidate | null, reason: string }
// WorkAlert: 'atrasada' | 'fiscalizacao_desatualizada' | 'inconsistencia_fisico_financeira' |
//            'paralisada' | 'sem_cobertura_financeira' | 'contrato_vencendo'
```

- [ ] **Step 1: Write failing tests for normalization and token similarity.**

```js
assert.equal(normalizarIdentificador("Proc. 012/2026"), "122026");
assert.equal(normalizarTexto("Pavimentação asfáltica – Av. Brasil"), "pavimentacao asfaltica av brasil");
assert.ok(similaridadeTokens("pavimentacao de vias urbanas", "obra de pavimentacao urbana") >= 0.5);
```

- [ ] **Step 2: Write failing tests for safe candidate selection.**

```js
assert.equal(selecionarCandidato([
  { id: "a", score: 88, evidence: {}, minimumEvidence: true },
  { id: "b", score: 70, evidence: {}, minimumEvidence: true },
]).candidate.id, "a");
assert.equal(selecionarCandidato([
  { id: "a", score: 88, evidence: {}, minimumEvidence: true },
  { id: "b", score: 82, evidence: {}, minimumEvidence: true },
]).status, "sem_correspondencia_segura");
assert.equal(selecionarCandidato([
  { id: "a", score: 95, evidence: { valueOnly: true }, minimumEvidence: false },
]).status, "sem_correspondencia_segura");
```

- [ ] **Step 3: Write failing tests for financial values, validity, and all six alerts with an injected civil date `2026-08-11`.**

```js
const finance = calcularFinanceiro({
  contrato: { valor: 100_000 },
  empenhos: [{
    valor_empenhado_bruto: 90_000, valor_empenhado_anulado: 5_000,
    valor_liquidado_bruto: 70_000, valor_liquidado_anulado: 2_000,
    valor_baixado_bruto: 60_000, valor_baixado_anulado: 1_000,
  }],
  valorObra: 110_000,
});
assert.deepEqual(finance, {
  valorContratado: 100_000,
  valorEmpenhado: 85_000,
  valorLiquidado: 68_000,
  valorPago: 59_000,
  saldoContratual: 41_000,
  percentualFinanceiro: 59,
  basePercentual: "contrato",
});
assert.deepEqual(calcularVigencia({ contrato: null, dataInicio: "2026-01-01", prazoExecucao: 120 }), {
  inicio: "2026-01-01", fim: "2026-05-01", origem: "estimada",
});
```

- [ ] **Step 4: Run `node --test server/services/obras-conciliacao.test.mjs`.**

Expected: FAIL because the service does not exist.

- [ ] **Step 5: Implement normalization without new dependencies.**

```js
export const ALGORITHM_VERSION = "1";
export const MATCH_CONFIG = Object.freeze({
  minimumScore: 75,
  minimumMargin: 10,
  staleInspectionDays: 60,
  physicalFinancialGap: 20,
  expiringDays: 30,
});

export function normalizarIdentificador(value) {
  return String(value || "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function normalizarTexto(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
```

- [ ] **Step 6: Implement scoring with explicit evidence.**

Use these weights and caps:

```js
const SCORE = Object.freeze({
  exactIdentifier: 60,
  exactYear: 15,
  adjacentYear: 8,
  objectMax: 40,
  valueWithin5: 25,
  valueWithin15: 15,
  valueWithin30: 8,
  exactSupplier: 15,
});
```

For obra → licitação, `minimumEvidence` is true only with object similarity at least `0.70` plus exact year and value difference at most `15%`. For licitação → PNCP, an exact normalized process/number satisfies the strong identifier rule; otherwise require object similarity at least `0.70`, exact year and value difference at most `15%`. Prefilter candidates to the same normalized CNPJ; never score another municipality/authority.

- [ ] **Step 7: Implement `selecionarCandidato` by sorting descending, enforcing score, minimum evidence and a 10-point lead over second place.**

- [ ] **Step 8: Implement civil-date helpers without UTC conversion, financial net values, safe division, validity precedence, and the six approved alert rules.**

- [ ] **Step 9: Run `node --test server/services/obras-conciliacao.test.mjs`.**

Expected: PASS for normalization, scores, ambiguity, financial calculations, validity and alerts.

- [ ] **Step 10: Add the test file to `test:server`, then commit.**

```powershell
git add -- server/services/obras-conciliacao.mjs server/services/obras-conciliacao.test.mjs package.json
git commit -m "feat: criar motor de conciliacao de obras"
```

---

### Task 3: Conciliação persistente, histórica e idempotente

**Files:**
- Modify: `server/services/obras-conciliacao.mjs`
- Modify: `server/services/obras-conciliacao.test.mjs`

**Interfaces:**
- `conciliarObras(db, { hoje = civilToday(), failAfterWorkId } = {}): ReconciliationResult`.
- `agendarConciliacaoObras(db): boolean`.
- `ReconciliationResult = { id, status, analisadas, vinculadas, semCorrespondencia, erros }`.
- Active links are read with `WHERE obra_id = ? AND ativo = 1`.

- [ ] **Step 1: Add a fixture helper that inserts two works, two TCE procurements, PNCP records and multiple accounting commitments.**

The secure fixture must produce one chain:

```text
obra-segura -> lic-segura (object/year/value)
lic-segura -> pncp-contrato (process 12/2026)
pncp-contrato -> empenho-1 + empenho-2 (contract/process identifiers)
```

The ambiguous fixture must contain two equally scored procurement candidates and produce no links.

- [ ] **Step 2: Write the failing integration test.**

```js
const result = conciliarObras(db, { hoje: "2026-08-11" });
assert.equal(result.analisadas, 2);
assert.equal(result.vinculadas, 1);
assert.equal(result.semCorrespondencia, 1);
assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tcepr_obras_metricas").get().total, 2);
assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tcepr_obras_vinculos WHERE ativo = 1").get().total, 4);
```

- [ ] **Step 3: Run the focused test and confirm it fails because `conciliarObras` is not exported.**

- [ ] **Step 4: Implement candidate loading and accepted-chain expansion.**

Load each source once per run, group candidates by normalized CNPJ/year/process, and avoid one SQL query per candidate. Link multiple empenhos only when each has an exact normalized process, contract or licitation identifier inherited from an accepted TCE/PNCP chain. Do not accept a direct approximate work → commitment match.

- [ ] **Step 5: Implement atomic persistence.**

```js
db.exec("BEGIN IMMEDIATE");
try {
  // Insert run as executando.
  // For each work, compare desired links with current active links.
  // Deactivate removed links with ativo=0 and desativado_em=datetime('now').
  // Keep unchanged links active and update score/evidence/version.
  // Insert new links and UPSERT current metrics.
  // Mark run concluido/parcial and commit.
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  // Record a separate failed run after rollback; current links/metrics remain untouched.
  throw error;
}
```

- [ ] **Step 6: Add and pass an idempotency test.**

Run twice with unchanged fixtures and assert the same active link count, no duplicate rows, and unchanged `criado_em` for retained links.

- [ ] **Step 7: Add and pass a history test.**

Change the secure fixture so it no longer meets the threshold, run again, then assert old links are inactive with `desativado_em`, current metrics say `sem_correspondencia_segura`, and the previous run remains in `tcepr_obras_conciliacoes`.

- [ ] **Step 8: Add and pass a rollback test.**

Call `conciliarObras(db, { hoje: "2026-08-11", failAfterWorkId: obraId })` only as a test seam; assert the prior active links and metrics remain unchanged and a failed run is recorded.

- [ ] **Step 9: Implement and test `agendarConciliacaoObras`.**

Use a `WeakSet` to coalesce simultaneous schedules and `setImmediate` to execute. Return `true` only when a new run is scheduled; return `false` while the same database is pending. Catch the background failure because `conciliarObras` already records it.

- [ ] **Step 10: Run `node --test server/services/obras-conciliacao.test.mjs`.**

Expected: PASS for secure, ambiguous, idempotent, historical, rollback and scheduled flows.

- [ ] **Step 11: Commit.**

```powershell
git add -- server/services/obras-conciliacao.mjs server/services/obras-conciliacao.test.mjs
git commit -m "feat: conciliar obras de forma auditavel"
```

---

### Task 4: Gatilhos automáticos das três fontes

**Files:**
- Modify: `server/services/tcepr.mjs:315-430`
- Modify: `server/services/tcepr.test.mjs`
- Modify: `server/services/pncp.mjs:193-261`
- Create: `server/services/pncp.test.mjs` if it does not exist at execution time
- Modify: `server/db.mjs:2053-2164`
- Modify: `server/db.empenhos.test.mjs:144-237`
- Modify: `package.json:13` if `server/services/pncp.test.mjs` is created

**Interfaces:**
- Both source services import `agendarConciliacaoObras` and call it after their synchronization row is finalized.
- `empenhos_importar` calls it after `_finalizar === true` or after an `append` batch commits.
- `empenhos_limpar` calls it after deletion.

- [ ] **Step 1: Add failing trigger assertions to TCE-PR and PNCP service tests.**

Inject `opcoes.onDadosAtualizados` into both synchronization functions for deterministic tests:

```js
let chamadas = 0;
await sincronizarTcePr(db, { fetchImpl, onDadosAtualizados: () => { chamadas += 1; } });
assert.equal(chamadas, 1);
```

The production default for `onDadosAtualizados` is `() => agendarConciliacaoObras(db)`.

- [ ] **Step 2: Run both service test files and confirm the callback assertion fails.**

- [ ] **Step 3: Call the callback only after the synchronization status and totals have been finalized.**

Do not run it when validation fails before a synchronization starts. A partial synchronization with at least one valid source still schedules reconciliation. A total source failure records the sync error, does not schedule a new run and preserves existing metrics.

- [ ] **Step 4: Add failing import trigger tests to `server/db.empenhos.test.mjs`.**

Because `runRpc` has no dependency-injection argument, assert observable scheduling through a row in `tcepr_obras_conciliacoes`, polling with short `setImmediate` turns. Cover final replace, append, and clear; assert an intermediate `_continuar` chunk does not schedule.

- [ ] **Step 5: Wire `agendarConciliacaoObras(db)` after successful commitment/import and after clearing.**

```js
if (finalizar || modo === "append") {
  invalidarCacheEmpenhosFiltros();
  agendarConciliacaoObras(db);
}
```

- [ ] **Step 6: Run focused trigger tests.**

```powershell
node --test server/services/tcepr.test.mjs server/services/pncp.test.mjs server/db.empenhos.test.mjs
```

Expected: PASS; no trigger runs before the source transaction is complete.

- [ ] **Step 7: Commit.**

```powershell
git add -- server/services/tcepr.mjs server/services/tcepr.test.mjs server/services/pncp.mjs server/services/pncp.test.mjs server/db.mjs server/db.empenhos.test.mjs package.json
git commit -m "feat: atualizar conciliacao apos sincronizacoes"
```

---

### Task 5: Consultas e contrato HTTP do painel

**Files:**
- Modify: `server/services/obras-conciliacao.mjs`
- Modify: `server/services/obras-conciliacao.test.mjs`
- Modify: `server/api.mjs:906-1047`
- Modify: `server/api.tcepr.test.mjs`

**Interfaces:**
- `resumirPainelObras(db): WorkDashboardSummary`.
- `listarPainelObras(db, filters): { rows, total, pagina, porPagina }`.
- `detalharPainelObra(db, id): WorkDashboardDetail | null`.
- `filters = { busca, ano, situacao, vigencia, faixaFisica, alerta, vinculo, pagina, porPagina }`.
- `vigencia`: `todas | vigente | vencendo | vencida | indisponivel`.
- `faixaFisica`: `todas | sem_percentual | 0_25 | 26_50 | 51_75 | 76_99 | 100`.
- `vinculo`: `todos | confiavel | sem_correspondencia_segura`.
- `alerta`: `todos` or one exported `WorkAlert` value.
- `/api/tce-pr/status` adds `ultimaConciliacao: { status, iniciado_em, finalizado_em, erros_json } | null` and `resumoPainelObras` while preserving the existing `resumo` object.

`WorkDashboardSummary`:

```js
{
  total: 0,
  valorTotal: 0,
  emAndamento: 0,
  atrasadas: 0,
  paralisadas: 0,
  semVinculo: 0,
}
```

Each row adds to the current work fields:

```js
{
  vigencia_inicio: null,
  vigencia_fim: null,
  vigencia_origem: null,
  valor_contratado: 0,
  valor_empenhado: 0,
  valor_liquidado: 0,
  valor_pago: 0,
  saldo_contratual: null,
  percentual_financeiro: null,
  vinculo_status: "sem_correspondencia_segura",
  vinculo_pontuacao: null,
  alertas: [],
}
```

- [ ] **Step 1: Write failing service-query tests for summary, priority ordering and combined filters.**

Insert metrics that represent a paralyzed work, an overdue work and a healthy work. Assert order `paralisada`, `atrasada`, healthy; then combine `ano=2026`, `alerta=atrasada`, and `vinculo=confiavel`.

- [ ] **Step 2: Implement parameterized SQL in the service.**

Use `json_each(COALESCE(m.alertas_json, '[]'))` for alert filtering. Build `WHERE` fragments from fixed enum branches only; bind every user value. Parse `alertas_json` and `evidencias_json` before returning.

- [ ] **Step 3: Write failing API tests for the expanded status, list, detail and pending response.**

```js
const status = await get("/api/tce-pr/status", cookie);
assert.deepEqual(status.body.data.resumoPainelObras, {
  total: 2, valorTotal: 150000, emAndamento: 1,
  atrasadas: 1, paralisadas: 1, semVinculo: 1,
});

const obras = await get("/api/tce-pr/obras?alerta=atrasada&vinculo=confiavel", cookie);
assert.equal(obras.body.data.rows[0].vigencia_origem, "contrato");
assert.ok(Array.isArray(obras.body.data.rows[0].alertas));
```

- [ ] **Step 4: Replace inline obra summary/list/detail SQL in `server/api.mjs` with service calls.**

Keep existing response fields and add new fields, so current consumers do not break. Validate page as positive integer; cap search at 120 characters; ignore unsupported enum values by treating them as `todos`.

- [ ] **Step 5: Expand work detail.**

Return:

```js
{
  ...obra,
  metricas,
  alertas,
  acompanhamentos,
  vinculos: [{ entidade_tipo, entidade_id, pontuacao, evidencias, versao_algoritmo, atualizado_em, registro }],
  empenhos: [{ id, numero_empenho, ano_empenho, contrato, num_processo, licitacao, nome_credor,
    valor_empenhado, valor_liquidado, valor_pago, saldo_pagar }],
}
```

- [ ] **Step 6: Extend `/api/tce-pr/pendencias` with `obrasSemVinculo`, without removing current arrays.**

- [ ] **Step 7: Run focused backend tests.**

```powershell
node --test server/services/obras-conciliacao.test.mjs server/api.tcepr.test.mjs
```

Expected: PASS for authorization, old response compatibility, new totals, filters, ordering, detail and pending links.

- [ ] **Step 8: Commit.**

```powershell
git add -- server/services/obras-conciliacao.mjs server/services/obras-conciliacao.test.mjs server/api.mjs server/api.tcepr.test.mjs
git commit -m "feat: expor painel integrado de obras"
```

---

### Task 6: Componentes de indicadores, filtros e tabela

**Files:**
- Create: `src/components/tcepr/obrasTypes.ts`
- Create: `src/components/tcepr/ObrasPainel.tsx`
- Create: `src/components/tcepr/ObrasPainel.test.tsx`

**Interfaces:**

```ts
export type ObraAlerta =
  | "atrasada" | "fiscalizacao_desatualizada" | "inconsistencia_fisico_financeira"
  | "paralisada" | "sem_cobertura_financeira" | "contrato_vencendo";

export type ObraFiltros = {
  busca: string;
  ano: string;
  situacao: string;
  vigencia: "todas" | "vigente" | "vencendo" | "vencida" | "indisponivel";
  faixaFisica: "todas" | "sem_percentual" | "0_25" | "26_50" | "51_75" | "76_99" | "100";
  alerta: "todos" | ObraAlerta;
  vinculo: "todos" | "confiavel" | "sem_correspondencia_segura";
};

export type ObraPainelResumo = {
  total: number; valorTotal: number; emAndamento: number;
  atrasadas: number; paralisadas: number; semVinculo: number;
};

export type ObraPainelProps = {
  resumo: ObraPainelResumo;
  obras: ObraPainelItem[];
  filtros: ObraFiltros;
  anos: number[];
  carregando: boolean;
  pagina: number;
  totalPaginas: number;
  total: number;
  onFiltrosChange: (next: ObraFiltros) => void;
  onPaginaChange: (page: number) => void;
  onAbrir: (id: string) => void;
};
```

- [ ] **Step 1: Write failing component tests.**

Cover:

```tsx
expect(screen.getByText("Obras atrasadas")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /Obras atrasadas/i }));
expect(onFiltrosChange).toHaveBeenCalledWith(expect.objectContaining({ alerta: "atrasada" }));
await user.selectOptions(screen.getByLabelText("Situação da obra"), "Paralisada");
expect(onFiltrosChange).toHaveBeenCalledWith(expect.objectContaining({ situacao: "Paralisada" }));
expect(screen.getByText("59% financeiro")).toBeInTheDocument();
expect(screen.getByText("Sem correspondência segura")).toBeInTheDocument();
```

Also assert loading, empty state, vigência estimated label, six alert labels, row activation by click/keyboard, and pagination callback.

- [ ] **Step 2: Run `npx vitest run src/components/tcepr/ObrasPainel.test.tsx`.**

Expected: FAIL because the component and types do not exist.

- [ ] **Step 3: Define all shared response types in `obrasTypes.ts`.**

Include `ObraPainelItem`, `ObraPainelResumo`, `ObraFiltros`, `ObraAlerta`, `ObraVinculo`, `ObraEmpenho` and `DetalheObraItem`. Keep snake_case for API fields and camelCase only for local props/filter state.

- [ ] **Step 4: Implement `ObrasPainel` using existing UI components.**

Structure:

```tsx
<section aria-label="Painel de obras municipais">
  <div className="grid gap-3 grid-cols-2 xl:grid-cols-6">{/* six filter cards */}</div>
  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">{/* search + five selects */}</div>
  <Card>{/* responsive table and DataPagination */}</Card>
</section>
```

Use `Button variant="ghost"` inside summary cards so cards are keyboard accessible. Use `Progress` for physical and financial percentages, badges for alerts/status, `aria-label` on icon-only content, and `tabIndex={0}` plus Enter/Space handling on rows.

- [ ] **Step 5: Map alert codes to fixed Portuguese labels and variants.**

```ts
export const ALERTA_LABEL: Record<ObraAlerta, string> = {
  atrasada: "Atrasada",
  fiscalizacao_desatualizada: "Fiscalização desatualizada",
  inconsistencia_fisico_financeira: "Diferença físico-financeira",
  paralisada: "Paralisada",
  sem_cobertura_financeira: "Sem cobertura financeira",
  contrato_vencendo: "Contrato vencendo",
};
```

- [ ] **Step 6: Run the component test.**

Expected: PASS with no accessibility query failures.

- [ ] **Step 7: Commit.**

```powershell
git add -- src/components/tcepr/obrasTypes.ts src/components/tcepr/ObrasPainel.tsx src/components/tcepr/ObrasPainel.test.tsx
git commit -m "feat: criar painel visual de obras"
```

---

### Task 7: Detalhe físico-financeiro e memória da conciliação

**Files:**
- Create: `src/components/tcepr/DetalheObra.tsx`
- Create: `src/components/tcepr/DetalheObra.test.tsx`
- Modify: `src/components/tcepr/obrasTypes.ts`

**Interfaces:**
- `DetalheObra({ item }: { item: DetalheObraItem }): JSX.Element`.
- `DetalheObraItem` includes `acompanhamentos`, `metricas`, `alertas`, `vinculos`, and `empenhos` in addition to work fields.

- [ ] **Step 1: Write failing detail tests.**

```tsx
render(<DetalheObra item={fixtureConfiavel} />);
expect(screen.getByText("Execução físico-financeira")).toBeInTheDocument();
expect(screen.getByText("R$ 100.000,00")).toBeInTheDocument();
expect(screen.getByText("59% financeiro")).toBeInTheDocument();
expect(screen.getByText("Processo coincidente")).toBeInTheDocument();
expect(screen.getByText("Cronologia das fiscalizações")).toBeInTheDocument();
```

Add one fixture without contract, commitment, inspection or percentage and assert `Não disponível`, `Vigência estimada` where possible, and no `NaN`/`Infinity` text.

- [ ] **Step 2: Run `npx vitest run src/components/tcepr/DetalheObra.test.tsx`.**

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Extract the current detail markup from `TcePr.tsx` and expand it into four sections.**

```tsx
<div className="space-y-6">
  <section aria-labelledby="obra-cadastro">{/* identification, object, regime, value, validity */}</section>
  <section aria-labelledby="obra-financeiro">{/* physical/financial progress and totals */}</section>
  <section aria-labelledby="obra-vinculos">{/* links, confidence, evidence, PNCP URL */}</section>
  <section aria-labelledby="obra-fiscalizacoes">{/* newest-first timeline */}</section>
</div>
```

- [ ] **Step 4: Render financial totals from API values only.**

Do not recalculate totals in React. Clamp only the visual progress bar to `0..100`; display the numeric API percentage as received so over-execution remains visible.

- [ ] **Step 5: Render audit evidence safely.**

Map known evidence keys (`exactProcess`, `exactNumber`, `objectSimilarity`, `valueDifference`, `exactYear`, `exactSupplier`) to Portuguese labels. Ignore unknown keys in the compact view and expose raw evidence only through a `<details>` element using `JSON.stringify(evidencias, null, 2)`.

- [ ] **Step 6: Run the focused test and confirm PASS.**

- [ ] **Step 7: Commit.**

```powershell
git add -- src/components/tcepr/DetalheObra.tsx src/components/tcepr/DetalheObra.test.tsx src/components/tcepr/obrasTypes.ts
git commit -m "feat: detalhar execucao das obras"
```

---

### Task 8: Integrar o painel à aba existente

**Files:**
- Modify: `src/pages/TcePr.tsx:1-290`
- Modify: `src/pages/TcePr.test.tsx`

**Interfaces:**
- `TcePr` owns `obraFiltros` and serializes them to `/api/tce-pr/obras`.
- `Status` adds `resumoPainelObras: ObraPainelResumo`.
- The existing tabs, licitation list, conference tab, synchronization button and permissions remain unchanged.

- [ ] **Step 1: Expand the page fetch fixture and write failing integration tests.**

Test this flow:

```tsx
await user.click(screen.getByRole("button", { name: "Obras municipais" }));
expect(await screen.findByText("Obras atrasadas")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /Obras atrasadas/i }));
await waitFor(() => expect(fetch).toHaveBeenCalledWith(
  expect.stringContaining("alerta=atrasada"), expect.any(Object),
));
await user.click(screen.getByText("Pavimentação da Avenida Brasil"));
expect(await screen.findByText("Execução físico-financeira")).toBeInTheDocument();
```

Also assert that the initial licitation empty state still renders and the admin synchronization button still calls `/sincronizar`.

- [ ] **Step 2: Run `npx vitest run src/pages/TcePr.test.tsx`.**

Expected: FAIL because the existing page does not render `ObrasPainel`.

- [ ] **Step 3: Import `ObrasPainel`, `DetalheObra` and shared types; remove the local duplicate work/detail types and old local `DetalheObra` function.**

- [ ] **Step 4: Split filters by tab.**

Keep existing `busca`/`ano` behavior for licitations. Add:

```ts
const FILTROS_OBRA_INICIAIS: ObraFiltros = {
  busca: "", ano: "todos", situacao: "todas", vigencia: "todas",
  faixaFisica: "todas", alerta: "todos", vinculo: "todos",
};
const [obraFiltros, setObraFiltros] = useState(FILTROS_OBRA_INICIAIS);
```

Reset page to 1 when any work filter changes. Serialize only non-default values into `URLSearchParams`.

- [ ] **Step 5: Render the work dashboard only for `tab === "obras"`.**

Pass the summary from status, work rows, available years, loading state, total/pagination, filter setter, page setter, and `abrirDetalhe("obra", id)`.

- [ ] **Step 6: Keep top-level cards compatible.**

The four current global TCE cards remain above tabs. The six work-specific cards render inside the work tab, avoiding changes to the licitation and conference experiences.

- [ ] **Step 7: Show data freshness.**

Next to the last TCE synchronization, show the last reconciliation status/time returned by `/status`. When it is `erro` or older than the latest source update, render `Dados financeiros aguardando atualização` without hiding current values.

- [ ] **Step 8: Run focused frontend tests.**

```powershell
npx vitest run src/components/tcepr/ObrasPainel.test.tsx src/components/tcepr/DetalheObra.test.tsx src/pages/TcePr.test.tsx
```

Expected: PASS for the dashboard, detail and previous TCE behavior.

- [ ] **Step 9: Commit.**

```powershell
git add -- src/pages/TcePr.tsx src/pages/TcePr.test.tsx
git commit -m "feat: integrar painel de obras ao tce-pr"
```

---

### Task 9: Verificação completa e acabamento

**Files:**
- Modify only files from Tasks 1–8 when a verification failure proves a scoped correction is needed.

**Interfaces:**
- No new interfaces; this task verifies the complete feature against the approved specification.

- [ ] **Step 1: Run all focused server tests.**

```powershell
node --test server/db.tcepr-obras.test.mjs server/services/obras-conciliacao.test.mjs server/services/tcepr.test.mjs server/services/pncp.test.mjs server/api.tcepr.test.mjs server/db.empenhos.test.mjs
```

Expected: all tests pass with zero failed/cancelled/skipped tests unless a pre-existing test is explicitly marked skipped before this feature.

- [ ] **Step 2: Run all focused frontend tests.**

```powershell
npx vitest run src/components/tcepr/ObrasPainel.test.tsx src/components/tcepr/DetalheObra.test.tsx src/pages/TcePr.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Run static checks.**

```powershell
npm run typecheck
npm run lint
```

Expected: both commands exit 0. Fix only issues introduced by the panel work.

- [ ] **Step 4: Run complete suites and build.**

```powershell
npm run test:server
npm test
npm run build
```

Expected: all suites and production build exit 0. If an unrelated pre-existing failure remains, record the exact command and failure without modifying unrelated code.

- [ ] **Step 5: Perform local visual verification at desktop and mobile widths.**

Start with `npm run dev:integrado`, open the TCE-PR route, and verify:

- six work indicators and quick filters;
- combined filters and reset to first page;
- priority order;
- physical/financial progress and long-object wrapping;
- badges for all alerts and missing data;
- keyboard opening of rows;
- detail sections and chronology;
- loading, empty, ambiguous, stale-data and API-error states;
- no horizontal page overflow at 375 px; table may use its own horizontal scroll container.

- [ ] **Step 6: Inspect the final diff for scope and secrets.**

```powershell
git diff --check
git status --short
git diff --stat
```

Confirm no database files, uploads, environment files or unrelated user changes are staged.

- [ ] **Step 7: Commit only scoped verification fixes if any were necessary.**

```powershell
git add -- server/db.mjs server/db.tcepr-obras.test.mjs server/services/obras-conciliacao.mjs server/services/obras-conciliacao.test.mjs server/services/tcepr.mjs server/services/tcepr.test.mjs server/services/pncp.mjs server/services/pncp.test.mjs server/db.empenhos.test.mjs server/api.mjs server/api.tcepr.test.mjs src/components/tcepr src/pages/TcePr.tsx src/pages/TcePr.test.tsx package.json
git commit -m "chore: verificar painel de obras"
```

## Self-review

- Spec coverage: Tasks 1–5 implement automatic, persistent and auditable reconciliation, safe abstention, source triggers, financial calculations, validity, six alerts, API filters, detail and stale-data behavior. Tasks 6–8 implement the approved indicators, filters, table, priority order, audit memory and inspection chronology. Task 9 verifies permissions, regressions, accessibility, responsive layout and the complete build.
- Placeholder scan: the plan contains no deferred implementation markers or unspecified error-handling steps; each behavior has named inputs, outputs, tests and commands.
- Type consistency: backend and frontend use the same snake_case API properties; local filter props are camelCase. Alert codes, validity values and link states are defined once and reused by subsequent tasks.
- Scope: no new module, manual linking, forced low-confidence link, external notification, AI prediction or new dependency is introduced.
- Worktree safety: every commit command names only scoped files, avoiding the existing unrelated modified and untracked files.
