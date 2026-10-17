-- Apply after the baseline drizzle schema and the representative migrations.
-- UI profile choices are preferences; authority always comes from this database.
alter table public.products add column if not exists manufacturer text not null default 'FCO'
  check (manufacturer in ('FCO', 'HD'));
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists catalog_page integer;

create or replace function public.can_sell()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') = 'false'
    and (
      exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
      or ((auth.jwt()->'app_metadata'->>'provider' = 'google'
        or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google')
      and exists(select 1 from public.commercial_representatives r
        where r.active and (r.user_id = auth.uid() or (
          r.user_id is null and lower(r.email) = lower(auth.jwt()->>'email')
          and exists(select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null)
        ))))
    ), false);
$$;
revoke all on function public.can_sell() from public, anon;
grant execute on function public.can_sell() to authenticated;

create or replace function public.access_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'level', case when public.can_sell() and exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then 1 when public.can_sell() then 2 else 3 end,
    'can_sell', public.can_sell(),
    'name', coalesce(nullif(auth.jwt()->'user_metadata'->>'full_name', ''), nullif(auth.jwt()->'user_metadata'->>'name', ''), split_part(auth.jwt()->>'email', '@', 1), 'Visitante'),
    'email', coalesce(auth.jwt()->>'email', '')
  ) where auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') = 'false'
    and (public.can_sell() or auth.jwt()->'app_metadata'->>'provider' = 'google'
      or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google');
$$;
revoke all on function public.access_context() from public, anon;
grant execute on function public.access_context() to authenticated;

-- New Google accounts are visitors until an administrator authorizes them.
-- In particular, the first person registering must never become administrator.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, email)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Visitante'), coalesce(new.email, ''));
  return new;
end;
$$;

-- Restrictive policies intersect every older permissive policy, including legacy
-- seller roles assigned automatically by previous versions of the signup trigger.
create policy "commercial products gate" on public.products as restrictive
for select to authenticated using (public.can_sell());
create policy "commercial customers gate" on public.customers as restrictive
for all to authenticated using (public.can_sell()) with check (public.can_sell());
create policy "commercial orders gate" on public.orders as restrictive
for all to authenticated using (public.can_sell()) with check (public.can_sell());
create policy "commercial items gate" on public.order_items as restrictive
for all to authenticated using (public.can_sell()) with check (public.can_sell());
revoke all on public.products, public.customers, public.orders, public.order_items from anon;

-- Explicit allowlist prevents future sensitive columns leaking into the catalog.
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
   and (public.can_sell() or auth.jwt()->'app_metadata'->>'provider' = 'google'
     or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google')
   and p.active and c.active;
$$;
revoke all on function public.catalog_products() from public, anon;
grant execute on function public.catalog_products() to authenticated;

-- Orders are written exclusively by the server function; row policies alone
-- cannot validate client supplied totals, snapshots, discounts or line prices.
revoke insert, update, delete on public.orders, public.order_items from authenticated;

create or replace function public.create_order(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _uid uuid := auth.uid();
  _term text := payload->>'payment_term';
  _order uuid;
  _cust public.customers%rowtype;
  _it jsonb;
  _p public.products%rowtype;
  _price numeric; _disc numeric; _qty int; _net numeric;
  _sub numeric := 0; _tot numeric := 0; _n int := 0;
begin
  if not public.can_sell() then raise exception 'Acesso comercial não autorizado' using errcode = '42501'; end if;
  if _term is null or _term not in ('cash','30','30_45_60','30_45_60_75') then raise exception 'Condição inválida'; end if;
  select * into _cust from public.customers where id = (payload->>'customer_id')::uuid
    and deleted_at is null and (seller_id = _uid or public.has_role(_uid, 'admin'));
  if not found then raise exception 'Cliente não encontrado'; end if;
  if jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'Pedido sem itens'; end if;
  if jsonb_array_length(payload->'items') = 0 then raise exception 'Pedido sem itens'; end if;
  insert into public.orders(seller_id, customer_id, customer_snapshot, kind, payment_term, delivery, carrier, buyer, notes)
  values(_uid, _cust.id, to_jsonb(_cust), coalesce(payload->>'kind','pedido'), _term,
    payload->>'delivery', payload->>'carrier', payload->>'buyer', payload->>'notes') returning id into _order;
  for _it in select * from jsonb_array_elements(payload->'items') loop
    select * into _p from public.products where id = (_it->>'product_id')::uuid and active;
    if not found then raise exception 'Produto indisponível'; end if;
    _price := case _term when 'cash' then _p.price_cash when '30' then _p.price_30 when '30_45_60' then _p.price_30_45_60 else _p.price_30_45_60_75 end;
    if _price is null then raise exception 'Produto % sem preço', _p.code; end if;
    _qty := (_it->>'quantity')::int;
    _disc := coalesce((_it->>'discount_pct')::numeric, 0);
    if _qty is null or _qty <= 0 or _disc < 0 or _disc > 100 then raise exception 'Quantidade ou desconto inválido'; end if;
    _net := round(_price * (1 - _disc/100), 2);
    insert into public.order_items(order_id, product_id, code, category, application, quantity, unit_price, discount_pct, net_price, line_total)
    values(_order, _p.id, _p.code, coalesce((select name from public.categories where id=_p.category_id),''), _p.application, _qty, _price, _disc, _net, _net*_qty);
    _sub := _sub + _price*_qty; _tot := _tot + _net*_qty; _n := _n + 1;
  end loop;
  update public.orders set subtotal=round(_sub,2), total=round(_tot,2), item_count=_n where id=_order;
  update public.customers set last_order_at=now() where id=_cust.id;
  return _order;
end;
$$;
revoke all on function public.create_order(jsonb) from public, anon;
grant execute on function public.create_order(jsonb) to authenticated;

create or replace function public.update_order_status(order_id uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_sell() or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if new_status is null or new_status not in ('sent','received','processing','invoiced','cancelled') then
    raise exception 'Situação inválida';
  end if;
  update public.orders set status = new_status where id = order_id;
  if not found then raise exception 'Pedido não encontrado'; end if;
end;
$$;
revoke all on function public.update_order_status(uuid, text) from public, anon;
grant execute on function public.update_order_status(uuid, text) to authenticated;

-- The manufacturer is part of the order history, just like code and price.
alter table public.order_items add column if not exists manufacturer text not null default 'FCO';
create or replace function public.snapshot_order_manufacturer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select manufacturer into new.manufacturer from public.products where id = new.product_id;
  new.manufacturer := coalesce(new.manufacturer, 'FCO');
  return new;
end;
$$;
revoke all on function public.snapshot_order_manufacturer() from public, anon, authenticated;
create trigger order_items_manufacturer before insert on public.order_items
for each row execute function public.snapshot_order_manufacturer();
