# Html-visualizer

Visualizador e editor de HTML em tempo real com funcionalidade de download.

## Descrição

Este projeto permite visualizar código HTML em tempo real enquanto você digita, com uma interface split-screen moderna e a capacidade de baixar o HTML editado.

## ✨ Características

- 📝 **Syntax Highlighting** - Editor CodeMirror com tema Dracula
- 👁️ **Preview em Tempo Real** - Visualização instantânea do código
- 🎨 **Interface Moderna** - Design gradiente com animações suaves
- 📱 **100% Responsivo** - Funciona perfeitamente em mobile, tablet e desktop
- ⚡ **Performance Otimizada** - Debounce e otimizações para dispositivos móveis
- ♿ **Acessível** - WCAG 2.1 AA compliant
- 🖥️ **Preview Responsivo** - Simule diferentes tamanhos de tela
- 📝 **Formatação Automática** - Formate seu código com um clique (Ctrl+Shift+F)
- ⬇️ **Download Inteligente** - Baixe com timestamp automático
- 🎯 **Empty State** - Exemplo pronto para começar rapidamente
- 🔔 **Toast Notifications** - Feedback visual para todas as ações
- 🗑️ **Limpar com Segurança** - Confirmação antes de apagar código
- ⌨️ **Atalhos de Teclado** - Ctrl+Z/Y para desfazer/refazer, Ctrl+S para baixar
- 🎨 **Ícones SVG** - Interface profissional e acessível
- 💾 **Validação Inteligente** - Previne ações em editor vazio

## Como Usar

1. Execute o arquivo `start.bat` para iniciar o projeto
2. **Primeira vez?** Clique em "Carregar Exemplo" para ver um template
3. Cole ou digite seu código HTML no painel esquerdo
4. Visualize o resultado em tempo real no painel direito
5. Use os botões da toolbar para:
   - **Formatar Código** - Identar e organizar automaticamente
   - **Limpar** - Apagar todo o código (com confirmação)
   - **Desktop/Tablet/Mobile** - Simular diferentes tamanhos de tela (apenas desktop)
   - **Baixar HTML** - Salvar arquivo com timestamp

### 🎯 Dicas Rápidas
- Use `Ctrl+Shift+F` para formatar rapidamente
- Use `Ctrl+S` para baixar (previne save do navegador)
- Use `Ctrl+Z` e `Ctrl+Y` para desfazer/refazer
- Todas as ações mostram notificações de feedback
- O arquivo baixado inclui timestamp: `html-export-2026-02-09-14-30-00.html`

## 📱 Responsividade

O projeto foi desenvolvido com abordagem **Mobile-First** e funciona perfeitamente em:

- 📱 **Mobile** (320px - 639px) - Layout vertical otimizado
- 📱 **Tablet** (640px - 1023px) - Layout híbrido
- 🖥️ **Desktop** (1024px+) - Layout split-screen completo
- 🖥️ **Large Desktop** (1440px+) - Tipografia aumentada

### Breakpoints
- Mobile: 320px - 639px
- Tablet: 640px - 1023px  
- Desktop: 1024px+
- Large Desktop: 1440px+

Veja o [RESPONSIVE-CHECKLIST.md](RESPONSIVE-CHECKLIST.md) para detalhes completos.

## Estrutura do Projeto

```
Html-visualizer/
├── css/
│   ├── style.css          # Estilos Mobile-First
│   └── toast.css          # Sistema de notificações
├── js/
│   ├── script.js          # Lógica da aplicação
│   └── toast.js           # Toast manager
├── index.html             # Estrutura HTML semântica
├── start.bat              # Inicializador do projeto
├── README.md              # Este arquivo
├── RULES.md               # Regras do projeto
├── RESPONSIVE-CHECKLIST.md # Checklist de responsividade
├── REFACTORING-SUMMARY.md  # Resumo da refatoração
└── UX-UI-AUDIT.md         # Auditoria completa de UX/UI
```

## Tecnologias

- HTML5 (Semântico)
- CSS3 (Mobile-First, CSS Variables, Flexbox, Grid)
- JavaScript (Vanilla ES6+)
- CodeMirror 5.65.2 (Editor com syntax highlighting)
- Google Fonts (Roboto Mono)

## Acessibilidade

- ♿ WCAG 2.1 AA compliant
- ⌨️ Navegação por teclado completa
- 🔍 Focus visível em todos os elementos
- 📢 ARIA labels e roles corretos
- 🎯 Touch targets ≥ 44px
- 🔊 Anúncios para screen readers
- 🎨 Suporte a prefers-reduced-motion
- 🎨 Suporte a prefers-contrast

## Performance

- ⚡ Debounce em eventos de input (300ms)
- 🚀 Viewport otimizado para mobile
- 📦 Recursos externos com preconnect
- 🎯 Animações otimizadas
- 💾 Código minificado e eficiente
- 🔔 Toast system leve e performático
- ✅ Validações antes de ações pesadas

## UX/UI

- 🎨 Design System com tokens CSS
- 🔔 Feedback visual para todas as ações
- 🎯 Empty state com exemplo pronto
- ⚠️ Confirmações para ações destrutivas
- 📝 Microcopy claro e descritivo
- 🎨 Ícones SVG profissionais
- 🎯 Hierarquia visual clara (botões primário/secundário)
- ⌨️ Atalhos de teclado para power users

Veja a [Auditoria UX/UI completa](UX-UI-AUDIT.md) para detalhes.

## Desenvolvedor

**Dev Aleksandro Alves**
