# Formatos e Contratos de Dados

> Estruturas JSON, formatos de arquivo e contratos da API para integração e geração de dados.

---

## 1. Resposta padrão da API

Todas as rotas retornam JSON no formato Supabase-compatível:

```json
{
  "data": <resultado ou null>,
  "error": null
}
```

Em erro:
```json
{
  "data": null,
  "error": {
    "message": "Descrição do erro",
    "code": "CODIGO_OPCIONAL"
  }
}
```

---

## 2. POST /api/query

### Select
```json
{
  "table": "tarefas",
  "action": "select",
  "select": "*",
  "filters": [
    { "column": "status", "value": "todo" }
  ],
  "order": [
    { "column": "ordem", "ascending": true }
  ],
  "limit": 50
}
```

### Insert (único)
```json
{
  "table": "solicitacoes",
  "action": "insert",
  "payload": {
    "solicitante": "João Silva",
    "empresa": "Secretaria de Obras",
    "data_solicitacao": "13/07/2026",
    "observacoes": "Material de construção",
    "items": [
      {
        "id": "uuid",
        "item": "Cimento",
        "descricao": "Saco 50kg",
        "quantidade": 10,
        "valorUnitario": 35.00,
        "valorTotal": 350.00
      }
    ],
    "valor_total": 350.00,
    "assinatura": "data:image/png;base64,...",
    "anexos": [
      {
        "name": "orcamento.pdf",
        "url": "http://localhost:8080/api/files/1234-abc-orcamento.pdf",
        "type": "application/pdf",
        "path": "1234-abc-orcamento.pdf"
      }
    ]
  }
}
```

> `id`, `created_at` e `updated_at` são gerados automaticamente se omitidos.

### Update
```json
{
  "table": "tarefas",
  "action": "update",
  "payload": { "status": "done" },
  "filters": [{ "column": "id", "value": "uuid-da-tarefa" }]
}
```

### Delete
```json
{
  "table": "solicitacoes",
  "action": "delete",
  "filters": [{ "column": "id", "value": "uuid" }]
}
```

### Upsert
```json
{
  "table": "solicitantes",
  "action": "upsert",
  "payload": { "nome": "Maria Santos" },
  "onConflict": "nome",
  "ignoreDuplicates": true
}
```

---

## 3. POST /api/rpc

### usuario_status
```json
{
  "fn": "usuario_status",
  "args": { "_username": "aleksandro" }
}
```
Resposta:
```json
{
  "data": [{ "existe": true, "tem_senha": true }],
  "error": null
}
```

### usuario_login
```json
{
  "fn": "usuario_login",
  "args": { "_username": "aleksandro", "_senha": "<senha-local-nao-versionada>" }
}
```
Resposta: `{ "data": true, "error": null }`

### usuario_set_senha
```json
{
  "fn": "usuario_set_senha",
  "args": { "_username": "maicon", "_senha": "<senha-de-exemplo-nao-real>" }
}
```
Resposta: `{ "data": true, "error": null }` ou `false` se senha já existe.

---

## 4. Storage

### Upload
```json
{
  "bucket": "solicitacao-anexos",
  "path": "1720891234-abc42-nota.pdf",
  "contentBase64": "<base64>",
  "contentType": "application/pdf",
  "upsert": false
}
```

Convenção de `path`:
```
{timestamp}-{random6}-{nome_sanitizado}
```
Caracteres especiais no nome substituídos por `_`.

### Remove
```json
{
  "bucket": "solicitacao-anexos",
  "paths": ["1720891234-abc42-nota.pdf"]
}
```

---

## 5. Estruturas do frontend

### FormData (solicitação)
```typescript
{
  nomeSolicitante: string;
  nomeEmpresa: string;
  dataSolicitacao: string;  // "dd/MM/yyyy"
  observacoes: string;
}
```

### Item (solicitação)
```typescript
{
  id: string;           // UUID
  item: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;   // calculado
}
```

