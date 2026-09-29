REVOKE ALL ON FUNCTION public.seed_user_defaults(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_user_defaults(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.seed_user_defaults(uuid) FROM authenticated;