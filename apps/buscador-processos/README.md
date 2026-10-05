# ⚖️ Buscador de Processos Judiciais

Ferramenta automatizada para buscar processos judiciais por CPF ou CNPJ em tribunais brasileiros usando Python e Selenium.

## ✨ Funcionalidades

- 🔍 **Busca em múltiplos tribunais** brasileiros
- 📊 **Relatórios em TXT e HTML** para fácil visualização
- 🤖 **Detecção de CAPTCHA** com 5 métodos (PT-BR + EN)
- 📁 **Organização por documento** (CPF ou CNPJ)
- 🌐 **Busca em plataformas** especializadas (Jusbrasil)

## 🚀 Instalação

### Pré-requisitos
- Python 3.7+
- Google Chrome instalado

### Instalar dependências

```bash
pip install -r requirements.txt
```

## 📖 Como Usar

### 🖥️ Interface Gráfica (GUI) - Recomendado

A interface gráfica oferece uma experiência mais intuitiva com validação em tempo real e acompanhamento visual do progresso.

#### Executar via Batch (Windows)
```bash
executar_gui.bat
```

#### Executar via Python
```bash
python gui.py
```

**Recursos da GUI:**
- ✅ Validação em tempo real do CPF/CNPJ
- 📊 Barra de progresso visual
- 📄 Log colorido de resultados
- 📁 Botão para abrir pasta de resultados
- 🌐 Botão para abrir relatório HTML
- 🔄 Interface não-bloqueante (threading)

### 💻 Interface de Linha de Comando (CLI)

A interface CLI mantém a experiência tradicional de linha de comando.

#### Executar via Batch (Windows)
```bash
executar.bat
```

#### Executar via Python
```bash
python cli.py
# ou
python main.py
```

### Exemplo de Uso (CLI)

```
📋 Digite o CPF ou CNPJ
   CPF: 000.000.000-00 ou 00000000000
   CNPJ: 00.000.000/0000-00 ou 00000000000000

🔢 CPF/CNPJ: 12345678900
```

## 📦 Estrutura do Projeto

```
buscador-processos/
├── core.py              # Módulo compartilhado com lógica de busca
├── gui.py               # Interface gráfica (tkinter)
├── cli.py               # Interface de linha de comando
├── main.py              # Ponto de entrada (compatibilidade)
├── executar_gui.bat     # Launcher da GUI
├── executar.bat         # Launcher da CLI
├── requirements.txt     # Dependências Python
├── README.md           # Documentação
└── resultados/         # Pasta com resultados das buscas
    └── CPF_12345678900/
        ├── processos_20260129_110000.txt
        └── processos_20260129_110000.html
```

## 📁 Estrutura de Resultados

```
resultados/
└── CPF_12345678900/
    ├── processos_20260127_144530.txt
    └── processos_20260127_144530.html
```

## 🏛️ Tribunais e Fontes Consultadas

| Categoria | Fontes |
|-----------|--------|
| ⚖️ Tribunais de Justiça | TJSP, TJRJ, TJMG |
| 🏛️ Justiça Federal | TRF1, TRF2, TRF3, TRF4, TRF5 |
| 📜 Tribunais Superiores | STF, STJ, TST |
| 🔍 Plataformas | Jusbrasil |
| 📄 Documentos | PDFs de processos em sites .jus.br |

## 📊 Formatos de Relatório

### Arquivo TXT
```
# Processos Judiciais - CPF: 123.456.789-00
# Data da busca: 27/01/2026 14:45:30
================================================================================

## Google - Processos Judiciais (5 resultados)
--------------------------------------------------------------------------------

1. Processo nº 1234567-89.2024.8.26.0100
   Link: https://...
   Descrição: ...
```

### Arquivo HTML
Relatório visual formatado com CSS para fácil navegação e leitura.

## 🤖 Detecção de CAPTCHA

O script detecta CAPTCHAs automaticamente usando 5 métodos:

1. **Verificação de URL** - Detecta `/sorry/` ou `captcha`
2. **Análise de texto** - Procura palavras-chave (PT-BR + EN)
3. **Detecção de iFrames** - Identifica reCAPTCHA
4. **Elementos visuais** - Procura `div.g-recaptcha`
5. **Título da página** - Verifica se contém "captcha" ou "verify"

Quando detectado, o script pausa e aguarda resolução manual.

## 🔧 Configurações

### Alterar número de resultados por busca

No arquivo `main.py`:
```python
for result in search_results[:10]:  # Altere 10 para outro valor
```

## ⚠️ Aviso Legal

Esta ferramenta é apenas para fins educacionais e de pesquisa. Use com responsabilidade e respeite os termos de serviço das plataformas e a privacidade das pessoas.

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar.
