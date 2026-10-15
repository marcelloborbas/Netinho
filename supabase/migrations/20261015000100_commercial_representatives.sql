-- Representatives are provisioned only by authenticated administrators.
create table if not exists public.commercial_representatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text not null unique,
  phone text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.commercial_representatives enable row level security;
revoke all on public.commercial_representatives from anon;
grant select on public.commercial_representatives to authenticated;
grant insert, update, delete on public.commercial_representatives to authenticated;
create policy "Admins manage representatives" on public.commercial_representatives
  for all to authenticated
  using (exists(select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'))
  with check (exists(select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
create policy "Representatives view their own record" on public.commercial_representatives
  for select to authenticated
  using (user_id = (select auth.uid()));
-- Only a verified, linked Supabase account may be granted representative access.
create or replace function public.is_active_commercial_representative()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.commercial_representatives r
    where r.user_id = (select auth.uid()) and r.active
  );
$$;
revoke all on function public.is_active_commercial_representative() from public, anon;
grant execute on function public.is_active_commercial_representative() to authenticated;
