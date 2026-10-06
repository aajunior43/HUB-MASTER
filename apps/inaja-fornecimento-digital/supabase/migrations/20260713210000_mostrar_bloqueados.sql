-- Adiciona preferência de exibição de módulos bloqueados por usuário
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS mostrar_bloqueados BOOLEAN NOT NULL DEFAULT false;

-- Atualiza usuario_modulos_disponiveis para retornar a flag
CREATE OR REPLACE FUNCTION public.usuario_modulos_disponiveis(_username text)
RETURNS TABLE(modulo_id text, is_admin boolean, mostrar_bloqueados boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT um.modulo_id, u.is_admin, u.mostrar_bloqueados
  FROM public.usuarios u
  JOIN public.usuario_modulos um ON um.usuario_id = u.id
  WHERE lower(u.username) = lower(_username)
    AND u.ativo = true;
$$;

-- Atualiza admin_atualizar_usuario para incluir mostrar_bloqueados
CREATE OR REPLACE FUNCTION public.admin_atualizar_usuario(
  _caller             text,
  _id                 uuid,
  _is_admin           boolean,
  _ativo              boolean,
  _modulos            text[],
  _mostrar_bloqueados boolean DEFAULT false
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
  SET is_admin = _is_admin, ativo = _ativo, mostrar_bloqueados = _mostrar_bloqueados
  WHERE id = _id;

  DELETE FROM public.usuario_modulos WHERE usuario_id = _id;

  INSERT INTO public.usuario_modulos (usuario_id, modulo_id)
  SELECT _id, m
  FROM UNNEST(_modulos) AS m
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_usuario(text, uuid, boolean, boolean, text[], boolean) TO anon, authenticated;

-- Atualiza admin_criar_usuario para incluir mostrar_bloqueados
CREATE OR REPLACE FUNCTION public.admin_criar_usuario(
  _caller             text,
  _username           text,
  _is_admin           boolean,
  _modulos            text[],
  _mostrar_bloqueados boolean DEFAULT false
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

  INSERT INTO public.usuarios (username, is_admin, mostrar_bloqueados)
  VALUES (lower(trim(_username)), _is_admin, _mostrar_bloqueados)
  RETURNING id INTO new_id;

  INSERT INTO public.usuario_modulos (usuario_id, modulo_id)
  SELECT new_id, m
  FROM UNNEST(_modulos) AS m
  ON CONFLICT DO NOTHING;

  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_criar_usuario(text, text, boolean, text[], boolean) TO anon, authenticated;

-- admin_listar_usuarios: incluir mostrar_bloqueados
CREATE OR REPLACE FUNCTION public.admin_listar_usuarios(_caller text)
RETURNS TABLE(
  id uuid, username text, is_admin boolean, ativo boolean,
  modulos text[], created_at timestamptz, mostrar_bloqueados boolean
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
    u.created_at,
    u.mostrar_bloqueados
  FROM public.usuarios u
  LEFT JOIN public.usuario_modulos um ON um.usuario_id = u.id
  GROUP BY u.id, u.username, u.is_admin, u.ativo, u.created_at, u.mostrar_bloqueados
  ORDER BY u.created_at;
END;
$$;
