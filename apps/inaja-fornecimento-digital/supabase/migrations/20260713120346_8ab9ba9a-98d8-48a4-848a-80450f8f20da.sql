
-- Solicitantes
CREATE TABLE public.solicitantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitantes TO anon, authenticated;
GRANT ALL ON public.solicitantes TO service_role;
ALTER TABLE public.solicitantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read solicitantes" ON public.solicitantes FOR SELECT USING (true);
CREATE POLICY "Public insert solicitantes" ON public.solicitantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update solicitantes" ON public.solicitantes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete solicitantes" ON public.solicitantes FOR DELETE USING (true);

-- Empresas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO anon, authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read empresas" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "Public insert empresas" ON public.empresas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update empresas" ON public.empresas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete empresas" ON public.empresas FOR DELETE USING (true);

-- Observações
CREATE TABLE public.observacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  texto TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observacoes TO anon, authenticated;
GRANT ALL ON public.observacoes TO service_role;
ALTER TABLE public.observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read observacoes" ON public.observacoes FOR SELECT USING (true);
CREATE POLICY "Public insert observacoes" ON public.observacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update observacoes" ON public.observacoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete observacoes" ON public.observacoes FOR DELETE USING (true);

-- Modelos (templates)
CREATE TABLE public.modelos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  form_data JSONB NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos TO anon, authenticated;
GRANT ALL ON public.modelos TO service_role;
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read modelos" ON public.modelos FOR SELECT USING (true);
CREATE POLICY "Public insert modelos" ON public.modelos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update modelos" ON public.modelos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete modelos" ON public.modelos FOR DELETE USING (true);

-- Solicitações (histórico)
CREATE TABLE public.solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante TEXT NOT NULL,
  empresa TEXT NOT NULL,
  data_solicitacao TEXT NOT NULL,
  observacoes TEXT,
  items JSONB NOT NULL,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes TO anon, authenticated;
GRANT ALL ON public.solicitacoes TO service_role;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read solicitacoes" ON public.solicitacoes FOR SELECT USING (true);
CREATE POLICY "Public insert solicitacoes" ON public.solicitacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update solicitacoes" ON public.solicitacoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete solicitacoes" ON public.solicitacoes FOR DELETE USING (true);

-- Trigger para updated_at em modelos
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER modelos_updated_at
BEFORE UPDATE ON public.modelos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
