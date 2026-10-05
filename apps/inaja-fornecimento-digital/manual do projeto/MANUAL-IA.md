# Manual do Projeto — Inajá Fornecimento Digital

> **Propósito:** referência completa de **funcionalidades**, módulos e fluxos de uso.

**Documentos relacionados:** [README](./README.md) · [Cenários práticos](./CENARIOS-E-EXEMPLOS.md) · [Regras de negócio](./REGRAS-NEGOCIO.md) · [Visual](./MANUAL-VISUAL-IA.md) · [Infraestrutura](./MANUAL-INFRAESTRUTURA-IA.md) · [Glossário](./GLOSSARIO.md)

---

## 1. Visão geral

**Nome:** Inajá Fornecimento Digital  
**Cliente:** Prefeitura Municipal de Inajá — Estado do Paraná  
**Desenvolvedor:** DEV Aleksandro Alves  
**URL local:** `http://localhost:8080/`  
**Banco de dados:** SQLite local em `data/inaja.sqlite`  
**Stack:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui  

O sistema é um hub de módulos administrativos. Após o login, o usuário vê a **Visão Geral** com cards clicáveis que levam a cada módulo.

### Módulos disponíveis

| Módulo | Rota | Função principal |
|--------|------|------------------|
| Solicitações | `/solicitacoes` | Emissão de solicitações de aquisição (PDF, Word, Excel), histórico, modelos e lote |
| Mural de Tarefas | `/tarefas` | Quadro Kanban de demandas internas |
| Calculadora de Diárias | `/diarias` | Cálculo de diárias conforme decreto municipal |
| Credores Fixos | `/credores-fixos` | Credores mensais recorrentes e controle de empenhos |

---

## 2. Como iniciar o sistema

### Pré-requisitos
- Node.js instalado
- Dependências: `npm install --legacy-peer-deps` (feito automaticamente pelo script)

### Comando rápido (Windows)
Executar `rodar.bat` na raiz do projeto. Ele:
1. Verifica Node.js
2. Instala dependências se necessário
3. Inicia `npm run dev` em `http://localhost:8080/`

### Banco de dados
- Arquivo: `data/inaja.sqlite`
- Criado automaticamente na primeira execução
- Tabelas: `usuarios`, `solicitacoes`, `solicitantes`, `empresas`, `observacoes`, `modelos`, `tarefas`, `credores_fixos`, `empenhos_mensais`

---

## 3. Autenticação e usuários

### Rota
`/login`

### Usuários cadastrados
| Usuário | Senha | Comportamento |
|---------|-------|---------------|
| `aleksandro` | Criada no 1º acesso | Tela de **criar senha** |
| `maicon` | Criada no 1º acesso | Tela de **criar senha** |
| `luana` | Criada no 1º acesso | Tela de **criar senha** |

### Fluxo de login (3 etapas)

1. **Usuário** — digitar o nome de usuário e clicar "Continuar"
2. **Login** — se já tem senha: digitar senha e "Entrar"
3. **Criar senha** — se é primeiro acesso: nova senha + confirmação (mín. 4 caracteres) e "Criar e entrar"

### Regras de senha
- Mínimo 4 caracteres
- Senha só pode ser criada **uma vez** por usuário (não há redefinição pelo app)
- Senhas armazenadas com hash scrypt no banco
- Para forçar senha do aleksandro: `node scripts/set-aleksandro-password.mjs`

### Sessão
- Armazenada em `localStorage` com chave `prefeitura_user`
- Botão **Sair** no hub limpa a sessão e redireciona para `/login`
- Rotas protegidas: todas exceto `/login` exigem usuário logado

---

## 4. Navegação e rotas

```
/login              → Tela de autenticação
/                   → Hub de módulos (Visão Geral)
/solicitacoes       → Módulo de Solicitações
/tarefas            → Mural de Tarefas (Kanban)
/diarias            → Calculadora de Diárias
/credores-fixos     → Credores Fixos
/*                  → Página 404
```

### Padrão de navegação
- Cada módulo tem botão **Voltar** ou **Módulos** que retorna ao hub (`/`)
- O hub exibe o nome do usuário logado e botão **Sair**

---

## 5. Identidade visual e efeitos do site

### Paleta e tema
- **Verde esmeralda** (`#064E3B`) — cor primária institucional
- **Dourado** (`#C9A84C`) — destaques e acentos
- Gradientes `bg-gradient-emerald` nos cabeçalhos
- Tipografia display para títulos (`font-display`)

