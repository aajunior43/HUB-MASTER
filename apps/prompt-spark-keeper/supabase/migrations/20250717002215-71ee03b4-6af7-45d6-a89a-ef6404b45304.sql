
-- Criar tabela para armazenar os prompts
CREATE TABLE public.prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1
);

-- Habilitar Row Level Security (RLS) para permitir acesso público
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Criar política que permite acesso completo para todos (já que é uma aplicação pública)
CREATE POLICY "Allow all operations on prompts" ON public.prompts
  FOR ALL USING (true)
  WITH CHECK (true);

-- Criar função para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar automaticamente o updated_at
CREATE TRIGGER update_prompts_updated_at 
    BEFORE UPDATE ON public.prompts 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();
