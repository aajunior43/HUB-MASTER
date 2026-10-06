# Decisões de Arquitetura (ADR)

> Por que o sistema foi construído assim. Ajuda IA a **não propor mudanças** que contradizem decisões intencionais.

---

## ADR-001 — Banco SQLite local em vez de Supabase cloud

**Status:** Ativo  
**Contexto:** Projeto iniciado com Supabase; necessidade de rodar offline na prefeitura.  
**Decisão:** SQLite em `data/inaja.sqlite` com API Node embutida.  
**Consequências:**
- ✅ Funciona sem internet após instalação
- ✅ Dados ficam no disco da máquina
- ✅ Um único arquivo para backup
- ❌ Sem sync multi-máquina nativo
- ❌ Escrita concorrente limitada

**Não fazer:** Reintroduzir Supabase cloud sem migração planejada.

---

## ADR-002 — Cliente local estilo query-builder (`db`)

**Status:** Ativo  
**Contexto:** Frontend usa `db.from()`, `.rpc()`, `.storage` (API no estilo Supabase, sem cloud).  
**Decisão:** `src/integrations/db/client.ts` como proxy HTTP para `/api` (SQLite local).  
**Consequências:**
- ✅ Uma API mental estável para o React
- ✅ Funciona offline com o mesmo código de produção
- ⚠️ Realtime é simulado (eventos em memória, mesma aba)

**Arquivo crítico:** `src/integrations/db/client.ts`

---

## ADR-003 — Autenticação só no cliente (localStorage)

**Status:** Ativo  
**Contexto:** Uso interno, poucos usuários, máquina/rede confiável.  
**Decisão:** RPC valida senha; sessão = username em `localStorage` (`prefeitura_user`, flags admin/módulos); API de dados **sem** token HTTP.  
**Permissões (existem, mas só no frontend + `_caller` nas RPCs sensíveis):**
- `is_admin` — acesso a `/admin`, `/superlog` e **todos** os módulos (`RequireModulo` libera admin).
- `usuario_modulos` — lista de módulos liberados por usuário.
- `mostrar_bloqueados` — exibe cards bloqueados no hub (visual).

**Consequências:**
- ✅ Implementação simples para rede interna
- ❌ API aberta para quem alcança o host (não expor na internet pública)
- ⚠️ `_caller` é username em texto forjável na API — confiar só na rede local

**Não fazer:** Assumir segurança de rede sem camada extra (VPN, reverse proxy com auth).

---

## ADR-004 — Senha no primeiro acesso + recuperação por código

**Status:** Ativo  
**Decisão:**
- `usuario_set_senha` só funciona se `senha_hash IS NULL` (primeiro acesso).
- Recuperação: `usuario_solicitar_recuperacao` gera código de 6 dígitos (30 min); em ambiente interno o código **é devolvido na resposta/UI** (não há e-mail).
- Política de senha: mínimo 6 caracteres + maiúscula + minúscula + número.
- Reset admin: `admin_reset_senha` (limpa hash) ou script local.

**Seed:** cria apenas os usuários iniciais, sem credenciais. Todos definem a própria senha no primeiro acesso; reset segue disponível via Admin ou script.

---

## ADR-005 — PDF salva no histórico; Word/Excel não

**Status:** Ativo  
**Decisão:** Apenas `exportToPDF` chama `db.from('solicitacoes').insert()`.  
**Razão:** PDF é documento oficial; Word/Excel são rascunhos/exportação auxiliar.

---

## ADR-006 — Geração de documentos no navegador

**Status:** Ativo  
**Decisão:** jsPDF, docx, xlsx rodam client-side.  
**Consequências:**
- ✅ Sem carga no servidor Node
- ✅ Funciona em standalone estático + API
- ❌ Depende de recursos do navegador
- ❌ PDFs grandes podem travar aba

---

## ADR-007 — Lote em memória de sessão

**Status:** Ativo  
**Decisão:** `useBatchRequest` guarda lote processado em React state.  
**Consequências:**
- ✅ Rápido para processar e exportar PDF único
- ❌ Perde lote ao recarregar página
- ❌ Não entra no histórico automaticamente

---

## ADR-008 — Vite plugin para API em dev

**Status:** Ativo  
**Decisão:** `vite-plugin-local-db.mjs` injeta middleware — mesma origem que frontend.  
**Alternativa rejeitada:** Servidor API separado em outra porta (CORS).

