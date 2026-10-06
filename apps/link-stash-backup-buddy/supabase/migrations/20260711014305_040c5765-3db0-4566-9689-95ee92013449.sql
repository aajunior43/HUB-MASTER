
-- Indexes for hot queries
CREATE INDEX IF NOT EXISTS idx_links_user_deleted_created ON public.links (user_id, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_user_folder ON public.links (user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_link_tags_link ON public.link_tags (link_id);
CREATE INDEX IF NOT EXISTS idx_link_tags_tag ON public.link_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON public.folders (user_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_links_updated_at ON public.links;
CREATE TRIGGER trg_links_updated_at BEFORE UPDATE ON public.links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_folders_updated_at ON public.folders;
CREATE TRIGGER trg_folders_updated_at BEFORE UPDATE ON public.folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tighten link_tags insert to also check tag ownership
DROP POLICY IF EXISTS "Users can create their own link_tags" ON public.link_tags;
CREATE POLICY "Users can create their own link_tags"
ON public.link_tags FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_tags.link_id AND l.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.tags t WHERE t.id = link_tags.tag_id AND t.user_id = auth.uid())
);

-- Atomic toggle_favorite
CREATE OR REPLACE FUNCTION public.toggle_link_favorite(_link_id uuid)
RETURNS public.links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.links;
BEGIN
  UPDATE public.links
  SET is_favorite = NOT is_favorite
  WHERE id = _link_id AND user_id = auth.uid()
  RETURNING * INTO row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link não encontrado ou sem permissão';
  END IF;
  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_link_favorite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_link_favorite(uuid) TO authenticated;

-- Atomic replace_link_tags
CREATE OR REPLACE FUNCTION public.replace_link_tags(_link_id uuid, _tag_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.links WHERE id = _link_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Link não encontrado ou sem permissão';
  END IF;

  IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(_tag_ids) tid
      WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.id = tid AND t.user_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Tag inválida';
    END IF;
  END IF;

  DELETE FROM public.link_tags WHERE link_id = _link_id;

  IF _tag_ids IS NOT NULL AND array_length(_tag_ids, 1) > 0 THEN
    INSERT INTO public.link_tags (link_id, tag_id)
    SELECT _link_id, tid FROM unnest(_tag_ids) tid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_link_tags(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_link_tags(uuid, uuid[]) TO authenticated;
