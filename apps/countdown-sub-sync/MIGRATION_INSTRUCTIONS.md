# Instruções para Aplicar Migração no Supabase

## Problema
A coluna `category` ainda existe no banco de dados com constraint NOT NULL, causando erros ao tentar salvar assinaturas.

## Solução
Execute os seguintes comandos SQL no Supabase Dashboard:

### Passo 1: Acesse o Supabase Dashboard
1. Vá para: https://supabase.com/dashboard
2. Selecione o projeto: `bfbjpismsvqmihwisezv`
3. Clique em "SQL Editor" no menu lateral

### Passo 2: Execute a Migração
Cole e execute o seguinte SQL:

```sql
-- Remove constraint NOT NULL da coluna category
ALTER TABLE public.subscriptions ALTER COLUMN category DROP NOT NULL;

-- Remove a coluna category completamente
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS category;
```

### Passo 3: Verificar
Após executar, verifique se a migração foi aplicada:

```sql
-- Verificar estrutura da tabela
\d public.subscriptions;
```

### Passo 4: Remover Código Temporário
Após aplicar a migração, remova as linhas temporárias do código:

**Arquivo**: `src/hooks/use-subscriptions.ts`

Remover estas linhas:
```typescript
category: 'Outros', // Valor temporário até migração ser aplicada
```

## Status
- ✅ Migração criada
- ⏳ Aguardando aplicação no banco
- ⏳ Remoção do código temporário