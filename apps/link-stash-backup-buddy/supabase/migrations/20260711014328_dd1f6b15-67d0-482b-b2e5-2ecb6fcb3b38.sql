
REVOKE EXECUTE ON FUNCTION public.toggle_link_favorite(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.replace_link_tags(uuid, uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.toggle_link_favorite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_link_tags(uuid, uuid[]) TO authenticated;
