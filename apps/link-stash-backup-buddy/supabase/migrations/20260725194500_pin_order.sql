ALTER TABLE public.links ADD COLUMN IF NOT EXISTS pin_position integer;

CREATE OR REPLACE FUNCTION public.reorder_pinned_links(_link_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM unnest(_link_ids) id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.links l
      WHERE l.id = id AND l.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Link inválido ou sem permissão';
  END IF;

  UPDATE public.links l
  SET pin_position = ordered.position - 1
  FROM unnest(_link_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE l.id = ordered.id AND l.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_pinned_links(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_pinned_links(uuid[]) TO authenticated;
