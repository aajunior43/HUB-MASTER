# ⚡ Guia Rápido de Teste - Html-visualizer

## 🎯 Teste em 5 Minutos

### 1️⃣ Teste Básico (1 min)
```
✅ Abrir start.bat
✅ Ver empty state "Comece a editar HTML"
✅ Ver toast de boas-vindas
✅ Clicar "Carregar Exemplo"
✅ Ver toast "Exemplo carregado!"
✅ Ver preview atualizado
```

### 2️⃣ Teste de Formatação (1 min)
```
✅ Clicar "Formatar Código"
✅ Ver toast "Código formatado!"
✅ Verificar código identado
✅ Testar Ctrl+Shift+F
✅ Ver toast com atalho
```

### 3️⃣ Teste de Download (1 min)
```
✅ Clicar "Baixar HTML"
✅ Ver toast "Preparando download..."
✅ Ver toast "Download concluído!"
✅ Verificar arquivo baixado
✅ Verificar nome com timestamp
```

### 4️⃣ Teste de Validação (1 min)
```
✅ Clicar "Limpar"
✅ Confirmar dialog
✅ Ver toast "Editor limpo"
✅ Tentar formatar vazio
✅ Ver toast "Editor vazio"
✅ Tentar baixar vazio
✅ Ver toast "Nada para baixar"
```

### 5️⃣ Teste Responsivo (1 min)
```
✅ Redimensionar janela para mobile
✅ Ver layout vertical
✅ Ver botões com ícones apenas
✅ Clicar botão preview
✅ Ver toast "Modo preview indisponível"
✅ Redimensionar para desktop
✅ Clicar botão "Tablet"
✅ Ver toast "Preview: Tablet"
```

---

## 🧪 Checklist Completo

### Interface
- [ ] Header visível e legível
- [ ] Toolbar organizada
- [ ] Botão "Baixar HTML" destacado (primário)
- [ ] Outros botões discretos (secundários)
- [ ] Ícones SVG carregados
- [ ] Labels visíveis em desktop
- [ ] Labels ocultos em mobile (só ícones)
- [ ] Footer visível e não sobrepõe

### Empty State
- [ ] Aparece quando editor vazio
- [ ] Ícone de código visível
- [ ] Título "Comece a editar HTML"
- [ ] Descrição clara
- [ ] Botão "Carregar Exemplo" funciona
- [ ] Desaparece quando há código

### Toast Notifications
- [ ] Toast de boas-vindas aparece (1s delay)
- [ ] Toast "Exemplo carregado" (success)
- [ ] Toast "Código formatado" (success)
- [ ] Toast "Download concluído" (success)
- [ ] Toast "Editor limpo" (info)
- [ ] Toast "Editor vazio" (warning)
- [ ] Toast "Nada para baixar" (error)
- [ ] Toast "Modo preview indisponível" (warning)
- [ ] Toasts aparecem no canto superior direito (desktop)
- [ ] Toasts aparecem na parte inferior (mobile)
- [ ] Toasts fecham automaticamente (3s)
- [ ] Botão X fecha toast manualmente

### Editor
- [ ] CodeMirror carrega
- [ ] Syntax highlighting funciona
- [ ] Números de linha visíveis
- [ ] Line wrapping funciona
- [ ] Auto-close tags funciona
- [ ] Ctrl+Z desfaz
- [ ] Ctrl+Y refaz
- [ ] Ctrl+Shift+F formata
- [ ] Placeholder visível quando vazio

### Preview
- [ ] Atualiza em tempo real (300ms debounce)
- [ ] HTML renderiza corretamente
- [ ] CSS inline funciona
- [ ] JavaScript inline funciona
- [ ] Iframe com sandbox (segurança)

### Botões
- [ ] "Formatar Código" funciona
- [ ] "Limpar" pede confirmação
- [ ] "Desktop" ativa preview desktop
- [ ] "Tablet" ativa preview tablet (só desktop)
- [ ] "Mobile" ativa preview mobile (só desktop)
- [ ] "Baixar HTML" baixa arquivo
- [ ] Todos os botões ≥ 44px (touch-friendly)
- [ ] Focus visível ao navegar por teclado
- [ ] Hover effects funcionam (desktop)
- [ ] Active states funcionam (mobile)

### Download
- [ ] Arquivo baixa corretamente
- [ ] Nome inclui timestamp
- [ ] Formato: html-export-YYYY-MM-DD-HH-MM-SS.html
- [ ] Conteúdo correto
- [ ] Encoding UTF-8

