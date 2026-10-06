# Painel gerencial e de fiscalização de obras do TCE-PR

## Objetivo

Transformar a aba existente **Obras municipais** do módulo TCE-PR em um painel gerencial e de fiscalização. O painel deve combinar os dados oficiais de obras e acompanhamentos do TCE-PR com licitações, contratações e contratos do PNCP e com os empenhos orçamentários importados no sistema.

O cruzamento será totalmente automático, persistente e auditável. O sistema somente criará um vínculo quando houver confiança suficiente; correspondências ambíguas permanecerão sem vínculo e serão apresentadas como pendência, sem associação forçada.

## Contexto atual

O sistema já possui:

- sincronização de licitações, obras e acompanhamentos do TCE-PR;
- sincronização de contratações e contratos do PNCP;
- importação de empenhos orçamentários;
- aba de obras com listagem, situação, percentual físico, último acompanhamento e detalhe das fiscalizações;
- indicadores básicos de quantidade, valor, obras paralisadas e obras sem acompanhamento.

A implementação evoluirá essa estrutura. Não será criado outro módulo ou uma segunda fonte de verdade para obras.

## Decisões aprovadas

- O painel ficará na aba **Obras municipais** do TCE-PR.
- O foco será combinado: gestão e fiscalização.
- Os vínculos financeiros serão totalmente automáticos.
- Vínculos sem confiança suficiente não serão criados.
- A conciliação será persistida para que o resultado seja estável, auditável e rápido de consultar.
- Os últimos dados válidos continuarão disponíveis quando uma fonte externa falhar.

## Experiência do painel

### Indicadores

O topo da aba exibirá:

- total de obras;
- valor total das obras;
- obras em andamento;
- obras atrasadas;
- obras paralisadas;
- obras sem vínculo financeiro confiável.

Os cartões funcionarão como filtros rápidos quando isso não conflitar com os filtros já selecionados.

### Alertas prioritários

O painel destacará:

- vigência encerrada sem conclusão da obra;
- mais de 60 dias sem fiscalização ou acompanhamento;
- diferença superior a 20 pontos percentuais entre execução física e percentual pago;
- obra paralisada;
- obra sem cobertura financeira confiável;
- contrato com vigência terminando nos próximos 30 dias.

A lista será inicialmente ordenada por necessidade de atenção. A precedência será: paralisada, atrasada, fiscalização desatualizada, possível inconsistência físico-financeira, contrato vencendo e sem cobertura financeira. Em um mesmo nível, aparecerá primeiro a obra com fiscalização mais antiga.

### Filtros e tabela

Os filtros contemplarão:

- busca textual;
- ano;
- situação;
- estado da vigência;
- faixa de execução física;
- tipo de alerta;
- qualidade do vínculo automático.

A tabela principal apresentará:

- obra/intervenção;
- valor da obra;
- situação;
- percentual físico;
- vigência;
- última fiscalização;
- valor contratado;
- valores empenhado, liquidado e pago;
- percentual financeiro;
- alertas;
- confiança do vínculo.

### Detalhe da obra

Ao abrir uma obra, o usuário verá:

- identificação e dados cadastrais da intervenção;
- objeto, regime, valor e prazo de execução;
- vigência contratual ou vigência estimada;
- linha do tempo dos acompanhamentos e fiscalizações;
- licitação, contratação e contrato relacionados;
- empenhos relacionados;
- totais contratado, empenhado, liquidado, pago e saldo;
- comparação entre execução física e financeira;
- alertas calculados;
- memória do cruzamento, com pontuação, critérios usados e data da análise.

## Fontes e fluxo dos dados

As fontes serão:

1. `tcepr_obras` e `tcepr_obras_acompanhamentos`, para cadastro, execução física, situação e fiscalizações;
2. `tcepr_licitacoes`, como ponte para processo e edital quando houver correspondência com a obra;
3. `pncp_registros`, para contratações, contratos, fornecedores, valores e vigência;
4. `empenhos_orcamentarios`, para valores empenhados, liquidados, pagos e saldos.

