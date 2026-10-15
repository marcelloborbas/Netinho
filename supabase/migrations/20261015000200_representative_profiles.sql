-- Perfis públicos editáveis; separados de credenciais e autorizações comerciais.
create table if not exists public.representative_profiles (
  slug text primary key,
  full_name text not null,
  region text not null,
  email text,
  phone text,
  updated_at timestamptz not null default now()
);
alter table public.representative_profiles enable row level security;
grant select on public.representative_profiles to anon, authenticated;
grant insert, update on public.representative_profiles to authenticated;
create policy "Public can view representative profiles"
on public.representative_profiles for select to anon, authenticated using (true);
create policy "Only administrators manage representative profiles"
on public.representative_profiles for all to authenticated
using (exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'))
with check (exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
insert into public.representative_profiles (slug, full_name, region)
values
 ('abdenego-eugenio','Abdenego Eugênio','Vale do Paraíba e Litoral Norte'),
 ('livaldo-souza-silva','Livaldo Souza Silva','Todo o Brasil · Teste')
on conflict (slug) do nothing;
