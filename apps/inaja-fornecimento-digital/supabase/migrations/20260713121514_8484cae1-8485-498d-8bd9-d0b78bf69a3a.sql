
ALTER TABLE public.solicitantes REPLICA IDENTITY FULL;
ALTER TABLE public.empresas REPLICA IDENTITY FULL;
ALTER TABLE public.observacoes REPLICA IDENTITY FULL;
ALTER TABLE public.solicitacoes REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitantes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.empresas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.observacoes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
