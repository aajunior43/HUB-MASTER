# Cenários e Exemplos Práticos

> Situações reais com passo a passo e dados de exemplo. Ideal para IA treinar respostas e orientar usuários.

---

## Cenário 1 — Primeiro acesso da Luana

**Contexto:** Luana nunca usou o sistema.

```
1. Abrir http://localhost:8080 → redireciona para /login
2. Digitar: luana → Continuar
3. Tela "Primeiro acesso" → criar senha (ex: luana2026)
4. Confirmar senha → Criar e entrar
5. Hub com 4 módulos → escolher módulo
```

**IA deve dizer:** senha é escolhida por ela; não há como recuperar depois pelo app.

---

## Cenário 2 — Aleksandro emite solicitação de material

**Pedido do usuário:** "Preciso solicitar 20 resmas de papel A4 para a Secretaria de Educação"

```
1. Primeiro acesso: aleksandro escolhe uma senha forte local
2. Hub → Solicitações
3. Preencher:
   - Solicitante: Maria Oliveira
   - Empresa: Secretaria de Educação
   - Data: (hoje)
4. Itens → Adicionar:
   - Item: Papel A4
   - Descrição: Sulfite 75g 500 folhas
   - Qtd: 20
   - Valor unit.: 25.00
   - Total: 500.00 (automático)
5. Ações → PDF (salva no histórico + download)
```

**Observação:** Word/Excel também exportam, mas **não** entram no histórico.

---

## Cenário 3 — Reutilizar solicitação antiga

**Pedido:** "Quero refazer o pedido do João da semana passada"

```
1. Solicitações → menu Histórico
2. Buscar "João"
3. Clicar Duplicar na linha desejada
4. Formulário abre com dados + data de HOJE
5. Ajustar itens/valores se necessário
6. Exportar PDF
```

---

## Cenário 4 — Gerar lote com IA

**Pedido do usuário:** "Tenho 3 pedidos para gerar de uma vez"

**Resposta da IA (arquivo .txt):**
```txt
# Lote Secretaria de Obras — 13/07/2026
José Santos|Secretaria de Obras|Reforma calçada|Saco Cimento:CP-II 50kg:10:35.00;Areia:Areia média m³:2:120.00
Ana Costa|Secretaria de Saúde|Posto de saúde|Luva:Latex tamanho M caixa 100:5:45.00
Pedro Lima|Secretaria de Educação|Material escolar|Caneta:Esferográfica azul:200:1.50;Caderno:96 folhas:50:8.00
```

**No sistema:**
```
1. Solicitações → Solicitação em Lote
2. Baixar modelo (opcional) ou colar conteúdo em .txt
3. Upload do arquivo
4. Verificar validação (0 erros)
5. Processar lote → Gerar Lote PDF
```

---

## Cenário 5 — Viagem e diária

**Pedido:** "Motorista saiu segunda 8h e voltou terça 20h para Curitiba"

```
1. Hub → Calculadora de Diárias
2. Cargo: Motorista
3. Destino: Curitiba / Foz do Iguaçu
4. Saída: 2026-07-13T08:00
5. Retorno: 2026-07-14T20:00
6. Resultado: ~36h → 1 diária (12-24h) + 1 extra (12h após 24h) = 2 diárias
7. Valor unit.: R$ 419,32 → Total: R$ 838,64
8. Exportar PDF
```

**Cálculo para IA:**
```
horas = 36
36 > 24 → integrais = 1 + floor((36-24)/12) = 1 + 1 = 2
total = 2 × 419.32 = 838.64
```

---

## Cenário 6 — Viagem curta (sem direito)

**Pedido:** "Fui à cidade vizinha 8h da manhã e voltei 15h"

```
horas = 7 → < 12h → 0 diárias → "Sem direito a diária"
```

---

## Cenário 7 — Registrar empenho de credor fixo

**Pedido:** "Marcar empenho de julho do credor Energia Elétrica"

```
1. Hub → Credores Fixos
2. Ano: 2026
3. Localizar credor na tabela
4. Clicar célula "Jul"
5. Preencher:
   - Nº empenho: 2026/0458
   - Valor: (padrão valor mensal ou ajustar)
   - Observação: (opcional)
6. Confirmar empenho → célula fica verde ✓
```

---

## Cenário 8 — Nova tarefa no Kanban

**Pedido:** "Criar tarefa para Maicon revisar edital até sexta"

```
1. Hub → Mural de Tarefas
2. Nova Tarefa (ou + na coluna A Fazer)
3. Título: Revisar edital de pregão
4. Responsável: MAICON
5. Prioridade: alta
6. Prazo: data da sexta
7. Status: A Fazer
8. Criar
9. Arrastar para "Em Andamento" quando iniciar
```

---

## Cenário 9 — Salvar dados para reutilizar

**Pedido:** "Sempre uso o mesmo solicitante e departamento"

```
1. Solicitações → Dados Salvos
2. Adicionar solicitante: Carlos Mendes
3. Adicionar empresa: Secretaria de Administração
4. Voltar ao formulário → combobox sugere os salvos
```

---

## Cenário 10 — Criar modelo de solicitação recorrente

**Pedido:** "Todo mês peço os mesmos itens de limpeza"

```
1. Preencher formulário com itens padrão
2. Menu Modelos
3. Nome: "Limpeza mensal padrão"
4. Salvar modelo
5. Próximo mês: Modelos → Carregar → ajustar data → PDF
```

---

## Cenário 11 — Busca rápida (Ctrl+K)

**Pedido:** "Achar solicitação da empresa XYZ"

```
1. Em /solicitacoes → Ctrl+K
2. Digitar "XYZ"
3. Selecionar solicitação → Duplicar ou Reimprimir PDF
```

---

## Cenário 12 — Problema: esqueci a senha do Maicon

**Resposta correta da IA:**
```
O sistema não tem recuperação de senha.
Opções para administrador técnico:
1. node scripts/set-aleksandro-password.mjs (só aleksandro)
2. Para maicon: apagar senha_hash no SQLite e ele recria no 1º acesso
Não inventar tela de "esqueci minha senha" — não existe.
```

---

## Matriz: "Quero X" → "Vá em Y"

| Quero… | Módulo | Ação |
|--------|--------|------|
| Pedir compra | Solicitações | Formulário → PDF |
| Vários pedidos de uma vez | Solicitações | Lote |
| Ver pedidos antigos | Solicitações | Histórico |
| Repetir pedido | Solicitações | Histórico → Duplicar |
| Salvar nome de departamento | Solicitações | Dados Salvos |
| Template mensal | Solicitações | Modelos |
| Organizar tarefas | Tarefas | Kanban |
| Calcular viagem | Diárias | Formulário + PDF |
| Controlar pagamento mensal | Credores Fixos | Grade empenhos |
| Sair do sistema | Hub | Sair |

---

## Exemplos de resposta da IA (tom correto)

### ✅ Bom
> Para emitir essa solicitação, acesse **Solicitações** no hub, preencha o solicitante e a Secretaria de Educação, adicione o item "Papel A4" com quantidade 20 e valor R$ 25,00, depois clique em **PDF**. O arquivo será baixado e salvo no histórico.

### ❌ Evitar
> Vou criar um módulo de compras automático para você. *(não existe)*  
> Envie sua senha que eu reseto. *(inseguro e sem fluxo)*  
> O protocolo oficial será #2026-0042. *(protocolo é decorativo)*

---

*Adicionar novos cenários conforme surgirem dúvidas reais dos usuários.*
