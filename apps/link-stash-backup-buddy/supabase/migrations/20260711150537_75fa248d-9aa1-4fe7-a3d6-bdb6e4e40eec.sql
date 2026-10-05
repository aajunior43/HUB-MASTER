REVOKE EXECUTE ON FUNCTION public.toggle_link_favorite(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.replace_link_tags(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_link_favorite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_link_tags(uuid, uuid[]) TO authenticated;