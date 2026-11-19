-- Removing access (inactive or non-selling role) must immediately revoke
-- the owner's read access to commission and territory rows.
drop policy if exists "commission rates visible to owner and administrator" on public.salesperson_commission_rates;
create policy "commission rates visible to active owner and administrator"
  on public.salesperson_commission_rates for select to authenticated
  using (
    (user_id = (select auth.uid()) and public.can_sell())
    or public.has_role((select auth.uid()), 'admin')
  );

drop policy if exists "Users view own territory" on public.person_territories;
create policy "Active sellers view own territory"
  on public.person_territories for select to authenticated
  using (user_id = (select auth.uid()) and public.can_sell());