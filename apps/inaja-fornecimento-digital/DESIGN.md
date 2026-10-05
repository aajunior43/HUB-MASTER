# Inajá Fornecimento Digital Design System

## 1. Atmosphere & Identity

Um centro de operações institucional: confiável, calmo e orientado a decisões. A assinatura visual é a combinação de esmeralda profundo, creme e dourado, com profundidade tonal e detalhes de brilho usados apenas para orientar a atenção.

## 2. Color

### Palette

| Role | Token | Usage |
|------|-------|-------|
| Surface primary | `--background` | Fundo principal |
| Surface elevated | `--card` | Cards, painéis e formulários |
| Text primary | `--foreground` | Títulos e conteúdo |
| Text secondary | `--muted-foreground` | Metadados e instruções |
| Border | `--border` | Divisores e contornos |
| Accent primary | `--primary` | Ações principais e foco |
| Accent highlight | `--accent` / `--gold` | Estado ativo, destaque e status administrativo |
| Status success | `--emerald` | Usuário ativo e conexão disponível |
| Status error | `--destructive` | Falhas e ações destrutivas |

### Rules

- Usar tokens sem hexágulos locais.
- Dourado é reservado para foco, estado ativo e identidade administrativa.
- Superfícies usam tons da mesma família esmeralda/creme para criar profundidade.

## 3. Typography

### Scale

| Level | Usage |
|-------|-------|
| Display / H1 | Título da página e identidade do módulo |
| H2 / H3 | Seções e nomes de cards |
| Body | Descrições e conteúdo de formulário |
| Caption / Overline | Status, identificadores e metadados |

### Font Stack

- Títulos: `Urbanist`, system sans-serif.
- Corpo: `Epilogue`, system sans-serif.
- Dados técnicos: fonte mono do sistema.

## 4. Spacing & Layout

- Base de 4px, com `gap-2` a `gap-6` nos agrupamentos.
- Conteúdo administrativo limitado a `max-w-5xl` para manter leitura e escaneabilidade.
- Cards de usuário podem ocupar toda a largura; formulários e configurações usam colunas responsivas.
- Mobile: uma coluna, ações empilháveis e tabs com rolagem horizontal quando necessário.

## 5. Components

### Admin page shell

- **Structure**: `PageHeader`, resumo operacional, navegação de abas, conteúdo, `AppFooter`.
- **Variants**: usuários, novo usuário, configurações.
- **States**: carregando, vazio, erro de RPC, conteúdo carregado.
- **Accessibility**: abas com `aria-selected`, foco visível e controles com rótulo.

### User management card

- **Structure**: avatar/identidade, status, permissões, ações e edição inline.
- **Variants**: ativo, inativo, administrador, edição aberta.
- **States**: padrão, hover, edição, salvando, resetando senha.
- **Accessibility**: botões com nomes explícitos e confirmação para reset de senha.

### Admin metric card

- **Structure**: rótulo, valor e ícone contextual.
- **Variants**: total, ativos, administradores.
- **States**: padrão, carregando e vazio.

### Institutional footer

- **Structure**: faixa esmeralda compacta, brasão, identificação da prefeitura, contato WhatsApp, crédito e copyright.
- **Variants**: responsivo em coluna no mobile e alinhado em duas áreas no desktop.
- **States**: padrão e tema escuro.
- **Accessibility**: imagem com texto alternativo, link WhatsApp com nome explícito e informações institucionais em texto real.

## 6. Motion & Interaction

- Transições de interação entre 150ms e 250ms, apenas em cor, opacidade e transform.
- Abertura da edição inline deve preservar a posição do usuário na lista.
- Respeitar `prefers-reduced-motion` para animações não essenciais.

## 7. Depth & Surface

Estratégia mista: bordas discretas para separar regiões e sombras esmeralda suaves apenas em superfícies elevadas ou ativas. Evitar sombras pretas genéricas e excesso de cartões aninhados.
