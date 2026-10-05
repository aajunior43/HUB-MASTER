# Portfólio Profissional - Aleksandro Alves da Rocha Junior

Portfólio moderno e responsivo desenvolvido com HTML5, CSS3 e JavaScript, otimizado para performance e acessibilidade.

## 🚀 Características

- **Design Moderno**: Interface moderna com efeitos 3D e animações avançadas
- **Totalmente Responsivo**: Adaptado para todos os dispositivos e tamanhos de tela
- **Acessibilidade**: Implementação completa de padrões WCAG 2.1
- **Performance Otimizada**: Carregamento rápido e experiência fluida
- **SEO Friendly**: Otimizado para motores de busca

## 🛠️ Tecnologias Utilizadas

- HTML5 semântico
- CSS3 com animações avançadas
- JavaScript ES6+
- Font Awesome para ícones
- Google Fonts (Orbitron, Rajdhani, Exo 2)

## 📦 Deploy na Vercel

### Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. [Vercel CLI](https://vercel.com/cli) instalado globalmente

### Instalação e Deploy

1. **Clone ou faça download do projeto**
   ```bash
   # Se usando Git
   git clone [seu-repositorio]
   cd [nome-do-projeto]
   ```

2. **Instale a Vercel CLI (se não tiver)**
   ```bash
   npm i -g vercel
   ```

3. **Faça login na Vercel**
   ```bash
   vercel login
   ```

4. **Deploy do projeto**
   ```bash
   vercel
   ```

5. **Para deploy em produção**
   ```bash
   vercel --prod
   ```

### Deploy Automático via GitHub

1. Conecte seu repositório GitHub à Vercel
2. Configure as seguintes configurações de build:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: (deixe vazio)
   - **Output Directory**: ./
   - **Install Command**: (deixe vazio)

## 📂 Estrutura do Projeto

```
├── index.html              # Página principal
├── about.html              # Página sobre
├── portfolio.html          # Página portfólio
├── certificates.html       # Página certificados
├── contact.html            # Página contato
├── blog.html               # Página blog
├── styles.css              # Estilos principais
├── accessibility.css       # Estilos de acessibilidade
├── script.js               # JavaScript principal
├── vercel.json             # Configurações da Vercel
├── package.json            # Dependências e scripts
├── .vercelignore           # Arquivos ignorados no deploy
└── images/                 # Pasta de imagens
    └── certificates/       # Certificados organizados por categoria
        ├── data/
        ├── design/
        └── general/
```

## ⚙️ Configurações da Vercel

O arquivo `vercel.json` inclui:

- **Headers de segurança**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Cache otimizado**: Cache longo para assets estáticos, cache curto para HTML
- **Redirects**: Configuração para URLs limpas
- **Compressão**: Habilitada automaticamente

## 🎨 Personalização

### Cores Principais
```css
:root {
    --primary-color: #fbbf24;     /* Dourado */
    --secondary-color: #00d4ff;   /* Azul ciano */
    --accent-color: #ff6b9d;      /* Rosa */
    --background: #000000;        /* Preto */
    --text-light: #ffffff;        /* Branco */
}
```

### Fontes
- **Orbitron**: Títulos e elementos destacados
- **Rajdhani**: Texto principal
- **Exo 2**: Texto secundário

## 🔧 Otimizações Implementadas

- **Performance**:
  - Preload de recursos críticos
  - Compressão de imagens
  - Minificação de CSS/JS via Vercel
  - Cache headers otimizados

- **SEO**:
  - Meta tags completas
  - Open Graph tags
  - Structured data
  - URLs semânticas

- **Acessibilidade**:
  - Skip links
  - Estados ARIA
  - Navegação por teclado
  - Contraste adequado
  - Suporte a prefers-reduced-motion

## 📱 Responsividade

Breakpoints configurados:
- Mobile: < 480px
- Tablet: 481px - 768px
- Desktop: 769px - 1200px
- Large: > 1200px

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Contato

**Aleksandro Alves da Rocha Junior**
- Email: [seu-email@exemplo.com]
- LinkedIn: [seu-linkedin]
- GitHub: [seu-github]

---

Desenvolvido com ❤️ por Aleksandro Alves da Rocha Junior