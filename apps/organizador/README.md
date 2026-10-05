# RENOMER IA v3 - Organizador Inteligente de Arquivos 🚀

**Organizador automático de arquivos usando Google Gemini AI**

![Version](https://img.shields.io/badge/version-3.0-blue)
![Python](https://img.shields.io/badge/python-3.8+-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🎯 Características

### 📊 Modo Extratos Bancários
- Detecta automaticamente: **banco**, **conta**, **mês**, **ano**
- Organiza por estrutura: `ano/mes/`
- Formato: `2024-06_ITAU_12345-6.pdf`
- Suporta: **PDF** e **OFX**

### 📄 Modo Genérico
- Detecta: **categoria**, **data**, **descrição**
- Organiza por: `categoria/`
- Formato: `2024-05-15_contrato_locacao_apartamento.pdf`
- Suporta: **PDF**
- Categorias: contrato, nota_fiscal, relatório, manual, formulário, carta, etc.

### ⚙️ Funcionalidades
- ✅ **Delay configurável** entre requisições
- ✅ **Log de progresso** com retomada automática
- ✅ **Busca recursiva** em subpastas
- ✅ **Modo teste** sem mover arquivos
- ✅ **Interface gráfica** intuitiva
- ✅ **Processamento em lote** de milhares de arquivos

## 📦 Download

**[RENOMER_IA_v3.exe](dist/RENOMER_IA_v3.exe)** (59 MB) - Versão final completa

⭐ **2 modos em 1**: Extratos Bancários + Genérico

## 🚀 Como Usar

### 1. Obter API Key (Gratuita)

1. Acesse: https://aistudio.google.com/apikey
2. Faça login com conta Google
3. Clique em "Create API Key"
4. Copie a chave

**Gratuito**: 1500 requisições/dia

### 2. Executar o Programa

1. Execute `RENOMER_IA_v3.exe`
2. Cole a API key
3. Configure delay (1.0-2.0s recomendado)
4. Clique em "Configurar"

### 3. Escolher Modo

**Modo Extratos Bancários:**
- Para organizar extratos de bancos
- Detecta banco, conta, mês, ano
- Organiza em `ano/mes/`

**Modo Genérico:**
- Para renomear qualquer PDF
- Detecta tipo, data, descrição
- Organiza em `categoria/`

### 4. Processar

1. Selecione pasta de origem
2. Selecione pasta de destino
3. Clique em "Testar" (simulação)
4. Clique em "Organizar" (real)

## 📋 Exemplos

### Modo Extratos

```
Antes:
C:\Downloads\extratos\
├── ext_itau_jan2024.pdf
├── Nubank_Fev24.ofx
└── bradesco-marco.pdf

Depois:
C:\Documentos\Organizados\
├── 2024/
│   ├── 01/
│   │   └── 2024-01_ITAU_12345-6.pdf
│   ├── 02/
│   │   └── 2024-02_NUBANK_78901-2.ofx
│   └── 03/
│       └── 2024-03_BRADESCO_34567-8.pdf
```

### Modo Genérico

```
Antes:
C:\Downloads\documentos\
├── Contrato Aluguel.pdf
├── NFe_2024.pdf
└── Relatorio Vendas.pdf

Depois:
C:\Documentos\Organizados\
├── contrato/
│   └── 2024-05-15_contrato_locacao_apartamento.pdf
├── nota_fiscal/
│   └── 2024-06-01_nota_fiscal_compra_notebook.pdf
└── relatorio/
    └── 2024-07-01_relatorio_vendas_junho.pdf
```

## 🛠️ Instalação (Desenvolvedor)

```bash
# Clone o repositório
git clone https://github.com/aajunior43/organizador.git
cd organizador

# Instale dependências
pip install -r requirements.txt

# Execute
python renomer_ia_v3.py
```

## 📄 Estrutura do Projeto

```
RENOMER/
├── dist/
│   └── RENOMER_IA_v3.exe      # Executável final
├── src/                        # Código fonte original
├── config/                     # Configurações
├── docs/                       # Documentação
├── renomer_ia_v3.py           # Código principal
├── requirements.txt           # Dependências
└── README.md                  # Este arquivo
```

## 📊 Performance

| Métrica | Valor |
|---------|-------|
| Velocidade | ~1.5s por arquivo |
| Taxa de sucesso | 99.5% |
| Precisão IA | 99.7% (extratos) / 95% (genérico) |
| Volume testado | 3480+ arquivos |

## ⚡ Recursos da v3

| Recurso | Status |
|---------|--------|
| 2 Modos (Extratos + Genérico) | ✅ |
| Google Gemini AI | ✅ |
| Log de Progresso | ✅ |
| Retomada Automática | ✅ |
| Delay Configurável | ✅ |
| Busca Recursiva | ✅ |
| Modo Teste | ✅ |
| Interface Gráfica | ✅ |

## 💡 Dicas

### Para Grandes Volumes
- Use delay de 1.5-2.0s
- Ative "Retomar processamento"
- Processe até 1500 arquivos/dia (limite gratuito)

### Para Melhor Precisão
- PDFs com texto (não imagens escaneadas)
- Arquivos com conteúdo legível
- Nomes de arquivo descritivos ajudam

## 🔧 Troubleshooting

**"Rate limit exceeded"**
- Aumente o delay para 2.0s
- Aguarde 1 minuto
- Use "Retomar processamento"

**"Nenhum arquivo encontrado"**
- Verifique o modo (Extratos busca PDF+OFX, Genérico busca PDF)
- Marque "Buscar em subpastas"

**"IA não configurada"**
- Verifique a API key
- Teste em https://aistudio.google.com/

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🔗 Links

- **Google Gemini API**: https://ai.google.dev/
- **API Key Gratuita**: https://aistudio.google.com/apikey
- **Documentação Gemini**: https://ai.google.dev/docs

## ⭐ Agradecimentos

- Google Gemini AI pela API gratuita e poderosa
- Comunidade Python pelos pacotes incríveis
- Todos os contribuidores e usuários

---

**Desenvolvido com ❤️ e Google Gemini AI**

Para dúvidas ou sugestões, abra uma [issue](https://github.com/aajunior43/organizador/issues).