### Anexo
```typescript
{
  name: string;
  url: string;
  type: string;   // MIME
  path: string;   // relativo a data/uploads/
}
```

### Tarefa
```typescript
{
  id: string;
  titulo: string;
  descricao: string | null;
  responsavel: "ALEKSANDRO" | "LUANA" | "MAICON" | "TODOS" | null;
  prioridade: "baixa" | "media" | "alta";
  status: "todo" | "doing" | "done";
  ordem: number;
  prazo: string | null;  // "YYYY-MM-DD"
  created_at: string;
  updated_at: string;
}
```

### Credor
```typescript
{
  id: string;
  nome: string;
  documento: string | null;
  departamento: "Administração" | "Saúde" | "Educação" | "Assistência Social";
  valor_mensal: number;
  descricao: string | null;
}
```

### Empenho
```typescript
{
  id: string;
  credor_id: string;
  ano: number;
  mes: number;          // 1–12
  status: "pendente" | "empenhado";
  valor: number | null;
  numero_empenho: string | null;
  observacao: string | null;
  empenhado_em: string | null;  // ISO datetime
}
```

### Template (modelo)
```typescript
{
  id: string;
  nome: string;
  form_data: FormData;
  items: Item[];
  created_at: string;
  updated_at: string;
}
```

### DuplicatePayload (histórico → formulário)
```typescript
{
  formData: FormData;
  items: Item[];
}
```

---

## 6. Arquivo de lote (.txt)

### Formato de linha
```
SOLICITANTE|EMPRESA|OBSERVACOES|ITEM1:DESC1:QTD1:VALOR1;ITEM2:DESC2:QTD2:VALOR2
```

### Exemplo completo
```txt
# Solicitações — Secretaria de Obras — Julho/2026
João Silva|Secretaria de Obras|Reforma da escola|Tinta Latex:Tinta branca 18L:5:45.00;Rolo:Rolo espuma 23cm:10:8.50
Maria Santos|Secretaria de Saúde|Equipamentos|Termômetro:Infravermelho:3:89.00
Pedro Costa|Secretaria de Educação||Papel A4:Sulfite 500fls:50:25.00
```

### Parse de item com `:` na descrição
Entrada:
```
Parafuso:Parafuso sextavado:6mm:100:0.50
```
Parser divide por `:` e usa:
- `parts[0]` → item
- `parts[length-2]` → quantidade
- `parts[length-1]` → valor
- `parts[1..length-3]` → descrição (rejoin com `:`)

Resultado:
```json
{
  "item": "Parafuso",
  "descricao": "Parafuso sextavado:6mm",
  "quantidade": 100,
  "valorUnitario": 0.50
}
```

### Erros de validação retornados
```json
{
  "line": 3,
  "error": "Formato inválido. Esperado 4 campos separados por |, encontrados 3"
}
```

---

## 7. JSON de lote processado (export)

Gerado por `exportBatchToJSON` na sessão:
```json
[
  {
    "id": "uuid",
    "solicitante": "João Silva",
    "empresa": "Secretaria de Obras",
    "dataSolicitacao": "13/07/2026",
    "observacoes": "Reforma",
    "items": [
      {
        "item": "Tinta Latex",
        "descricao": "Tinta branca 18L",
        "quantidade": 5,
        "valorUnitario": 45.00
      }
    ],
    "valorTotal": 225.00
  }
]
```

---

## 8. JSON de modelo (import/export)

```json
{
  "name": "Modelo Padrão Obras",
  "formData": {
    "nomeSolicitante": "",
    "nomeEmpresa": "Secretaria de Obras",
    "dataSolicitacao": "13/07/2026",
    "observacoes": ""
  },
  "items": [
    {
      "id": "uuid",
      "item": "Cimento",
      "descricao": "CP-II 50kg",
      "quantidade": 0,
      "valorUnitario": 0,
      "valorTotal": 0
    }
  ]
}
```

---

## 9. JSON de dados salvos (export local)

