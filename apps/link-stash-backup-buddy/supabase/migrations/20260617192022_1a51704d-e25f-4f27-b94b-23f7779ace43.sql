CREATE TABLE public.mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_tokens TO authenticated;
GRANT ALL ON public.mcp_tokens TO service_role;

ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mcp tokens" ON public.mcp_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mcp tokens" ON public.mcp_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mcp tokens" ON public.mcp_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mcp tokens" ON public.mcp_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_mcp_tokens_updated_at
BEFORE UPDATE ON public.mcp_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();