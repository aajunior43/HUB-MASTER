# Design: lançador de backup para Windows

## Objetivo

Criar `backup.bat` na raiz do projeto para permitir que o operador execute o backup local por duplo clique, com mensagens claras e sem precisar abrir o terminal ou conhecer comandos npm.

## Abordagem

O arquivo será um wrapper seguro para o comando existente `npm run backup`. Ele reutilizará `scripts/backup-db.mjs` e `server/backup.mjs`, mantendo uma única implementação da rotina de backup.

O lançador seguirá o padrão visual e operacional de `rodar.bat`:

- ativará extensões do `cmd` e UTF-8;
- mudará o diretório atual para a pasta do próprio arquivo;
- exibirá um cabeçalho identificando a rotina;
- verificará a disponibilidade de Node.js e npm;
- verificará a existência de `package.json` e do script de backup;
- executará `call npm run backup`;
- apresentará uma mensagem inequívoca de sucesso ou falha;
- preservará o código de saída do comando;
- manterá a janela aberta com `pause` para que o operador leia o resultado.

## Fluxo

1. O operador abre `backup.bat`.
2. O lançador confirma os requisitos mínimos.
3. O comando `npm run backup` cria uma nova pasta em `data/backups/AAAA-MM-DD_HHMMSS/`.
4. O script existente imprime os arquivos copiados, o destino e o tamanho.
5. O lançador mostra o estado final e aguarda uma tecla.

Backups anteriores não serão alterados nem removidos.

## Tratamento de erros

O lançador encerrará com código diferente de zero quando Node.js, npm, `package.json` ou a execução do backup falharem. Cada caso mostrará uma orientação curta. A janela permanecerá aberta tanto no sucesso quanto no erro.

## Verificação

A implementação será verificada em dois caminhos:

1. execução normal, confirmando código de saída zero e criação de um novo diretório de backup com banco e uploads;
2. execução com requisito propositalmente indisponível em ambiente controlado, confirmando mensagem de erro e código de saída diferente de zero.

Também será executado `git diff --check` antes da conclusão.
