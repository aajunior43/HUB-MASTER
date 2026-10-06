# Glossário

> Termos do sistema, da prefeitura e técnicos — com definição clara para IA e usuários.

---

## A

**ActionTile**  
Botão quadrado com ícone no painel "Ações do Sistema" (Visualizar, PDF, Word, etc.).

**Anexo**  
Arquivo enviado junto à solicitação (máx. 10 MB). Fica em `data/uploads/`.

**Anexo I / Anexo II**  
Tabelas de valores de diária no Decreto 019/2025. Anexo I = Prefeito/Vice/Secretários; Anexo II = demais servidores.

---

## B

**Batch / Lote**  
Processamento de várias solicitações a partir de um arquivo `.txt` estruturado.

**Brasão**  
Logo institucional da prefeitura usado em headers e PDFs. Path: `/brasao.png` (`public/brasao.png`).

---

## C

**Canal (channel)**  
Abstração de "realtime" no cliente local. Sincroniza dados apenas no mesmo navegador.

**Credor fixo**  
Fornecedor com pagamento mensal recorrente (aluguel, energia, etc.).

**ComboboxInput**  
Campo com autocomplete que sugere valores salvos (solicitante, empresa).

---

## D

**Decreto 019/2025**  
Base legal para cálculo de diárias em Inajá/PR.

**Design system Emerald Prestige**  
Identidade visual: verde esmeralda + dourado + creme.

**Diária**  
Verba de viagem calculada pelo tempo de afastamento do município.

**Drag & drop**  
Arrastar cards de tarefa entre colunas do Kanban.

---

## E

**Emerald Prestige**  
Ver Design system.

**Empenho**  
Registro de reserva orçamentária para pagar um credor em determinado mês.

**Epilogue**  
Fonte do corpo de texto da interface.

---

## F

**First access / Primeiro acesso**  
Fluxo em que maicon/luana criam senha pela primeira vez (`usuario_set_senha`).

---

## G

**GlowCard**  
Card do hub com efeito de brilho que segue o cursor.

**GRANT / RLS**  
Conceitos do Supabase cloud — **não aplicáveis** ao SQLite local atual.

---

## H

**Hash scrypt**  
Algoritmo usado para armazenar senhas (`scrypt$salt$hash`).

**Histórico**  
Lista de solicitações salvas no banco (somente via export PDF).

**Hub**  
Tela inicial (`/`) com cards dos 4 módulos.

---

## I

**Item (solicitação)**  
Linha da tabela: nome, descrição, quantidade, valor unitário, total.

---

## K

**Kanban**  
Quadro visual com colunas A Fazer / Em Andamento / Concluído.

---

## L

**localStorage**  
Armazenamento do navegador para sessão (`prefeitura_user`).

**Lote**  
Ver Batch.

---

## M

**Middleware**  
`createLocalDbMiddleware()` — intercepta `/api/*` no servidor.

**Modelo / Template**  
Formulário de solicitação salvo para reutilização.

**Módulo**  
Uma das 4 áreas do hub: Solicitações, Tarefas, Diárias, Credores Fixos.

---

## P

**Payload**  
Corpo JSON enviado à API (`/api/query`, `/api/rpc`).

**Pipe `|`**  
Separador de campos no arquivo de lote.

**Protocolo**  
Número decorativo no header (`#2026-NNNN`) — não é oficial.

**PRAGMA WAL**  
Modo Write-Ahead Log do SQLite para melhor concorrência de leitura.

---

## Q

**QueryBuilder**  
Classe no `client.ts` que implementa `db.from().select()...`.

---

## R

**Realtime**  
Atualização automática de listas — **local ao navegador**, não entre PCs.

**RPC**  
Remote Procedure Call — funções como `usuario_login`.

**RequireAuth**  
Componente que bloqueia rotas sem usuário logado.

---

## S

**scrypt**  
Função de hash de senha (ver Hash scrypt).

**Seed**  
Dados iniciais inseridos ao criar banco (usuários e módulos, sem credenciais).

**Sidebar**  
Menu lateral verde escuro no módulo Solicitações.

**Solicitação de aquisição**  
Documento formal pedindo compra de produtos/serviços.

**SQLite**  
Banco de dados em arquivo único `data/inaja.sqlite`.

**Standalone**  
Servidor de produção `server/standalone.mjs`.

**Supabase (client)**  
Nome legado — hoje é cliente **local** que fala com `/api`.

---

## T

**Template**  
Ver Modelo.

---

## U

**Urbanist**  
Fonte dos títulos (`font-display`).

**Upsert**  
Insert ou update se já existir (usado em solicitantes com `onConflict`).

**Usuário**  
aleksandro, maicon ou luana.

---

## V

**View (Solicitações)**  
Seção interna: form, batch, history, data, templates, settings.

**Vite**  
Bundler e dev server do frontend.

---

## W

**WAL**  
Ver PRAGMA WAL.

**Whitelist**  
Lista de tabelas permitidas em `runQuery` — `usuarios` **fora** da lista.

---

## Siglas

| Sigla | Significado |
|-------|-------------|
| PR | Paraná |
| PDF | Portable Document Format |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| SPA | Single Page Application |
| HMR | Hot Module Replacement (Vite) |

---

*Sugira novos termos quando aparecerem no projeto.*
