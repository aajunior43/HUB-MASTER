# 🤝 Guia de Contribuição

Obrigado por considerar contribuir para o **Extractor de Estilo com Gemini**! Este documento fornece diretrizes para contribuir com o projeto.

## 📋 Índice

- [Como Contribuir](#como-contribuir)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)
- [Desenvolvimento](#desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Código de Conduta](#código-de-conduta)

## 🚀 Como Contribuir

Existem várias maneiras de contribuir:

- 🐛 **Reportar bugs** - Encontrou um problema? Nos conte!
- 💡 **Sugerir melhorias** - Tem uma ideia? Compartilhe conosco!
- 📝 **Melhorar documentação** - Ajude outros usuários
- 🔧 **Contribuir com código** - Implemente novas funcionalidades
- 🌍 **Traduzir** - Ajude a tornar o projeto multilíngue
- ⭐ **Dar uma estrela** - Mostre seu apoio!

## 🐛 Reportando Bugs

Antes de reportar um bug:

1. **Verifique se já foi reportado** nas [Issues](https://github.com/aajunior43/extensao-extrator-designer/issues)
2. **Use a versão mais recente** da extensão
3. **Teste em diferentes navegadores** se possível

### Template para Bug Report

```markdown
**Descrição do Bug**
Uma descrição clara e concisa do problema.

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '...'
3. Role para baixo até '...'
4. Veja o erro

**Comportamento Esperado**
O que você esperava que acontecesse.

**Screenshots**
Se aplicável, adicione screenshots para ajudar a explicar o problema.

**Ambiente:**
- OS: [ex: Windows 10]
- Navegador: [ex: Chrome 120]
- Versão da Extensão: [ex: 1.0.0]

**Contexto Adicional**
Qualquer outra informação relevante sobre o problema.
```

## 💡 Sugerindo Melhorias

Para sugerir uma melhoria:

1. **Verifique se já foi sugerida** nas Issues
2. **Descreva claramente** o problema atual
3. **Explique a solução proposta**
4. **Considere alternativas**

### Template para Feature Request

```markdown
**Sua solicitação está relacionada a um problema?**
Uma descrição clara do problema. Ex: Fico frustrado quando [...]

**Descreva a solução que você gostaria**
Uma descrição clara e concisa do que você quer que aconteça.

**Descreva alternativas consideradas**
Uma descrição clara de quaisquer soluções ou recursos alternativos.

**Contexto adicional**
Qualquer outro contexto ou screenshots sobre a solicitação.
```

## 🛠️ Desenvolvimento

### Pré-requisitos

- Navegador baseado em Chromium (Chrome, Edge, Brave)
- Editor de código (VS Code recomendado)
- Git
- API Key do Google Gemini (para testes)

### Configuração do Ambiente

1. **Fork o repositório**
   ```bash
   git clone https://github.com/SEU_USUARIO/extensao-extrator-designer.git
   cd extensao-extrator-designer
   ```

2. **Carregue a extensão no navegador**
   - Abra `chrome://extensions/`
   - Ative "Modo do desenvolvedor"
   - Clique em "Carregar sem compactação"
   - Selecione a pasta do projeto

3. **Configure sua API key**
   - Obtenha uma chave em [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Configure na extensão

### Estrutura do Projeto

```
.
├── manifest.json          # Configuração da extensão
├── popup.html             # Interface principal
├── popup.js               # Lógica do popup
├── options.html           # Página de configurações
├── options.js             # Lógica das configurações
├── content_script.js      # Script de extração
├── README.md              # Documentação principal
├── CONTRIBUTING.md        # Este arquivo
├── CHANGELOG.md           # Histórico de mudanças
├── LICENSE                # Licença MIT
└── .github/
    └── workflows/
        └── ci.yml         # CI/CD Pipeline
```

## 📏 Padrões de Código

### JavaScript

- **Use ES6+** quando possível
- **Nomeação clara** para variáveis e funções
- **Comentários** para lógica complexa
- **Tratamento de erros** adequado
- **Async/await** para operações assíncronas

```javascript
// ✅ Bom
async function extractStyles() {
  try {
    const data = await getStyleData();
    return processData(data);
  } catch (error) {
    console.error('Erro na extração:', error);
    throw error;
  }
}

// ❌ Evitar
function extractStyles() {
  // sem tratamento de erro
  return getStyleData().then(data => processData(data));
}
```

### HTML

- **Semântica correta** (header, main, section)
- **Acessibilidade** (ARIA labels, roles)
- **Estrutura limpa** e indentada

```html
<!-- ✅ Bom -->
<button 
  id="generateBtn" 
  aria-label="Gerar prompt com Gemini"
  data-tooltip="Analisa a página (Ctrl+Enter)"
>
  Gerar Prompt
</button>

<!-- ❌ Evitar -->
<div onclick="generate()">Gerar</div>
```

### CSS

- **Variáveis CSS** para cores e espaçamentos
- **Mobile-first** approach
- **Nomenclatura BEM** quando apropriado

```css
/* ✅ Bom */
.btn-primary {
  background: var(--primary-color);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}

/* ❌ Evitar */
.button {
  background: #6366f1;
  padding: 12px;
}
```

## 🔄 Processo de Pull Request

1. **Crie uma branch** para sua feature
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```

2. **Faça commits descritivos**
   ```bash
   git commit -m "✨ Adiciona exportação em PDF"
   ```

3. **Teste suas mudanças**
   - Teste em diferentes navegadores
   - Verifique acessibilidade
   - Teste com diferentes sites

4. **Atualize documentação** se necessário

5. **Abra o Pull Request**
   - Descreva claramente as mudanças
   - Referencie issues relacionadas
   - Adicione screenshots se aplicável

### Template de Pull Request

```markdown
## Descrição
Breve descrição das mudanças.

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## Como Testar
1. Passo 1
2. Passo 2
3. Passo 3

## Checklist
- [ ] Código segue os padrões do projeto
- [ ] Testes foram realizados
- [ ] Documentação foi atualizada
- [ ] Mudanças são compatíveis com versões anteriores
```

## 📝 Convenções de Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação
- `refactor:` refatoração
- `test:` testes
- `chore:` tarefas de manutenção

Exemplos:
```
feat: adiciona exportação em PDF
fix: corrige erro na validação da API key
docs: atualiza README com novas instruções
style: melhora espaçamento dos botões
```

## 🏷️ Versionamento

Usamos [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): mudanças incompatíveis
- **MINOR** (0.1.0): novas funcionalidades compatíveis
- **PATCH** (0.0.1): correções de bugs

## 🤝 Código de Conduta

### Nosso Compromisso

Nós, como membros, contribuidores e líderes, nos comprometemos a fazer da participação em nossa comunidade uma experiência livre de assédio para todos.

### Padrões

Exemplos de comportamento que contribuem para um ambiente positivo:

- Usar linguagem acolhedora e inclusiva
- Respeitar diferentes pontos de vista
- Aceitar críticas construtivas
- Focar no que é melhor para a comunidade
- Mostrar empatia com outros membros

### Aplicação

Instâncias de comportamento abusivo podem ser reportadas entrando em contato com a equipe do projeto. Todas as reclamações serão analisadas e investigadas.

## 🙏 Reconhecimento

Todos os contribuidores serão reconhecidos no README do projeto. Obrigado por ajudar a tornar este projeto melhor!

---

**Dúvidas?** Abra uma [Issue](https://github.com/aajunior43/extensao-extrator-designer/issues) ou entre em contato!