-- Run with psql as database owner AFTER applying schema/migrations to a test DB.
-- Fixtures and mutations are rolled back. Any failed assertion aborts the run.
\set ON_ERROR_STOP on
begin;
do $$ begin
 if has_function_privilege('anon','public.access_context()','EXECUTE')
   or has_function_privilege('anon','public.catalog_products()','EXECUTE')
   or has_function_privilege('anon','public.create_order(jsonb)','EXECUTE')
   or has_function_privilege('anon','public.update_order_status(uuid,text)','EXECUTE') then
   raise exception 'Anonymous role can execute protected RPC';
 end if;
end $$;
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
values
 ('a0000000-0000-0000-0000-000000000001','viewer-access-test@example.invalid',now(),'{}','{"provider":"google","providers":["google"]}'),
 ('a0000000-0000-0000-0000-000000000002','seller-access-test@example.invalid',now(),'{}','{"provider":"google","providers":["google"]}'),
 ('a0000000-0000-0000-0000-000000000003','admin-access-test@example.invalid',now(),'{}','{"provider":"email","providers":["email"]}');
do $$ begin
 if exists(select 1 from public.user_roles where user_id in (
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003')) then
   raise exception 'Signup granted a privileged role';
 end if;
end $$;
insert into public.user_roles(user_id,role) values('a0000000-0000-0000-0000-000000000003','admin');
-- Legacy signup seller roles must not confer access.
insert into public.user_roles(user_id,role) values('a0000000-0000-0000-0000-000000000001','seller');
insert into public.commercial_representatives(full_name,email,active)
values('Access test seller','seller-access-test@example.invalid',true);
insert into public.categories(id,name) values('b0000000-0000-0000-0000-000000000001','Access integration test');
insert into public.products(id,category_id,code,application,manufacturer,stock,price_cash)
values('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','ACCESS-TEST-HD','Integration test','HD',99,123.45);

set local role authenticated;
-- Confirmed email accounts can consult catalogs without gaining commercial rights.
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","email":"viewer-access-test@example.invalid","app_metadata":{"provider":"email","providers":["email"]}}',true);
do $$ begin
 if (public.access_context()->>'level')::int <> 3 or public.can_sell() is distinct from false then raise exception 'Email viewer access incorrect'; end if;
 if exists(select 1 from public.products) or exists(select 1 from public.customers) then raise exception 'Email viewer sees commercial records'; end if;
 if exists(select 1 from jsonb_array_elements(public.catalog_products()) p where p->>'price_cash' is not null or p->>'stock' is not null) then raise exception 'Email viewer sees price or stock'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","is_anonymous":true,"app_metadata":{"provider":"google","providers":["google"]}}',true);
do $$ begin
 if public.access_context() is not null or public.can_sell() is distinct from false or public.catalog_products() <> '[]'::jsonb then raise exception 'Anonymous session accepted'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000001","email":"viewer-access-test@example.invalid","app_metadata":{"provider":"google","providers":["google"]}}',true);
do $$ declare product jsonb; begin
 if public.can_sell() or (public.access_context()->>'level')::int <> 3 then raise exception 'Viewer gained seller access'; end if;
 if not exists(select 1 from public.categories where id='b0000000-0000-0000-0000-000000000001') then raise exception 'Google viewer categories denied'; end if;
 if exists(select 1 from public.products) then raise exception 'Viewer can read raw commercial product data'; end if;
 if exists(select 1 from public.customers) or exists(select 1 from public.orders) or exists(select 1 from public.order_items) then raise exception 'Viewer can read commercial records'; end if;
 begin
   insert into public.customers(company_name) values('Unauthorized viewer customer');
   raise exception 'Viewer can create customers';
 exception when insufficient_privilege then null;
 end;
 select value into product from jsonb_array_elements(public.catalog_products()) where value->>'code'='ACCESS-TEST-HD';
 if product is null or product->>'manufacturer' <> 'HD' then raise exception 'Viewer catalog unavailable'; end if;
 if product->>'price_cash' is not null or product->>'price_30' is not null or product->>'price_note' is not null or product->>'stock' is not null then raise exception 'Viewer catalog leaks sensitive data'; end if;
 begin
   perform public.create_order('{}'::jsonb);
   raise exception 'Viewer create_order was accepted';
 exception when insufficient_privilege then null;
 end;
 if has_table_privilege(current_user,'public.orders','INSERT') or has_table_privilege(current_user,'public.order_items','INSERT') then raise exception 'Direct order writes still allowed'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","email":"seller-access-test@example.invalid","app_metadata":{"provider":"google","providers":["google"]}}',true);
do $$ declare product jsonb; begin
 if not public.can_sell() or (public.access_context()->>'level')::int <> 2 then raise exception 'Approved Google seller denied'; end if;
 select value into product from jsonb_array_elements(public.catalog_products()) where value->>'code'='ACCESS-TEST-HD';
 if (product->>'price_cash')::numeric <> 123.45 then raise exception 'Seller price incorrect'; end if;
end $$;
-- This account has no legacy user_roles seller row. Customer access is based
-- on active authorization + row ownership, and prices remain server computed.
insert into public.customers(id,company_name) values('d0000000-0000-0000-0000-000000000001','Access integration customer');
do $$ declare order_uuid uuid; begin
 if not exists(select 1 from public.customers where id='d0000000-0000-0000-0000-000000000001') then raise exception 'New representative customer access denied'; end if;
 order_uuid := public.create_order('{"customer_id":"d0000000-0000-0000-0000-000000000001","payment_term":"cash","total":0,"items":[{"product_id":"c0000000-0000-0000-0000-000000000001","quantity":2,"unit_price":0}]}'::jsonb);
 if not exists(select 1 from public.orders where id=order_uuid and total=246.90 and subtotal=246.90) then raise exception 'Order server pricing failed'; end if;
 if not exists(select 1 from public.order_items where order_id=order_uuid and manufacturer='HD' and unit_price=123.45 and quantity=2) then raise exception 'Order snapshot failed'; end if;
 begin
   perform public.update_order_status(order_uuid,'invoiced');
   raise exception 'Seller changed order status';
 exception when insufficient_privilege then null;
 end;
end $$;

-- Password recovery access remains available to an existing trusted admin.
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000003","email":"admin-access-test@example.invalid","app_metadata":{"provider":"email","providers":["email"]}}',true);
do $$ begin
 if not public.can_sell() or (public.access_context()->>'level')::int <> 1 then raise exception 'Administrator recovery denied'; end if;
end $$;
-- Deauthorization takes effect immediately even with an unexpired JWT.
reset role;
update public.commercial_representatives set active=false where email='seller-access-test@example.invalid';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-0000-0000-000000000002","email":"seller-access-test@example.invalid","app_metadata":{"provider":"google","providers":["google"]}}',true);
do $$ begin
 if public.can_sell() then raise exception 'Revoked representative retains access'; end if;
end $$;
rollback;
