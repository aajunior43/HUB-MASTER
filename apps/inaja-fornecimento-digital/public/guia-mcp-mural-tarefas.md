# Guia do agente de IA — MCP da Prefeitura de Inajá

Use este servidor MCP somente para ações que o usuário solicitou. A chave MCP representa um usuário do sistema: as ferramentas exibidas e o acesso aos dados respeitam os módulos atribuídos a esse usuário.

## Conexão

- Endpoint local: `http://localhost:8001/mcp`
- Produção: use somente HTTPS, VPN ou proxy reverso com controle de acesso. O servidor local escuta em `127.0.0.1` por padrão; não exponha a porta HTTP diretamente.
- Se for necessário escutar na rede, configure `INAJA_BIND_HOST=0.0.0.0` somente atrás do proxy/VPN. Para clientes MCP em navegador, configure também `MCP_ALLOWED_ORIGIN` com a origem exata.
- Autenticação: `Authorization: Bearer <CHAVE_MCP_GERADA_NO_SISTEMA>`
- Novas chaves podem ter 30, 90, 180 ou 365 dias de validade; 90 dias é o padrão do painel.
- Nunca solicite, revele ou grave uma chave MCP em mensagens, tarefas ou documentos.

## Módulos e ferramentas

O servidor publica somente as ferramentas permitidas pelos módulos do usuário da chave. Há dois formatos de chamada:

- Ferramentas diretas do Mural, credores, solicitações, obrigações e alguns backups recebem os campos diretamente no objeto da ferramenta.
- Ferramentas baseadas em RPC recebem todos os campos dentro de `argumentos`. Consulte o `inputSchema` retornado por `tools/list` para os nomes e formatos aceitos.

### Mural de tarefas

- `listar_tarefas`, `criar_tarefa`, `editar_tarefa`, `mover_tarefa`, `remover_tarefa` e `resumo_tarefas`.
- Antes de editar, mover ou remover, liste as tarefas para confirmar o `id`.

### Credores e empenhos

- `listar_credores`, `criar_credor`, `editar_credor`, `remover_credor`.
- `listar_empenhos_mensais`, `atualizar_empenho_mensal`, `remover_empenho_mensal`, `resumo_empenhos` e `credores_pendentes`.

### Solicitações

- `listar_solicitacoes`, `criar_solicitacao`, `editar_solicitacao`, `adicionar_observacao_solicitacao`, `remover_solicitacao` e `resumo_solicitacoes`.

### Obrigações

- `listar_obrigacoes`: pode filtrar por `categoria`, `resolvido` e `data_limite`.
- `criar_obrigacao`: exige `titulo` e `data_limite` (`YYYY-MM-DD`); aceita `categoria` e `descricao`.
- `atualizar_obrigacao`: altere apenas os campos solicitados.
- `concluir_obrigacao`: use `concluida: true` para concluir ou `false` para reabrir.
- `remover_obrigacao` e `resumo_obrigacoes`.

Categorias aceitas: `geral`, `prestacao_contas`, `tribunal_contas`, `licitacao`, `contrato`, `convenio`, `folha_pagamento`, `fiscal`, `obra`, `rh`, `saude`, `educacao` e `outro`.

Exemplos de ferramentas diretas:

```text
listar_tarefas({"status":"todo","limite":50})
```

```text
remover_tarefa({"id":"UUID_DA_TAREFA","confirmacao":"REMOVER"})
```

As ferramentas diretas `remover_tarefa`, `remover_credor`, `remover_empenho_mensal`, `remover_solicitacao` e `remover_obrigacao` exigem `confirmacao: "REMOVER"` no nível superior. A ferramenta direta `enviar_backup_github` exige `confirmacao: "ENVIAR_BACKUP"` no nível superior.

## Modulos adicionais

As ferramentas abaixo usam as RPCs oficiais do sistema. Envie os argumentos da RPC dentro do campo `argumentos`; por exemplo: `{ "argumentos": { "_pagina": 1, "_por_pagina": 50 } }`.

### Empenhos orcamentarios

`consultar_estatisticas_empenhos`, `listar_empenhos_orcamentarios`, `obter_empenho_orcamentario`, `listar_filtros_empenhos` e `importar_empenhos`.

### Gestao de documentos

