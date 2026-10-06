# 🔍 Buscador de Grupos e Comunidades

Ferramenta automatizada para buscar links de grupos e comunidades em múltiplas plataformas sociais usando Python e Selenium.

## 📱 Plataformas Suportadas

| Plataforma | Emoji | Padrão de Link |
|------------|-------|----------------|
| WhatsApp | 🟢 | `chat.whatsapp.com` |
| Telegram | 🔵 | `t.me` |
| Discord | 🟣 | `discord.gg` |
| Reddit | 🟠 | `reddit.com/r/` |
| Facebook Groups | 🔵 | `facebook.com/groups/` |

## ✨ Funcionalidades

- 🔍 **Busca automatizada** no Google com termos específicos
- 🤖 **Detecção de CAPTCHA** com 5 métodos diferentes (PT-BR + EN)
- 📄 **Paginação automática** (até 5 páginas por busca)
- 💾 **Exportação automática** em arquivos TXT organizados por tema
- 🔄 **Modo multi-plataforma** para buscar em todas de uma vez
- 📝 **Extração inteligente** de links em href e texto simples

## 🚀 Instalação

### Pré-requisitos
- Python 3.7+
- Google Chrome instalado

### Instalar dependências

```bash
pip install -r requirements.txt
```

## 📖 Como Usar

### 🎨 Interface Gráfica (GUI) - RECOMENDADO

A versão GUI oferece uma experiência visual moderna e intuitiva:

#### Executar via Batch (Windows)
```bash
executar_gui.bat
```

#### Executar via Python
```bash
python main_gui.py
```

#### Recursos da GUI:
- ✨ Interface moderna com tema escuro
- 📊 Barra de progresso visual com percentual
- 🔄 Atualizações de progresso em tempo real
- 🤖 Notificações de CAPTCHA com popup
- ⏹ Botão para parar busca a qualquer momento
- 📁 Abertura rápida da pasta de resultados
- 🎯 Seleção visual de plataformas
- 📜 Histórico de buscas (últimas 10)
- ⚙️ Configurações personalizáveis:
  - Número de páginas (1-20)
  - Auto-abrir pasta de resultados
- ⌨️ Atalhos de teclado:
  - `Ctrl+Enter` - Iniciar busca
  - `Ctrl+S` - Parar busca
  - `Ctrl+O` - Abrir resultados
  - `Ctrl+H` - Ver histórico
  - `Esc` - Fechar diálogos

---

### 💻 Interface de Linha de Comando (CLI)

Para usuários que preferem o terminal:

#### Executar via Batch (Windows)
```bash
executar.bat
```

#### Executar via Python
```bash
python main.py
```

### Menu Interativo

```
📱 Escolha a plataforma para buscar:
   1 - WhatsApp
   2 - Telegram
   3 - Discord
   4 - Reddit
   5 - Facebook Groups
   6 - Todas - Buscas separadas
```

## 📁 Estrutura de Resultados

Os links são salvos automaticamente em:

```
resultados/
├── futebol/
│   ├── whatsapp_20260127_114532.txt
│   └── telegram_20260127_114645.txt
└── todos_grupos/
    └── whatsapp_20260127_121500.txt
```

### Formato dos Arquivos

```
# Links de WHATSAPP
# Termo de busca: futebol
# Data: 27/01/2026 11:45:32
# Total: 15 links
============================================================

https://chat.whatsapp.com/ABC123...
https://chat.whatsapp.com/DEF456...
```

## 🤖 Detecção de CAPTCHA

O script detecta CAPTCHAs automaticamente usando 5 métodos:

1. **Verificação de URL** - Detecta `/sorry/` ou `captcha`
2. **Análise de texto** - Procura palavras-chave (PT-BR + EN)
3. **Detecção de iFrames** - Identifica reCAPTCHA
4. **Elementos visuais** - Procura `div.g-recaptcha`
5. **Título da página** - Verifica se contém "captcha" ou "verify"

Quando detectado, o script pausa e aguarda resolução manual.

## 🔧 Configurações

### Alterar número máximo de páginas

No arquivo `main.py`:
```python
max_paginas = 5  # Altere para 10, 15, etc.
```

## ⚠️ Aviso Legal

Esta ferramenta é apenas para fins educacionais. Use com responsabilidade e respeite os termos de serviço das plataformas.

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar.
