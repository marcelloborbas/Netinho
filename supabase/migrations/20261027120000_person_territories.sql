-- Dados regionais editáveis por RH - Pessoas
create table if not exists public.person_territories (
  user_id uuid primary key references auth.users(id) on delete cascade,
  city_base text not null default '',
  region text not null default '',
  map_url text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.person_territories enable row level security;
create policy "Admins manage person territories" on public.person_territories
  for all to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.site_role='Administrador' and p.access_active=true))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.site_role='Administrador' and p.access_active=true));
create policy "Users view own territory" on public.person_territories
  for select to authenticated using (user_id=auth.uid());
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('territory-maps','territory-maps',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy "Admins upload territory maps" on storage.objects
  for insert to authenticated with check (bucket_id='territory-maps' and exists (select 1 from public.profiles p where p.id=auth.uid() and p.site_role='Administrador' and p.access_active=true));
create policy "Anyone views territory maps" on storage.objects
  for select to public using (bucket_id='territory-maps');
