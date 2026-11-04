-- Comissão individual para representantes do cadastro comercial, mesmo sem login.
-- Não altera as comissões existentes de usuários autenticados.
create table if not exists public.commercial_representative_commission_rates (
 representative_id uuid primary key references public.commercial_representatives(id) on delete cascade,
 rate numeric(3,1) not null check (rate >= 0.5 and rate <= 3.5 and rate * 2 = trunc(rate * 2)),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.commercial_representative_commission_rates enable row level security;
revoke all on public.commercial_representative_commission_rates from anon, authenticated;
grant select on public.commercial_representative_commission_rates to authenticated;
drop policy if exists "admin reads commercial representative commissions" on public.commercial_representative_commission_rates;
create policy "admin reads commercial representative commissions"
 on public.commercial_representative_commission_rates for select to authenticated
 using (public.has_role(auth.uid(), 'admin'));
create or replace function public.admin_set_commercial_representative_commission(p_representative uuid, p_rate numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.has_role(auth.uid(), 'admin') then
   raise exception 'Acesso administrativo necessário' using errcode='42501';
 end if;
 if not exists (select 1 from public.commercial_representatives where id=p_representative) then
   raise exception 'Representante não encontrado';
 end if;
 if p_rate is not null and (p_rate < 0.5 or p_rate > 3.5 or p_rate * 2 <> trunc(p_rate * 2)) then
   raise exception 'Comissão inválida: use 0,5 a 3,5 em passos de 0,5';
 end if;
 if p_rate is null then
   delete from public.commercial_representative_commission_rates where representative_id=p_representative;
 else
   insert into public.commercial_representative_commission_rates(representative_id,rate,updated_by)
   values(p_representative,p_rate,auth.uid())
   on conflict(representative_id) do update set rate=excluded.rate,updated_by=excluded.updated_by,updated_at=now();
 end if;
end;
$$;
revoke all on function public.admin_set_commercial_representative_commission(uuid,numeric) from public,anon;
grant execute on function public.admin_set_commercial_representative_commission(uuid,numeric) to authenticated;