### Efeitos visuais recorrentes
| Efeito | Onde aparece | Descrição |
|--------|--------------|-----------|
| `GlowCard` (spotlight) | Hub de módulos | Cards com brilho colorido ao passar o mouse (verde, laranja, azul, roxo, vermelho) |
| `bg-gradient-emerald` | Headers de todas as páginas | Fundo verde com gradiente |
| Radial gradients | Headers | Círculos de luz sutis no fundo |
| `backdrop-blur` | Cards de login e header sticky | Desfoque de fundo |
| `animate-fade-in` | Transição entre views | Animação de entrada suave |
| `shadow-card` / `shadow-elevated` | Cards | Sombras em camadas |
| `hover:scale-[1.02]` | Botões de ação | Leve zoom ao hover |
| Sidebar colapsável | Módulo Solicitações | Menu lateral que encolhe para ícones |
| Badges coloridos | Kanban, histórico, credores | Indicadores de status/prioridade |
| Barras de destaque | Seções de formulário | Barra vertical colorida (`w-1 h-6 bg-accent`) à esquerde dos títulos |

### Elementos institucionais fixos
- Brasão da prefeitura: `/brasao.png`
- Endereço: Av. Antônio Veiga Martins, 80 — CEP 87670-200
- Telefone: (44) 3112-4320
- E-mail: prefeito@inaja.pr.gov.br
- Rodapé: "Desenvolvido por DEV ALEKSANDRO ALVES"

---

## 6. Módulo: Solicitações (`/solicitacoes`)

Sistema completo de **Solicitação de Aquisição de Produtos ou Serviços**. Possui menu lateral com 6 seções internas (views).

### 6.1 Sidebar — seções internas

| View | Nome no menu | Função |
|------|--------------|--------|
| `form` | Solicitação | Formulário principal de nova solicitação |
| `batch` | Solicitação em Lote | Processar múltiplas solicitações via arquivo .txt |
| `history` | Histórico | Consultar solicitações salvas no banco |
| `data` | Dados Salvos | Gerenciar solicitantes, empresas e observações |
| `templates` | Modelos | Salvar e carregar modelos de formulário |
| `settings` | Preferências | Ajustar tamanho da fonte dos documentos |

### 6.2 Formulário de solicitação (`form`)

#### Campos principais
- **Nome do Solicitante** — combobox com autocomplete dos solicitantes salvos
- **Empresa / Departamento** — combobox com empresas salvas
- **Data da Solicitação** — padrão: data de hoje (dd/MM/yyyy)
- **Observações Gerais** — texto livre

#### Itens da solicitação
Cada item tem:
- Código (automático, sequencial)
- Item (nome)
- Descrição
- Quantidade
- Valor unitário
- Valor total (calculado automaticamente: qtd × valor unit.)

**Checkbox "Incluir itens e valores":**
- Marcado (padrão): gera tabela de itens nos documentos
- Desmarcado: solicitação sem tabela de itens nem valores

#### Anexos
- Upload de arquivos anexados à solicitação
- Incluídos no PDF gerado

#### Assinatura digital
- Pad de assinatura desenhável com mouse/touch
- Incluída no PDF exportado

#### Painel "Ações do Sistema" (lado direito)
| Botão | Ação |
|-------|------|
| Visualizar | Abre preview do documento antes de exportar |
| PDF | Gera PDF e **salva no banco** (`solicitacoes`) |
| Word | Gera arquivo .docx para download |
| Excel | Gera planilha .xlsx formatada para download |
| Limpar | Reseta todos os campos do formulário |

#### Protocolo
- Exibido no header: `#ANO-NNNN` (baseado no ano e quantidade de itens)
- Apenas visual, não é número oficial persistido

### 6.3 Preview (visualização)
- Acessível pelo botão "Visualizar"
- Mostra documento formatado como será impresso
- Permite exportar PDF, Word ou Excel direto da preview
- Botão "Voltar ao Formulário" retorna à edição

### 6.4 Solicitação em Lote (`batch`)

Processa múltiplas solicitações de um arquivo `.txt`.

#### Formato do arquivo (obrigatório)
```
SOLICITANTE|EMPRESA|OBSERVACOES|ITEM1:DESCRICAO1:QTD1:VALOR1;ITEM2:DESCRICAO2:QTD2:VALOR2
```

**Regras:**
- Exatamente 4 campos separados por `|`
- Itens separados por `;`
- Detalhes do item: `NOME:DESCRIÇÃO:QUANTIDADE:VALOR` separados por `:`
- Decimais com ponto (ex: `25.50`)
- Linhas com `#` são comentários (ignoradas)
- Solicitante e empresa são obrigatórios