`listar_arquivos_documentos`, `criar_pasta_documentos`, `remover_pasta_documentos`, `registrar_arquivo_documento`, `renomear_arquivo_documento`, `remover_arquivo_documento`, `listar_setores_documentos`, `listar_tipos_documentos`, `criar_documento`, `atualizar_documento`, `enviar_documento`, `responder_documento`, `encaminhar_documento`, `arquivar_documento`, `cancelar_documento`, `obter_documento`, `listar_documentos`, `anexar_arquivo_documento`, `listar_notificacoes_documentos`, `marcar_notificacao_documento_lida`, `listar_filtros_documentos`, `salvar_filtro_documentos`, `remover_filtro_documentos` e `listar_superlog_documentos`.

### Calendario, RPAs e IA

O MCP inclui eventos e regras do calendario (`listar_eventos_calendario`, `criar_evento_calendario`, `atualizar_evento_calendario`, `remover_evento_calendario`, `marcar_excecao_calendario`, `remover_excecao_calendario`, `salvar_regras_calendario`), operacoes de RPA (`listar_rpas`, `calcular_rpa`, `criar_rpa`, `atualizar_rpa`, `remover_rpa`) e assistentes de IA (`listar_modelos_ia`, `consultar_ia`, `executar_assistente_empenho`, `classificar_despesa`, `sugerir_tarefa_com_ia`).

### Assinaturas, financeiro, mural e CNPJ

- Autentique: `listar_envios_autentique`, `listar_contatos_autentique`, `salvar_contato_autentique` e `remover_contato_autentique`.
- Financeiro: `listar_contas_financeiras`, `criar_conta_financeira`, `atualizar_conta_financeira`, `remover_conta_financeira`, `listar_transacoes_financeiras`, `criar_transacao_financeira`, `atualizar_transacao_financeira`, `remover_transacao_financeira`, `listar_alertas_financeiros`, `resolver_alerta_financeiro` e `consultar_dashboard_financeiro`.
- Mural: `listar_recados_mural`, `criar_recado_mural`, `atualizar_recado_mural`, `remover_recado_mural`, `listar_comentarios_mural`, `criar_comentario_mural` e `remover_comentario_mural`.
- CNPJ: `buscar_cnpj`, `listar_cnpjs_salvos`, `salvar_cnpj` e `remover_cnpj_salvo`.

### Backups administrativos

Administradores podem usar `criar_backup`, `enviar_backup_github`, `consultar_status_backup`, `listar_backups`, `verificar_integridade_backup`, `criar_backup_completo`, `enviar_backup_completo_github` e `remover_backup`. `criar_backup` e `enviar_backup_github` são ferramentas diretas; as demais são RPCs e recebem parâmetros em `argumentos`.

As ferramentas PDF continuam disponíveis apenas no navegador e não fazem parte do catálogo MCP.

Para RPCs destrutivas, a confirmação fica dentro de `argumentos`:

```json
{"argumentos":{"_id":"ID_DO_REGISTRO","_confirmacao":"REMOVER"}}
```

Confirmações RPC aceitas: `IMPORTAR_EMPENHOS` em `importar_empenhos`, `CANCELAR` em `cancelar_documento`, `ENVIAR_BACKUP` em `enviar_backup_completo_github` e `REMOVER` nas demais RPCs destrutivas.

## Segurança operacional

1. Não invente IDs, responsáveis, datas ou conteúdo.
2. Se houver mais de um item correspondente, peça ao usuário que identifique o correto.
3. Para exclusões, confirme o item e use `confirmacao: "REMOVER"` nas ferramentas diretas ou `argumentos._confirmacao: "REMOVER"` nas RPCs, somente após autorização explícita.
4. Preserve campos não mencionados ao atualizar um registro.
5. Datas devem usar `YYYY-MM-DD`; peça esclarecimento quando a data estiver ambígua.
6. Informe ao usuário o resultado de toda alteração executada.
7. Todas as operações ficam registradas na auditoria com origem `mcp`.

## Administração

Chaves vinculadas a administradores também podem usar as ferramentas de backup listadas acima. O envio ao GitHub exige confirmação literal `ENVIAR_BACKUP` no nível correspondente da ferramenta e autorização explícita do usuário.
