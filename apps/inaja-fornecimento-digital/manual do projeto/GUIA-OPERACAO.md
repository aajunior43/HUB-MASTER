# Guia de Operação

> Rotina diária, backup, manutenção e procedimentos para quem **opera** o sistema na prefeitura.

---

## 1. Rotina diária

### Iniciar o sistema (manhã)
```bash
# Opção A — Windows
rodar.bat

# Opção B — manual
cd A:\KAMBAM\inaja-fornecimento-digital
npm run dev
```
1. Aguardar mensagem: `http://localhost:8080`
2. Abrir no navegador
3. Login com seu usuário

### Encerrar (fim do expediente)
1. Fechar aba do navegador (opcional: Sair no hub)
2. No terminal: `Ctrl+C` para parar o servidor
3. **Não** apagar pasta `data/`

---

## 2. Backup

### O que backupar
```
data/
├── inaja.sqlite      ← OBRIGATÓRIO
└── uploads/          ← anexos das solicitações
```

### Frequência recomendada
| Criticidade | Frequência |
|-------------|------------|
| Uso diário intenso | Diário (fim do dia) |
| Uso moderado | Semanal |
| Antes de atualização | Sempre |

### Como fazer backup manual
```bash
# Windows — copiar pasta
xcopy "data" "backup\data-2026-07-13" /E /I

# Ou copiar só o banco
copy "data\inaja.sqlite" "backup\inaja-2026-07-13.sqlite"
```

### Restaurar backup
1. Parar o servidor (`Ctrl+C`)
2. Substituir `data/inaja.sqlite` pelo backup
3. Substituir `data/uploads/` se necessário
4. Reiniciar `rodar.bat`

### Cópia criptografada pelo Telegram

Use esta opção somente como cópia adicional, nunca como substituta do backup local.

1. Em **Admin → Configurações**, defina a senha exclusiva do arquivo de backup Telegram. O sistema confirma somente que ela está configurada; não a exibe nem permite recuperá-la.
2. Configure e inicie o bot, gere o código Telegram no Admin e, no chat privado, escolha **Vínculo** antes de enviar apenas os seis dígitos. O código gerado é válido por 10 minutos; a solicitação aberta pelo botão **Vínculo** aceita o envio por 2 minutos.
3. Depois do vínculo, escolha **Backup** no menu de botões do bot e confirme a ação. Apenas um usuário administrador vinculado ao mesmo chat privado pode confirmar.
4. Baixe o ZIP recebido e armazene-o em local seguro. Ele usa AES-256 e só abre com a senha definida no Admin.

O ZIP para Telegram é temporário: ele é removido ao final do envio, inclusive se o envio falhar. A cópia local não criptografada em `data/backups/` permanece preservada. Se não houver senha configurada, a cópia local é criada, mas nenhum arquivo é enviado. Não envie a senha em mensagens, não a anote no Telegram e não compartilhe o arquivo com pessoas sem autorização.

### Teste de recuperação trimestral

1. Em um computador ou pasta isolada, extraia uma cópia de backup com a senha correta.
2. Abra o SQLite extraído em modo somente leitura e execute `PRAGMA integrity_check;`; o resultado deve ser `ok`.
3. Confirme que os anexos esperados estão presentes em `uploads/`.
4. Registre a data, o responsável e o resultado. Não use o banco extraído para substituir o banco de produção sem parar o servidor e seguir o procedimento de restauração acima.

### ⚠️ Nunca fazer durante backup
- Não copiar `.sqlite` enquanto o servidor está gravando (preferir parar antes)
- Arquivos `-wal` e `-shm` são temporários — backupar só `inaja.sqlite` é suficiente se servidor parado

---

## 3. Produção (servidor dedicado)

### Deploy inicial
```bash
npm install --legacy-peer-deps
npm run build
npm start
```

### Variáveis
```bash
set PORT=8080
node server/standalone.mjs
```

### Serviço Windows (conceito)
1. Instalar Node 20+
2. Criar tarefa agendada ou serviço NSSM apontando para:
   - Programa: `node`
   - Argumentos: `server/standalone.mjs`
   - Diretório: pasta do projeto