**Exemplo:**
```
João Silva|Secretaria de Obras|Reforma da escola|Tinta Latex:Tinta branca 18L:5:45.00;Rolo:Rolo espuma 23cm:10:8.50
```

#### Ações disponíveis
- **Baixar modelo** — arquivo `.txt` de exemplo
- **Baixar instruções para IA** — guia para gerar arquivos de lote
- **Upload de arquivo** — valida linha a linha e mostra erros
- **Processar lote** — carrega solicitações válidas na memória
- **Gerar Lote PDF** — um PDF com todas as solicitações processadas
- **Exportar JSON** — backup das solicitações processadas
- **Limpar Lote** — remove solicitações processadas da sessão

#### Resumo após processamento
Exibe cards com: total de solicitações, valor total, solicitantes únicos, empresas únicas.

### 6.5 Histórico (`history`)

- Lista todas as solicitações salvas no banco (ordenadas por data de criação)
- **Busca** por solicitante, empresa, data ou observações
- **Reimprimir PDF** — gera PDF a partir dos dados salvos
- **Duplicar** — carrega dados no formulário para nova solicitação (data atualizada para hoje)
- **Excluir** — remove do banco (com confirmação)
- Atualização em tempo real quando há mudanças

### 6.6 Dados Salvos (`data`)

Gerencia listas reutilizáveis no banco:
- **Solicitantes** — nomes de pessoas
- **Empresas** — departamentos/empresas
- **Observações** — textos de observação frequentes

**Ações:**
- Adicionar novo registro
- Selecionar para preencher o formulário atual
- Excluir registro
- Exportar/importar JSON (backup local)

Esses dados alimentam os comboboxes do formulário e a busca global.

### 6.7 Modelos (`templates`)

- **Salvar modelo** — grava formulário + itens atuais com um nome
- **Carregar modelo** — aplica dados salvos no formulário
- **Excluir modelo**
- **Importar de arquivo JSON**
- Modelos ficam no banco (`modelos`)

### 6.8 Preferências (`settings`)

- **Tamanho da fonte** — controla o tamanho do texto nos PDFs e na preview (padrão: 12px)

### 6.9 Busca global (atalho)

- **Atalho:** `Ctrl+K` (ou `Cmd+K` no Mac)
- Também acessível pelo botão "Buscar" no header
- Busca em:
  - Solicitantes salvos
  - Empresas salvas
  - Solicitações do histórico (últimas 100)
- Ações ao selecionar:
  - Preencher solicitante/empresa no formulário
  - Duplicar solicitação
  - Reimprimir PDF

---

## 7. Módulo: Mural de Tarefas (`/tarefas`)

Quadro **Kanban** para organizar demandas internas da prefeitura.

### Colunas
| Status | Nome | Cor do topo |
|--------|------|-------------|
| `todo` | A Fazer | Cinza |
| `doing` | Em Andamento | Verde primário |
| `done` | Concluído | Verde escuro |

### Campos de uma tarefa
- **Título** (obrigatório)
- **Descrição**
- **Responsável** — opções: `ALEKSANDRO`, `LUANA`, `MAICON`, `TODOS`
- **Prazo** — data
- **Prioridade** — `baixa`, `media`, `alta` (badge colorido)
- **Status** — coluna do Kanban

### Ações
| Ação | Como fazer |
|------|------------|
| Criar tarefa | Botão "Nova Tarefa" ou `+` em cada coluna |
| Editar | Ícone de lápis no card |
| Excluir | Ícone de lixeira no card |
| Mover entre colunas | Arrastar e soltar (drag & drop) |
| Voltar ao hub | Botão "Módulos" no header |

### Dados
- Persistidos na tabela `tarefas` do SQLite
- Sincronização em tempo real entre abas do mesmo navegador

---

## 8. Módulo: Calculadora de Diárias (`/diarias`)

Calcula direito a diárias conforme **Decreto Municipal nº 019/2025** (Inajá/PR).

### Base legal
- **Anexo I** — Lei nº 1.090/2019 (Prefeito, Vice e Secretários)
- **Anexo II** — Lei nº 1.087/2019, alterada pela Lei nº 1.284/2023 (demais servidores)

### Campos de entrada
- **Cargo/função** — Prefeito/Vice, Secretário, Procurador, Diretor, Supervisor, Motorista, Outros
- **Destino** — varia conforme o anexo do cargo:
  - Curitiba / Foz do Iguaçu
  - Demais cidades do Paraná
  - Brasília / demais capitais
  - Demais cidades fora do Estado (só Anexo I)