O valor pago dos empenhos seguirá a convenção já usada pelo sistema: valor baixado líquido. Cada total financeiro será calculado com o valor bruto menos o respectivo valor anulado.

O fluxo preferencial será:

```text
Obra TCE-PR -> Licitação TCE-PR -> Contratação/contrato PNCP -> Empenhos
```

Quando uma etapa intermediária não existir, o motor poderá avaliar candidatos diretamente na etapa seguinte, mas exigirá evidências independentes suficientes para alcançar a confiança mínima.

## Normalização e conciliação automática

Antes da comparação, o serviço normalizará:

- CNPJ e outros identificadores, mantendo apenas dígitos;
- números de processo, edital, licitação e contrato;
- nomes de fornecedores;
- objetos, removendo acentos, pontuação e termos sem poder discriminatório;
- datas e anos;
- valores monetários.

Cada candidato receberá uma pontuação explicável baseada nas evidências disponíveis:

- coincidência exata de processo, edital, licitação, contrato ou identificador relacionado;
- mesmo órgão ou município;
- compatibilidade temporal;
- similaridade entre objetos;
- proximidade entre valores;
- mesmo fornecedor, quando este existir nas duas fontes.

Identificadores exatos terão peso superior a critérios aproximados. Similaridade textual ou valor próximo, isoladamente, nunca serão suficientes para criar um vínculo.

Um vínculo será aceito somente quando:

- alcançar o limite mínimo de confiança configurado pelo serviço;
- possuir o conjunto mínimo de evidências independentes definido para o tipo de entidade;
- estiver claramente acima do segundo melhor candidato.

Caso contrário, a obra ou entidade ficará com o estado `sem_correspondencia_segura`. Os limites e pesos ficarão centralizados em constantes testáveis, não espalhados pela API ou pela interface.

## Persistência e auditoria

Será criada uma tabela de vínculos de obras com, no mínimo:

- identificador do vínculo;
- obra;
- tipo e identificador da entidade vinculada;
- pontuação de confiança;
- estado do vínculo;
- critérios/evidências em JSON;
- versão do algoritmo;
- datas de criação e última análise.

A combinação de obra, tipo e entidade será única. A conciliação será idempotente: executar novamente com as mesmas fontes não duplicará vínculos nem totais.

Vínculos automáticos antigos serão reavaliados quando os dados de origem ou a versão do algoritmo mudarem. A atualização ocorrerá em transação: o conjunto anterior continuará válido até que o novo resultado esteja completo. O histórico necessário para explicar mudanças de associação será preservado em registro de auditoria ou em eventos de conciliação.

## Vigência e cálculos

A vigência seguirá esta precedência:

1. `vigencia_inicio` e `vigencia_fim` do contrato PNCP vinculado;
2. data de início da obra e data final calculada com `prazo_execucao`;
3. informação indisponível.

Os cálculos financeiros serão:

- **empenhado líquido:** empenhado bruto menos empenhado anulado;
- **liquidado líquido:** liquidado bruto menos liquidado anulado;
- **pago líquido:** baixado bruto menos baixado anulado;
- **saldo contratual:** valor contratado menos pago líquido;
- **percentual financeiro:** pago líquido dividido pelo valor contratado; na ausência de contrato, pago líquido dividido pelo valor da obra, com indicação de que a base é estimada.

Divisão por zero ou ausência de base produzirá percentual indisponível, nunca `Infinity`, `NaN` ou um percentual artificial.

## Regras dos alertas

- **Atrasada:** fim da vigência anterior à data atual e situação diferente de concluída.
- **Fiscalização desatualizada:** último acompanhamento anterior a 60 dias; uma obra nunca acompanhada também será sinalizada.
- **Possível inconsistência:** diferença absoluta superior a 20 pontos entre percentual físico e percentual financeiro.
- **Paralisada:** situação calculada a partir do acompanhamento do TCE-PR.
- **Sem cobertura financeira:** nenhum vínculo financeiro alcançou confiança suficiente.
- **Contrato vencendo:** fim da vigência entre a data atual e os próximos 30 dias.

As comparações de data usarão o fuso configurado pelo servidor e datas civis, evitando mudança de classificação por conversão indevida para UTC.

