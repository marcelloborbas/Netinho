-- Classes comerciais e comissões administrativas. Aplicação aditiva, sem reset.
alter table public.customers add column order_class smallint check (order_class in (1,2,3));
create or replace function public.customer_order_minimum(class smallint)
returns numeric language sql immutable set search_path='' as $$
 select case class when 1 then 5000 when 2 then 10000 when 3 then 1000 else 0 end::numeric;
$$;
-- Runs on the server-computed final total inside create_order, rolling back on failure.
create or replace function public.enforce_customer_order_minimum()
returns trigger language plpgsql security definer set search_path='' as $$
declare minimum numeric;
begin
 minimum := public.customer_order_minimum((new.customer_snapshot->>'order_class')::smallint);
 if new.kind='pedido' and new.total < minimum then
   raise exception 'Pedido mínimo da classe do cliente: R$ %', minimum;
 end if;
 return new;
end;
$$;
revoke all on function public.enforce_customer_order_minimum() from public, anon, authenticated;
create trigger enforce_order_minimum after update of total on public.orders
for each row execute function public.enforce_customer_order_minimum();

create table public.supplier_commissions (
 order_id uuid not null references public.orders(id),
 manufacturer text not null check (manufacturer in ('FCO','HD')),
 rate numeric not null check (rate in (0.5,1,3,3.5,5,6)),
 paid_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(order_id,manufacturer)
);
alter table public.supplier_commissions enable row level security;
revoke all on public.supplier_commissions from anon, authenticated;
-- RPCs enforce authorization even if invoked outside the administration screen.
create function public.admin_supplier_commissions()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.manufacturer) from (
 select o.id order_id,o.number,o.created_at,o.status,o.customer_snapshot->>'company_name' customer_name,
 i.manufacturer,sum(i.line_total) sold_total,c.rate,round(sum(i.line_total)*c.rate/100,2) commission,c.paid_at
 from public.orders o join public.order_items i on i.order_id=o.id
 left join public.supplier_commissions c on c.order_id=o.id and c.manufacturer=i.manufacturer
 where o.kind='pedido'
 group by o.id,i.manufacturer,c.rate,c.paid_at
 ) r),'[]'::jsonb);
end;
$$;
create function public.save_supplier_commission(p_order_id uuid,p_manufacturer text,p_rate numeric,p_paid boolean)
returns void language plpgsql security definer set search_path='' as $$
declare current_status text; existing public.supplier_commissions%rowtype;
begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 select status into current_status from public.orders where id=p_order_id and kind='pedido' for update;
 if not found or not exists(select 1 from public.order_items where order_id=p_order_id and manufacturer=p_manufacturer) then raise exception 'Pedido ou fornecedor inválido'; end if;
 if p_rate is null or p_rate not in (0.5,1,3,3.5,5,6) then raise exception 'Taxa inválida'; end if;
 if p_paid is null then raise exception 'Informe a situação do repasse'; end if;
 if p_paid and current_status <> 'invoiced' then raise exception 'Repasse permitido somente após faturamento'; end if;
 select * into existing from public.supplier_commissions where order_id=p_order_id and manufacturer=p_manufacturer;
 if existing.paid_at is not null and existing.rate <> p_rate then raise exception 'Estorne o repasse antes de alterar a taxa'; end if;
 insert into public.supplier_commissions(order_id,manufacturer,rate,paid_at)
 values(p_order_id,p_manufacturer,p_rate,case when p_paid then coalesce(existing.paid_at,now()) end)
 on conflict(order_id,manufacturer) do update set rate=excluded.rate,paid_at=excluded.paid_at,updated_at=now();
end;
$$;
revoke all on function public.admin_supplier_commissions(),public.save_supplier_commission(uuid,text,numeric,boolean) from public,anon;
grant execute on function public.admin_supplier_commissions(),public.save_supplier_commission(uuid,text,numeric,boolean) to authenticated;

