-- Garante que aprovar/ativar um perfil como Representante também crie
-- o vínculo comercial usado pelo RLS e pelo cadastro de clientes.
create or replace function public.admin_set_person(
  p_user uuid, p_role text, p_active boolean, p_uf text, p_cities text, p_supervisor uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _email text;
  _full_name text;
begin
  if not exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Somente administradores podem alterar pessoas.' using errcode = '42501';
  end if;

  if p_role not in ('Visitante','Vendedor','Representante','Administrador') then
    raise exception 'Perfil inválido' using errcode = '22023';
  end if;

  if p_user = auth.uid() and (p_role <> 'Administrador' or not p_active) then
    raise exception 'Não é permitido remover seu próprio acesso administrativo.' using errcode = '42501';
  end if;

  if p_role = 'Administrador' and not exists (
    select 1 from public.user_roles where user_id = p_user and role = 'admin'
  ) then
    insert into public.user_roles(user_id, role) values (p_user, 'admin') on conflict do nothing;
  elsif p_role <> 'Administrador' then
    delete from public.user_roles where user_id = p_user and role = 'admin';
  end if;

  update public.profiles
  set site_role = p_role,
      access_active = p_active,
      territory_uf = case when p_role in ('Vendedor','Representante') then nullif(trim(p_uf),'') end,
      territory_cities = case when p_role in ('Vendedor','Representante') then nullif(trim(p_cities),'') end,
      supervisor_id = case when p_role = 'Vendedor' and p_supervisor <> p_user then p_supervisor end
  where id = p_user;

  if not found then
    raise exception 'Pessoa não encontrada';
  end if;

  if p_role = 'Representante' and p_active then
    select full_name, email into _full_name, _email
    from public.profiles where id = p_user;

    if nullif(trim(_email), '') is null then
      raise exception 'O representante precisa ter e-mail cadastrado.';
    end if;

    if exists (
      select 1 from public.commercial_representatives
      where lower(trim(email)) = lower(trim(_email))
        and user_id is not null and user_id <> p_user
    ) then
      raise exception 'Este e-mail já está vinculado a outra conta de representante.' using errcode = '23505';
    end if;

    update public.commercial_representatives
    set user_id = p_user,
        full_name = coalesce(nullif(_full_name, ''), _email),
        email = _email,
        active = true,
        updated_at = now()
    where user_id = p_user
       or (lower(trim(email)) = lower(trim(_email)) and user_id is null);

    if not exists (
      select 1 from public.commercial_representatives where user_id = p_user
    ) then
      insert into public.commercial_representatives(user_id, full_name, email, active)
      values (p_user, coalesce(nullif(_full_name, ''), _email), _email, true);
    end if;
  elsif p_role <> 'Administrador' or not p_active then
    update public.commercial_representatives
    set active = false, updated_at = now()
    where user_id = p_user;
  end if;
end;
$function$;

-- Defesa adicional: nunca permitir pedido com cliente sem dono ou de outra carteira.
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
  if _cust.seller_id is distinct from _uid and not public.has_role(_uid, 'admin') then
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
