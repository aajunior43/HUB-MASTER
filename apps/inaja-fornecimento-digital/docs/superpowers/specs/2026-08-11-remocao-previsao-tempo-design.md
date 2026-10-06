# Remoção da previsão do tempo

## Objetivo

Remover completamente a previsão do tempo exibida no hub principal do sistema e eliminar sua integração frontend com a API Open-Meteo.

## Escopo

- Retirar a importação de `WeatherCard` de `src/pages/ModuleHub.tsx`.
- Retirar a renderização do card de previsão do tempo do hub principal.
- Excluir `src/components/WeatherCard.tsx`, incluindo a lógica de carregamento, atualização automática, estados de erro e consulta à Open-Meteo.
- Confirmar que não restam imports, URLs ou textos da previsão do tempo no código ativo do frontend.
- Preservar todas as demais alterações já presentes no diretório de trabalho.

## Fora do escopo

- Não alterar outros módulos, páginas, rotas, banco de dados ou serviços do backend.
- Não remover referências genéricas a “tempo” que pertençam a funcionalidades distintas, como linha do tempo, duração ou tempo de afastamento.
- Não adicionar uma alternativa visual para substituir o card removido.

## Arquitetura e fluxo

Antes da mudança, `ModuleHub` importa `WeatherCard`, que consulta diretamente a Open-Meteo ao montar, atualiza os dados a cada 15 minutos e renderiza carregamento, erro ou previsão. Depois da mudança, o hub seguirá renderizando os demais módulos sem montar esse componente; portanto, não haverá mais chamada externa de clima nem intervalo de atualização associado.

## Tratamento de erros

Não será criado novo tratamento de erro. Os estados de falha pertencem exclusivamente ao componente removido e deixarão de existir junto com a integração.

## Verificação e critérios de aceitação

- O arquivo `src/components/WeatherCard.tsx` não existe mais.
- `src/pages/ModuleHub.tsx` não importa nem renderiza `WeatherCard`.
- Uma busca no frontend não encontra `WeatherCard`, `open-meteo.com` ou o texto “Previsão do tempo” em código ativo.
- Typecheck, lint, testes e build continuam passando.
- As alterações não relacionadas já existentes no diretório de trabalho permanecem intactas.
