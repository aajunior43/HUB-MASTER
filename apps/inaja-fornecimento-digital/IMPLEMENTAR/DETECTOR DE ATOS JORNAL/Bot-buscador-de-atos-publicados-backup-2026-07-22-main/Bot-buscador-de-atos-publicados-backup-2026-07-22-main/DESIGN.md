# Monitor Inajá — contrato de interface

Este documento descreve a interface Jinja/CSS existente. Ele é um contrato de
preservação: uma mudança visual deve partir destes tokens e padrões, ou
atualizar este arquivo junto com a alteração. Não é uma proposta de redesign.

## 1. Direção e arquitetura

- Produto: painel operacional para acompanhar atos publicados de Inajá-PR.
- Atmosfera: escura, técnica e discreta, com superfícies translúcidas, bordas
  suaves e pontos de cor para orientar estados operacionais.
- Camadas CSS, nesta ordem: `static/base.css` (tokens e reset),
  `static/layout.css` (estrutura), `static/components.css` (primitivas) e
  `static/utils.css` (utilitários), reunidas por `static/styles.css`.
- `templates/base.html` é o shell compartilhado: link de salto, cabeçalho,
  navegação principal, `<main>` e toast global. As páginas devem estendê-lo.

## 2. Tokens de cor, superfície e elevação

| Papel | Escuro | Claro |
|---|---|---|
| Fundo | `--bg: #0d0f14` | `#f5f6fa` |
| Fundos escalonados | `--bg-2: #13161e`, `--bg-3: #1a1e28` | `#eef0f5`, `#e4e7ef` |
| Superfícies | `--surface: rgba(255,255,255,.04)`, `--surface-2: rgba(255,255,255,.07)` | equivalentes pretos a `.03` e `.06` |
| Bordas | `--border: rgba(255,255,255,.08)`, `--border-2: rgba(255,255,255,.14)` | equivalentes pretos a `.10` e `.18` |
| Ação | `--accent: #6366f1`, `--accent-2: #818cf8` | `#4f46e5`, `#6366f1` |
| Sucesso | `--green: #22d3a5` | `#059669` |
| Atenção | `--amber: #fbbf24` | `#d97706` |
| Erro | `--red: #f87171` | `#dc2626` |
| Informação | `--blue: #38bdf8` | `#0284c7` |
| Texto | `--text-1: #f0f2f8`, `--text-2: #a0a8c0`, `--text-3: #5a637a` | `#1e1e2e`, `#4a4a5a`, `#8a8a9a` |

O modo claro é ativado por `html[data-theme="light"]`; a ausência do valor
mantém o modo escuro. A preferência persiste em `localStorage` e respeita
`prefers-color-scheme` antes da primeira pintura. Sombras são `--shadow` e
`--shadow-lg`; o destaque de ação usa `--accent-glow` e `--glow-accent`.
Dois gradientes radiais fixos compõem a atmosfera de fundo.

## 3. Tipografia, forma e espaçamento

- Fonte do corpo: Inter (300–800), com `system-ui, sans-serif` como fallback.
  Código usa JetBrains Mono/Fira Code/Courier New.
- Base: 15px, linha 1.6. Hierarquia recorrente: 0.68–0.85rem para metadados e
  controles, 0.95–1rem para títulos de painel, e `clamp()` para títulos de
  página (1.25–2.8rem).
- Raios: `--radius-sm: 8px`, `--radius: 14px`, `--radius-lg: 20px`; pills usam
  `999px`.
- A unidade de ritmo é 0.5rem. Espaços recorrentes: 0.35, 0.5, 0.75, 1, 1.25,
  1.5, 2, 3 e 4rem. O conteúdo principal tem largura máxima de 1400px e
  padding `1.5rem 1.5rem 4rem`.

## 4. Layout e responsividade

- A topbar é sticky, desfocada (`blur(16px)`) e fica acima do conteúdo.
- `page-shell` ocupa pelo menos a viewport; `<main id="main-content">` cresce
  para preencher o espaço.
- Grades: estatísticas usam `auto-fit/minmax(160px, 1fr)`; cards usam
  `auto-fill/minmax(260px, 1fr)`; painéis divididos têm duas colunas.
- Pontos de quebra existentes: até 1100px a área central do dashboard vira uma
  coluna; até 900px splits e a navegação colapsam; até 700px gráficos e listas
  lado a lado viram uma coluna; até 600px `.hide-mobile` é ocultado.
- Em telas até 900px, `#nav-toggle` aparece e `.main-nav.is-open` revela a
  navegação; os links `.nav-mobile-only` substituem o menu “Mais”.

## 5. Primitivas compartilhadas e estados

