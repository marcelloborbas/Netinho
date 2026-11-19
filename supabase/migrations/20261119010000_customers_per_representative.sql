-- Cada cliente pertence a um único representante comercial.
-- Administradores veem todas as carteiras e podem atribuir/transferir clientes.
-- Representantes veem e gerenciam apenas os clientes cujo seller_id é seu auth.uid().

-- Vincula automaticamente contas ativas com perfil Representante ao cadastro comercial
-- correspondente pelo e-mail verificado já armazenado no perfil.
update public.commercial_representatives r
set user_id = p.id,
    full_name = coalesce(nullif(p.full_name, ''), r.full_name),
    active = true,
    updated_at = now()
from public.profiles p
where lower(trim(r.email)) = lower(trim(p.email))
  and p.site_role = 'Representante'
  and p.access_active = true
  and (r.user_id is null or r.user_id = p.id);

insert into public.commercial_representatives (user_id, full_name, email, active)
select p.id, coalesce(nullif(p.full_name, ''), p.email), p.email, true
from public.profiles p
where p.site_role = 'Representante'
  and p.access_active = true
  and p.email is not null
  and not exists (
    select 1 from public.commercial_representatives r
    where r.user_id = p.id or lower(trim(r.email)) = lower(trim(p.email))
  );

drop policy if exists "customers shared for authorized sellers" on public.customers;
drop policy if exists "customers own" on public.customers;
drop policy if exists "customers assigned representative or admin" on public.customers;

create policy "customers assigned representative or admin"
on public.customers
for all to authenticated
using (
  public.can_sell()
  and (
    seller_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin')
  )
)
with check (
  public.can_sell()
  and (
    (
      seller_id = (select auth.uid())
      and exists (
        select 1 from public.commercial_representatives r
        where r.user_id = (select auth.uid())
          and r.active = true
      )
    )
    or (
      public.has_role((select auth.uid()), 'admin')
      and exists (
        select 1 from public.commercial_representatives r
        where r.user_id = customers.seller_id
          and r.active = true
      )
    )
  )
);

create index if not exists customers_seller_id_idx on public.customers(seller_id);

comment on column public.customers.seller_id is
  'Usuário do representante comercial responsável pelo cliente; o RLS limita cada representante à própria carteira.';

-- create_order é SECURITY DEFINER; portanto, precisa validar explicitamente
-- a carteira do cliente em vez de depender somente do RLS da tabela.
create or replace function public.create_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _uid uuid := auth.uid();
  _term text := payload->>'payment_term';
  _order uuid;
  _cust public.customers%rowtype;
  _it jsonb;
  _p public.products%rowtype;
  _price numeric; _disc numeric; _qty int; _net numeric;
  _sub numeric := 0; _tot numeric := 0; _n int := 0;
  _max_disc numeric := public.order_discount_limit();
begin
  if not public.can_sell() then raise exception 'Acesso comercial não autorizado' using errcode = '42501'; end if;
  if _term is null or _term not in ('cash','30','30_45_60','30_45_60_75') then raise exception 'Condição inválida'; end if;
  select * into _cust from public.customers
  where id = (payload->>'customer_id')::uuid and deleted_at is null;
  if not found then raise exception 'Cliente não encontrado'; end if;
  if _cust.seller_id <> _uid and not public.has_role(_uid, 'admin') then
    raise exception 'Cliente não pertence à sua carteira' using errcode = '42501';
  end if;
  if jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'Pedido sem itens'; end if;
  if jsonb_array_length(payload->'items') = 0 then raise exception 'Pedido sem itens'; end if;
  if _max_disc is not null then
    for _it in select * from jsonb_array_elements(payload->'items') loop
      _disc := coalesce((_it->>'discount_pct')::numeric, 0);
      if _disc > _max_disc then
        raise exception using message = format('Desconto máximo permitido: %s%%.', replace(trim_scale(_max_disc)::text, '.', ',')), errcode = '22023';
      end if;
    end loop;
  end if;
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
    if _max_disc is not null and _disc > _max_disc then
      raise exception using message = format('Desconto máximo permitido: %s%% (item %s).', replace(trim_scale(_max_disc)::text, '.', ','), _p.code), errcode = '22023';
    end if;
    _net := round(_price * (1 - _disc/100), 2);
    insert into public.order_items(order_id, product_id, code, category, application, quantity, unit_price, discount_pct, net_price, line_total)
    values(_order, _p.id, _p.code, coalesce((select name from public.categories where id=_p.category_id),''), _p.application, _qty, _price, _disc, _net, _net*_qty);
    _sub := _sub + _price*_qty; _tot := _tot + _net*_qty; _n := _n + 1;
  end loop;
  update public.orders set subtotal=round(_sub,2), total=round(_tot,2), item_count=_n where id=_order;
  update public.customers set last_order_at=now() where id=_cust.id;
  return _order;
end;
$function$;

revoke all on function public.create_order(jsonb) from public, anon;
grant execute on function public.create_order(jsonb) to authenticated;
