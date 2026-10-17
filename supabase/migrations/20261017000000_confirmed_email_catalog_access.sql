-- Confirmed email accounts may consult catalogs. Commercial authorization is unchanged.
BEGIN;
create or replace function public.access_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'level', case when public.can_sell() and exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then 1 when public.can_sell() then 2 else 3 end,
    'can_sell', public.can_sell(),
    'name', coalesce(nullif(auth.jwt()->'user_metadata'->>'full_name', ''), nullif(auth.jwt()->'user_metadata'->>'name', ''), split_part(auth.jwt()->>'email', '@', 1), 'Visitante'),
    'email', coalesce(auth.jwt()->>'email', '')
  ) where auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') = 'false'
    and (public.can_sell() or exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null) or auth.jwt()->'app_metadata'->>'provider' = 'google'
      or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google');
$$;
create or replace function public.catalog_products()
returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id', p.id, 'category_id', p.category_id, 'code', p.code,
   'refs', p.refs, 'application', p.application, 'brand', p.brand,
   'manufacturer', p.manufacturer, 'image_url', p.image_url, 'catalog_page', p.catalog_page,
   'active', p.active, 'search_text', p.search_text, 'created_at', p.created_at, 'updated_at', p.updated_at,
   'categories', jsonb_build_object('name', c.name),
   'stock', case when public.can_sell() then p.stock end,
   'price_cash', case when public.can_sell() then p.price_cash end,
   'price_30', case when public.can_sell() then p.price_30 end,
   'price_30_45_60', case when public.can_sell() then p.price_30_45_60 end,
   'price_30_45_60_75', case when public.can_sell() then p.price_30_45_60_75 end,
   'price_note', case when public.can_sell() then p.price_note end
 ) order by p.manufacturer, p.code), '[]'::jsonb)
 from public.products p join public.categories c on c.id = p.category_id
 where auth.uid() is not null
   and coalesce(auth.jwt()->>'is_anonymous', 'false') = 'false'
   and (public.can_sell() or exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null) or auth.jwt()->'app_metadata'->>'provider' = 'google'
     or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google')
   and p.active and c.active;
$$;
COMMIT;
