-- Todos os usuários com autorização comercial compartilham a carteira de clientes.
-- A política restritiva "commercial customers gate" continua exigindo can_sell().
drop policy if exists "customers own" on public.customers;
create policy "customers shared for authorized sellers" on public.customers
  for all to authenticated
  using (public.can_sell())
  with check (public.can_sell());

-- Pedidos continuam vinculados ao vendedor autenticado.
-- A função de registro de pedidos, definida em 20261016000000_catalog_access_levels.sql,
-- deve permitir selecionar clientes de qualquer vendedor autorizado.
do $$
declare
  fn text;
begin
  select pg_get_functiondef(p.oid) into fn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_order' and p.pronargs = 1
  limit 1;
  if fn is not null then
    fn := replace(fn,
      'and (seller_id = _uid or public.has_role(_uid, ''admin''))',
      '');
    execute fn;
  end if;
end;
$$;
