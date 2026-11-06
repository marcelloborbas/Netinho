-- Permitir comissão individual para Administrador, além de Vendedor e Representante.
-- Não altera taxas existentes automaticamente; a ficha do administrador grava 3,5%.
create or replace function public.admin_set_salesperson_commission(p_user uuid, p_rate numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.has_role(auth.uid(), 'admin') then
  raise exception 'Acesso administrativo necessário' using errcode='42501';
 end if;
 if p_rate is not null and (p_rate < 0.5 or p_rate > 3.5 or p_rate * 2 <> trunc(p_rate * 2)) then
  raise exception 'Comissão deve estar entre 0,5%% e 3,5%% em passos de 0,5';
 end if;
 if not exists(select 1 from public.profiles where id=p_user and site_role in ('Vendedor','Representante','Administrador')) then
  raise exception 'Selecione um vendedor, representante ou administrador cadastrado';
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
