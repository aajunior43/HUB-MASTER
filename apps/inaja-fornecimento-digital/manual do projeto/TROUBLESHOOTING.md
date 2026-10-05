# Troubleshooting e FAQ

> Problemas comuns, causas e soluções. Para IA orientar usuários e desenvolvedores.

---

## Início e servidor

### "Node.js não encontrado" (rodar.bat)
**Causa:** Node não instalado ou fora do PATH.  
**Solução:**
1. Instalar Node.js 20+ de https://nodejs.org/
2. Reiniciar o terminal
3. Verificar: `node --version`

### Porta 8080 já em uso
**Causa:** Outra instância do app ou outro serviço na porta.  
**Solução:**
```bash
# Windows — encontrar processo
netstat -ano | findstr :8080
taskkill /PID <pid> /F

# Ou alterar porta em vite.config.ts e standalone.mjs
```

### `npm install` falha
**Causa:** Conflitos de peer dependencies.  
**Solução:**
```bash
npm install --legacy-peer-deps
```

### Página em branco após build
**Causa:** Assets não encontrados ou rota sem fallback.  
**Solução:**
- Em dev: usar `npm run dev`
- Em produção: usar `npm start` (standalone com SPA fallback)
- Não abrir `dist/index.html` direto no navegador (file://)

---

## Login e autenticação

### "Usuário não encontrado"
**Causa:** Username não é aleksandro, maicon ou luana.  
**Solução:** Usar um dos três usuários cadastrados (minúsculas).

### "Senha incorreta" (aleksandro)
**Causa:** Senha alterada ou banco resetado sem seed.  
**Solução:**
```bash
node scripts/set-aleksandro-password.mjs
```
Defina uma nova senha forte localmente; ela não deve ser registrada na documentação nem enviada por mensagens.

### "Não foi possível criar — Senha já definida"
**Causa:** Usuário já criou senha no primeiro acesso.  
**Solução:** Não há redefinição pelo app. Para reset manual, apagar `senha_hash` no SQLite ou recriar via script.

### Login funciona mas redireciona de volta para /login
**Causa:** `localStorage` bloqueado ou limpo.  
**Solução:**
- Verificar se navegador permite localStorage
- Modo anônimo pode limpar ao fechar
- Verificar DevTools → Application → localStorage → `prefeitura_user`

### maicon/luana pedem senha em vez de criar
**Causa:** `senha_hash` já preenchido no banco.  
**Solução:** Comportamento correto — já passaram do primeiro acesso.

---

## Banco de dados

### Dados sumiram
**Causa:** `inaja.sqlite` apagado ou substituído.  
**Solução:**
- Restaurar backup de `data/inaja.sqlite`
- Reiniciar app recria banco vazio com seed (só usuários)

### Erro ao salvar / "Erro ao carregar"
**Causa:** Banco corrompido ou sem permissão de escrita.  
**Solução:**
1. Parar o servidor
2. Verificar permissões da pasta `data/`
3. Se corrompido: renomear `inaja.sqlite` para backup e reiniciar
4. Remover arquivos `-wal` e `-shm` órfãos se necessário

### "Tabela inválida" na API
**Causa:** Tentativa de acessar tabela fora da whitelist (ex: `usuarios` via query).  
**Solução:** Usuários só via RPC (`usuario_login`, etc.).

### Duplicata ao salvar solicitante
**Causa:** Nome já existe (UNIQUE).  
**Solução:** Normal — usar o existente ou excluir o antigo em Dados Salvos.

---

## Solicitações

### PDF exporta mas não aparece no histórico
**Causa:** Erro silencioso no insert ou exportou Word/Excel (não salvam).  
**Solução:**
- Só **PDF** salva no histórico
- Verificar console do navegador (F12)
- Testar `/api/health`

### Anexo não carrega no PDF
**Causa:** Arquivo removido de `data/uploads/` ou URL inválida.  
**Solução:** Reenviar anexo antes de exportar PDF.

### Assinatura não aparece no PDF
**Causa:** Pad vazio ou exportação antes de desenhar.  
**Solução:** Desenhar assinatura e exportar PDF novamente.

### Busca global (Ctrl+K) não abre
**Causa:** Foco fora da página ou conflito de atalho do navegador.  
**Solução:** Clicar na página e tentar novamente; usar botão "Buscar" no header.

### Lote rejeita arquivo
**Causas comuns:**
| Erro | Correção |
|------|----------|
| "4 campos separados por \|" | Adicionar pipe faltante |
| "Solicitante obrigatório" | Preencher 1º campo |
| "Quantidade inválida" | Usar inteiro > 0 |
| "Valor inválido" | Usar ponto: `25.50` não `25,50` |
| "Arquivo inválido" | Usar extensão `.txt` |

---

## Tarefas (Kanban)

### Tarefas não sincronizam entre computadores
**Causa:** Realtime é local (mesmo navegador), não WebSocket entre máquinas.  
**Solução:** Comportamento esperado. Recarregar página para ver dados atualizados de outro PC (se compartilham o mesmo SQLite em rede — não é o caso padrão).

### Drag & drop não move card
**Causa:** Soltar fora da coluna ou erro de rede.  
**Solução:** Soltar dentro da área da coluna; verificar console.

---

## Diárias

### "Retorno posterior à saída" erro
**Causa:** Data/hora de retorno ≤ saída.  
**Solução:** Corrigir datas no formulário.

### "Cargo não possui diária para destino"
**Causa:** Anexo II não tem "fora do Estado".  
**Solução:** Escolher destino válido para o cargo.

### Valor diferente do esperado
**Causa:** Regra usa diárias integrais, não meias.  
**Solução:** Verificar horas: <12h=0, 12-24h=1, >24h=1+extras.

---

## Credores Fixos

### Célula do mês não muda de cor
**Causa:** Empenho não confirmado no diálogo.  
**Solução:** Clicar na célula → preencher → "Confirmar empenho".

### Credor sumiu após exclusão
**Causa:** Exclusão remove credor + todos empenhos (CASCADE).  
**Solução:** Não há lixeira — recriar credor manualmente.

---

## Produção e deploy

### "Pasta dist/ não encontrada"
**Solução:**
```bash
npm run build
npm start
```

### `node:sqlite` module not found
**Causa:** Node.js < 20.  
**Solução:** Atualizar para Node 20 ou superior.

### App funciona em dev mas não em produção
**Checklist:**
- [ ] `npm run build` executado
- [ ] `npm start` (não `npm run dev`)
- [ ] Pasta `data/` existe ao lado de `dist/`
- [ ] Porta `PORT` liberada no firewall

---

## FAQ — perguntas frequentes

**Precisa de internet?**  
Não, após instalar dependências. Banco e API são 100% locais.

**Precisa de arquivo .env?**  
Não.

**Onde ficam os dados?**  
`data/inaja.sqlite` e `data/uploads/`.

**Como fazer backup?**  
Copiar a pasta `data/` inteira.

**Posso usar Supabase na nuvem?**  
Não no estado atual. O `client.ts` aponta para API local.

**Há app mobile?**  
Não — é web responsiva.

**Quantos usuários simultâneos?**  
SQLite suporta leitura concorrente (WAL), mas escrita serializada. Adequado para equipe pequena (3–10).

**PDF/Word/Excel rodam no servidor?**  
Não — geração é no navegador (client-side).

**Como adicionar novo usuário?**  
Inserir em `usuarios` no SQLite ou estender seed em `server/db.mjs`. Não há tela de cadastro.

**O protocolo #2026-0001 é oficial?**  
Não — é decorativo.

---

## Diagnóstico rápido (checklist IA)

```
1. node --version          → >= 20?
2. curl /api/health        → ok: true?
3. data/inaja.sqlite       → existe?
4. localStorage user       → preenchido após login?
5. Console F12             → erros JS?
6. Network tab             → /api/query retorna 200?
```

---

*Atualizar este documento quando novos problemas recorrentes forem identificados.*
