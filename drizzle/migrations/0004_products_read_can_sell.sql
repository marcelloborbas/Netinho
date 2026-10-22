DROP POLICY IF EXISTS "products read" ON public.products;
CREATE POLICY "products read" ON public.products FOR SELECT TO authenticated USING (public.can_sell());