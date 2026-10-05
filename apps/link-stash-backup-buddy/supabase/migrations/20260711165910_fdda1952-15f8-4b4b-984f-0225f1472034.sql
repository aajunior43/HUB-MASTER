CREATE TABLE public.site_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  username TEXT,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_credentials TO authenticated;
GRANT ALL ON public.site_credentials TO service_role;

ALTER TABLE public.site_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own site credentials"
  ON public.site_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own site credentials"
  ON public.site_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site credentials"
  ON public.site_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site credentials"
  ON public.site_credentials FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_site_credentials_updated_at
  BEFORE UPDATE ON public.site_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX site_credentials_user_id_idx ON public.site_credentials(user_id, created_at DESC);