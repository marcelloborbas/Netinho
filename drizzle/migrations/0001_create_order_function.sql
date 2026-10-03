CREATE OR REPLACE FUNCTION public.create_order(payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _term text := payload->>'payment_term';
  _order uuid;
  _cust public.customers%ROWTYPE;
  _it jsonb;
  _p public.products%ROWTYPE;
  _price numeric; _disc numeric; _qty int; _net numeric;
  _sub numeric := 0; _tot numeric := 0; _n int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  IF _term NOT IN ('cash','30','30_45_60','30_45_60_75') THEN RAISE EXCEPTION 'Condição inválida'; END IF;
  SELECT * INTO _cust FROM public.customers WHERE id = (payload->>'customer_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  IF jsonb_array_length(COALESCE(payload->'items','[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Pedido sem itens'; END IF;

  INSERT INTO public.orders(seller_id, customer_id, customer_snapshot, kind, payment_term, delivery, carrier, buyer, notes)
  VALUES (_uid, _cust.id, to_jsonb(_cust), COALESCE(payload->>'kind','pedido'), _term,
          payload->>'delivery', payload->>'carrier', payload->>'buyer', payload->>'notes')
  RETURNING id INTO _order;

  FOR _it IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT * INTO _p FROM public.products WHERE id = (_it->>'product_id')::uuid AND active;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto indisponível'; END IF;
    _price := CASE _term WHEN 'cash' THEN _p.price_cash WHEN '30' THEN _p.price_30
              WHEN '30_45_60' THEN _p.price_30_45_60 ELSE _p.price_30_45_60_75 END;
    IF _price IS NULL THEN RAISE EXCEPTION 'Produto % sem preço', _p.code; END IF;
    _qty := GREATEST((_it->>'quantity')::int, 1);
    _disc := LEAST(GREATEST(COALESCE((_it->>'discount_pct')::numeric,0),0),100);
    _net := round(_price * (1 - _disc/100), 2);
    INSERT INTO public.order_items(order_id, product_id, code, category, application, quantity, unit_price, discount_pct, net_price, line_total)
    VALUES (_order, _p.id, _p.code, COALESCE((SELECT name FROM public.categories WHERE id=_p.category_id),''), _p.application, _qty, _price, _disc, _net, _net*_qty);
    _sub := _sub + _price*_qty; _tot := _tot + _net*_qty; _n := _n + 1;
  END LOOP;

  UPDATE public.orders SET subtotal = round(_sub,2), total = round(_tot,2), item_count = _n WHERE id = _order;
  UPDATE public.customers SET last_order_at = now() WHERE id = _cust.id;
  RETURN _order;
END $$;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb) TO authenticated;
-- orders UPDATE is admin-only; allow the function's own total update for the owner
CREATE POLICY "orders owner totals" ON public.orders FOR UPDATE TO authenticated USING (seller_id = auth.uid() AND created_at > now() - interval '1 minute') WITH CHECK (seller_id = auth.uid());