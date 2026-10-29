-- Comissão individual de vendas, separada das comissões de fornecedores.
-- A taxa só pode ser atribuída por administrador; não modifica usuários existentes.
create table if not exists public.salesperson_commission_rates (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 rate numeric(3,1) not null check (rate >= 0.5 and rate <= 3.5 and rate * 2 = trunc(rate * 2)),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.salesperson_commission_rates enable row level security;
revoke all on public.salesperson_commission_rates from anon, authenticated;
grant select on public.salesperson_commission_rates to authenticated;
create policy "commission rates visible to owner and administrator"
 on public.salesperson_commission_rates for select to authenticated
 using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create or replace function public.admin_set_salesperson_commission(p_user uuid, p_rate numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.has_role(auth.uid(), 'admin') then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if p_rate is not null and (p_rate < 0.5 or p_rate > 3.5 or p_rate * 2 <> trunc(p_rate * 2)) then
   raise exception 'Comissão deve estar entre 0,5%% e 3,5%% em passos de 0,5';
 end if;
 if not exists(select 1 from public.profiles where id=p_user and site_role in ('Vendedor','Representante')) then
   raise exception 'Selecione um vendedor ou representante cadastrado';
 end if;
 if p_rate is null then
   delete from public.salesperson_commission_rates where user_id=p_user;
 else
   insert into public.salesperson_commission_rates(user_id,rate,updated_by)
   values(p_user,p_rate,auth.uid())
   on conflict(user_id) do update set rate=excluded.rate,updated_by=excluded.updated_by,updated_at=now();
 end if;
end;
$$;
revoke all on function public.admin_set_salesperson_commission(uuid,numeric) from public,anon;
grant execute on function public.admin_set_salesperson_commission(uuid,numeric) to authenticated;