- **Saída** — data/hora (`datetime-local`)
- **Retorno** — data/hora (`datetime-local`)

### Regras de cálculo
| Tempo de afastamento | Resultado |
|---------------------|-----------|
| Menor que 12h | Sem direito a diária |
| De 12h a 24h | 1 diária integral |
| Acima de 24h | 1 diária + 1 diária extra a cada 12h além das 24h iniciais |

### Resultado exibido
- Horas fora
- Pernoites (noites entre saída e retorno)
- Diárias integrais
- Valor unitário da diária (conforme cargo + destino)
- Valor total devido
- Texto explicativo da regra aplicada

### Exportação
- Botão **Exportar PDF** — gera relatório formatado com cabeçalho institucional
- Status visual: verde se há direito, vermelho se reprovado

### Valores de referência (diária integral)
Exemplos por cargo/destino (valores em R$):
- Prefeito/Vice — Interior PR: 333,67 | Curitiba/Foz: 667,33 | Capitais: 1.067,73
- Secretário — Interior PR: 333,67 | Curitiba/Foz: 667,33 | Capitais: 1.001,00
- Demais servidores (Anexo II) — Interior PR: 188,69 | Curitiba/Foz: 419,32 | Capitais: 524,15
- Motorista — Interior PR: 209,66

---

## 9. Módulo: Credores Fixos (`/credores-fixos`)

Controle de credores com pagamentos mensais recorrentes e empenhos.

### Cadastro de credor
| Campo | Descrição |
|-------|-----------|
| Nome * | Nome do credor |
| CNPJ/CPF | Documento |
| Departamento | Administração, Saúde, Educação, Assistência Social |
| Valor mensal | Valor padrão em R$ |
| Descrição | Texto livre |

### Grade anual de empenhos
- Tabela com 12 colunas (Jan a Dez) por credor
- Cada célula é clicável:
  - **Pendente** (ícone relógio, fundo cinza)
  - **Empenhado** (ícone check, fundo verde)
- Ao clicar, abre diálogo para:
  - Nº do empenho
  - Valor (padrão: valor mensal do credor)
  - Observação
  - Confirmar empenho ou marcar como pendente

### Filtros
- **Ano** — seleciona o ano da grade
- **Departamento** — todos ou específico
- **Status** — todos, com pendência, com empenhos

### Ações
| Ação | Descrição |
|------|-----------|
| Novo Credor | Abre formulário de cadastro |
| Editar | Ícone lápis na linha do credor |
| Excluir | Remove credor e todo histórico de empenhos (com confirmação) |
| Relatório PDF | Gera PDF com todos os credores filtrados, status mensal e totais empenhados |

### Dados
- Tabela `credores_fixos` — cadastro
- Tabela `empenhos_mensais` — um registro por credor/ano/mês

---

## 10. Formatos de exportação

| Módulo | Formatos | Salva no banco? |
|--------|----------|-----------------|
| Solicitações | PDF, Word (.docx), Excel (.xlsx) | PDF sim; Word/Excel só download |
| Solicitações em Lote | PDF (lote), JSON | Não (sessão temporária) |
| Histórico | PDF (reimpressão) | Não (já está no banco) |
| Diárias | PDF | Não |
| Credores Fixos | PDF (relatório) | Não |
| Dados Salvos | JSON (import/export) | Sim (ao importar) |
| Modelos | JSON (import) | Sim |

### Nomenclatura de arquivos gerados
- Solicitação PDF: `Solicitacao_Aquisicao_DDMMAAAA.pdf`
- Lote PDF: `Lote_Solicitacoes_DDMMAAAA.pdf`
- Diária PDF: `diaria_AAAA-MM-DD.pdf`
- Credores PDF: `credores-fixos-ANO.pdf`

---

## 11. Atalhos de teclado

| Atalho | Ação | Onde |
|--------|------|------|
| `Ctrl+K` | Abrir busca global | Módulo Solicitações |
| `Enter` | Submeter formulário | Login, formulários |

---

## 12. Fluxos de uso comuns (passo a passo)

### Criar uma solicitação simples
1. Login → Hub → **Solicitações**
2. Preencher solicitante, empresa, data
3. Adicionar itens (nome, descrição, qtd, valor)
4. Opcional: assinatura, anexos, observações
5. Clicar **PDF** (salva no banco e baixa) ou **Visualizar** antes

