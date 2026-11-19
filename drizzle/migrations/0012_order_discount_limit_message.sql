CREATE OR REPLACE FUNCTION public.create_order(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  select * into _cust from public.customers where id = (payload->>'customer_id')::uuid
    and deleted_at is null ;
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
    if _max_disc is not null and _disc > _max_disc then
      raise exception using
        message = format('Desconto máximo permitido: %s%% (item %s).', replace(trim_scale(_max_disc)::text, '.', ','), _p.code),
        errcode = '22023';
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