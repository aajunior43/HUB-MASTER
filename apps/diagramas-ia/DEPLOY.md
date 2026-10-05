# Guia de Deploy na Vercel

## Pré-requisitos

1. **Conta na Vercel**: Crie uma conta em [vercel.com](https://vercel.com)
2. **Chave API do Gemini**: Obtenha em [Google AI Studio](https://makersuite.google.com/app/apikey)

## Passos para Deploy

### 1. Preparação do Repositório

```bash
# Clone o projeto
git clone <url-do-repositorio>
cd diagram-creator

# Instale dependências
npm install

# Teste localmente
npm run dev
```

### 2. Configuração da API Gemini

1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Clique em "Create API Key"
3. Copie a chave gerada

### 3. Deploy via Vercel CLI

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel

# Configure a variável de ambiente
vercel env add GEMINI_API_KEY
```

### 4. Deploy via GitHub (Recomendado)

1. **Push para GitHub**:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Conectar à Vercel**:
   - Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
   - Clique em "New Project"
   - Importe seu repositório do GitHub

3. **Configurar Variáveis de Ambiente**:
   - Na página do projeto, vá para "Settings" > "Environment Variables"
   - Adicione: `GEMINI_API_KEY` = `sua_chave_api`

4. **Deploy Automático**:
   - O deploy será feito automaticamente
   - Cada push para `main` gerará um novo deploy

## Configurações Importantes

### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Environment Variables
```
GEMINI_API_KEY=sua_chave_api_do_gemini
```

### Domínio Personalizado (Opcional)
1. Vá para "Settings" > "Domains"
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções

## Verificação do Deploy

Após o deploy, verifique:

1. ✅ Site carrega corretamente
2. ✅ Elementos podem ser arrastados
3. ✅ IA Gemini responde (teste com prompt simples)
4. ✅ Exportação funciona
5. ✅ Interface responsiva

## Troubleshooting

### Erro de API Key
```
Error: Chave da API do Gemini não configurada
```
**Solução**: Verifique se `GEMINI_API_KEY` está configurada nas variáveis de ambiente

### Erro de Build
```
Module not found: Can't resolve 'reactflow'
```
**Solução**: Execute `npm install` e verifique dependências

### Erro de Timeout
```
Function execution timed out
```
**Solução**: A API do Gemini está configurada para 30s de timeout no `vercel.json`

## Monitoramento

- **Analytics**: Habilitado automaticamente na Vercel
- **Logs**: Acesse via dashboard da Vercel
- **Performance**: Monitore Core Web Vitals

## Atualizações

Para atualizar o site:
1. Faça alterações no código
2. Commit e push para GitHub
3. Deploy automático será executado

## Suporte

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Next.js](https://nextjs.org/docs)
- [Google AI Studio](https://makersuite.google.com/)