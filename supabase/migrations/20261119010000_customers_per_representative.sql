-- Cada cliente pertence a um único representante comercial.
-- O administrador mantém acesso global e pode atribuir/repassar clientes.
-- Representantes só podem consultar e alterar os clientes cujo seller_id é seu auth.uid().

drop policy if exists "customers shared for authorized sellers" on public.customers;
drop policy if exists "customers own" on public.customers;

create policy "customers assigned representative or admin"
on public.customers
for all to authenticated
using (
  public.can_sell()
  and (
    seller_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin')
  )
)
with check (
  public.can_sell()
  and (
    (
      seller_id = (select auth.uid())
      and exists (
        select 1 from public.commercial_representatives r
        where r.user_id = (select auth.uid())
          and r.active = true
      )
    )
    or (
      public.has_role((select auth.uid()), 'admin')
      and exists (
        select 1 from public.commercial_representatives r
        where r.user_id = customers.seller_id
          and r.active = true
      )
    )
  )
);

create index if not exists customers_seller_id_idx on public.customers(seller_id);

comment on column public.customers.seller_id is
  'Usuário do representante comercial responsável pelo cliente; o RLS limita cada representante à própria carteira.';