---

## ADR-009 — Standalone para produção

**Status:** Ativo  
**Decisão:** `server/standalone.mjs` serve `dist/` + API em um processo.  
**Não usar em produção:** `npm run dev` (Vite dev server).

---

## ADR-010 — Design system Emerald Prestige / tema Inajá

**Status:** Ativo  
**Decisão:** Paleta verde/dourado institucional; Urbanist + Epilogue.  
**Temas (next-themes):**
- **`inaja`** — claro padrão (tokens em `:root` / `.inaja`)
- **`inaja-escuro`** — escuro (classe `inaja-escuro`; Tailwind `dark:` via seletor em `tailwind.config.ts`, incl. `nietzsche`, `heraclito`, etc.)
- **`fundador`** — vintage / legado (sépia, bronze, parchment; classe `.fundador`, sem `dark`)
- **`tesouro`** — finanças / ouro institucional (champanhe, ouro, preto-ouro; classe `.tesouro`).  
  **Não** usar nomes que evoquem sítio/campo rural. Preferência antiga `fazenda` migra para `tesouro`.
- **`noturno-parana`** — noite de interior (azul-marinho, prata, verde-mate; classe `.noturno-parana`; Tailwind `dark:`)
- **`secretario`** — **luxo máximo ouro + prata** (ônix/gabinete; distinto do Tesouro claro; classe `.secretario`; Tailwind `dark:`). UI: label «Tema Secretário», short «Secretário», ícone Gem.
- **`michelangelo`** — renascimento / afresco (gesso, ultramarino, terracota, folha de ouro; classe `.michelangelo`; **claro**, sem `dark`). UI: label «Michelangelo», short «Afresco», ícone Palette.
- **`socrates`** — filosofia clássica / ágora (mármore, oliva, bronze; classe `.socrates`; **claro**, sem `dark`). UI: label «Sócrates», short «Ágora», ícone BookOpen. Hub: ilustrações em `public/temas/socrates/`.
- **`platao`** — academia platônica / formas ideais (índigo, ouro, luz; classe `.platao`; **claro**, sem `dark`). UI: label «Platão», short «Academia», ícone Hexagon. Hub: ilustrações em `public/temas/platao/`.
- **`maquiavel`** — poder florentino (bordô, negro, ouro, verde; classe `.maquiavel`; **escuro**, Tailwind `dark:`). UI: label «Maquiavel», short «Príncipe», ícone Swords. Hub: ilustrações em `public/temas/maquiavel/`.
- **`rick-morty`** — cartoon sci-fi / portal (ciano, verde-portal, roxo; classe `.rick-morty`; **escuro**, Tailwind `dark:`). UI: label «Rick e Morty», short «Portal», ícone Rocket. Hub: ilustrações em `public/temas/rick-morty/`.
- **`tetris`** — arcade / tetrominós (preto + ciano, amarelo, roxo, verde, laranja; classe `.tetris`; **escuro**, Tailwind `dark:`). UI: label «Tetris», short «Blocos», ícone LayoutGrid. Hub: ilustrações em `public/temas/tetris/`.
- **`van-gogh`** — noite estrelada (cobalto, amarelo girassol; **escuro**). Hub: `public/temas/van-gogh/`.
- **`monet`** — impressionismo (pastel, lírios, água; **claro**). Hub: `public/temas/monet/`.
- **`picasso`** — cubismo (primárias ousadas; **claro**). Hub: `public/temas/picasso/`.
- **`kahlo`** — viva México (turquesa, magenta, coral; **claro**). Hub: `public/temas/kahlo/`.
- **`hokusai`** — ukiyo-e (azul da Prússia, onda; **claro**). Hub: `public/temas/hokusai/`.
- **`aristoteles`** — Liceu / justo meio (pergaminho, âmbar; **claro**). Hub: `public/temas/aristoteles/`.
- **`nietzsche`** — abismo e raio (roxo-noite, ouro; **escuro**). Hub: `public/temas/nietzsche/`.
- **`confucio`** — harmonia imperial (vermelho, jade, ouro; **claro**). Hub: `public/temas/confucio/`.
- **`descartes`** — cogito / grade racional (azul-cinza; **claro**). Hub: `public/temas/descartes/`.
- **`heraclito`** — tudo flui / fogo (âmbar, fogo; **escuro**). Hub: `public/temas/heraclito/`.
- **`simpsons`** — cartoon Springfield (amarelo, céu azul, contorno preto; **claro**). Hub: `public/temas/simpsons/`.
- **`resident-evil`** — survival horror (preto, vermelho Umbrella, verde tóxico; **escuro**). Hub: `public/temas/resident-evil/`.
- **`donkey-kong`** — arcade jungla (marrom, vermelho, amarelo-banana; **escuro**). Hub: `public/temas/donkey-kong/`.
- Ciclo UI: … → Resident Evil → Donkey Kong → Inajá
- Migração de preferências legadas: `light`→`inaja`, `dark`→`inaja-escuro`, `fazenda`→`tesouro` (sem quebrar storage antigo)
- Sem espaços em nomes de tema (next-themes / classes CSS)
- `enableSystem: false`; storage key `inaja-theme`

