# Renomeador de Documentos

Ferramenta para renomear documentos automaticamente usando IA.

## Como usar

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Execute: `npm run dev`
4. Configure sua API key do Gemini
5. Faça upload dos documentos
6. Baixe os arquivos renomeados

## Requisitos

- Node.js
- API key do Google Gemini

## Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS

## Como fazer deploy deste projeto?

### Deploy na Vercel (Recomendado)

1. **Via GitHub**:
   - Acesse [vercel.com](https://vercel.com)
   - Conecte sua conta GitHub
   - Selecione o repositório
   - Deploy automático!

2. **Via CLI**:
   ```bash
   # Instalar Vercel CLI
   npm i -g vercel

   # Fazer login
   vercel login

   # Deploy
   vercel
   ```
   Ou simplesmente:
   ```bash
   npx vercel
   ```

### Configurações Importantes

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x ou superior

Para mais detalhes sobre outras opções de deploy (Netlify, GitHub Pages), consulte o arquivo `deploy-guide.md`.

### Posso conectar um domínio personalizado?

Sim! Na Vercel, vá para Project > Settings > Domains e clique em Add Domain.
