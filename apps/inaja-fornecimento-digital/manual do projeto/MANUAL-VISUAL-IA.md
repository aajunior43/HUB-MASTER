# Manual Visual — Inajá Fornecimento Digital

> **Propósito:** identidade visual, design system, efeitos e padrões de interface.

**Documentos relacionados:** [README](./README.md) · [Funcional](./MANUAL-IA.md) · [Mapa do código](./MAPA-DO-CODIGO.md) · [Guia dev](./GUIA-DESENVOLVIMENTO.md)

---

## 1. Identidade do design system

**Nome interno:** Emerald Prestige  
**Conceito:** sistema institucional da Prefeitura Municipal de Inajá — elegante, sóbrio, com verde esmeralda e dourado como cores de autoridade pública.

### Personalidade visual
- **Institucional** — transmite seriedade de órgão público
- **Moderno** — cards arredondados, gradientes suaves, microinterações
- **Acolhedor** — fundo creme, não branco puro; contraste suave
- **Hierárquico** — títulos fortes, labels em caixa alta, barras de destaque coloridas

### Arquivo-fonte das cores
`src/index.css` — variáveis CSS em `:root` / `.inaja` e nos temas (incl. `.van-gogh`, `.monet`, `.picasso`, `.kahlo`, `.hokusai`, etc.)

---

## 2. Paleta de cores

### Cores principais (hex)

| Nome | Hex | Uso |
|------|-----|-----|
| Esmeralda profundo | `#064E3B` | Primary, cabeçalhos, tabelas, sidebar |
| Esmeralda | `#0D7A5F` | Secondary, gradientes |
| Dourado | `#C9A84C` | Accent, destaques, barras, totais |
| Creme | `#F5F0E0` (aprox.) | Background geral, fundos suaves |
| Branco | `#FFFFFF` | Cards, popovers |
| Tinta (texto) | `#1E2921` (aprox.) | Texto principal em documentos |

### Tokens CSS (modo claro)

| Token | Papel |
|-------|-------|
| `--background` | Fundo da página (creme claro) |
| `--foreground` | Texto principal (verde escuro) |
| `--primary` | Botões principais, títulos, tabelas |
| `--primary-foreground` | Texto sobre primary (creme) |
| `--secondary` | Labels, elementos secundários |
| `--accent` | Dourado — destaques, ícones, totais |
| `--muted` | Fundos de input, áreas neutras |
| `--muted-foreground` | Texto secundário, subtítulos |
| `--destructive` | Erros, exclusão, alertas vermelhos |
| `--border` | Bordas de cards e inputs |
| `--ring` | Foco de inputs (dourado) |

### Tokens estendidos

| Token | Classe Tailwind | Uso |
|-------|-----------------|-----|
| `--gold` | `text-gold`, `bg-gold` | Dourado puro |
| `--gold-soft` | `bg-gold-soft` | Fundo dourado claro |
| `--emerald-deep` | `text-emerald-deep` | Verde mais escuro |
| `--emerald` | `text-emerald` | Verde médio |
| `--emerald-soft` | `bg-emerald-soft` | Fundo verde clarinho |
| `--cream` | `bg-cream` | Creme institucional |

### Sidebar (esmeralda profundo)

| Token | Visual |
|-------|--------|
| `--sidebar-background` | Fundo verde muito escuro |
| `--sidebar-foreground` | Texto creme |
| `--sidebar-primary` | Dourado (destaques, botões) |
| `--sidebar-accent` | Verde médio para hover |
| `--sidebar-border` | Borda sutil verde |

### Temas (next-themes)
- Ciclo no seletor inclui artistas, filósofos e pop: Michelangelo, Sócrates, Platão, Maquiavel, Van Gogh, Monet, Picasso, Kahlo, Hokusai, Aristóteles, Nietzsche, Confúcio, Descartes, Heráclito, Simpsons, Resident Evil, **Donkey Kong** (+ Rick e Morty, Tetris, institucionais)
- Hub com imagem por módulo: pastas em `public/temas/{id-do-tema}/`
- Classes no `<html>` sem espaços; Tailwind `dark:` via seletor em `tailwind.config.ts`

