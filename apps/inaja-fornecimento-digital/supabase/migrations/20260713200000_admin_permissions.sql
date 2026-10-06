-- =====================================================
-- MIGRATION: Sistema de Admin + Permissões de Módulos
-- =====================================================

-- 1. Adicionar colunas na tabela usuarios
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS is_admin  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ativo     BOOLEAN NOT NULL DEFAULT true;

-- 2. Tabela de permissões por módulo
CREATE TABLE IF NOT EXISTS public.usuario_modulos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  modulo_id    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, modulo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_modulos TO anon, authenticated;
GRANT ALL ON public.usuario_modulos TO service_role;
ALTER TABLE public.usuario_modulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read usuario_modulos"   ON public.usuario_modulos FOR SELECT USING (true);
CREATE POLICY "Public insert usuario_modulos" ON public.usuario_modulos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update usuario_modulos" ON public.usuario_modulos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete usuario_modulos" ON public.usuario_modulos FOR DELETE USING (true);

-- 3. Setar aleksandro como admin
UPDATE public.usuarios SET is_admin = true WHERE lower(username) = 'aleksandro';

-- 4. Módulos padrão para todos os usuários existentes
INSERT INTO public.usuario_modulos (usuario_id, modulo_id)
SELECT u.id, m.modulo_id
FROM public.usuarios u
CROSS JOIN (
  VALUES ('solicitacoes'), ('tarefas'), ('diarias'), ('credores-fixos')
) AS m(modulo_id)
ON CONFLICT (usuario_id, modulo_id) DO NOTHING;

-- =====================================================
-- 5. RPC: Módulos disponíveis para um usuário
-- =====================================================
CREATE OR REPLACE FUNCTION public.usuario_modulos_disponiveis(_username text)
RETURNS TABLE(modulo_id text, is_admin boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT um.modulo_id, u.is_admin
  FROM public.usuarios u
  JOIN public.usuario_modulos um ON um.usuario_id = u.id
  WHERE lower(u.username) = lower(_username)
    AND u.ativo = true;
$$;
GRANT EXECUTE ON FUNCTION public.usuario_modulos_disponiveis(text) TO anon, authenticated;

-- =====================================================
-- 6. RPC: Listar todos os usuários (somente para admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_listar_usuarios(_caller text)
RETURNS TABLE(
  id uuid, username text, is_admin boolean, ativo boolean,
  modulos text[], created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE lower(username) = lower(_caller) AND is_admin = true AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.is_admin,
    u.ativo,
    COALESCE(ARRAY_AGG(um.modulo_id) FILTER (WHERE um.modulo_id IS NOT NULL), '{}') AS modulos,
    u.created_at
  FROM public.usuarios u
  LEFT JOIN public.usuario_modulos um ON um.usuario_id = u.id
  GROUP BY u.id, u.username, u.is_admin, u.ativo, u.created_at
  ORDER BY u.created_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_listar_usuarios(text) TO anon, authenticated;

-- =====================================================
-- 7. RPC: Criar novo usuário (somente admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_criar_usuario(
  _caller   text,
  _username text,
  _is_admin boolean,
  _modulos  text[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE lower(username) = lower(_caller) AND is_admin = true AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuarios WHERE lower(username) = lower(_username)) THEN
    RAISE EXCEPTION 'Usuário já existe';
  END IF;

  INSERT INTO public.usuarios (username, is_admin)
  VALUES (lower(trim(_username)), _is_admin)
  RETURNING id INTO new_id;

  INSERT INTO public.usuario_modulos (usuario_id, modulo_id)
  SELECT new_id, m
  FROM UNNEST(_modulos) AS m
  ON CONFLICT DO NOTHING;

  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_criar_usuario(text, text, boolean, text[]) TO anon, authenticated;

-- =====================================================
-- 8. RPC: Atualizar usuário (somente admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_atualizar_usuario(
  _caller   text,
  _id       uuid,
  _is_admin boolean,
  _ativo    boolean,
  _modulos  text[]
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE lower(username) = lower(_caller) AND is_admin = true AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.usuarios
  SET is_admin = _is_admin, ativo = _ativo
  WHERE id = _id;

  DELETE FROM public.usuario_modulos WHERE usuario_id = _id;

  INSERT INTO public.usuario_modulos (usuario_id, modulo_id)
  SELECT _id, m
  FROM UNNEST(_modulos) AS m
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_usuario(text, uuid, boolean, boolean, text[]) TO anon, authenticated;

-- =====================================================
-- 9. RPC: Reset de senha (somente admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_reset_senha(
  _caller text,
  _id     uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE lower(username) = lower(_caller) AND is_admin = true AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.usuarios SET senha_hash = NULL WHERE id = _id;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reset_senha(text, uuid) TO anon, authenticated;

-- =====================================================
-- 10. RPC: Checar ativo no login (atualiza função existente)
-- =====================================================
CREATE OR REPLACE FUNCTION public.usuario_login(_username text, _senha text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.usuarios
     WHERE lower(username) = lower(_username)
       AND ativo = true
       AND senha_hash IS NOT NULL
       AND senha_hash = extensions.crypt(_senha, senha_hash)
  );
$$;
