-- DDDs de atuação declarados pelo administrador para cada representante.
CREATE TABLE IF NOT EXISTS public.representative_area_ddds (
 representative_id uuid PRIMARY KEY,
 ddds text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.representative_area_ddds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.representative_area_ddds FROM PUBLIC;
GRANT SELECT ON public.representative_area_ddds TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.representative_area_ddds TO authenticated;
DROP POLICY IF EXISTS "Read representative DDDs" ON public.representative_area_ddds;
CREATE POLICY "Read representative DDDs" ON public.representative_area_ddds FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin manages representative DDDs" ON public.representative_area_ddds;
CREATE POLICY "Admin manages representative DDDs" ON public.representative_area_ddds FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
NOTIFY pgrst, 'reload schema';
