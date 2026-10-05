# Regras de Negócio

> Regras fixas do sistema que uma IA **não deve inventar ou alterar** sem solicitação explícita.

---

## 1. Autenticação

### Usuários válidos
Somente estes usernames existem no sistema:
- `aleksandro`
- `maicon`
- `luana`

Comparação é **case-insensitive** (`Aleksandro` = `aleksandro`).

### Senhas

| Regra | Detalhe |
|-------|---------|
| Mínimo | 6 caracteres |
| Criação | Apenas no **primeiro acesso** (`senha_hash` deve estar vazio) |
| Redefinição | **Não existe** pelo app — usar script manual |
| aleksandro | Define a própria senha no primeiro acesso; o seed não fornece credencial |
| maicon / luana | Cada um define a própria senha no 1º login |
| Armazenamento | Hash scrypt — nunca texto puro |

### Sessão
- Guardada em `localStorage` (`prefeitura_user`)
- Apenas o **nome do usuário** — sem token, sem expiração automática
- Logout limpa o localStorage

---

## 2. Solicitações de aquisição

### Campos
| Campo | Obrigatório | Observação |
|-------|-------------|------------|
| Solicitante | Recomendado | Autocomplete de salvos |
| Empresa | Recomendado | Autocomplete de salvos |
| Data | Preenchida auto | Padrão: hoje (dd/MM/yyyy) |
| Observações | Opcional | Texto livre |
| Itens | Condicional | Só se "Incluir itens e valores" marcado |

### Itens
| Campo | Regra |
|-------|-------|
| Quantidade | Número ≥ 0 |
| Valor unitário | Número ≥ 0, decimais permitidos |
| Valor total | Calculado: `quantidade × valorUnitario` |
| Mínimo de itens | 1 linha no formulário (pode estar vazia) |

### Checkbox "Incluir itens e valores"
- **Marcado:** tabela aparece em preview, PDF, Word, Excel
- **Desmarcado:** documento sem tabela nem valores; `valor_total = 0`

### Persistência
- **Somente exportação PDF** grava em `solicitacoes`
- Word e Excel são download apenas — não entram no histórico

### Anexos
- Máximo **10 MB** por arquivo
- Bucket lógico: `solicitacao-anexos`
- Armazenados em `data/uploads/`

### Assinatura
- Desenho no pad — salva como data URL PNG
- Incluída no PDF se preenchida

### Protocolo no header
- Formato visual: `#ANO-NNNN`
- **Não é número oficial** — decorativo, baseado em contagem de itens

---

## 3. Solicitação em lote

### Formato de linha (obrigatório)
```
SOLICITANTE|EMPRESA|OBSERVACOES|ITENS
```

### Regras de parsing
| Regra | Detalhe |
|-------|---------|
| Campos por linha | Exatamente **4**, separados por `\|` |
| Solicitante | Obrigatório, não vazio |
| Empresa | Obrigatório, não vazio |
| Observações | Pode ser vazio, mas o campo `\|` deve existir |
| Itens | Separados por `;` |
| Item | Formato `NOME:DESCRIÇÃO:QTD:VALOR` |
| Dois pontos na descrição | Permitidos — parser usa últimos 2 campos como QTD e VALOR |
| Quantidade | Inteiro > 0 |
| Valor | Float ≥ 0, ponto decimal |
| Comentários | Linhas iniciadas com `#` ignoradas |
| Arquivo | Apenas `.txt` |

### Após processamento
- Fica em **memória da sessão** — não salva no banco automaticamente
- Exportável como PDF lote ou JSON

---

## 4. Dados salvos

### Solicitantes e empresas
- Nome **único** no banco (constraint UNIQUE)
- Inserção duplicada retorna erro `23505` (ignorado silenciosamente em alguns fluxos)

### Observações
- Texto **único** no banco

### Exclusão
- Remove do banco permanentemente
- Não afeta solicitações já salvas no histórico

---

## 5. Modelos (templates)

- Nome **único** por modelo
- Salva `form_data` + `items` como JSON
- Pode importar/exportar arquivo JSON externo
- Carregar modelo **substitui** o formulário atual

---

## 6. Histórico

- Ordenado por `created_at` descendente
- Busca: solicitante, empresa, data, observações (case-insensitive)
- Duplicar: carrega no formulário com **data de hoje**
- Excluir: remove permanentemente (com confirmação)
- Reimprimir: gera PDF sem alterar registro

---

## 7. Mural de Tarefas (Kanban)

### Status válidos
`todo` | `doing` | `done`

### Prioridades válidas
`baixa` | `media` | `alta`

### Responsáveis válidos
`ALEKSANDRO` | `LUANA` | `MAICON` | `TODOS`

### Regras
| Regra | Detalhe |
|-------|---------|
| Título | Obrigatório |
| Ordem | Auto-incrementada por coluna ao criar |
| Drag & drop | Atualiza apenas `status` |
| Exclusão | Permanente, sem confirmação dupla |

---

## 8. Calculadora de Diárias

### Base legal
**Decreto Municipal nº 019/2025** — Inajá/PR

### Anexos de valores
| Anexo | Cargos |
|-------|--------|
| I (Lei 1.090/2019) | Prefeito/Vice, Secretários |
| II (Lei 1.087/2019 alt. 1.284/2023) | Procurador, Diretor, Supervisor, Motorista, Outros |

### Destinos
| Destino | Anexo I | Anexo II |
|---------|---------|----------|
| Curitiba / Foz do Iguaçu | Sim | Sim |
| Demais cidades do Paraná | Sim | Sim |
| Brasília / capitais | Sim | Sim |
| Demais cidades fora do Estado | Sim | **Não** |

### Regra de cálculo

