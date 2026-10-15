-- Permitir que cada representante autenticado pelo Google consulte somente sua autorização.
-- A criação/edição da autorização permanece restrita às políticas administrativas existentes.
ALTER TABLE public.commercial_representatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Representante consulta sua autorização Google" ON public.commercial_representatives;
CREATE POLICY "Representante consulta sua autorização Google"
ON public.commercial_representatives FOR SELECT TO authenticated
USING (
  active = true
  AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(auth.jwt() -> 'app_metadata' -> 'providers', '[]'::jsonb)) AS provider
    WHERE provider #>> '{}' = 'google'
  )
);
