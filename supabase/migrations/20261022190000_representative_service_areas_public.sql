-- Expose only service cities, never private CPF, RG or address.
-- The public directory needs this safe subset for matching by municipality.
CREATE OR REPLACE VIEW public.representative_service_areas_public AS
SELECT slug, service_cities
FROM public.representative_private_details;
REVOKE ALL ON public.representative_service_areas_public FROM PUBLIC;
GRANT SELECT ON public.representative_service_areas_public TO anon, authenticated;
COMMENT ON VIEW public.representative_service_areas_public IS
  'Public directory: only slug and service cities; no private representative information.';
