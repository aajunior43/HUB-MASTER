# Módulo: Gestão de Documentos e Processos (estilo 1Doc)

Módulo de comunicação interna, tramitação e assinatura eletrônica para o
`inaja-fornecimento-digital`. Segue o padrão existente do projeto: backend em
`node:sqlite` com RPC (`runRpc` em `server/db.mjs`) e API `/api/rpc`; frontend
React em `src/pages/`.

> Status: **Fase 1 — Núcleo de Documentos entregue.** Processos, Assinaturas e
> Organograma (gestão de usuários/setores) vêm nas próximas fases.

## Estrutura de arquivos

```
server/db.mjs                 # schema (migrate) + RPCs gd_* + helpers (obterUsuario, podeAcessar, gerarProtocolo, auditar, notificar)
src/pages/GestaoDocumentos.tsx # UI: Caixa de Entrada, Novo Documento, Detalhe (histórico/anexos/ações)
src/App.tsx                   # rota /gestao-documentos
src/pages/ModuleHub.tsx       # card "Gestão de Documentos"
server/db.gestao.test.mjs     # testes do núcleo (node:test, :memory:)
```

Não há pasta `/modules` isolada: o código é centralizado em `server/` e
`src/pages/`, coerente com o restante do projeto.

## Banco de dados (migrations)

O schema é criado por `migrate(db)` em `server/db.mjs` (idempotente via
`CREATE TABLE IF NOT EXISTS`). **Não há passo manual**: ao abrir o banco
(`openDatabase()`), `migrate()` e `seed()` rodam automaticamente, criando as
tabelas `gd_*` e dados iniciais (setor "Prefeitura", tipos padrão de documento,
vínculo usuário→setor e liberação do módulo para os usuários).

Tabelas desta fase: `gd_setores`, `gd_usuario_setor`, `gd_tipos_documento`,
`gd_documentos`, `gd_documento_destinatarios`, `gd_tramitacoes`, `gd_anexos`,
`gd_mencoes`, `gd_modelos_documento` (estrutura pronta), `gd_logs_auditoria`,
`gd_notificacoes`. Tabelas reservadas para fases futuras: `gd_tipos_processo`,
`gd_processos`, `gd_etapas_processo`, `gd_assinaturas`, `gd_webhooks`,
`gd_filtros_salvos`.

## RPCs disponíveis (domínio Documentos)

| RPC | Papel |
|-----|-------|
| `gd_setores_listar` | lista setores (dropdowns) |
| `gd_tipos_listar` | tipos de documento ativos |
| `gd_documento_criar` | cria rascunho; gera protocolo `ANO.NNNNNN.TIPO` |
| `gd_documento_enviar` | envia a setores (Para) + CC; cria tramitação e notifica |
| `gd_documento_responder` | marca "respondido" + registra tramitação |
| `gd_documento_encaminhar` | move para outro setor + notifica |
| `gd_documento_arquivar` / `gd_documento_cancelar` | muda status |
| `gd_documento_get` | detalhe + destinatários + histórico + anexos (**com proteção IDOR**) |
| `gd_documento_listar` | caixa de entrada filtrada por acesso do usuário |
| `gd_documento_anexar` | registra anexo com validação de tipo (pdf/docx/imagens) e tamanho (≤25MB) |
| `gd_notificacoes_listar` / `gd_notificacao_marcar_lida` | notificações in-app (polling) |

Autenticação: todo RPC exige `_caller` (username). Acesso a documento respeita
`podeAcessar()` — autor, admin ou membro de setor destinatário (proteção contra
IDOR). Anexos usam o endpoint existente `/api/storage/upload` (base64) e são
validados no RPC.

## Como plugar / usar

1. O módulo já está liberado no `seed()` para todos os usuários.
2. Acesse `/gestao-documentos` após login.
3. Para consumo externo (outro sistema), chame `POST /api/rpc` com
   `{ "fn": "gd_documento_listar", "args": { "_caller": "<user>", ... } }`.

## Testes

```
node --test server/db.gestao.test.mjs
```

Cobrem: criação de documento + protocolo, envio (Para/CC + tramitação +
notificação), regras de autor (só autor/admin envia), responder/encaminhar/
arquivar, **proteção IDOR** (get/listar), e validação de anexos.

## Próximas fases (ainda não implementadas)

- **Processos**: `gd_processos` + `gd_etapas_processo` (etapas, SLA, formulários
  dinâmicos, prioridade legal).
- **Assinaturas**: `gd_assinaturas` (simples por login+senha; stub de
  certificado ICP-Brasil PKCS#7/CAdES; assinatura em lote; tokens externos).
- **Organograma/ACL**: UI de `gd_setores`/`gd_usuario_setor`, papéis por função,
  log de auditoria de acessos, webhooks e filtros salvos.
```
