# Guia para Aplicar Migração de Múltiplos Perfis

## ❌ Problema Identificado
As colunas necessárias (`is_primary`, `is_active`, `profile_slug`) não existem na tabela `profiles` do Supabase.

**Estrutura atual da tabela:**
- id
- user_id  
- username
- display_name
- bio
- avatar_url
- updated_at

## ✅ Solução: Aplicar Migração Manual

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard:**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute o SQL da migração:**
   Copie e cole o seguinte SQL:

```sql
-- Adicionar novas colunas à tabela profiles
ALTER TABLE profiles 
ADD COLUMN is_primary BOOLEAN DEFAULT false,
ADD COLUMN profile_slug TEXT UNIQUE,
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Atualizar perfis existentes
UPDATE profiles 
SET 
  is_primary = true,
  is_active = true,
  profile_slug = lower(regexp_replace(username, '[^a-zA-Z0-9]', '', 'g'))
WHERE is_primary IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_active ON profiles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_primary ON profiles(is_primary);
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(profile_slug);

-- Atualizar RLS policies
DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profiles" ON profiles;

CREATE POLICY "Users can view own profiles" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

4. **Execute a query:**
   - Clique em "Run" ou pressione Ctrl+Enter
   - Verifique se não há erros

### Opção 2: Via CLI do Supabase

Se você tem o CLI do Supabase instalado:

```bash
# Instalar CLI (se não tiver)
npm install -g supabase

# Fazer login
supabase login

# Aplicar migração
supabase db push
```

## 🔄 Após Aplicar a Migração

1. **Restaurar funcionalidade completa:**
   Execute este comando para restaurar o código completo:
   ```bash
   git checkout HEAD~1 -- src/components/ProfileSelector.tsx src/pages/Dashboard.tsx
   ```

2. **Testar a aplicação:**
   - Acesse http://localhost:8080/
   - Verifique se os perfis carregam sem erro
   - Teste a criação de novos perfis

## 📋 Verificação

Para verificar se a migração foi aplicada corretamente:

1. No SQL Editor do Supabase, execute:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

2. Você deve ver as novas colunas:
   - is_primary (boolean)
   - profile_slug (text)
   - is_active (boolean)

## 🚀 Funcionalidades Habilitadas Após Migração

- ✅ Múltiplos perfis por usuário
- ✅ Perfil primário designado
- ✅ URLs personalizadas (profile_slug)
- ✅ Ativação/desativação de perfis
- ✅ Seletor de perfis no Dashboard
- ✅ Criação de novos perfis
- ✅ Gerenciamento completo de perfis

---

**Nota:** Após aplicar a migração, a aplicação terá funcionalidade completa de múltiplos perfis!