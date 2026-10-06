# 📝 Configuração de Prompts - Status AI

Este arquivo contém todos os prompts usados pela IA para gerar status. Você pode editá-los livremente para personalizar o comportamento da aplicação.

## 📁 Arquivo Principal: `prompts.ts`

### 🎯 **basePrompt**
Prompt principal que define a estrutura básica da solicitação à IA.

**Variáveis disponíveis:**
- `{theme}` - Tema selecionado pelo usuário
- `{randomSeed}` - Número aleatório para variação
- `{timeStamp}` - Timestamp para unicidade
- `{currentAttempt}` - Tentativa atual
- `{sourceInstruction}` - Instrução específica da fonte
- `{emojiInstruction}` - Instrução sobre emojis
- `{hashtagInstruction}` - Instrução sobre hashtags

### 🎬 **sourceInstructions**
Define como a IA deve se comportar para cada tipo de tema:

- **filme**: Citações diretas de filmes
- **series**: Frases de séries de TV
- **musica**: Trechos de letras de música
- **default**: Comportamento padrão (livre escolha)

### 🎨 **colorPalettes**
Define as cores e fontes para cada categoria de tema.

**Formato:** `Tema: #cor_fundo + #cor_texto + Fonte`

### 💡 **examples**
Exemplos específicos para guiar a IA em cada categoria.

### 📝 **formatInstructions**
Define como a resposta deve ser estruturada.

## 🛠️ Como Editar

### 1. **Adicionar Novo Tema Específico**
```typescript
sourceInstructions: {
  // ... outros temas
  anime: `🎌 FONTE OBRIGATÓRIA: Citação DIRETA de anime
• Use uma frase marcante de anime famoso
• Pode ser nacional ou internacional
• OBRIGATÓRIO: Mencione o anime entre parênteses`,
}
```

### 2. **Modificar Cores de um Tema**
```typescript
colorPalettes: `
// ... outras cores
• Anime/Mangá: #ff6b6b + #ffffff + Poppins
`
```

### 3. **Alterar Comportamento Geral**
Edite o `basePrompt` para mudar como a IA se comporta:
```typescript
basePrompt: `🎯 SEU NOVO PROMPT AQUI
Mantenha as variáveis {theme}, {sourceInstruction}, etc.`
```

### 4. **Adicionar Novos Exemplos**
```typescript
examples: `
// ... outros exemplos
🎌 Para "Anime" - CITAÇÕES DIRETAS DE ANIMES:
• "Acredite!" (Naruto)
• "Vou me tornar o Rei dos Piratas!" (One Piece)
`
```

## 🔄 Aplicar Mudanças

1. Edite o arquivo `src/config/prompts.ts`
2. Salve o arquivo
3. Reinicie a aplicação (se necessário)
4. As mudanças serão aplicadas automaticamente

## ⚠️ Dicas Importantes

- **Mantenha as variáveis**: `{theme}`, `{sourceInstruction}`, etc.
- **Teste gradualmente**: Faça uma mudança por vez
- **Backup**: Mantenha uma cópia do arquivo original
- **Formato**: Mantenha a estrutura de resposta esperada

## 🎯 Exemplos de Personalização

### Adicionar Tema "Livros"
```typescript
// Em sourceInstructions
livros: `📚 FONTE OBRIGATÓRIA: Citação DIRETA de livro famoso
• Use uma frase marcante de literatura
• Pode ser nacional ou internacional
• OBRIGATÓRIO: Mencione o livro e autor entre parênteses`,

// Em colorPalettes
• Livros/Literatura: #8b4513 + #f5f5dc + Crimson Text

// Em examples
📚 Para "Livros" - CITAÇÕES DIRETAS DE LIVROS:
• "Ser ou não ser, eis a questão" (Hamlet - Shakespeare)
• "O importante não é vencer todos os dias, mas lutar sempre" (Walcyr Carrasco)
```

### Modificar Comportamento de Filmes
```typescript
filme: `🎬 FONTE MODIFICADA: Citações de filmes brasileiros
• FOQUE APENAS em filmes nacionais
• Use frases icônicas do cinema brasileiro
• OBRIGATÓRIO: Mencione o filme e ano entre parênteses`,
```

## 🚀 Funcionalidades Avançadas

- **Condicionais**: Use lógica no `buildPrompt()` para comportamentos complexos
- **Variações**: Adicione mais variáveis para personalização
- **Validação**: Implemente validação de prompts antes do uso

---

**Divirta-se personalizando os prompts! 🎨**