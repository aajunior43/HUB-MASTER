# 🌐 Guia de Deploy - Acesso Externo

Como tornar seu site acessível fora da rede local:

## 🚀 **Opções Recomendadas (Gratuitas)**

### 1. **Vercel** (Mais Fácil)
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy
vercel
```
**Resultado**: URL tipo `gemini-pdf-rename.vercel.app`

### 2. **Netlify**
```bash
# 1. Build do projeto
npm run build

# 2. Instalar Netlify CLI
npm i -g netlify-cli

# 3. Deploy
netlify deploy --prod --dir=dist
```

### 3. **GitHub Pages**
```bash
# 1. Instalar gh-pages
npm install --save-dev gh-pages

# 2. Adicionar no package.json:
"scripts": {
  "deploy": "gh-pages -d dist"
}

# 3. Build e deploy
npm run build
npm run deploy
```

## ⚡ **Deploy Rápido com Vercel**

1. **Via GitHub** (Recomendado):
   - Acesse [vercel.com](https://vercel.com)
   - Conecte sua conta GitHub
   - Selecione o repositório `gemini-pdf-rename-magic`
   - Deploy automático!

2. **Via CLI**:
   ```bash
   npx vercel
   ```
   - Siga as instruções
   - URL gerada automaticamente

## 🔧 **Configurações Importantes**

### Build Settings (Vercel/Netlify):
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x

### Variáveis de Ambiente:
- Configure `VITE_GEMINI_API_KEY` se necessário
- Nunca exponha chaves API no código

## 🌍 **URLs de Exemplo**
- Vercel: `https://gemini-pdf-rename.vercel.app`
- Netlify: `https://gemini-pdf-rename.netlify.app`
- GitHub Pages: `https://aajunior43.github.io/gemini-pdf-rename-magic`

## 📱 **Vantagens**
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Deploy automático via Git
- ✅ Domínio personalizado (opcional)
- ✅ Totalmente gratuito

## 🎯 **Próximos Passos**
1. Escolha uma plataforma (Vercel recomendado)
2. Faça o deploy
3. Teste a URL pública
4. Compartilhe com outros usuários!

---
**Dica**: Vercel é a opção mais simples e rápida para React/Vite apps.