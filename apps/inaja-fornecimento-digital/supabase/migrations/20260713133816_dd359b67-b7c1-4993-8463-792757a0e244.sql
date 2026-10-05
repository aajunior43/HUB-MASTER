
CREATE TABLE public.tarefas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  responsavel text,
  prioridade text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'todo',
  ordem integer NOT NULL DEFAULT 0,
  prazo date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO anon, authenticated;
GRANT ALL ON public.tarefas TO service_role;

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tarefas" ON public.tarefas FOR SELECT USING (true);
CREATE POLICY "Public insert tarefas" ON public.tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tarefas" ON public.tarefas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete tarefas" ON public.tarefas FOR DELETE USING (true);

CREATE TRIGGER trg_tarefas_updated_at
BEFORE UPDATE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tarefas;
