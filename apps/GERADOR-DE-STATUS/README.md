# 🎨 StatusAI Creator

> Transforme suas ideias em imagens de status profissionais para redes sociais usando Inteligência Artificial.

## ✨ Funcionalidades

- 🤖 **Geração com IA**: Powered by Google Gemini AI
- 🎨 **Design Profissional**: Templates elegantes e modernos
- 📱 **Responsivo**: Funciona perfeitamente em mobile e desktop
- 🎯 **Personalização**: Emojis, hashtags, vinhetas e fontes
- 💾 **Histórico**: Salve e gerencie seus status favoritos
- 📥 **Download**: Baixe em alta qualidade (PNG)

## 🚀 Tecnologias

- **Framework**: Next.js 15 com App Router
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **IA**: Google Gemini API
- **Animações**: Framer Motion
- **Ícones**: Lucide React

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/statusai-creator.git

# Entre no diretório
cd statusai-creator

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Execute em desenvolvimento
npm run dev
```

## ⚙️ Configuração

1. Obtenha uma chave da API do Google Gemini em [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Adicione sua chave no arquivo `.env.local`:

```env
NEXT_PUBLIC_GEMINI_API_KEY=sua_chave_aqui
```

## 🎯 Como Usar

1. **Digite um tema**: Ex: "motivação", "amor", "sucesso"
2. **Personalize**: Escolha emojis, hashtags, vinhetas
3. **Gere**: Clique em "Gerar Status" 
4. **Baixe**: Salve a imagem em alta qualidade

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 15)
│   ├── favorites/         # Página de favoritos
│   ├── history/           # Página de histórico
│   └── ...
├── components/            # Componentes React
│   ├── ui/               # Componentes de interface
│   ├── sections/         # Seções da página
│   └── ...
├── services/             # Serviços (APIs, IA)
├── hooks/                # Custom hooks
├── utils/                # Utilitários
└── config/               # Configurações
```

## 🎨 Temas Disponíveis

- 💪 Motivação
- ❤️ Amor
- 🏆 Sucesso
- 🧠 Sabedoria
- 💪 Força
- ☮️ Paz
- 😊 Felicidade
- 🦁 Coragem
- 🌟 Esperança
- 🙏 Gratidão
- 👨‍👩‍👧‍👦 Família
- 🤝 Amizade
- 💼 Trabalho
- 💭 Sonhos
- 🎬 Filmes
- 📺 Séries
- 🎵 Música

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run start        # Executar produção
npm run lint         # Verificar código
```

## 📱 Deploy

### Vercel (Recomendado)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload da pasta .next
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- [Google Gemini AI](https://ai.google.dev/) pela API de IA
- [Next.js](https://nextjs.org/) pelo framework
- [Tailwind CSS](https://tailwindcss.com/) pela estilização
- [Framer Motion](https://www.framer.com/motion/) pelas animações

---

**Feito com ❤️ para criar status incríveis!**