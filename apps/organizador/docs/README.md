# 🏦 ORGANIZADOR DE EXTRATOS BANCÁRIOS - SISTEMA LOCAL

Sistema local avançado para organização automática de extratos bancários **SEM IA**.

## 🚀 COMO USAR

### Execução Simples:
1. **Duplo clique** em `INICIAR.bat`
2. **Interface gráfica** abre automaticamente
3. **Selecione** pastas de origem e destino
4. **Execute** organização ou prévia

## 🎯 INTERFACE COM SELETOR DE PASTAS

### Configuração de Pastas:
- **Pasta de Origem**: Onde estão seus extratos
- **Pasta de Destino**: Onde organizar os arquivos
- **Configurações salvas** automaticamente

### Botões de Ação:
- **ORGANIZAR EXTRATOS**: Execução real (move arquivos)
- **VISUALIZAR PRÉVIA**: Modo teste (não move nada)
- **GERAR RELATÓRIO**: Cria relatório HTML dos resultados

## 🧠 DETECÇÃO INTELIGENTE LOCAL

### Datas Detectadas:
- **MM/YYYY**: `06/2023`, `12/2024`
- **MM/YY**: `06/23`, `12/24`
- **YYYY/MM**: `2023/06`, `2024/12`
- **YYYYMM**: `202306`, `202412`
- **Nomes**: `JUNHO`, `JUN`, `DEZEMBRO`, `DEZ`

### Contas Detectadas:
- **Com hífen**: `12345-6`, `98765-X`
- **Simples**: `123456`, `987654`
- **EXT**: `EXT JUNHO 12345-6`
- **Extrato**: `Extrato123456`
- **CAIXA**: `CAIXA JAN 123-4`
- **Banco**: `BANCO 123456`, `CONTA 987654`

## 📁 ESTRUTURA DE ORGANIZAÇÃO

```
PASTA_DESTINO/
└── CONTA_123456/
    ├── 2023_06_JUNHO/
    │   ├── 2023-06_123456_PDF.pdf
    │   └── 2023-06_123456_OFX.ofx
    ├── 2023_12_DEZEMBRO/
    │   ├── 2023-12_123456_PDF.pdf
    │   └── 2023-12_123456_OFX.ofx
    └── 2024_01_JANEIRO/
        └── 2024-01_123456_OFX.ofx
```

## ✨ CARACTERÍSTICAS

### 🎯 **Sistema 100% Local**:
- ✅ **Sem IA** - Não precisa de internet
- ✅ **Sem APIs** - Totalmente gratuito
- ✅ **Rápido** - Processamento instantâneo
- ✅ **Privado** - Dados não saem do computador

### 🔍 **Detecção Avançada**:
- ✅ **Múltiplos formatos** de data
- ✅ **Padrões diversos** de conta
- ✅ **Validação automática** de resultados
- ✅ **Tratamento de duplicatas**

### 🖥️ **Interface Amigável**:
- ✅ **Seletor de pastas** visual
- ✅ **Configurações salvas** automaticamente
- ✅ **Log em tempo real** do processamento
- ✅ **Prévia antes** de executar

### 📊 **Relatórios Completos**:
- ✅ **HTML visual** com estatísticas
- ✅ **JSON detalhado** para análise
- ✅ **Lista de erros** específicos
- ✅ **Histórico** de processamentos

## 🔧 ARQUIVOS DO SISTEMA

### Essenciais:
- `INICIAR.bat` - Arquivo principal
- `interface_com_seletor.py` - Interface gráfica com seletor
- `organizador_local_avancado.py` - Sistema de organização
- `relatorio_simples.py` - Gerador de relatório
- `app.py` - Servidor web/API (opcional)
- `config.py` - Configurações

### Documentação:
- `README.md` - Este guia
- `requirements.txt` - Dependências mínimas

## ⚙️ FLUXO RECOMENDADO

### Primeira Execução:
1. **Execute** `INICIAR.bat`
2. **Selecione** pasta de origem (seus extratos)
3. **Selecione** pasta de destino (onde organizar)
4. **Clique "VISUALIZAR PRÉVIA"** para ver resultado
5. **Se OK, clique "ORGANIZAR EXTRATOS"**

### Uso Regular:
1. **Execute** `INICIAR.bat`
2. **Pastas já configuradas** automaticamente
3. **Clique "ORGANIZAR EXTRATOS"** diretamente
4. **Gere relatório** se necessário

## 🛡️ VALIDAÇÕES AUTOMÁTICAS

- **Data válida**: Mês 1-12, ano 2020-2030
- **Conta válida**: Mínimo 3 caracteres
- **Pasta existe**: Verifica origem antes de processar
- **Não duplicar**: Origem ≠ destino
- **Backup automático**: Versiona arquivos duplicados

## 🔍 EXEMPLO DE DETECÇÃO

### Arquivo: `EXT JUNHO 12345-6 INVEST.pdf`
- **Data detectada**: `JUNHO` → `06/2024` (ano atual)
- **Conta detectada**: `12345-6` → `123456`
- **Resultado**: `CONTA_123456/2024_06_JUNHO/2024-06_123456_PDF.pdf`

### Arquivo: `Extrato987654 062023.ofx`
- **Data detectada**: `062023` → `06/2023`
- **Conta detectada**: `987654`
- **Resultado**: `CONTA_987654/2023_06_JUNHO/2023-06_987654_OFX.ofx`

---

**Sistema 100% local, rápido e confiável - Sem dependências externas!**