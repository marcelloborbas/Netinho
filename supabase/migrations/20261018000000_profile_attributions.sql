alter table public.profiles
  add column if not exists attribution text not null default 'Visitante'
  check (attribution in ('Representante', 'Visitante', 'Cliente'));

create or replace function public.access_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'level', case
      when public.can_sell() and exists(
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'admin'
      ) then 1
      when public.can_sell() then 2
      else 3
    end,
    'can_sell', public.can_sell(),
    'name', coalesce(
      nullif(auth.jwt()->'user_metadata'->>'full_name', ''),
      nullif(auth.jwt()->'user_metadata'->>'name', ''),
      split_part(auth.jwt()->>'email', '@', 1),
      'Visitante'
    ),
    'email', coalesce(auth.jwt()->>'email', ''),
    'attribution', coalesce(
      (select p.attribution from public.profiles p where p.id = auth.uid()),
      case when public.can_sell() then 'Representante' else 'Visitante' end
    )
  ) where auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') = 'false'
    and (
      public.can_sell()
      or exists(select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null)
      or auth.jwt()->'app_metadata'->>'provider' = 'google'
      or coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
    );
$$;
revoke all on function public.access_context() from public, anon;
grant execute on function public.access_context() to authenticated;

create or replace function public.admin_set_profile_attribution(
  p_target_user uuid,
  p_attribution text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Apenas administradores podem alterar a atribuição.' using errcode = '42501';
  end if;

  if p_attribution not in ('Representante', 'Visitante', 'Cliente') then
    raise exception 'Atribuição inválida.' using errcode = '22023';
  end if;

  update public.profiles
  set attribution = p_attribution
  where id = p_target_user;

  if not found then
    raise exception 'Cadastro de usuário não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.admin_set_profile_attribution(uuid, text) from public, anon;
grant execute on function public.admin_set_profile_attribution(uuid, text) to authenticated;
