-- Included inside the access-test transaction, using its disposable fixtures.
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000003","email":"admin-access-test@example.invalid","app_metadata":{"provider":"email"}}',true);
do $$ declare oid uuid; payload jsonb; c smallint; minimum numeric; begin
 payload := '{"customer_id":"d0000000-0000-0000-0000-000000000001","payment_term":"cash","kind":"pedido","items":[{"product_id":"c0000000-0000-0000-0000-000000000001","quantity":2}]}'::jsonb;
 foreach c in array array[1,2,3]::smallint[] loop
  update public.customers set order_class=c where id='d0000000-0000-0000-0000-000000000001';
  minimum := public.customer_order_minimum(c);
  begin
   perform public.create_order(payload);
   raise exception 'TEST: minimum bypassed for class %',c;
  exception when raise_exception then
   if sqlerrm not like 'Pedido mínimo%' then raise; end if;
  end;
  -- Budget drafts can be recorded before reaching the order minimum.
  perform public.create_order(payload || '{"kind":"orcamento"}'::jsonb);
  -- Boundary: quantities priced server-side must reach the configured minimum.
  oid:=public.create_order(jsonb_set(payload,'{items,0,quantity}',to_jsonb(ceil(minimum/123.45)::int)));
  if not exists(select 1 from public.orders where id=oid and total>=minimum and customer_snapshot->>'order_class'=c::text) then raise exception 'TEST: class snapshot/total wrong'; end if;
 end loop;
 update public.customers set order_class=null where id='d0000000-0000-0000-0000-000000000001';
 oid:=public.create_order(payload);
 perform public.save_supplier_commission(oid,'HD',3.5,false);
 if not exists(select 1 from jsonb_array_elements(public.admin_supplier_commissions()) r where r->>'order_id'=oid::text and (r->>'sold_total')::numeric=246.90 and (r->>'commission')::numeric=8.64) then raise exception 'TEST: commission calculation wrong'; end if;
 begin
  perform public.save_supplier_commission(oid,'HD',2,false);
  raise exception 'TEST: invalid rate accepted';
 exception when raise_exception then if sqlerrm<>'Taxa inválida' then raise; end if; end;
 begin
  perform public.save_supplier_commission(oid,'HD',3.5,true);
  raise exception 'TEST: payment accepted before invoicing';
 exception when raise_exception then if sqlerrm<>'Repasse permitido somente após faturamento' then raise; end if; end;
 perform public.update_order_status(oid,'invoiced');
 perform public.save_supplier_commission(oid,'HD',3.5,true);
 if not exists(select 1 from jsonb_array_elements(public.admin_supplier_commissions()) r where r->>'order_id'=oid::text and r->>'paid_at' is not null) then raise exception 'TEST: payment not saved'; end if;
 perform public.save_supplier_commission(oid,'HD',3.5,false);
end $$;
-- A revoked seller and a visitor cannot read or mutate commissions.
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","email":"seller-access-test@example.invalid"}',true);
do $$ begin
 begin perform public.admin_supplier_commissions(); raise exception 'TEST: seller read commissions'; exception when insufficient_privilege then null; end;
 begin perform public.save_supplier_commission('00000000-0000-0000-0000-000000000000','HD',1,false); raise exception 'TEST: seller wrote commission'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.supplier_commissions; raise exception 'TEST: direct table readable'; exception when insufficient_privilege then null; end;
end $$;
