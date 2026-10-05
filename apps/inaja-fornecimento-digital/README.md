# Inajá Fornecimento Digital

Sistema interno da **Prefeitura Municipal de Inajá (PR)** para solicitações de aquisição, credores fixos, empenhos, diárias, documentos e envio para assinatura (Autentique).

Roda **offline** na máquina da prefeitura: frontend React + API Node + **SQLite** (`data/inaja.sqlite`).

## Requisitos

- **Node.js 22+** ([nodejs.org](https://nodejs.org/))
- Windows (bat) ou qualquer SO com terminal

## Início rápido (desenvolvimento)

```bat
rodar.bat
```

Ou:

```sh
npm install --legacy-peer-deps
npm run dev
```

Abra **http://localhost:8001/**

### Usuários iniciais

| Usuário     | Senha                          |
|-------------|--------------------------------|
| aleksandro  | cria no **primeiro acesso** |
| maicon      | cria no **primeiro acesso**    |
| luana       | cria no **primeiro acesso**    |

Política de senha: **mínimo 6 caracteres**, com **maiúscula**, **minúscula** e **número**.

## Produção (recomendado)

```sh
npm install --legacy-peer-deps
npm run build
npm start
```

Isso sobe `server/standalone.mjs` (API + arquivos estáticos de `dist/`).

Não use `npm run dev` como produção.

## MCP da Prefeitura

O servidor MCP local fica em `http://localhost:8001/mcp`; para acesso remoto, publique-o somente por HTTPS/VPN/proxy reverso. No sistema, entre como administrador e abra **MCP** para criar uma chave vinculada ao usuário que a IA deverá representar.

Conecte sua IA pela URL acima usando autenticação **Bearer** com a chave gerada. O MCP publica as ferramentas correspondentes aos módulos do usuário vinculado à chave. As RPCs usam o formato `{ "argumentos": { ... } }`; as ferramentas diretas do Mural, credores, solicitações, obrigações e alguns backups recebem os campos no nível superior. Para exclusões, RPCs usam `argumentos._confirmacao` e ferramentas diretas usam `confirmacao`. Todas as operações ficam registradas na auditoria com origem `mcp`. A chave é mostrada uma única vez, as novas chaves expiram por padrão em 90 dias e podem ser revogadas na tela MCP.

O guia completo, com o catálogo e exemplos de confirmações, está em [`public/guia-mcp-mural-tarefas.md`](public/guia-mcp-mural-tarefas.md). A lista retornada por `tools/list` é a fonte de verdade para as ferramentas disponíveis à chave.

### Acesso externo

- Porta local do sistema e do MCP: `8001`
- Cabeçalho de autenticação: `Authorization: Bearer imcp_...`

Para acesso externo, use um proxy reverso com HTTPS e certificado; não encaminhe a porta HTTP diretamente para a internet e nunca registre a chave MCP nesta documentação. Se for indispensável escutar na rede, configure `INAJA_BIND_HOST=0.0.0.0` somente atrás desse controle de acesso.

**Nota de deploy (VPS):** o ambiente atual pode usar `INAJA_BIND_HOST=0.0.0.0` na porta `8001` para acesso direto pelo IP enquanto não houver proxy HTTPS. Isso é intencional e documentado; quando Traefik/HTTPS estiver na frente, volte para `127.0.0.1` e force `INAJA_COOKIE_SECURE=1` (ou deixe o auto-detect via `X-Forwarded-Proto`).

Nunca publique essa URL sem HTTPS, VPN ou proxy com controle de acesso. A chave MCP permite executar ações em nome de `MCP_USER`.

## Backup

```sh
npm run backup
```

Copia o SQLite e `data/uploads/` para `data/backups/AAAA-MM-DD_HHMMSS/`.

Faça backup **antes de atualizar** o sistema e de forma periódica (ex.: fim do dia).

### Envio pelo Telegram

O administrador pode enviar uma cópia adicional pelo bot: configure uma senha exclusiva em **Admin → Configurações**, no chat privado escolha **Vínculo** e então envie o código exibido no Admin; depois escolha **Backup** no menu de botões. O arquivo enviado é um ZIP temporário protegido por AES-256; a senha nunca é exibida pelo sistema nem enviada ao Telegram. Após o envio (ou uma falha), o ZIP temporário é removido e o backup local sem criptografia em `data/backups/` é mantido. Guarde uma cópia fora da máquina: o Telegram não substitui a rotina de backup local.

## Módulos principais

- **Solicitações** — PDF / Word / Excel + assinatura manuscrita no PDF
- **Credores fixos** — empenhos mensais, lote, relatório, Excel
- **Empenhos** — importação CSV orçamentária
- **Backup** — cópia de `inaja.sqlite` + `uploads/` para `data/backups/` (UI admin ou `npm run backup`)
- **Telegram** — bot no mesmo processo; vínculo por código do Admin e menu de botões para status, backup e consultas
- **TCE-PR — Dados abertos** — importa o Mural de Licitações e Obras Municipais, acompanha atualizações e cruza licitações com o PNCP
- **SICONFI — Indicadores fiscais** — consulta RREO, RGF, DCA, extrato de entregas e alertas de responsabilidade fiscal
- **Gestão de documentos**, diárias, RPA, prazos, calendário, IA (OpenRouter no Admin), etc.

Admin: `/admin` (apenas administradores).

### TCU / Portal da Transparência

A tela de CNPJ consulta a certidão consolidada e a lista de licitantes inidôneos do TCU. A tela de Credores Fixos oferece a mesma verificação por fornecedor. Com `PORTAL_TRANSPARENCIA_API_KEY` configurada no servidor ou em **Admin → Configurações**, o sistema acrescenta CEIS, CNEP e contratos federais.

### Saúde pública — DATASUS/CNES

O módulo `/saude-publica` consulta a rede municipal e estadual do Cadastro Nacional de Estabelecimentos de Saúde, com filtros por código do município, UF, tipo, situação e busca textual. Também permite abrir um CNES exato, consultar dados cadastrais, endereço, contato, gestão, atualização e capacidades ambulatoriais/hospitalares.

A integração é protegida pela permissão `saude-publica`, usa cache de dez minutos e não grava os dados externos no banco local. O serviço aceita códigos municipais de seis ou sete dígitos e normaliza o valor para o formato de seis dígitos utilizado pela API do CNES.

Fonte oficial: <https://apidadosabertos.saude.gov.br/> · conjunto CNES: <https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude>.

### Banco Central — serviço auxiliar

O Banco Central alimenta a aba **Índices oficiais** em `/calculadoras`. O usuário pode consultar IPCA mensal (SGS 433) ou Selic efetiva diária (SGS 11), informar valor e período e obter a composição das observações publicadas, o fator acumulado, o acréscimo e o valor atualizado. O cálculo é uma ferramenta de apoio e deve ser conferido conforme a metodologia prevista no contrato ou obrigação. As consultas ficam em cache por uma hora e não são persistidas.

Rotas protegidas pelos módulos `calculadoras` ou `prestacao-contas` (Banco Central):

- `GET /api/bcb/config`
- `GET /api/bcb/serie?serie=ipca|selic&dataInicial=&dataFinal=`
- `GET /api/bcb/calcular?valor=&serie=&dataInicial=&dataFinal=`

Fontes oficiais: <https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json> e <https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json>.

## Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desenvolvimento |
| `npm run build` + `npm start` | Produção |
| `npm run check` | typecheck + lint + testes frontend + build |
| `npm run test:server` | Testes backend (SQLite em memória) |
| `npm run backup` | Backup local |

## Documentação interna

Pasta **`manual do projeto/`** — ADRs, regras de negócio, mapa do código, operação.

Guia para agentes de IA: **`AGENTS.md`**.

## Segurança (resumo)

- Uso **interno** / rede confiável (ver ADRs).
- API local sem token de sessão HTTP ainda — não exponha na internet pública sem VPN/proxy.
- Chaves OpenRouter só no Admin (`config_*` exige admin).

## Repositório

https://github.com/aajunior43/inaja-fornecimento-digital