### Modo escuro
- Temas escuros: `.inaja-escuro`, `.noturno-parana`, `.secretario`, `.maquiavel`, `.rick-morty`, `.tetris`, `.van-gogh`, `.nietzsche`, `.heraclito`, `.resident-evil`, `.donkey-kong` (e legado `.dark`)
- Primary e accent **invertem** no escuro institucional: dourado vira primary, fundo mais profundo
- Sidebar fica ainda mais escura
- Tokens redefinidos em `index.css` por classe de tema

---

## 3. Tipografia

### Fontes (Google Fonts)

| Papel | Família | Pesos | Classe Tailwind |
|-------|---------|-------|-----------------|
| Títulos / display | **Urbanist** | 400–800 | `font-display` |
| Corpo / UI | **Epilogue** | 300–700 | `font-sans` (padrão) |

### Hierarquia tipográfica

| Elemento | Estilo típico |
|----------|---------------|
| Título de página (hub) | `font-display font-bold text-2xl` |
| Título de módulo | `font-display font-bold text-lg` a `text-3xl` |
| Subtítulo de seção | `text-xs sm:text-sm text-muted-foreground` |
| Label de campo | `text-[11px] font-bold uppercase tracking-widest text-secondary` |
| Eyebrow (acima do título) | `text-[10px] tracking-[0.25em] uppercase text-sidebar-primary` |
| Valores monetários | `font-display font-bold` ou `font-extrabold` |
| Total geral (destaque) | `text-gradient-gold` ou `text-accent` |
| Rodapé / créditos | `text-[10px] uppercase tracking-[0.25em] text-muted-foreground` |
| Kbd (atalho) | `text-[10px] font-mono` |

### Letter-spacing padrão
- Labels e eyebrows: `tracking-widest` ou `tracking-[0.25em]` a `tracking-[0.3em]`
- Títulos display: `letter-spacing: -0.01em` (ligeiramente condensado)

---

## 4. Espaçamento, bordas e sombras

### Border radius
- **Padrão global:** `--radius: 1rem` (16px)
- **Cards principais:** `rounded-2xl` (mais arredondado que o padrão)
- **Botões de ação (tiles):** `rounded-xl`
- **Ícones em círculo:** `rounded-full`
- **Badges:** `rounded-md`

### Sombras customizadas

| Classe | Efeito |
|--------|--------|
| `shadow-card` | Sombra leve — cards em repouso |
| `shadow-elevated` | Sombra profunda — cards de destaque, preview |
| `shadow-sm` | shadcn padrão em cards base |

Definição em CSS:
```css
--shadow-card: 0 1px 2px ..., 0 8px 24px -12px ...;
--shadow-elevated: 0 4px 8px ..., 0 24px 48px -18px ...;
```

### Gradientes

| Classe | Direção | Cores |
|--------|---------|-------|
| `bg-gradient-emerald` | 160deg | `#064E3B` → verde médio |
| `text-gradient-gold` | 135deg | dourado claro → dourado escuro (texto) |
| `bg-gradient-to-r from-card to-muted/40` | horizontal | Cabeçalhos de seção em cards |

### Linhas decorativas
- `h-px bg-gradient-to-r from-transparent via-sidebar-primary/70 to-transparent` — linha dourada no rodapé do header
- `w-1 h-6 bg-accent rounded-full` — barra vertical dourada à esquerda de títulos de seção
- `border-t-4` colorido — colunas do Kanban (cinza, verde, verde escuro)

---

## 5. Componentes visuais principais

### 5.1 Cabeçalho institucional (padrão em todas as páginas)

```
┌─────────────────────────────────────────────────────────┐
│  [gradiente esmeralda + radial glow sutil]              │
│  [Brasão circular]  Prefeitura Municipal de             │
│                     Inajá                    [Sair]     │
│  ─────────── linha dourada gradiente ───────────        │
└─────────────────────────────────────────────────────────┘
```

**Classes típicas:**
- Container: `bg-gradient-emerald border-b-2 border-sidebar-primary/40`
- Overlay: `opacity-[0.08]` com `radial-gradient` verde
- Brasão: `w-16 h-16 rounded-full` com `border border-sidebar-primary/50` e `blur-lg` atrás
- Botão sair: `bg-sidebar-primary text-sidebar-primary-foreground`

### 5.2 GlowCard (hub de módulos)

Componente: `src/components/ui/spotlight-card.tsx`