3. Garantir que `data/` tem permissão de escrita

### Atualizar versão
```bash
git pull                    # se usar git
npm install --legacy-peer-deps
npm run build
# Reiniciar standalone
# NÃO apagar data/
```

---

## 4. Usuários e senhas

| Usuário | Procedimento |
|---------|--------------|
| aleksandro | Reset: `node scripts/set-aleksandro-password.mjs` e definir nova senha fora de documentação e mensagens |
| maicon / luana | Apagar `senha_hash` no SQLite → primeiro acesso novamente |

### Adicionar usuário (técnico)
Editar `seed()` em `server/db.mjs` ou INSERT manual:
```sql
INSERT INTO usuarios (id, username) VALUES ('uuid', 'novo_usuario');
```

---

## 5. Monitoramento

### Health check
```bash
curl http://localhost:8080/api/health
```
Esperado: `"ok": true`

### Sinais de problema
| Sinal | Ação |
|-------|------|
| Página não carrega | Verificar Node e porta 8080 |
| Login falha todos | Verificar `data/inaja.sqlite` |
| Upload falha | Verificar permissão `data/uploads/` |
| PDF em branco | Testar outro navegador (Chrome/Edge) |
| Disco cheio | Limpar uploads antigos (com cuidado) |

### Logs
- Terminal onde roda `npm run dev` ou `npm start`
- Console do navegador (F12) para erros de frontend
- O servidor grava eventos em JSON com `timestamp`, `level`, `event`, `requestId`, IP, status e duração.
- Respostas `4xx`, `5xx` e chamadas lentas aparecem como `warn` ou `error`; ajuste `LOG_SLOW_REQUEST_MS` se necessário.
- `LOG_LEVEL=debug` habilita os argumentos redigidos das RPCs; senhas, tokens, conteúdo e base64 permanecem mascarados.
- Em **Admin → Superlog**, use busca, período e o campo **Correlação** para seguir uma requisição pelo `requestId`.

---

## 6. Limpeza e manutenção

### Limpar uploads antigos
1. Parar servidor
2. Revisar `data/uploads/` — remover arquivos órfãos
3. Opcional: limpar referências em `solicitacoes.anexos` no SQLite

### Compactar banco (opcional)
Com servidor **parado**:
```bash
sqlite3 data/inaja.sqlite "VACUUM;"
```

### Verificar integridade
```bash
sqlite3 data/inaja.sqlite "PRAGMA integrity_check;"
```

---

## 7. Calendário de manutenção sugerido

| Periodicidade | Tarefa |
|---------------|--------|
| Diário | Backup `inaja.sqlite` (se uso intenso) |
| Semanal | Backup completo `data/` |
| Mensal | Verificar espaço em disco |
| Mensal | Atualizar Node.js se necessário |
| Trimestral | Revisar documentação em `manual do projeto/` |
| Antes de mudança | Backup + testar em cópia |

---

## 8. Contatos e responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| Usuário (aleksandro, maicon, luana) | Operar módulos, criar solicitações |
| Admin técnico | Backup, servidor, senhas, atualizações |
| DEV Aleksandro Alves | Desenvolvimento e evolução do sistema |

---

## 9. Checklist — incidente "sistema parou"

```
[ ] Servidor está rodando? (terminal aberto, sem erro)
[ ] http://localhost:8080/api/health responde?
[ ] data/inaja.sqlite existe?
[ ] Node >= 20? (node --version)
[ ] Porta 8080 livre?
[ ] Restaurar último backup se banco corrompido
[ ] Consultar TROUBLESHOOTING.md
```

---

## 10. Checklist — novo computador

```
[ ] Instalar Node.js 20+
[ ] Copiar pasta do projeto (com data/)
[ ] npm install --legacy-peer-deps
[ ] rodar.bat ou npm run dev
[ ] Testar login aleksandro
[ ] Testar criar solicitação + PDF
[ ] Configurar backup automático da pasta data/
```

---

*Documento operacional — complementa MANUAL-INFRAESTRUTURA-IA.md.*
