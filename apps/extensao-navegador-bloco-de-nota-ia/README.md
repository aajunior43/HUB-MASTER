# 📝 Quick Notes AI

> Extensão Chrome para bloco de notas com nomes de arquivos gerados por IA

Uma extensão minimalista e inteligente para Chrome que permite criar notas rapidamente e baixá-las com nomes de arquivo gerados automaticamente pela **Google Gemini AI**, baseados no conteúdo das suas notas.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Funcionalidades

- 📝 **Editor minimalista** - Interface limpa e focada em escrever
- 🤖 **Nomes inteligentes** - IA da Google Gemini sugere nomes apropriados para seus arquivos
- 💾 **Download rápido** - Baixe suas notas como arquivo .txt com um clique
- 🧹 **Limpeza fácil** - Botão para limpar notas rapidamente
- 📊 **Contadores** - Contagem de caracteres e palavras em tempo real
- ⌨️ **Atalhos de teclado** - `Ctrl+D` para baixar, `Ctrl+L` para limpar
- 🎨 **Design moderno** - Interface com gradiente roxo e design glassmorphism
- 🔒 **Privacidade** - API Key armazenada localmente no navegador

## 🚀 Como Instalar

### 1. Obter a API Key do Gemini

1. Acesse: [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Copie sua API Key (gratuitamente)

### 2. Instalar a Extensão

1. Baixe ou clone este repositório
2. Abra o Chrome e digite: `chrome://extensions/`
3. Ative o **"Modo do desenvolvedor"** (canto superior direito)
4. Clique em **"Carregar sem compactação"**
5. Selecione a pasta do projeto
6. A extensão aparecerá na barra de ferramentas!

### 3. Configurar

1. Clique no ícone da extensão
2. Cole sua API Key do Gemini no campo inferior
3. Clique em **"Salvar"**
4. Pronto! Comece a usar

## 💡 Como Usar

1. **Escrever**: Digite suas notas no editor
2. **Baixar**: Clique no botão de download (ou `Ctrl+D`)
3. **IA em ação**: A IA analisará o conteúdo e criará um nome apropriado
4. **Arquivo salvo**: Seu arquivo .txt será baixado automaticamente

### Exemplos de Nomes Gerados

| Conteúdo da Nota | Nome Gerado pela IA |
|-----------------|-------------------|
| Lista de compras: leite, pão, ovos | `lista-compras-mercado.txt` |
| Reunião de projeto às 15h | `reuniao-projeto-15h.txt` |
| Ideias para o blog sobre JavaScript | `ideias-blog-javascript.txt` |
| Receita de bolo de chocolate | `receita-bolo-chocolate.txt` |

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl + D` (ou `Cmd + D` no Mac) | Baixar notas com nome gerado por IA |
| `Ctrl + L` (ou `Cmd + L` no Mac) | Limpar todas as notas |

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura da interface
- **CSS3** - Estilos modernos com gradientes e glassmorphism
- **JavaScript (ES6+)** - Lógica da aplicação
- **Google Gemini AI (2.5 Flash)** - Geração inteligente de nomes
- **Chrome Extension API** - Integração com o navegador
- **LocalStorage API** - Armazenamento seguro da API Key

## 📁 Estrutura do Projeto

```
quick-notes-ai/
├── manifest.json       # Configuração da extensão
├── popup.html         # Interface do usuário
├── popup.css          # Estilos da extensão
├── popup.js           # Lógica e integração com IA
└── README.md          # Este arquivo
```

## 🔒 Privacidade e Segurança

- ✅ **Sem armazenamento em nuvem** - Suas notas não são salvas
- ✅ **API Key local** - Armazenada apenas no seu navegador
- ✅ **Sem rastreamento** - Sem analytics ou telemetria
- ✅ **Código aberto** - Você pode auditar todo o código

## 🌐 Compatibilidade

- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Brave Browser
- ✅ Opera
- ✅ Vivaldi
- ✅ Qualquer navegador baseado em Chromium

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 💬 Suporte

Encontrou um bug ou tem alguma sugestão?

- 🐛 Abra uma [issue](https://github.com/aajunior43/extensao-navegador-bloco-de-nota-ia/issues)
- ⭐ Deixe uma estrela se você gostou do projeto!

## 🎯 Roadmap

- [ ] Temas customizáveis (claro/escuro)
- [ ] Múltiplas notas com abas
- [ ] Exportar em outros formatos (PDF, MD)
- [ ] Sincronização opcional com Google Drive
- [ ] Busca e filtros de notas antigas
- [ ] Formatação de texto (negrito, itálico, listas)

## 👨‍💻 Autor

Desenvolvido com ❤️ por [aajunior43](https://github.com/aajunior43)

---

⭐ Se este projeto te ajudou, considere dar uma estrela!
