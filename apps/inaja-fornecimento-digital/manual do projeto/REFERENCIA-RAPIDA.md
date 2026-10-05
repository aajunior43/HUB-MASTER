# Referência Rápida

> Uma página. Para detalhes → [README.md](./README.md)

---

## Sistema

| Item | Valor |
|------|-------|
| Nome | Inajá Fornecimento Digital |
| URL | http://localhost:8080 |
| Banco | `data/inaja.sqlite` |
| Anexos | `data/uploads/` |
| Node | 20+ · Porta 8080 |

## Comandos

```bash
rodar.bat                                          # dev Windows
npm run dev                                        # dev
npm run build && npm start                         # produção
node scripts/set-aleksandro-password.mjs           # reset aleksandro
curl http://localhost:8080/api/health            # health
```

## Rotas

`/login` · `/` · `/solicitacoes` · `/tarefas` · `/diarias` · `/credores-fixos`

## Usuários

| User | Senha | 1º acesso |
|------|-------|-----------|
| aleksandro | — | Cria senha |
| maicon | — | Cria senha |
| luana | — | Cria senha |

## Módulos → ação principal

| Módulo | Ação #1 |
|--------|---------|
| Solicitações | Formulário → PDF |
| Tarefas | Kanban drag & drop |
| Diárias | Saída/retorno → calcular |
| Credores | Clicar mês → empenhar |

## Solicitações — views

`form` · `batch` · `history` · `data` · `templates` · `settings`

## Atalho

`Ctrl+K` = busca global (Solicitações)

## API

`GET /api/health` · `POST /api/query` · `POST /api/rpc` · `POST /api/storage/upload` · `GET /api/files/{path}`

## RPC

`usuario_status` · `usuario_login` · `usuario_set_senha`

## Tabelas

`usuarios` · `solicitantes` · `empresas` · `observacoes` · `modelos` · `solicitacoes` · `tarefas` · `credores_fixos` · `empenhos_mensais`

## Cores

`#064E3B` esmeralda · `#C9A84C` dourado · `#F5F0E0` creme

## Diárias

`<12h→0` · `12-24h→1` · `>24h→1+floor((h-24)/12)`

## Lote

```
SOLICITANTE|EMPRESA|OBS|ITEM:DESC:QTD:VALOR;...
```

## Kanban

Status: `todo` `doing` `done` · Prio: `baixa` `media` `alta` · Resp: `ALEKSANDRO` `LUANA` `MAICON` `TODOS`

## Export → salva banco?

PDF solicitação ✅ · Word/Excel ❌ · PDF lote ❌ · PDF diária ❌

## Arquivos críticos

`server/db.mjs` · `server/api.mjs` · `src/integrations/db/client.ts` · `vite-plugin-local-db.mjs`

---

## Árvore: qual documento abrir?

```
Preciso de...
├─ Passo a passo uso real     → CENARIOS-E-EXEMPLOS
├─ Funcionalidade completa    → MANUAL-IA
├─ Regra fixa                 → REGRAS-NEGOCIO
├─ JSON / API / lote          → FORMATOS-E-CONTRATOS
├─ Onde no código             → MAPA-DO-CODIGO
├─ Alterar código             → GUIA-DESENVOLVIMENTO
├─ Por que foi feito assim    → DECISOES-ARQUITETURA
├─ Backup / operação          → GUIA-OPERACAO
├─ Erro                       → TROUBLESHOOTING
├─ Cor / UI                   → MANUAL-VISUAL-IA
├─ Servidor / deploy          → MANUAL-INFRAESTRUTURA-IA
├─ Termo                      → GLOSSARIO
├─ Contexto IA                → PROMPT-CONTEXTO-IA
└─ Índice geral               → README
```

---

## 14 documentos na pasta

README · PROMPT · REFERENCIA-RAPIDA · MANUAL-IA · MANUAL-VISUAL · MANUAL-INFRA · REGRAS · FORMATOS · CENARIOS · MAPA-CODIGO · GLOSSARIO · GUIA-OPERACAO · GUIA-DEV · DECISOES · TROUBLESHOOTING