```json
{
  "solicitantes": ["João Silva", "Maria Santos"],
  "empresas": ["Secretaria de Obras", "Secretaria de Saúde"],
  "observacoes": ["Material de escritório", "Reforma predial"]
}
```

---

## 10. Hash de senha (armazenamento)

Formato no banco (`senha_hash`):
```
scrypt$<salt_hex_32chars>$<hash_hex_128chars>
```

Exemplo (não usar em produção — apenas ilustrativo):
```
scrypt$a1b2c3d4e5f6....$9f8e7d6c5b4a....
```

---

## 11. Health check

```http
GET /api/health
```

```json
{
  "ok": true,
  "mode": "local-sqlite",
  "db": "data/inaja.sqlite"
}
```

---

## 12. Códigos de erro

| code | Origem | Significado |
|------|--------|-------------|
| `INVALID_TABLE` | query | Tabela não permitida |
| `INVALID_ACTION` | query | Ação desconhecida |
| `BAD_REQUEST` | query | Update/delete sem filtro |
| `23505` | query | Violação UNIQUE |
| `DB_ERROR` | query/rpc | Erro SQLite genérico |
| `WEAK_PASSWORD` | rpc | Senha < 4 caracteres |
| `UNKNOWN_RPC` | rpc | Função RPC inexistente |
| `EXISTS` | storage | Arquivo já existe |
| `NETWORK` | client | Falha de fetch |

---

## 13. Tabelas e colunas JSON

Colunas serializadas como JSON string no SQLite:

| Tabela | Colunas |
|--------|---------|
| `modelos` | `form_data`, `items` |
| `solicitacoes` | `items`, `anexos` |

O servidor faz `JSON.parse` no select e `JSON.stringify` no insert/update automaticamente.

---

## 14. TCE-PR — Dados abertos

O módulo `/tce-pr` consulta os arquivos oficiais do Tribunal de Contas do Estado do Paraná e grava os dados localmente para pesquisa:

- `GET /api/tce-pr/status`
- `POST /api/tce-pr/sincronizar` — somente administrador
- `GET /api/tce-pr/licitacoes?busca=&ano=&pagina=`
- `GET /api/tce-pr/obras?busca=&ano=&pagina=`
- `GET /api/tce-pr/detalhe?tipo=licitacao|obra&id=`
- `GET /api/tce-pr/pendencias`

As fontes são o Mural de Licitações e as bases de Obras Municipais, incluindo acompanhamentos. A configuração fica em **Admin → Configurações** nas chaves `tcepr_cnpj`, `tcepr_ibge`, `tcepr_anos` e `tcepr_sincronizacao_horas`. O cruzamento com o PNCP usa processo e objeto, sempre dentro do CNPJ do órgão.

Fonte oficial: <https://servicos.tce.pr.gov.br/servicos/srv_dados_abertos.aspx>.

---

## 15. SICONFI — Indicadores fiscais

O módulo /siconfi consulta e armazena localmente os demonstrativos fiscais publicados pelo Tesouro Nacional para o município configurado:

- GET /api/siconfi/status
- POST /api/siconfi/sincronizar — somente administrador
- GET /api/siconfi/indicadores?ano=
- GET /api/siconfi/registros?tipo=rreo|rgf|dca&busca=&ano=&periodo=&pagina=
- GET /api/siconfi/entregas?busca=&ano=&pagina=

O painel calcula receita total, despesas empenhadas e pagas, RCL, despesa com pessoal, limites prudencial e de alerta, dívida consolidada líquida, caixa líquida, restos a pagar e aplicações constitucionais quando o demonstrativo oficial contém a linha correspondente. Também compara as entregas localizadas com a cobertura esperada de RREO, RGF e DCA por exercício.

A configuração fica em Admin → Configurações nas chaves 'siconfi_ibge', 'siconfi_anos' e 'siconfi_sincronizacao_horas'. O módulo usa a permissão de Prestação de contas e não exige chave de API.

