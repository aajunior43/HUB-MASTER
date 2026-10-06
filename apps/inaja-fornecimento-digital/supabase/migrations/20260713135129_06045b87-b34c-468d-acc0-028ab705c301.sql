
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  senha_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.usuarios TO service_role;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.usuario_status(_username text)
RETURNS TABLE(existe boolean, tem_senha boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS(SELECT 1 FROM public.usuarios WHERE lower(username) = lower(_username)),
    EXISTS(SELECT 1 FROM public.usuarios WHERE lower(username) = lower(_username) AND senha_hash IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION public.usuario_set_senha(_username text, _senha text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE ok boolean;
BEGIN
  IF length(_senha) < 4 THEN
    RAISE EXCEPTION 'Senha muito curta';
  END IF;
  UPDATE public.usuarios
     SET senha_hash = extensions.crypt(_senha, extensions.gen_salt('bf'))
   WHERE lower(username) = lower(_username)
     AND senha_hash IS NULL
   RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.usuario_login(_username text, _senha text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.usuarios
     WHERE lower(username) = lower(_username)
       AND senha_hash IS NOT NULL
       AND senha_hash = extensions.crypt(_senha, senha_hash)
  );
$$;

GRANT EXECUTE ON FUNCTION public.usuario_status(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_set_senha(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_login(text, text) TO anon, authenticated;

INSERT INTO public.usuarios (username) VALUES ('aleksandro'), ('maicon'), ('luana')
ON CONFLICT (username) DO NOTHING;
