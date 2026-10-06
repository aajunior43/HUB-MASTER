
CREATE TABLE public.credores_fixos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  documento text,
  departamento text NOT NULL DEFAULT 'Administração',
  valor_mensal numeric NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credores_fixos TO anon, authenticated;
GRANT ALL ON public.credores_fixos TO service_role;
ALTER TABLE public.credores_fixos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read credores_fixos" ON public.credores_fixos FOR SELECT USING (true);
CREATE POLICY "Public insert credores_fixos" ON public.credores_fixos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update credores_fixos" ON public.credores_fixos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete credores_fixos" ON public.credores_fixos FOR DELETE USING (true);
CREATE TRIGGER trg_credores_fixos_updated_at BEFORE UPDATE ON public.credores_fixos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.empenhos_mensais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credor_id uuid NOT NULL REFERENCES public.credores_fixos(id) ON DELETE CASCADE,
  ano int NOT NULL,
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'pendente',
  valor numeric,
  numero_empenho text,
  observacao text,
  empenhado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(credor_id, ano, mes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empenhos_mensais TO anon, authenticated;
GRANT ALL ON public.empenhos_mensais TO service_role;
ALTER TABLE public.empenhos_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read empenhos" ON public.empenhos_mensais FOR SELECT USING (true);
CREATE POLICY "Public insert empenhos" ON public.empenhos_mensais FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update empenhos" ON public.empenhos_mensais FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete empenhos" ON public.empenhos_mensais FOR DELETE USING (true);
CREATE TRIGGER trg_empenhos_mensais_updated_at BEFORE UPDATE ON public.empenhos_mensais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