**Efeito:** card com brilho que segue o cursor do mouse (spotlight). Borda luminosa reativa ao movimento do ponteiro.

**Cores de glow por módulo (hub):**
| Posição | Cor glow |
|---------|----------|
| Solicitações | `green` |
| Tarefas | `orange` |
| Diárias | `blue` |
| Credores Fixos | `purple` |

**Propriedades visuais:**
- `rounded-2xl`, `backdrop-blur-[5px]`
- `shadow-[0_1rem_2rem_-1rem_black]`
- Ícone circular: `w-10 h-10 rounded-full bg-primary text-primary-foreground`
- Altura fixa no hub: `h-48`
- Cursor: `cursor-pointer`

### 5.3 Cards de conteúdo

**Padrão:**
```
rounded-2xl border-border/60 shadow-card overflow-hidden
```

**Cabeçalho de seção dentro do card:**
```
px-4 sm:px-6 py-4 border-b border-border/60
bg-gradient-to-r from-card to-muted/40
+ barra vertical dourada (w-1 h-6 bg-accent)
+ título uppercase tracking-wide text-sm font-display font-bold text-primary
```

### 5.4 Painel "Ações do Sistema" (formulário de solicitações)

Card especial com fundo verde:
- `bg-gradient-emerald text-primary-foreground shadow-elevated border-0`
- Blob decorativo: `absolute -right-8 -top-8 w-32 h-32 rounded-full bg-accent/10 blur-2xl`
- Barra inferior dourada: `absolute bottom-0 inset-x-0 h-1 bg-accent`
- Botões em grid 2×2: **ActionTile**

**ActionTile** — botão quadrado com ícone + label:
| Tom | Visual |
|-----|--------|
| `accent` | Fundo dourado translúcido |
| `secondary` | Fundo branco/creme translúcido |
| `destructive` | Fundo vermelho translúcido |
- Hover: `hover:scale-[1.02] active:scale-[0.98]`
- Label: `text-[11px] uppercase font-bold tracking-wider`

### 5.5 Sidebar (módulo Solicitações)

- Fundo: `sidebar-background` (verde escuro)
- Colapsável para ícones (`collapsible="icon"`)
- Item ativo expandido: `border-l-4 border-sidebar-primary bg-sidebar-primary/15`
- Item ativo colapsado: `bg-sidebar-primary/20`
- Header: brasão + "Prefeitura de Inajá — PR"
- Footer: "Desenvolvido por DEV ALEKSANDRO ALVES"

### 5.6 Header sticky (Solicitações)

```
sticky top-0 z-30 h-14 sm:h-16
bg-card/95 backdrop-blur-sm border-b border-border/60 shadow-card
```

Contém: trigger da sidebar, título, botão de busca (`Ctrl+K`), número de protocolo.

### 5.7 Tabelas de itens

**Desktop:**
- Header: `bg-primary text-primary-foreground`
- Colunas: `text-[11px] font-bold uppercase tracking-widest`
- Linhas: `hover:bg-muted/40`, `divide-y divide-border/60`
- Footer total: `bg-muted/60 border-t-2 border-accent`
- Valor total: `text-gradient-gold font-extrabold text-lg`

**Mobile:**
- Cada item vira um card individual com badge "Item 001"
- Total geral em card `bg-gradient-emerald` com valor em `text-accent`

### 5.8 Botões (shadcn)

| Variante | Visual |
|----------|--------|
| `default` | `bg-primary text-primary-foreground` — verde |
| `outline` | Borda + hover accent — usado para voltar/exportar secundário |
| `destructive` | Vermelho — excluir, limpar |
| `ghost` | Transparente — ícones, voltar |
| `secondary` | Verde médio |

Tamanhos: `sm` (h-9), `default` (h-10), `lg` (h-11), `icon` (quadrado 10×10)

### 5.9 Inputs e formulários

- Altura padrão: `h-11` em campos principais, `h-9` em tabelas
- Fundo: `bg-muted/40`
- Borda: `border-border`
- Foco: `focus-visible:ring-accent`
- Textarea: `min-h-[110px] resize-none`

### 5.10 Badges

| Contexto | Estilo |
|----------|--------|
| Prioridade baixa (Kanban) | `bg-muted text-muted-foreground` |
| Prioridade média | `bg-amber-100 text-amber-900` |
| Prioridade alta | `bg-red-100 text-red-900` |
| Departamento (Credores) | `variant="secondary"` |
| Contagem de coluna (Kanban) | `variant="secondary"` |