### Responsividade
- [ ] Mobile (320px) - Layout vertical
- [ ] Mobile (375px) - iPhone
- [ ] Mobile (390px) - iPhone 12/13
- [ ] Tablet (768px) - iPad
- [ ] Desktop (1024px) - Laptop
- [ ] Desktop (1920px) - Full HD
- [ ] Sem overflow horizontal
- [ ] Sem elementos cortados
- [ ] Textos legíveis

### Acessibilidade
- [ ] Navegação por Tab funciona
- [ ] Focus visível (outline 3px)
- [ ] ARIA labels presentes
- [ ] Screen reader friendly
- [ ] Contraste adequado
- [ ] Zoom 200% sem quebrar
- [ ] Atalhos de teclado funcionam

### Performance
- [ ] Preview atualiza suavemente
- [ ] Sem lag ao digitar
- [ ] Toasts aparecem instantaneamente
- [ ] Animações suaves
- [ ] Sem travamentos

---

## 🐛 Bugs Conhecidos

Nenhum bug conhecido no momento. Se encontrar algum, reporte!

---

## 📱 Teste em Dispositivos Reais

### Mobile
```
1. Abrir em smartphone
2. Testar orientação portrait
3. Testar orientação landscape
4. Testar gestos touch
5. Testar zoom
```

### Tablet
```
1. Abrir em tablet
2. Testar orientação portrait
3. Testar orientação landscape
4. Testar split-screen
```

### Desktop
```
1. Testar em Chrome
2. Testar em Firefox
3. Testar em Edge
4. Testar em Safari (Mac)
5. Testar zoom (Ctrl +/-)
```

---

## 🎯 Cenários de Uso Real

### Cenário 1: Desenvolvedor Testando Código
```
1. Abre app
2. Cola código HTML do projeto
3. Vê preview
4. Ajusta CSS inline
5. Formata código
6. Baixa arquivo
✅ Tempo esperado: < 2 minutos
```

### Cenário 2: Estudante Aprendendo HTML
```
1. Abre app
2. Clica "Carregar Exemplo"
3. Edita texto
4. Vê mudanças em tempo real
5. Experimenta tags diferentes
6. Baixa resultado
✅ Tempo esperado: < 3 minutos
```

### Cenário 3: Designer Prototipando
```
1. Abre app
2. Cola HTML de wireframe
3. Adiciona CSS inline
4. Testa em diferentes tamanhos (Desktop/Tablet/Mobile)
5. Ajusta responsividade
6. Baixa para apresentar
✅ Tempo esperado: < 5 minutos
```

---

## 🔍 Teste de Regressão

Após qualquer mudança, testar:

### Crítico
- [ ] Editor carrega
- [ ] Preview atualiza
- [ ] Download funciona
- [ ] Toasts aparecem
- [ ] Responsividade mantida

### Importante
- [ ] Formatação funciona
- [ ] Limpar funciona
- [ ] Preview modes funcionam
- [ ] Atalhos funcionam
- [ ] Empty state funciona

### Desejável
- [ ] Animações suaves
- [ ] Hover effects
- [ ] Transições
- [ ] Cores corretas
- [ ] Espaçamentos corretos

---

## 📊 Métricas de Qualidade

### Performance
- [ ] Lighthouse Performance > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No layout shifts

### Acessibilidade
- [ ] Lighthouse Accessibility = 100
- [ ] WAVE 0 erros
- [ ] axe DevTools 0 erros
- [ ] Contraste WCAG AA

### Best Practices
- [ ] Lighthouse Best Practices = 100
- [ ] HTTPS (se em produção)
- [ ] Sem console errors
- [ ] Sem console warnings

### SEO
- [ ] Lighthouse SEO = 100
- [ ] Meta tags presentes
- [ ] Título descritivo
- [ ] Meta description

---

## ✅ Aprovação Final

Projeto aprovado quando:
- ✅ Todos os testes básicos passam
- ✅ Responsividade funciona em 3+ dispositivos
- ✅ Acessibilidade WCAG AA
- ✅ Performance Lighthouse > 90
- ✅ 0 bugs críticos
- ✅ UX fluida e intuitiva

---

## 🚀 Deploy Checklist

Antes de fazer deploy:
- [ ] Todos os testes passam
- [ ] Documentação atualizada
- [ ] CHANGELOG atualizado
- [ ] README atualizado
- [ ] Sem console.logs de debug
- [ ] Sem TODOs no código
- [ ] Analytics configurado (opcional)
- [ ] Backup do código anterior

---

**Última atualização:** 09 de Fevereiro de 2026
**Versão testada:** 2.0.0
