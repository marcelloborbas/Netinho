-- Configuração comercial com uma única linha (id sempre true).
CREATE TABLE IF NOT EXISTS public.commercial_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  max_discount_pct numeric(5,2) NOT NULL DEFAULT 5 CHECK (max_discount_pct >= 0 AND max_discount_pct <= 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.commercial_settings TO authenticated;
GRANT ALL ON public.commercial_settings TO service_role;
ALTER TABLE public.commercial_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed-in users read commercial settings" ON public.commercial_settings;
CREATE POLICY "signed-in users read commercial settings"
  ON public.commercial_settings FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE
  );

-- Valor inicial: o maior desconto já praticado nos pedidos reais (5%).
INSERT INTO public.commercial_settings (id, max_discount_pct) VALUES (true, 5)
ON CONFLICT (id) DO NOTHING;

-- Limite que se aplica a quem está logado: nulo para administradores (sem limite).
CREATE OR REPLACE FUNCTION public.order_discount_limit()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN NULL
    ELSE coalesce((SELECT max_discount_pct FROM public.commercial_settings WHERE id), 0)
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.order_discount_limit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_discount_limit() TO authenticated, service_role;

-- Somente administradores alteram o limite.
CREATE OR REPLACE FUNCTION public.admin_set_max_discount(p_max numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso administrativo necessário' USING errcode = '42501';
  END IF;
  IF p_max IS NULL OR p_max < 0 OR p_max > 100 THEN
    RAISE EXCEPTION 'Desconto máximo inválido' USING errcode = '22023';
  END IF;
  INSERT INTO public.commercial_settings (id, max_discount_pct, updated_at, updated_by)
  VALUES (true, round(p_max, 2), now(), auth.uid())
  ON CONFLICT (id) DO UPDATE
    SET max_discount_pct = EXCLUDED.max_discount_pct,
        updated_at = now(),
        updated_by = EXCLUDED.updated_by;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_max_discount(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_max_discount(numeric) TO authenticated, service_role;

-- create_order: mesma lógica de preços, agora com o desconto limitado no servidor.
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
      raise exception 'Desconto máximo permitido: %%% (item %)', trim_scale(_max_disc), _p.code
        using errcode = '22023';
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