```
horas = retorno − saída

se horas < 12        → 0 diárias
se 12 ≤ horas ≤ 24   → 1 diária
se horas > 24        → 1 + floor((horas − 24) / 12) diárias

total = diárias × valor_unitário(cargo, destino)
```

### Validações
- Retorno deve ser **posterior** à saída
- Cargo sem valor para o destino → erro
- Não existe meia diária nessa regra; o cálculo considera apenas diárias integrais.

### Pernoites
- Contados como noites completas entre saída e retorno
- Informativo — não altera o cálculo de diárias integrais na regra atual

---

## 9. Credores Fixos

### Departamentos válidos
- Administração
- Saúde
- Educação
- Assistência Social

### Credor
| Campo | Regra |
|-------|-------|
| Nome | Obrigatório |
| Valor mensal | Numérico, padrão 0 |
| Documento | Opcional (CNPJ/CPF) |

### Empenhos
| Regra | Detalhe |
|-------|---------|
| Chave única | `(credor_id, ano, mes)` |
| Status | `pendente` ou `empenhado` |
| Valor padrão | `valor_mensal` do credor |
| empenhado_em | Preenchido ao confirmar empenho; limpo ao marcar pendente |
| Exclusão do credor | **CASCADE** — apaga todos os empenhos |

### Filtros
- **Pendência:** credor com algum mês pendente ou sem registro
- **Empenhado:** credor com algum mês empenhado

---

## 9A. Empenhos Orçamentários (`/empenhos`)

> Distinto dos **empenhos mensais** da seção 9: trata da importação em massa
> da **Relação de Empenho** (CSV exportado do SIAFI/Portifólias) e do
> dashboard de acompanhamento orçamentário. **Não há** sincronia entre as
> duas tabelas — são conceitos ortogonais.

### Origem dos dados
- **Arquivo:** `Relação de Empenho.csv` (separador `;`, encoding Windows-1252).
- **Colunas esperadas:** 41 (definidas em `camelMap` em `src/pages/Empenhos.tsx:66-87`).
- O parse (`parseCSV`) tolera aspas duplas, campos contendo `;` e quebras de
  linha embutidas em aspas.

### Tabela `empenhos_orcamentarios`
| Regra | Detalhe |
|-------|---------|
| ID composto | `${idEntidade}_${idEmpenho}_${numeroEmpenho}` — chave primária |
| Reimportação | `INSERT OR REPLACE` por id composto (sobrescreve ocorrência anterior com mesma chave) |
| `updated_at` | Atualizado automaticamente via trigger `emp_upd_at` |
| Índices | `ano_empenho`, `modalidade`, `tipo_empenho`, `num_recurso`, `num_programa`, `num_acao`, `num_despesa`, `num_natureza_desp`, `id_credor`, `nome_credor COLLATE NOCASE` |
| Origem do registro | Apenas SQLite. **Sem migration Postgres** — ver ADR-013 |

### Importação atômica (`empenhos_importar`)
| Modo | Comportamento |
|------|---------------|
| `substituir` (default) | Cria staging `empenhos_orcamentarios_novo`, insere chunks via `_continuar`/`_finalizar`, ao final faz `DROP` + `RENAME` + recria índices/trigger. **Falha em qualquer chunk preserva a tabela original.** |
| `append` | `INSERT OR REPLACE` direto na tabela real (upsert por id composto). |

**Autorização:** apenas admin ativo (verificado via `_caller` no backend).
Mesmo que a UI esconda a aba Importar para não-admins, o backend **rejeita**
chamadas diretas a `/api/rpc` sem admin.

**Sub-batching:** 100 linhas por `INSERT multi-VALUES` para manter o número de
parâmetros abaixo do limite SQLite (32766).

### `empenhos_limpar`
Apenas admin ativo. Apaga todas as linhas. Mantido para diagnóstico; a UI usa
`empenhos_importar` modo `substituir` para garantir atomicidade.

### Situação de pagamento
- **Pendente:** `saldo_pagar > 0`
- **Totalmente pago:** `saldo_pagar <= 0` (DEFAULT 0 — empenho novo sem
  pagamentos entra como "pago" se não vier com `saldo_pagar` informado)

### Formatação
- Valores monetários em BRL via `toLocaleString("pt-BR", { style: "currency", currency: "BRL" })`.
- `parseBR` rejeita negativos e notação científica (trata como 0) —
  empenhos são sempre >= 0.

### Acessibilidade
- Painel de detalhe é `Dialog` Radix (`role="dialog"`, focus trap, Escape).
- Linhas da tabela são ativáveis via teclado (`tabIndex=0`, `role="button"`,
  Enter/Space abre o detalhe).
- Cores dos status combinadas com texto + `aria-label` (daltos legíveis).
- Labels dos filtros vinculadas via `htmlFor`/`id`; botões de ícone têm
  `aria-label`.

---

## 10. Regras que a IA deve respeitar ao responder

### Pode afirmar
- Rotas, módulos e fluxos descritos nos manuais
- Regras de diárias conforme decreto 019/2025
- Formato de lote com pipe e dois-pontos
- Credenciais locais de desenvolvimento versionadas

### Não pode inventar
- Novos módulos ou funcionalidades inexistentes
- Recuperação de senha pelo app
- Permissões diferentes por usuário
- Sincronização realtime entre computadores
- Integração com sistemas externos (e-Sfinge, SIAFI, etc.) — não existe
- Numeração oficial de protocolo

### Deve pedir esclarecimento quando
- Dados de lote estão incompletos (falta solicitante, empresa ou itens)
- Cálculo de diária sem saída/retorno
- Credor sem nome
- Tarefa sem título

---

*Regras extraídas do código-fonte. Em caso de divergência, o código prevalece.*