### 5.11 Diálogos (modais)

- Componente Radix Dialog (`DialogContent`)
- Usados em: criar/editar tarefa, credor, empenho
- Footer com botões Cancelar + Confirmar

### 5.12 Toast / notificações

- Sistema: shadcn Toast (`use-toast`)
- Posição padrão do shadcn
- Variante `destructive` para erros

---

## 6. Efeitos e animações

| Efeito | Classe / origem | Onde |
|--------|-----------------|------|
| Fade in ao trocar view | `animate-fade-in` (0.3s, translateY 4px) | Views do módulo Solicitações |
| Accordion | `animate-accordion-down/up` | Componentes Radix |
| Spin no loading | `animate-spin` | Ícone RefreshCw no histórico |
| Hover scale | `hover:scale-[1.02]` | ActionTiles |
| Active scale | `active:scale-[0.98]` | ActionTiles |
| Backdrop blur | `backdrop-blur-sm`, `backdrop-blur` | Header, login card, GlowCard |
| Blur decorativo | `blur-lg`, `blur-2xl`, `blur-md` | Atrás do brasão |
| Drag cursor | `cursor-grab` / `active:cursor-grabbing` | Cards do Kanban |
| Line clamp | `line-clamp-3` | Descrição de tarefas, descrição de módulos |
| Transition | `transition-colors`, `transition-all duration-200` | Hovers gerais |

### GlowCard — mecânica do efeito
1. Escuta `pointermove` no documento
2. Atualiza CSS vars `--x`, `--y` com posição do cursor
3. Gera `radial-gradient` que segue o mouse
4. Pseudo-elementos `::before` e `::after` criam borda luminosa
5. `background-attachment: fixed` para efeito parallax sutil

---

## 7. Layout por tela

### Login (`/login`)
```
┌──────────────────────────────────────┐
│     fundo: bg-gradient-emerald       │
│                                      │
│    ┌──────────────────────┐        │
│    │  Card central         │        │
│    │  bg-card/95 blur      │        │
│    │  [Brasão]             │        │
│    │  Prefeitura de Inajá  │        │
│    │  [formulário]         │        │
│    └──────────────────────┘        │
└──────────────────────────────────────┘
```
- Centralizado: `min-h-screen flex items-center justify-center`
- Card: `max-w-sm p-6`

### Hub (`/`)
```
Header institucional (gradiente)
─────────────────────────────────
"VISÃO GERAL" (eyebrow uppercase)
┌─────────┐ ┌─────────┐ ┌─────────┐
│ GlowCard│ │ GlowCard│ │ GlowCard│  ← grid 1/2/3 colunas
│ Módulo  │ │ Módulo  │ │ Módulo  │
└─────────┘ └─────────┘ └─────────┘
Footer: DEV ALEKSANDRO ALVES
```
- Container: `max-w-6xl mx-auto px-6 py-10`
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

### Solicitações (`/solicitacoes`)
```
┌──────────┬────────────────────────────────────────┐
│ Sidebar  │ Header sticky (título + busca)       │
│ (verde   ├────────────────────────────────────────┤
│  escuro) │ Conteúdo da view ativa               │
│          │ (form / batch / history / etc.)        │
│          │ max-w-7xl ou max-w-5xl conforme view  │
└──────────┴────────────────────────────────────────┘
```

**Grid do formulário (12 colunas):**
| Bloco | Colunas |
|-------|---------|
| Dados da solicitação | 8 (lg) |
| Ações do sistema | 4 (lg) |
| Anexos | 6 (lg) |
| Assinatura | 6 (lg) |
| Itens | 12 (full) |

### Tarefas (`/tarefas`)
```
Header módulo + botão "Módulos"
─────────────────────────────────
Título + botão "Nova Tarefa"
┌──────────┬──────────┬──────────┐
│ A Fazer  │ Em And.  │ Concluído│  ← 3 colunas Kanban
│ (cards)  │ (cards)  │ (cards)  │
└──────────┴──────────┴──────────┘
```
- Colunas: `min-h-[400px]`, `rounded-xl bg-muted/30`
- Borda superior colorida por status

