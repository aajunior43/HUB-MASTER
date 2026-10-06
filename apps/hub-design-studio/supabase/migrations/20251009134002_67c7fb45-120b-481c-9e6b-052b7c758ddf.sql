-- Garantir que usernames sejam únicos globalmente
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- Adicionar índice para melhor performance nas buscas por user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Remover constraint de perfil primário se existir (para permitir múltiplos perfis)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;

-- Adicionar coluna para indicar se é o perfil padrão (cada usuário tem um padrão)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Criar função para garantir que apenas um perfil seja o padrão por usuário
CREATE OR REPLACE FUNCTION public.ensure_single_default_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.profiles 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para garantir apenas um perfil padrão
DROP TRIGGER IF EXISTS ensure_single_default_profile_trigger ON public.profiles;
CREATE TRIGGER ensure_single_default_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_profile();

-- Atualizar perfis existentes para marcar o primeiro como padrão
UPDATE public.profiles p1
SET is_default = true
WHERE id IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.profiles
  ORDER BY user_id, created_at ASC
);

-- Adicionar política RLS para permitir que usuários criem múltiplos perfis
DROP POLICY IF EXISTS "Users can create multiple profiles" ON public.profiles;
CREATE POLICY "Users can create multiple profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Adicionar política para deletar perfis próprios
DROP POLICY IF EXISTS "Users can delete own profiles" ON public.profiles;
CREATE POLICY "Users can delete own profiles"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);