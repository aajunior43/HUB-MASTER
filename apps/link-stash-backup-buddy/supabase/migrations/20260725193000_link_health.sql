CREATE TABLE IF NOT EXISTS public.link_health (
  link_id uuid PRIMARY KEY REFERENCES public.links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('healthy', 'broken', 'redirected', 'unknown')),
  status_code integer,
  final_url text,
  reason text,
  latency_ms integer,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.link_health ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_health TO authenticated;
GRANT ALL ON public.link_health TO service_role;

DROP POLICY IF EXISTS "Users manage own link health" ON public.link_health;
CREATE POLICY "Users manage own link health"
ON public.link_health FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_link_health_user_status
  ON public.link_health(user_id, status, checked_at DESC);