### Diárias (`/diarias`)
```
Header + Voltar
─────────────────────────────────
Card formulário (cargo, destino, datas)
Card resultado (stats 4 colunas + justificativa + total)
Card base legal (texto pequeno)
```
- Container: `max-w-3xl mx-auto`
- Stats: grid 2×2 ou 4 colunas com bordas

### Credores Fixos (`/credores-fixos`)
```
Header + Voltar
─────────────────────────────────
Card filtros (ano, departamento, status + ações)
Card tabela (credor × 12 meses + ações)
```
- Container: `max-w-7xl mx-auto`
- Células de mês: botões 8×8 com ícone check/clock

---

## 8. Ícones

**Biblioteca:** Lucide React (`lucide-react`)

| Ícone | Uso |
|-------|-----|
| `FileText` | Solicitações |
| `KanbanSquare` | Tarefas |
| `Calculator` | Diárias |
| `Wallet` | Credores Fixos |
| `LogOut` | Sair |
| `ArrowLeft` | Voltar |
| `Plus` / `Minus` | Adicionar/remover item |
| `Download` | Exportar |
| `Eye` | Visualizar |
| `Search` | Busca global |
| `PenTool` | Assinatura |
| `Paperclip` | Anexos |
| `Pencil` / `Trash2` | Editar / excluir |
| `CheckCircle2` / `Clock` | Empenhado / pendente |
| `Info` | Justificativa de diária |

**Tamanhos padrão:** `w-4 h-4` em botões, `w-5 h-5` em títulos, `w-3.5 h-3.5` em metadados

---

## 9. Responsividade

### Breakpoints Tailwind
| Prefixo | Largura |
|---------|---------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1400px |

### Padrões adaptativos
- Títulos: `text-xl sm:text-2xl md:text-3xl`
- Padding: `p-3 sm:p-5 lg:p-8`
- Grid de módulos: 1 → 2 → 3 colunas
- Tabela de itens: desktop (`hidden lg:block`) vs cards mobile (`lg:hidden`)
- Header: protocolo e busca ocultos em telas pequenas (`hidden md:flex`, `hidden lg:flex`)
- Sidebar: colapsa para ícones automaticamente

---

## 10. Identidade visual em documentos exportados

### PDF de solicitações (`pdfGenerator.ts`)

**Paleta RGB fixa:**
| Cor | RGB | Hex |
|-----|-----|-----|
| Esmeralda profundo | 6, 78, 59 | #064E3B |
| Esmeralda | 13, 122, 95 | #0D7A5F |
| Dourado | 201, 168, 76 | #C9A84C |
| Dourado suave | 245, 240, 224 | #F5F0E0 |

**Layout PDF:**
- Faixa superior verde + filete dourado
- Logo institucional à esquerda
- Título centralizado em verde
- Tabela com header verde e texto branco
- Linhas zebradas (`#F9FAF7`)
- Total com fundo dourado suave
- Bordas internas douradas na tabela

### Excel exportado
- Fonte: Calibri
- Header verde com texto branco
- Subtítulo com fundo `gold-soft` e borda inferior dourada
- Formato monetário: `"R$" #,##0.00`
- Zebra nas linhas de itens

### Word exportado
- Logo + título verde `#064E3B`
- Tabela com bordas verde/dourado
- Shading verde no header, creme no total

### PDF de diárias
- Header verde `#064E3B` (faixa 26mm)
- Brasão 20×20mm
- Resultado: verde se aprovado, vermelho se reprovado
- Box de total: fundo creme `#F5F0E0`

### PDF de credores fixos
- Simples, Helvetica, texto preto
- Check `✓` para empenhado, `•` para pendente

---

## 11. Elementos institucionais fixos

### Brasão
- Caminho: `/brasao.png`
- Sempre em círculo com borda dourada/verde
- Tamanhos: 16px (sidebar colapsada) a 80px (documentos)

### Textos institucionais
```
PREFEITURA MUNICIPAL DE INAJÁ
Av. Antônio Veiga Martins, 80 — CEP 87670-200
Telefone: (44) 3112-4320
E-mail: prefeito@inaja.pr.gov.br
Estado do Paraná
CNPJ: 76.970.318/0001-67 (em PDFs de diária)
```