Fonte oficial e documentação: <https://www.tesourotransparente.gov.br/consultas/consultas-siconfi/siconfi-api-de-dados-abertos> e <https://apidatalake.tesouro.gov.br/docs/siconfi/>.

---

## 16. TCU / Portal da Transparência — fornecedores

A consulta `/api/transparencia/cnpj?cnpj=` é protegida pelos módulos `cnpj` ou `credores-fixos` e consolida, sob demanda:

- certidão consolidada e licitantes inidôneos do TCU;
- CEIS e CNEP do Portal da Transparência;
- contratos federais associados ao CNPJ, quando a chave do Portal estiver configurada.

O cartão aparece automaticamente após uma consulta na tela `/cnpj`. Em **Credores Fixos**, o botão de escudo abre a mesma conferência no fornecedor selecionado. O resultado fica em cache por dez minutos e não grava a chave nem o payload externo no navegador.

A chave do Portal deve ser cadastrada pelo administrador em **Admin → Configurações**, na chave `portal_transparencia_api_key`, ou como `PORTAL_TRANSPARENCIA_API_KEY` no ambiente do servidor. O cadastro oficial da chave é feito em <https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email>.

Fontes oficiais: <https://sites.tcu.gov.br/dados-abertos/webservices-tcu/> e <https://api.portaldatransparencia.gov.br/>.

---

## 17. Saúde pública — DATASUS/CNES

O módulo `/saude-publica` consulta diretamente o Portal de Dados Abertos do SUS e oferece:

- listagem de estabelecimentos por município, UF, tipo de unidade e situação;
- detalhe por código CNES, com razão social, nome fantasia, CNPJ da entidade, endereço, contatos e coordenadas;
- capacidades cadastradas de atendimento ambulatorial, hospitalar, apoio, centro cirúrgico, obstétrico e neonatal;
- catálogo oficial de tipos de unidade e indicadores resumidos da página consultada.

Rotas protegidas pelo módulo `saude-publica`:

- `GET /api/saude/cnes?municipio=&uf=&tipo=&status=&busca=&pagina=`
- `GET /api/saude/cnes?cnes=`
- `GET /api/saude/cnes/tipos`

O serviço aceita códigos municipais de seis ou sete dígitos (por exemplo, `4110300`) e normaliza o valor para o código CNES de seis dígitos (`411030`). As respostas ficam em cache por dez minutos e continuam somente leitura; nenhum dado externo é persistido no banco local.

Fontes oficiais: <https://apidadosabertos.saude.gov.br/>, <https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude> e <https://datasus.saude.gov.br/cnes-estabelecimentos/>.

---

## 18. Banco Central — serviço auxiliar

### 18.1 Banco Central: séries e cálculos

O serviço `server/services/bcb.mjs` consome o BCData/SGS e restringe a integração às séries oficiais usadas pelo sistema:

- SGS `433`: IPCA, variação percentual mensal;
- SGS `11`: Selic efetiva, percentual diário em dias úteis.

`consultarSerieBcb` converte datas para o formato aceito pelo BCData, normaliza observações e aplica limite de dez anos por consulta. `calcularAtualizacaoBcb` compõe os fatores `1 + taxa/100` de cada observação do período e retorna principal, fator, variação acumulada, acréscimo, valor atualizado e quantidade de observações aplicadas. A rota é `GET /api/bcb/calcular?valor=&serie=&dataInicial=&dataFinal=` e a interface está na aba Índices oficiais da tela Calculadoras.

O resultado é apoio operacional, não substitui a metodologia contratual, a memória de cálculo ou a conferência contábil/jurídica aplicável. O cache do Banco Central dura uma hora e nenhum payload externo é persistido.

Fonte oficial: <https://dadosabertos.bcb.gov.br/dataset/11-taxa-de-juros---selic>.

---

*Contratos baseados em `server/api.mjs`, `server/db.mjs` e `src/integrations/db/client.ts`.*
