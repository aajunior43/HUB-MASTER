ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS links_user_deleted_idx ON public.links(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS links_user_archived_idx ON public.links(user_id, is_archived);