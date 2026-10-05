# Guia de Desenvolvimento

> Checklist para IA ou desenvolvedor **alterar o código** com segurança e consistência.

---

## 1. Ambiente de desenvolvimento

```bash
git clone <repo>
cd inaja-fornecimento-digital
npm install --legacy-peer-deps
npm run dev
```

**Requisitos:** Node 20+, npm 9+

**Verificar:**
- http://localhost:8080 — app carrega
- http://localhost:8080/api/health — `ok: true`
- No primeiro acesso, defina uma senha local forte para o usuário de teste

---

## 2. Antes de qualquer alteração

1. Ler **MAPA-DO-CODIGO.md** — saber onde mexer
2. Ler **DECISOES-ARQUITETURA.md** — não contradizer ADRs
3. Backup `data/inaja.sqlite` se testar migrações
4. Identificar módulo afetado (Solicitações, Tarefas, etc.)

---

## 3. Checklist — nova funcionalidade no frontend

```
[ ] Rota em App.tsx (se nova página)
[ ] Entrada no ModuleHub (se novo módulo)
[ ] RequireAuth na rota
[ ] Seguir MANUAL-VISUAL-IA.md (cores, fontes, cards)
[ ] Toast para feedback (use-toast)
[ ] Tratar loading e erro das promises `db`
[ ] Responsivo (sm/md/lg breakpoints)
[ ] Não quebrar cliente local em client.ts
```

---

## 4. Checklist — nova tabela no banco

```
[ ] CREATE TABLE em migrate() — server/db.mjs
[ ] Adicionar tabela na whitelist de runQuery()
[ ] Colunas JSON? → adicionar em JSON_COLS se necessário
[ ] Seed inicial se precisar dados default
[ ] Atualizar types.ts (opcional, referência)
[ ] Atualizar FORMATOS-E-CONTRATOS.md
[ ] Atualizar MANUAL-INFRAESTRUTURA.md
[ ] Testar via /api/query no curl ou app
```

**Exemplo whitelist:**
```javascript
const allowed = new Set([
  // ...existentes,
  "nova_tabela",
]);
```

---

## 5. Checklist — novo endpoint API

```
[ ] Handler em server/api.mjs → handleApi()
[ ] Validação de entrada
[ ] Resposta { data, error } consistente
[ ] Expor em client.ts se frontend precisar
[ ] Documentar em FORMATOS-E-CONTRATOS.md
```

---

## 6. Checklist — nova RPC (autenticação/regra)

```
[ ] Implementar em runRpc() — server/db.mjs
[ ] Chamar via `db.rpc()` no frontend
[ ] Tratar erros com código (WEAK_PASSWORD, etc.)
[ ] Atualizar REGRAS-NEGOCIO.md
[ ] Não expor via /api/query se for sensível
```

---

## 7. Padrões de código do projeto

### Imports
```typescript
import { db } from "@/integrations/db/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
```

### Chamada ao banco
```typescript
const { data, error } = await db
  .from("tarefas")
  .select("*")
  .eq("status", "todo")
  .order("ordem", { ascending: true });

if (error) {
  toast({ title: "Erro", description: error.message, variant: "destructive" });
  return;
}
```

### Estilo de componentes
- Cards: `rounded-2xl border-border/60 shadow-card`
- Títulos seção: `font-display font-bold text-primary uppercase tracking-wide text-sm`
- Barra accent: `w-1 h-6 bg-accent rounded-full`

### Nomenclatura
- Páginas: PascalCase (`CredoresFixos.tsx`)
- Hooks: `use` prefix (`useDataManager`)
- Server: `.mjs` ESM
- IDs: `crypto.randomUUID()` ou `randomUUID()` do node

---

## 8. Testes

### Existentes
- `src/pages/CredoresFixos.test.tsx` — Vitest + Testing Library
- Rodar: `npx vitest` (se configurado no projeto)

### Teste manual mínimo após mudança

| Área | Teste |
|------|-------|
| Auth | Login, logout, primeiro acesso |
| Solicitações | Criar, PDF, histórico |
| Lote | Upload .txt válido e inválido |
| Tarefas | CRUD + drag |
| Diárias | Cálculo <12h, 12-24h, >24h |
| Credores | CRUD + empenho |
| API | GET /api/health |

---

## 9. Build e release

```bash
npm run lint      # se alterou TS
npm run build     # deve passar sem erro
npm start         # testar produção local
```

**Build falhou?** Verificar imports, tipos, assets em `public/`.

---

## 10. Documentação — quando atualizar

| Mudança | Documentos |
|---------|------------|
| Nova feature visível | MANUAL-IA, CENARIOS-E-EXEMPLOS |
| Nova regra de negócio | REGRAS-NEGOCIO |
| Novo endpoint/campo | FORMATOS-E-CONTRATOS, INFRAESTRUTURA |
| Novo arquivo importante | MAPA-DO-CODIGO |
| Decisão arquitetural | DECISOES-ARQUITETURA |
| Problema recorrente | TROUBLESHOOTING |
| Mudança visual | MANUAL-VISUAL-IA |
| Operação/backup | GUIA-OPERACAO |

---

## 11. Anti-padrões (não fazer)

| ❌ Evitar | ✅ Fazer |
|----------|---------|
| Conectar Supabase cloud direto | Usar client.ts local |
| Senha em texto no banco | scrypt via RPC; o seed não cria credenciais |
| SQL concatenado com input do usuário | Prepared statements (já usado) |
| Tabela sem whitelist | Adicionar em allowed Set |
| Cores fora da paleta | Tokens CSS / Tailwind |
| `npm run dev` em produção | `npm run build && npm start` |
| Deletar `data/` no deploy | Preservar pasta |

---

## 12. Fluxo git sugerido

```bash
git checkout -b feat/nome-curto
# ... alterações ...
npm run build
git add <arquivos específicos>
git commit -m "Descrição clara do que mudou e por quê"
```

Incluir atualização de manuais no mesmo commit quando a mudança for visível ao usuário.

---

*Complementa MAPA-DO-CODIGO.md e MANUAL-INFRAESTRUTURA-IA.md.*
