# Remoção do módulo IBGE

## Objetivo

Remover o módulo independente **IBGE — Dados municipais** e sua integração própria de consulta e validação municipal, incluindo o uso automático na tela Saúde pública.

## Escopo

- Excluir a tela IBGE e seu teste.
- Remover importação e rota `/ibge` do frontend.
- Remover o card do hub e a permissão do painel administrativo.
- Remover o serviço `server/services/ibge.mjs`, seu teste e as rotas `/api/ibge/municipios` e `/api/ibge/estados`.
- Retirar a permissão `ibge` das listas de módulos e dos controles de acesso do serviço.
- Remover a validação automática do município na Saúde pública; o filtro continuará aceitando o código digitado manualmente para consultar o CNES.
- Atualizar README, manual e testes auxiliares para não documentarem nem testarem a integração removida.

## Fora do escopo

Os campos e valores de código IBGE usados como parâmetros próprios nas integrações TCE-PR e SICONFI permanecerão. Eles não são o módulo independente removido e são necessários para essas consultas continuarem funcionando.

## Testes e verificação

Antes da remoção, será criado um teste de regressão que espera `404` para as antigas rotas `/api/ibge/*`. Depois, serão executados o teste específico, a suíte de testes, o typecheck, o lint e o build. Também será feita uma busca final por imports, rotas e referências à integração removida.

## Comportamento esperado

Não haverá mais card, permissão ou rota dedicada ao IBGE. A Saúde pública não fará chamadas para `/api/ibge`; consultas ao CNES continuarão usando o código de município informado pelo usuário ou os demais filtros disponíveis.
