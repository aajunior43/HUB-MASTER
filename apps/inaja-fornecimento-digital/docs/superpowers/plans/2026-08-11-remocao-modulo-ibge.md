# Remoção do módulo IBGE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o módulo independente IBGE e sua integração própria de consulta/validação, sem remover os códigos IBGE exigidos pelas integrações TCE-PR e SICONFI.

**Architecture:** O frontend deixará de importar, exibir ou rotear a tela IBGE. O backend deixará de registrar o serviço e as rotas auxiliares IBGE, enquanto a Saúde pública continuará consultando o CNES com o código municipal digitado. A limpeza de permissões persistidas será feita na migração normal do banco.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Node.js `node:test`, SQLite local e documentação Markdown.

## Global Constraints

- Remover o serviço próprio `server/services/ibge.mjs` e as rotas `/api/ibge/*`.
- Não remover campos/parâmetros `tcepr_ibge`, `siconfi_ibge` ou `codigo_ibge` usados pelas integrações TCE-PR/SICONFI.
- A Saúde pública não pode fazer chamadas para `/api/ibge`; seu filtro mantém a entrada manual do código municipal para o CNES.
- Preservar alterações pré-existentes do usuário no worktree e fazer staging apenas dos arquivos desta tarefa.

---

### Task 1: Criar testes de remoção (RED)

**Files:**
- Create: `server/api.ibge-removal.test.mjs`
- Modify: `src/pages/SaudePublica.test.tsx`

**Interfaces:**
- Produces the server contract that both legacy IBGE endpoints return HTTP 404.
- Produces the frontend contract that Saúde pública exposes a plain municipality-code field and never calls `/api/ibge`.

- [ ] **Step 1: Write the failing server test**

Create an in-memory HTTP server around `handleApi`, migrate the database, and assert both removed routes return 404 without calling an external service:

```js
it("retorna 404 para as rotas IBGE removidas", async () => {
  const municipios = await fetch(new URL("/api/ibge/municipios?codigo=4110300", origin));
  const estados = await fetch(new URL("/api/ibge/estados", origin));

  assert.equal(municipios.status, 404);
  assert.equal(estados.status, 404);
});
```

Use the same `DatabaseSync(":memory:")`, `migrate(db)` and `createServer((req, res) => handleApi(req, res, db))` setup used by the existing server API tests, with `afterEach` closing the server and database.

- [ ] **Step 2: Update the Saúde pública test for the new contract**

Change the test fetch stub to retain only `/api/saude/cnes` and `/tipos` responses. Assert the field by its new accessible label and blur it without creating an IBGE request:

```tsx
const campoMunicipio = screen.getByLabelText("Código do município");
fireEvent.blur(campoMunicipio);
await waitFor(() => expect(fetchMock.mock.calls.every(([url]) => !String(url).startsWith("/api/ibge"))).toBe(true));
```

Keep the existing CNES result and detail assertions so the test still proves that the Saúde pública module works after the shared lookup is removed.

- [ ] **Step 3: Run the tests and verify they fail for the intended reason**

Run:

```powershell
node --test server/api.ibge-removal.test.mjs
npx vitest run src/pages/SaudePublica.test.tsx
```

Expected: the server test receives the current protected-route status instead of 404, and the Saúde pública test cannot find the new label while the old implementation is still present. Do not change production code until these failures are observed.

- [ ] **Step 4: Commit the red tests**

```powershell
git add -- server/api.ibge-removal.test.mjs src/pages/SaudePublica.test.tsx
git commit -m "test: cobrir remocao da integracao ibge"
```

### Task 2: Remove the backend IBGE integration (GREEN)

**Files:**
- Modify: `server/api.mjs`
- Modify: `server/api.auxiliares.test.mjs`
- Modify: `server/db.mjs`
- Modify: `package.json`
- Delete: `server/services/ibge.mjs`
- Delete: `server/services/ibge.test.mjs`

**Interfaces:**
- Consumes the failing 404 contract from Task 1.
- Produces no `/api/ibge/municipios` or `/api/ibge/estados` route and no standalone `ibge` permission in default/granted module data.

- [ ] **Step 1: Remove route registration and service import**

In `server/api.mjs`, delete the import of `buscarMunicipiosIbge`, `configuracaoIbge`, `consultarMunicipioIbge` and `listarEstadosIbge`, then delete the two `pathname === "/api/ibge/..."` route blocks. Leave the `/api/bcb/*` routes immediately following them unchanged.

- [ ] **Step 2: Remove stale permission defaults and stored grants**

In `server/db.mjs`, remove `"ibge"` from the `todosModulos` default array and add cleanup alongside the existing legacy-module cleanup:

```sql
DELETE FROM usuario_modulos WHERE modulo_id = 'ibge';
DELETE FROM usuario_modulos_ordem WHERE modulo_id = 'ibge';
DELETE FROM usuario_modulos_favoritos WHERE modulo_id = 'ibge';
```

Do not alter the `tcepr_ibge`, `siconfi_ibge`, `codigo_ibge`, `cod_ibge` or related TCE/SICONFI schema and service fields.

