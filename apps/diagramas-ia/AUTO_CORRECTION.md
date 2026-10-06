# 🔧 Sistema de Auto-Correção de Diagramas

Este sistema implementa correção automática inteligente para diagramas gerados pela IA, garantindo que sempre seja possível criar um diagrama funcional, mesmo quando há erros na geração inicial.

## 🚀 Funcionalidades

### 1. **Geração com Retry Automático**
- A IA tenta gerar o diagrama até 3 vezes automaticamente
- Cada tentativa usa informações do erro anterior para melhorar
- Se todas as tentativas falharem, usa um diagrama de fallback

### 2. **Validação em Tempo Real**
- Detecta erros automaticamente quando o diagrama é carregado
- Valida IDs únicos, conexões válidas, posicionamento
- Mostra indicadores visuais de erros

### 3. **Correção Automática Inteligente**
- Detecta erros críticos e solicita correção automaticamente
- A IA analisa o erro e corrige mantendo a intenção original
- Fallback inteligente baseado no tipo de diagrama solicitado

### 4. **Correção Manual**
- Usuário pode solicitar correção clicando no indicador de erro
- Toast com botão "Corrigir Automaticamente"
- Feedback visual durante o processo de correção

## 🔍 Tipos de Erros Detectados

### Erros Críticos (Correção Automática)
- IDs de nós duplicados
- Conexões referenciando nós inexistentes
- Diagramas sem nós
- Estrutura JSON inválida

### Erros de Aviso
- Nós sem conexões (órfãos)
- Nós sobrepostos
- Posicionamento inadequado

## 🛠️ Como Funciona

### 1. **Fluxo de Geração Normal**
```
Prompt → IA Gera → Valida → Sucesso ✅
```

### 2. **Fluxo com Auto-Correção**
```
Prompt → IA Gera → Erro Detectado → IA Corrige → Valida → Sucesso ✅
```

### 3. **Fluxo com Fallback**
```
Prompt → IA Gera → Erro → IA Corrige → Erro → Fallback → Sucesso ✅
```

## 📋 Diagramas de Fallback

O sistema inclui templates inteligentes para diferentes tipos de diagramas:

- **Login/Autenticação**: Fluxo completo com validação e tratamento de erro
- **E-commerce**: Processo de compra do produto ao pagamento
- **Aprovação/Workflow**: Processo de revisão e aprovação de documentos
- **Genérico**: Baseado nas palavras-chave do prompt

## 🎯 Benefícios

1. **Confiabilidade**: Sempre gera um diagrama funcional
2. **Experiência do Usuário**: Correções transparentes e automáticas
3. **Aprendizado**: A IA melhora com base nos erros anteriores
4. **Flexibilidade**: Fallbacks inteligentes para casos complexos

## 🔧 Configuração

### API Route (`/api/generate-diagram`)
- Suporta correção via parâmetros `currentDiagram` e `errorDetails`
- Retry automático com prompts melhorados
- Validação robusta de estrutura

### Hooks
- `useAutoCorrection`: Gerencia geração e correção
- `useDiagramValidation`: Valida diagramas em tempo real

### Componentes
- `DiagramEditor`: Detecta erros e solicita correção
- `AutoCorrectionStatus`: Feedback visual do processo
- `Toast`: Notificações com ações

## 📊 Métricas de Correção

O sistema rastreia:
- Número de tentativas de correção
- Uso de fallbacks
- Tipos de erros mais comuns
- Taxa de sucesso da correção automática

## 🎨 Interface do Usuário

### Indicadores Visuais
- **Ícone de erro**: Canto superior direito quando há problemas
- **Toast de correção**: Notificação com botão de ação
- **Status de correção**: Feedback durante o processo
- **Indicador de loading**: Mostra quando está corrigindo

### Mensagens Informativas
- Correção automática bem-sucedida
- Uso de diagrama de fallback
- Detalhes dos erros encontrados
- Progresso da correção

## 🚀 Uso

### Para Desenvolvedores
```typescript
const { correctDiagram, isGenerating } = useAutoCorrection()

// Corrigir diagrama manualmente
const correctedDiagram = await correctDiagram(
  originalPrompt, 
  currentDiagram, 
  errorDetails
)
```

### Para Usuários
1. Digite o prompt normalmente
2. Se houver erros, o sistema corrige automaticamente
3. Clique no ícone de erro para correção manual
4. Use o botão "Corrigir Automaticamente" nos toasts

## 🔮 Futuras Melhorias

- [ ] Aprendizado de padrões de erro
- [ ] Sugestões de melhoria de prompt
- [ ] Histórico de correções
- [ ] Métricas de qualidade do diagrama
- [ ] Correção colaborativa (múltiplas tentativas)