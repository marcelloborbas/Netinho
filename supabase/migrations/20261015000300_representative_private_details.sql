create table if not exists public.representative_private_details (
 slug text primary key references public.representative_profiles(slug) on delete cascade,
 cpf text, rg text, street_address text, neighborhood text,
 postal_code text, city text, state text, service_cities text,
 updated_at timestamptz not null default now()
);
alter table public.representative_private_details enable row level security;
revoke all on public.representative_private_details from anon;
grant select, insert, update on public.representative_private_details to authenticated;
create policy "Only admins access representative private details"
on public.representative_private_details for all to authenticated
using (exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'))
with check (exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='admin'));