| Primitiva | Uso e estado contratado |
|---|---|
| Topbar/navegação | `.main-nav`, link `.active`, agrupador `.nav-more.is-current`, menu móvel `.is-open`; `#nav-more-menu[hidden]` fecha o menu secundário. |
| Botões | `button`/`.btn` é a ação primária; `.btn-secondary`, `.btn-danger` e `.btn-small` são variantes. Hover eleva 1px; active retorna ao plano. Ao iniciar processamento, `startProcessing()` usa `disabled`, `aria-busy` e troca o texto; o estado bloqueado mantém contraste, remove elevação e mostra `cursor: wait`. |
| Painel | `.panel` + `.panel-head`; fundo translúcido, borda e raio grande. `.cards` organiza conteúdo interno. |
| Estatística | `.stats-grid article`; hover eleva 2px e revela gradiente. `stat-alert` sinaliza prioridade. |
| Filtros e abas | `.filter-btn.active`, `.chip.active`, `.tipo-chip.active` e `.tab-btn.active` representam a seleção atual. |
| Publicação | `.pub-row` é clicável; `.cat-*` colore a barra lateral por categoria; `.pub-valor` destaca valor. |
| Badge | `.badge`, `.badge-ia`, `.badge-ia-tag`; qualidade usa `.badge-conf-alta`, `.badge-conf-media`, `.badge-conf-revisar`. |
| Formulário | `.field` associa label e controle; focus de input/select/textarea recebe borda accent e anel de 3px. `#skip-nav:focus` entra na tela para dar acesso direto ao conteúdo. |
| Status operacional | `status-concluido`, `status-aviso`, `status-rodando`, `status-erro` e `status-ignorado` definem marcadores da timeline; presença usa `.is-online`/`.is-offline`, `.is-running`/`.is-idle`. |
| Feedback e conteúdo transitório | `.skeleton` comunica espera; ações assíncronas criam `.live-monitor-card.panel.fade-in` com progresso. `.global-toast.visible`, `.search-overlay.is-open` e `.nav-keymap-hint.is-visible` são as chaves de visibilidade. |
| Vazio e erro | `.empty` mantém uma mensagem textual quando não há resultados ou jobs. `status-erro` pinta o marcador da timeline com `--red`; o cockpit também expõe `#ciclo-erros` para erros recentes e `alert-error` para mensagens administrativas. |

Estados sem dados devem usar `.empty` ou a primitiva `.empty-state` com título,
texto e `role="status"`; não esconder a estrutura nem substituir o status por
cor sem texto. No caminho bem-sucedido, o botão que iniciou a ação permanece
desabilitado enquanto o monitor ao vivo é criado e acompanhado; ao terminar, o
monitor informa conclusão, o controle é restaurado e recebe foco antes da
remoção do monitor. Em resposta não OK ou erro de rede, `startProcessing()`
restaura imediatamente o texto e o atributo `disabled`. A mensagem de
carregamento deve continuar legível enquanto o monitor ao vivo é criado.

## 6. Movimento e interação

- Transição padrão: `--transition: .2s cubic-bezier(.4,0,.2,1)`.
- `.fade-in` usa 0.4s, `opacity` e `transform: translateY(8px)`; pontos de
  atividade usam `pulse-dot`/`pulse-ring`.
- Hover só reforça elementos interativos: links mudam de cor, botões e cards
  recebem elevação curta. O estado active não deve depender exclusivamente de
  movimento ou cor.
- Novos movimentos devem manter a semântica (carregamento, presença ou ação) e
  preferir `transform`, `opacity` ou `filter`.

## 7. Acessibilidade e dívida aceita

- O primeiro foco navegável é `#skip-nav`, que aponta para `#main-content` e
  fica visível em foco. O shell fornece `<header>`, `<nav aria-label="Principal">`
  e `<main>`.
- O botão móvel declara `aria-label`, `aria-expanded` e `aria-controls`; o menu
  “Mais” declara `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`,
  `role="menu"` e `role="menuitem"`.
- Controles sem texto visível devem ter rótulo acessível. Exemplos atuais:
  alternância de tema e busca/filtro do dashboard. Canvas de gráficos declara
  `aria-label`.
- Foco de formulários tem anel perceptível; o tema mantém tokens de texto e
  superfície distintos nos dois modos. Respeitar `lang="pt-BR"`, textos de
  estado e `alt` em prévias de página.
- Dívida existente, não ampliar sem uma tarefa específica: há estilos inline e
  alguns ícones emoji em templates. O contrato novo exige preservar rótulos e
  não introduzir novos controles apenas icônicos sem nome acessível.

## Verificação do contrato

`tests/test_ui_contract.py` fixa os landmarks do shell, o link de salto, os
rótulos acessíveis e os hooks prioritários de estado. Execute:

```powershell
python -m pytest tests/test_ui_contract.py tests/test_webapp.py -q
```