### Crédito do desenvolvedor
```
Desenvolvido por DEV ALEKSANDRO ALVES
```
- Rodapé do hub e sidebar
- `text-primary font-bold` ou `text-sidebar-primary`

---

## 12. Mapa de cores por contexto

| Contexto | Cor dominante | Accent |
|----------|---------------|--------|
| Hub / navegação | Gradiente esmeralda | Dourado nos botões |
| Formulário solicitação | Branco/creme (cards) | Painel ações = verde |
| Sidebar | Verde escuro | Dourado no item ativo |
| Kanban — A Fazer | Cinza | — |
| Kanban — Em Andamento | Verde primary | — |
| Kanban — Concluído | Verde escuro | — |
| Diária aprovada | Verde | Total em primary |
| Diária reprovada | Vermelho destructive | — |
| Empenho confirmado | `bg-primary` (verde) | Ícone branco |
| Empenho pendente | `bg-muted` (cinza) | Ícone cinza |
| Erro / toast | `destructive` vermelho | — |

---

## 13. Regras para IA — manter consistência visual

### Ao criar novas telas
1. Usar `bg-background` como fundo da página
2. Cabeçalho com `bg-gradient-emerald` + brasão + botão voltar
3. Títulos com `font-display font-bold text-primary`
4. Cards com `rounded-2xl border-border/60 shadow-card`
5. Seções com barra vertical dourada (`w-1 h-6 bg-accent rounded-full`)
6. Labels em `uppercase tracking-widest text-[11px]`
7. Botão principal: `bg-primary`, secundário: `variant="outline" border-primary/30`
8. Container centralizado: `max-w-6xl` ou `max-w-3xl` conforme complexidade

### Ao criar novos componentes
- Não usar cores fora da paleta (sem azul/rosa aleatório)
- Dourado só para destaques, não para fundos grandes
- Verde escuro para autoridade (headers, tabelas)
- Creme/branco para áreas de conteúdo
- Ícones sempre Lucide, tamanho 16–20px
- Animações sutis (`fade-in`, `scale` no hover) — nada exagerado

### Ao exportar documentos
- Sempre incluir brasão e cabeçalho institucional
- Cores RGB: `#064E3B`, `#C9A84C`, `#F5F0E0`
- Fonte PDF: Helvetica; Excel: Calibri; Word: padrão docx

### O que NÃO fazer
- Não usar tema claro com fundo branco puro (usar creme `--background`)
- Não misturar fontes fora de Urbanist/Epilogue
- Não usar border-radius pequeno em cards principais (preferir `rounded-2xl`)
- Não remover o brasão dos cabeçalhos
- Não usar emojis em interface institucional
- Não criar botões sem variante shadcn definida

---

## 14. Referência rápida de classes Tailwind

```css
/* Fundos */
bg-background          /* creme página */
bg-card                /* branco card */
bg-gradient-emerald    /* header verde */
bg-muted/40            /* input fundo */
bg-emerald-soft        /* highlight verde claro */
bg-gold-soft           /* highlight dourado claro */

/* Texto */
text-primary           /* verde escuro */
text-accent            /* dourado */
text-muted-foreground  /* cinza esverdeado */
text-gradient-gold     /* dourado gradiente */
font-display           /* Urbanist */

/* Bordas */
border-border/60       /* borda suave */
border-sidebar-primary/40  /* borda dourada sutil */
border-t-4             /* topo colorido (kanban) */

/* Efeitos */
shadow-card            /* sombra leve */
shadow-elevated        /* sombra forte */
animate-fade-in        /* entrada suave */
backdrop-blur-sm       /* desfoque */
```

---

## 15. Estrutura de arquivos visuais

| Arquivo | Conteúdo visual |
|---------|-----------------|
| `src/index.css` | Tokens CSS, gradientes, sombras, fontes |
| `tailwind.config.ts` | Cores Tailwind, animações, fontFamily |
| `index.html` | Import Google Fonts |
| `src/components/ui/*` | Componentes shadcn base |
| `src/components/ui/spotlight-card.tsx` | GlowCard |
| `src/components/AppSidebar.tsx` | Sidebar verde |
| `src/lib/pdfGenerator.ts` | Paleta e layout PDF |

---

*Última atualização: julho/2026 — Design System Emerald Prestige, Prefeitura Municipal de Inajá/PR.*