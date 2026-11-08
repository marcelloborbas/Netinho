-- Atualiza somente a função de leitura pública. Não modifica cadastros.
-- Usa o perfil vinculado ao representante comercial para localizar foto e UF.
CREATE OR REPLACE FUNCTION public.list_public_representatives()
RETURNS TABLE (id uuid, full_name text, uf text, city text, region text, phone text, photo_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, COALESCE(NULLIF(p.full_name,''),'Representante')::text,
         COALESCE(NULLIF(p.territory_uf,''),rpd.state,'')::text,
         COALESCE(NULLIF(pt.city_base,''),rpd.city,'')::text,
         COALESCE(NULLIF(pt.region,''),NULLIF(p.territory_cities,''),rpd.service_cities,rp.region,'')::text,
         COALESCE(NULLIF(p.phone,''),rp.phone,'')::text,
         p.id
  FROM public.profiles p
  LEFT JOIN public.person_territories pt ON pt.user_id=p.id
  LEFT JOIN public.representative_profiles rp ON lower(rp.email)=lower(p.email)
  LEFT JOIN public.representative_private_details rpd ON rpd.slug=rp.slug
  WHERE p.site_role='Representante' AND p.access_active=true
  UNION ALL
  SELECT c.id,c.full_name::text,
         COALESCE(NULLIF(d.state,''),NULLIF(linked.territory_uf,''),rpd.state,'')::text,
         COALESCE(NULLIF(d.city,''),NULLIF(pt.city_base,''),rpd.city,'')::text,
         COALESCE(NULLIF(d.region,''),NULLIF(d.service_cities,''),NULLIF(pt.region,''),NULLIF(linked.territory_cities,''),rpd.service_cities,rp.region,'')::text,
         COALESCE(NULLIF(d.phone,''),NULLIF(c.phone,''),NULLIF(linked.phone,''),rp.phone,'')::text,
         COALESCE(linked.id,c.id)
  FROM public.commercial_representatives c
  LEFT JOIN public.commercial_representative_details d ON d.representative_id=c.id
  LEFT JOIN public.profiles linked ON linked.id=c.user_id
  LEFT JOIN public.person_territories pt ON pt.user_id=linked.id
  LEFT JOIN public.representative_profiles rp ON lower(rp.email)=lower(c.email)
  LEFT JOIN public.representative_private_details rpd ON rpd.slug=rp.slug
  WHERE c.active=true
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.site_role='Representante' AND p.access_active=true AND lower(p.email)=lower(c.email)
    );
$$;
REVOKE ALL ON FUNCTION public.list_public_representatives() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_representatives() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
