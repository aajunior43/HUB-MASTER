
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.links       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_tags   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys    TO authenticated;

GRANT ALL ON public.profiles   TO service_role;
GRANT ALL ON public.links      TO service_role;
GRANT ALL ON public.folders    TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.tags       TO service_role;
GRANT ALL ON public.link_tags  TO service_role;
GRANT ALL ON public.api_keys   TO service_role;
