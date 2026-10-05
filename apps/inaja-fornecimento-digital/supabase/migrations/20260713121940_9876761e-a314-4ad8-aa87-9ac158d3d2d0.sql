
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assinatura text;

-- Public policies for the 'solicitacao-anexos' bucket (no-auth shared app)
DROP POLICY IF EXISTS "Public read anexos" ON storage.objects;
CREATE POLICY "Public read anexos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'solicitacao-anexos');

DROP POLICY IF EXISTS "Public upload anexos" ON storage.objects;
CREATE POLICY "Public upload anexos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'solicitacao-anexos');

DROP POLICY IF EXISTS "Public update anexos" ON storage.objects;
CREATE POLICY "Public update anexos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'solicitacao-anexos')
  WITH CHECK (bucket_id = 'solicitacao-anexos');

DROP POLICY IF EXISTS "Public delete anexos" ON storage.objects;
CREATE POLICY "Public delete anexos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'solicitacao-anexos');
