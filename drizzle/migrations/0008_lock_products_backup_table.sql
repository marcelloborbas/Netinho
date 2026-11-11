ALTER TABLE public.products_backup_20261109 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products_backup_20261109 FROM anon, authenticated;
GRANT ALL ON public.products_backup_20261109 TO service_role;