### Reutilizar solicitação anterior
1. Solicitações → **Histórico**
2. Buscar a solicitação desejada
3. Clicar **Duplicar** → volta ao formulário com dados preenchidos
4. Ajustar e exportar

### Processar lote de solicitações
1. Solicitações → **Solicitação em Lote**
2. Baixar modelo ou pedir à IA que gere o `.txt`
3. Fazer upload do arquivo
4. Verificar validação (erros por linha)
5. **Processar lote** → **Gerar Lote PDF**

### Registrar empenho mensal
1. Hub → **Credores Fixos**
2. Selecionar ano e filtros
3. Clicar na célula do mês desejado
4. Preencher nº empenho, valor, observação
5. **Confirmar empenho**

### Calcular diária de viagem
1. Hub → **Calculadora de Diárias**
2. Selecionar cargo e destino
3. Informar data/hora de saída e retorno
4. Verificar resultado e **Exportar PDF**

### Gerenciar tarefas da equipe
1. Hub → **Mural de Tarefas**
2. **Nova Tarefa** → preencher título, responsável, prioridade, prazo
3. Arrastar cards entre colunas conforme progresso

---

## 13. Instruções para IA — como ajudar usuários

### Ao receber pedidos sobre o sistema

1. **Identifique o módulo** correto antes de responder
2. **Siga os fluxos** descritos na seção 12
3. **Respeite as regras de negócio** (senhas, formato de lote, cálculo de diárias)
4. **Não invente funcionalidades** que não existem (ex: não há redefinição de senha, não há módulo de relatórios gerais)

### Ao gerar arquivos de lote (.txt)
Use o formato exato:
```
SOLICITANTE|EMPRESA|OBSERVACOES|ITEM:DESCRICAO:QTD:VALOR;ITEM2:DESCRICAO2:QTD2:VALOR2
```
- 4 campos com `|`
- Decimais com ponto
- Pelo menos 1 item por solicitação
- Linhas com `#` para comentários

### Ao ajudar com diárias
- Sempre pedir: cargo, destino, saída e retorno
- Aplicar regra: <12h = zero, 12-24h = 1, >24h = 1 + floor((horas-24)/12)
- Citar base legal: Decreto 019/2025

### Ao ajudar com credores
- Departamentos válidos: Administração, Saúde, Educação, Assistência Social
- Empenho é por credor/mês/ano
- Valor padrão vem do valor mensal do credor

### Ao ajudar com tarefas
- Responsáveis válidos: ALEKSANDRO, LUANA, MAICON, TODOS
- Prioridades: baixa, media, alta
- Status: todo, doing, done

### Credenciais (apenas para ambiente local de desenvolvimento)
- usuários definem a própria senha no primeiro acesso
- `maicon` e `luana`: senha definida no primeiro acesso

---

## 14. Modelo de dados (resumo)

```
usuarios          → id, username, senha_hash
solicitacoes      → id, solicitante, empresa, data_solicitacao, observacoes, items (JSON), valor_total, anexos (JSON), assinatura
solicitantes      → id, nome (único)
empresas          → id, nome (único)
observacoes       → id, texto (único)
modelos           → id, nome, form_data (JSON), items (JSON)
tarefas           → id, titulo, descricao, responsavel, prioridade, status, ordem, prazo
credores_fixos    → id, nome, documento, departamento, valor_mensal, descricao
empenhos_mensais  → id, credor_id, ano, mes, status, valor, numero_empenho, observacao, empenhado_em
```

---

## 15. Limitações conhecidas

- Autenticação é local e simples (sem papéis/permissões por módulo)
- Não há recuperação de senha pelo app
- Solicitações em lote não salvam automaticamente no banco (só PDF/JSON)
- Word e Excel não salvam no histórico — apenas PDF salva
- "Dados Salvos" na UI menciona JSON local, mas os dados ficam no SQLite via API local
- Realtime funciona apenas entre abas do mesmo navegador (não é Supabase cloud)
- Protocolo no header é decorativo, não sequencial oficial

---

## 16. Glossário

| Termo | Significado |
|-------|-------------|
| Solicitação | Pedido formal de aquisição de produtos/serviços |
| Empenho | Registro de reserva orçamentária para pagamento |
| Credor fixo | Fornecedor com pagamento mensal recorrente |
| Diária | Verba de viagem conforme tempo de afastamento |
| Modelo | Template reutilizável de formulário de solicitação |
| Lote | Processamento em massa de várias solicitações via .txt |
| Hub | Tela inicial com cards dos módulos |

---

*Última atualização: julho/2026 — gerado a partir do código-fonte do projeto Inajá Fornecimento Digital.*