- [ ] **Step 3: Keep the Banco Central auxiliary test independent**

In `server/api.auxiliares.test.mjs`, remove the `limparCacheIbge` import and call, remove the IBGE-specific forbidden/fixture/request assertions, rename the describe block to Banco Central, and retain the BCB route protection, mocked BCData response, series configuration and calculation assertions.

- [ ] **Step 4: Update the server test command and delete the service files**

In `package.json`, remove `server/services/ibge.test.mjs` from `test:server` and add `server/api.ibge-removal.test.mjs`. Delete the obsolete service and its dedicated test file.

- [ ] **Step 5: Run backend verification**

Run:

```powershell
node --test server/api.ibge-removal.test.mjs server/api.auxiliares.test.mjs
```

Expected: all tests pass, including both 404 assertions and the remaining BCB assertions.

### Task 3: Remove frontend module surfaces and shared lookup calls

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/ModuleHub.tsx`
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/SaudePublica.tsx`
- Delete: `src/pages/Ibge.tsx`
- Delete: `src/pages/Ibge.test.tsx`

**Interfaces:**
- Consumes the backend without `/api/ibge` from Task 2.
- Produces no standalone IBGE route/card/permission and a Saúde pública screen that uses only the CNES API.

- [ ] **Step 1: Remove route and lazy import**

Delete the `Ibge` lazy import and the `/ibge` route from `src/App.tsx`.

- [ ] **Step 2: Remove hub and admin entries**

Delete the `id: "ibge"` object from `todosModulos` in `src/pages/ModuleHub.tsx`, remove any now-unused `Globe2` import, and delete `{ id: "ibge", label: "IBGE — Dados municipais" }` from `MODULOS` in `src/pages/Admin.tsx`.

- [ ] **Step 3: Remove the standalone page files**

Delete `src/pages/Ibge.tsx` and `src/pages/Ibge.test.tsx`.

- [ ] **Step 4: Remove automatic IBGE validation from Saúde pública**

In `src/pages/SaudePublica.tsx`, remove `MunicipioIbge`, `apiIbge`, `carregandoIbge`, `erroIbge`, `municipioIbge`, `validarMunicipio` and their related render branches. Keep `municipio` as the manually entered CNES filter, rename its label to `Código do município`, remove the `onBlur` handler, and change the empty-filter error to mention “código do município” rather than “município IBGE”. The existing CNES `api` helper and query parameters remain unchanged.

- [ ] **Step 5: Run frontend targeted verification**

Run:

```powershell
npx vitest run src/pages/SaudePublica.test.tsx
npm run typecheck
```

Expected: the Saúde pública test passes without any `/api/ibge` request and TypeScript reports no unused imports or missing route symbols.

### Task 4: Remove obsolete IBGE documentation

**Files:**
- Modify: `README.md`
- Modify: `manual do projeto/FORMATOS-E-CONTRATOS.md`

**Interfaces:**
- Produces documentation that describes only the remaining CNES and Banco Central auxiliary services in these sections.

- [ ] **Step 1: Update README**

Remove the standalone IBGE paragraph, IBGE route bullets and IBGE-only source links. Keep the Banco Central section and its three BCB routes. In the Saúde pública description, call the input a municipality code and do not claim automatic IBGE validation or conversion by the removed integration.

- [ ] **Step 2: Update the project manual**

Remove the IBGE subsection from section 18, rename the remaining Banco Central subsection to 18.1, remove IBGE endpoints/source links, and update the Saúde/CNES paragraph so it describes the manual municipality-code input without the automatic lookup.

- [ ] **Step 3: Search the repository for removed integration references**

Run:

```powershell
rg -n -i "server/services/ibge|/api/ibge|Ibge\.tsx|id: \"ibge\"|limparCacheIbge|buscarMunicipiosIbge|consultarMunicipioIbge|listarEstadosIbge"
```

Expected: no matches outside the implementation plan/spec history. Generic `ibge` fields belonging to TCE-PR/SICONFI may remain and must be reviewed rather than deleted.

### Task 5: Full verification and handoff

**Files:**
- Modify only files already listed in Tasks 1–4.

- [ ] **Step 1: Run the full frontend test suite**

```powershell
npm test
```

- [ ] **Step 2: Run lint and production build**

```powershell
npm run lint
npm run build
```

- [ ] **Step 3: Run the complete server test command**

```powershell
npm run test:server
```

- [ ] **Step 4: Inspect the final diff and worktree**

```powershell
git diff --check
git status --short
git diff --stat
```

Confirm that only the planned module-removal files changed in the task commits and that pre-existing user modifications remain untouched.

- [ ] **Step 5: Commit the implementation**

```powershell
git add -- src/App.tsx src/pages/ModuleHub.tsx src/pages/Admin.tsx src/pages/SaudePublica.tsx src/pages/SaudePublica.test.tsx README.md "manual do projeto/FORMATOS-E-CONTRATOS.md" server/api.mjs server/api.auxiliares.test.mjs server/db.mjs package.json server/api.ibge-removal.test.mjs
git commit -m "refactor: remover modulo e integracao ibge"
```
