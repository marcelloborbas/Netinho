BEGIN;
CREATE TABLE IF NOT EXISTS public.commercial_representative_details (
 representative_id uuid PRIMARY KEY REFERENCES public.commercial_representatives(id) ON DELETE CASCADE,
 phone text NOT NULL DEFAULT '',
 street_address text NOT NULL DEFAULT '',
 address_number text NOT NULL DEFAULT '',
 neighborhood text NOT NULL DEFAULT '',
 postal_code text NOT NULL DEFAULT '',
 city text NOT NULL DEFAULT '',
 state text NOT NULL DEFAULT '',
 region text NOT NULL DEFAULT '',
 service_cities text NOT NULL DEFAULT '',
 cpf text NOT NULL DEFAULT '',
 rg text NOT NULL DEFAULT '',
 map_url text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commercial_representative_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_representative_details FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.commercial_representative_details TO authenticated;
DROP POLICY IF EXISTS "Admin manages commercial representative details" ON public.commercial_representative_details;
CREATE POLICY "Admin manages commercial representative details"
ON public.commercial_representative_details FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));
COMMIT;
NOTIFY pgrst, 'reload schema';