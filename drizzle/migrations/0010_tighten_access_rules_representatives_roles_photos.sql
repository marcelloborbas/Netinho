-- 1) Representante desativado perde imediatamente a leitura do próprio cadastro.
DROP POLICY IF EXISTS "Representatives view their own record" ON public.commercial_representatives;
CREATE POLICY "Representatives view their own record"
  ON public.commercial_representatives
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND active);

-- 2) has_role responde apenas sobre a própria conta (ou para o backend com chave de serviço).
--    Todas as regras e funções do projeto chamam has_role(auth.uid(), ...), então nada muda para elas.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
      _user_id = auth.uid()
      OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3) Sessões de convidado bloqueadas nas tabelas comerciais internas.
DROP POLICY IF EXISTS "no guest sessions" ON public.commercial_representative_commission_rates;
CREATE POLICY "no guest sessions" ON public.commercial_representative_commission_rates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE)
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE);

DROP POLICY IF EXISTS "no guest sessions" ON public.commercial_representative_details;
CREATE POLICY "no guest sessions" ON public.commercial_representative_details
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE)
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE);

DROP POLICY IF EXISTS "no guest sessions" ON public.person_territories;
CREATE POLICY "no guest sessions" ON public.person_territories
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE)
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE);

DROP POLICY IF EXISTS "no guest sessions" ON public.representative_area_ddds;
CREATE POLICY "no guest sessions" ON public.representative_area_ddds
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE)
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE);

DROP POLICY IF EXISTS "no guest sessions" ON public.salesperson_commission_rates;
CREATE POLICY "no guest sessions" ON public.salesperson_commission_rates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE)
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE);

-- 4) DDDs: leitura exige uma conta real conectada, no lugar de USING (true).
DROP POLICY IF EXISTS "Consultar DDDs" ON public.representative_area_ddds;
CREATE POLICY "Consultar DDDs"
  ON public.representative_area_ddds
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE
  );

-- 5) Fotos de pessoas: o bucket é público (endereços diretos continuam funcionando),
--    mas a listagem de todos os arquivos deixa de ser aberta. Somente administradores
--    leem os registros, o que mantém o envio com substituição (upsert) funcionando.
DROP POLICY IF EXISTS "Public can view person photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins read person photos" ON storage.objects;
CREATE POLICY "Admins read person photos"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'person-photos' AND public.has_role((SELECT auth.uid()), 'admin'));