**Documentado em:** MANUAL-VISUAL-IA.md

---

## ADR-011 — Migrações Supabase como legado

**Status:** Legado (referência)  
**Pasta:** `supabase/migrations/`  
**Decisão:** Schema espelhado manualmente em `server/db.mjs` → `migrate()`.  
**Não fazer:** Rodar Supabase CLI esperando que atualize SQLite automaticamente.

---

## ADR-012 — Realtime local apenas

**Status:** Ativo  
**Decisão:** `emitTableChange` após mutações — listeners na mesma aba/navegador.  
**Não prometer:** Sync ao vivo entre dois computadores.

---

## ADR-014 — Bot Telegram no mesmo processo (long polling)

**Status:** Ativo  
**Decisão:**
- Bot Node em `server/telegram/` sobe com `standalone.mjs` / Vite plugin (mesmo processo do SQLite).
- Long polling outbound para `api.telegram.org` (não exige porta pública).
- Identidade: `telegram_vinculos` (chat_id ↔ usuario_id); pareamento por código de 6 dígitos gerado no Admin.
- `_caller` nos comandos vem **somente** do vínculo — nunca do texto da mensagem.
- Só chats **privados**; token e `telegram_bot_enabled` em `configuracoes`.
- Ações destrutivas (ex.: backup) só admin + confirmação inline.

**Não fazer:** lista aberta de chat_ids no `.env` sem usuário do sistema; bot Python legado.

---

## ADR-013 — `empenhos_orcamentarios` é SQLite-only (sem migration Postgres)

**Status:** Ativo  
**Contexto:** A tabela `empenhos_orcamentarios` (importação de CSV do SIAFI/
Portifólias) existe **apenas** em `server/db.mjs` (`migrate()` e `criarIndicesEmpenhos`).
Não há equivalente em `supabase/migrations/` — intencionalmente, porque:
- Dados são volumosos (milhares de linhas) e específicos da instância local.
- A importação é feita via CSV na própria máquina; não há valor em sincronizar
  com a nuvem.
- O fluxo usa staging table + `DROP` + `RENAME` para garantir atomicidade,
  padrão SQLite que não transporta diretamente para Postgres.

**Consequências:**
- ✅ Operações criticas (`empenhos_importar`/`empenhos_limpar`) são atômicas e
  exigem admin ativo (verificação `_caller` em `runRpc`).
- ✅ Índices garantem filtros rápidos em `ano_empenho`, `modalidade`, etc.
- ⚠️ Migrar de volta ao Supabase exigirá criar a migration equivalente
  manualmente, incluindo a trigger de `updated_at` e o protocolo
  `_continuar`/`_finalizar` para importação atômica.

**Não fazer:** Adicionar essa tabela ao `supabase/migrations/` sem replicar índices,
trigger de `updated_at` e a estratégia atômica de importação.

**Arquivo crítico:** `server/db.mjs` (_linhas 142-187 para schema_, 594-700
_para os RPCs_).

---

## Quando propor mudança de arquitetura

| Necessidade | Mudança possível |
|-------------|------------------|
| Vários PCs mesmo banco | Banco em rede (Postgres) ou sync |
| Expor na internet | Auth na API + HTTPS |
| Reset de senha self-service | Nova RPC + UI |
| Histórico de lote | Insert em `solicitacoes` após batch |
| Papéis por usuário | Coluna `role` + middleware API |

Qualquer mudança acima deve atualizar esta lista e os manuais afetados.

---

*ADRs registradas em julho/2026. Numerar novas decisões sequencialmente.*