## Serviço e APIs

A lógica de normalização, pontuação, desempate, persistência e cálculo ficará em um serviço dedicado, separado dos manipuladores HTTP.

As APIs existentes serão ampliadas sem quebrar os consumidores atuais:

- `/api/tce-pr/status` incluirá os novos totais do painel;
- `/api/tce-pr/obras` aceitará os novos filtros e retornará resumo financeiro, vigência, alertas e confiança;
- `/api/tce-pr/detalhe?tipo=obra&id=...` incluirá vínculos, memória da conciliação, totais financeiros e alertas;
- a sincronização disparará a conciliação depois de atualizar as fontes relevantes.

O trabalho pesado não será executado durante a consulta do painel. A interface lerá resultados persistidos, mantendo abertura e paginação rápidas.

## Atualização automática

A conciliação deverá ser executada após:

- sincronização do TCE-PR;
- sincronização do PNCP;
- importação ou substituição dos empenhos;
- mudança de versão do algoritmo.

Quando não for seguro executar imediatamente dentro da operação de origem, será registrada uma reconciliação pendente e processada pelo mecanismo assíncrono já usado pelo servidor. Falha na conciliação não apagará o último resultado válido.

## Tratamento de erros e estado dos dados

- Falhas de fontes externas serão mostradas como sincronização parcial ou desatualizada.
- O painel continuará exibindo os últimos dados válidos, com a data da última atualização.
- Erros de conciliação serão registrados sem criar associações parciais.
- Dados inválidos de uma obra não interromperão a análise das demais.
- Mensagens técnicas completas ficarão nos logs; a interface apresentará mensagens operacionais curtas.

## Permissões e segurança

O painel manterá a permissão atual do módulo TCE-PR/PNCP. Consultas estarão disponíveis aos usuários autorizados e sincronizações manuais continuarão restritas a administradores. A memória de conciliação não incluirá segredos nem dados além dos já acessíveis nesses módulos.

## Estratégia de testes

### Unidade

- normalização de identificadores, textos, datas e valores;
- pontuação de correspondências fortes e fracas;
- rejeição quando o limite não for alcançado;
- rejeição de empate ou margem insuficiente sobre o segundo candidato;
- idempotência e reavaliação por versão;
- vigência contratual e estimada;
- cálculos financeiros líquidos;
- todos os alertas e seus limites.

### Integração e API

- migração e restrições da tabela de vínculos;
- fluxo obra, licitação, PNCP e empenhos com correspondência segura;
- ausência de vínculo em cenário ambíguo;
- preservação do último resultado após falha;
- novos filtros, totais, paginação e detalhe;
- autorização dos endpoints.

### Interface

- renderização dos indicadores;
- filtros rápidos e filtros combinados;
- ordenação por prioridade;
- colunas físicas, financeiras, de vigência e fiscalização;
- estados sem vínculo e sem dados;
- detalhe da obra e memória da conciliação;
- regressão das funcionalidades atuais do TCE-PR.

## Critérios de aceitação

- A aba Obras municipais apresenta os indicadores, alertas, filtros e colunas aprovados.
- Cada obra mostra valor, situação, percentual físico, vigência e última fiscalização.
- Vínculos confiáveis mostram contrato e totais empenhado, liquidado, pago e saldo.
- Correspondências ambíguas não são vinculadas e aparecem como pendência.
- A justificativa e a pontuação de cada vínculo podem ser consultadas.
- Os seis alertas seguem os limites aprovados.
- A conciliação é automática, persistente e idempotente.
- Falhas de atualização não removem os últimos dados válidos.
- Testes de unidade, integração, API e interface passam sem regressão das funções atuais.

## Fora do escopo

- criação de um novo módulo ou rota principal para obras;
- edição manual de vínculos;
- associação forçada de candidatos abaixo do limite de confiança;
- alteração dos dados oficiais recebidos do TCE-PR, PNCP ou empenhos;
- previsão de custo futuro ou de data de conclusão por inteligência artificial;
- notificações externas por e-mail, WhatsApp ou outros canais nesta primeira versão.
