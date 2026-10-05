# Especificação: melhoria completa do editor de PDF

## Objetivo

Transformar o módulo `Ferramentas PDF` em uma experiência consistente de edição e processamento local, com preview visual, seleção e ordenação de páginas, feedback operacional, acessibilidade e comportamento responsivo.

## Escopo funcional

### Base compartilhada

- Upload por clique e drag-and-drop.
- Validação de PDF, tamanho e estado de leitura.
- Preview com miniaturas, página atual, zoom, ajuste à largura e navegação.
- Seleção visual de páginas com suporte a teclado.
- Reordenação por arrastar e soltar, além de controles por botão.
- Remoção, rotação e duplicação de páginas quando suportadas pela biblioteca existente.
- Estados de carregamento, sucesso, erro e resultado baixado.

### Mesclar

- Fila de múltiplos PDFs com nome, tamanho, quantidade de páginas e miniatura.
- Reordenação dos arquivos por drag-and-drop.
- Preview da ordem final.
- Remoção de arquivos e ação de mesclar desabilitada até haver dois arquivos válidos.

### Dividir

- Seleção de páginas por miniaturas.
- Entrada manual de páginas e intervalos.
- Atalhos para todas, pares, ímpares, inverter e limpar.
- Exibição da ordem do PDF resultante.

### Comprimir

- Dois níveis: equilibrada e máxima.
- Aviso destacado no modo máximo sobre JPEG, perda de qualidade e possível remoção da seleção de texto.
- Confirmação antes da compressão máxima.
- Resultado com tamanho anterior, tamanho final e redução aproximada.

### Proteger

- Campos de senha e confirmação.
- Mostrar/ocultar senha.
- Indicador simples de força.
- Mensagem clara de que a senha não pode ser recuperada.

## Direção visual

- Preservar o sistema visual existente, usando os componentes UI já adotados.
- Substituir a dependência de um `iframe` único por uma área de editor com miniaturas e painel principal.
- Manter o processamento local, mas trocar a mensagem “sem limite” por limites técnicos reais e compreensíveis.
- Melhorar a visualização em telas pequenas com abas roláveis e layout vertical.
- Usar textos UTF-8 corretos e linguagem operacional objetiva.

## Arquitetura

Extrair da página atual componentes reutilizáveis:

- `PdfDropzone`: seleção e validação.
- `PdfWorkspace`: estado do documento, página ativa, zoom e navegação.
- `PdfThumbnailRail`: miniaturas, seleção e ordenação.
- `PdfFileQueue`: fila de documentos para mesclagem.
- `PdfProcessingStatus`: carregamento, erro e resultado.
- `PdfResultCard`: arquivo final, tamanho e download novamente.

As operações continuarão usando as funções existentes de `src/lib/pdfUtils.ts`. A página `PdfUtils.tsx` ficará responsável por composição e estado de cada aba, enquanto os componentes compartilhados cuidarão da interação visual.

## Erros e segurança

- Rejeitar arquivos inválidos com mensagem específica.
- Desabilitar ações enquanto o processamento estiver em andamento.
- Preservar o arquivo original e sempre gerar uma cópia.
- Informar limitações de memória e tamanho quando relevantes.
- Não enviar documentos para serviços externos.

## Testes e validação

- Testar parsing de páginas e intervalos.
- Testar seleção, inversão, limpeza e ordenação.
- Testar validação de senha e confirmação.
- Testar estados de erro e carregamento.
- Executar a suíte existente, build de produção e inspeção responsiva.

## Fora do escopo

- Edição de texto interno do PDF.
- OCR ou reconhecimento de texto.
- Assinatura digital dentro deste módulo.
- Upload ou armazenamento permanente dos PDFs processados.
