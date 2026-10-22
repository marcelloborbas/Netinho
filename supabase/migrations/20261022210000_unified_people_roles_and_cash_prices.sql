-- Uma única fonte de verdade para os quatro perfis.
alter table public.profiles add column if not exists site_role text not null default 'Visitante'
  check (site_role in ('Visitante','Vendedor','Representante','Administrador'));
alter table public.profiles add column if not exists access_active boolean not null default true;
alter table public.profiles add column if not exists territory_uf text;
alter table public.profiles add column if not exists territory_cities text;
alter table public.profiles add column if not exists supervisor_id uuid references public.profiles(id);

-- Preservar autorizações existentes durante a migração.
update public.profiles p set site_role = case
 when exists(select 1 from public.user_roles r where r.user_id=p.id and r.role='admin') then 'Administrador'
 when exists(select 1 from public.commercial_representatives c where c.active and (c.user_id=p.id or lower(c.email)=lower(p.email))) then 'Representante'
 else 'Visitante' end
where p.site_role='Visitante';

create or replace function public.can_sell()
returns boolean language sql stable security definer set search_path = '' as $$
 select coalesce(auth.uid() is not null
 and coalesce(auth.jwt()->>'is_anonymous','false')='false'
 and exists(select 1 from public.profiles p where p.id=auth.uid()
   and p.access_active and p.site_role in ('Vendedor','Representante','Administrador')
   and (p.site_role='Administrador' or
     (auth.jwt()->'app_metadata'->>'provider'='google' or coalesce(auth.jwt()->'app_metadata'->'providers','[]'::jsonb) ? 'google'))),false);
$$;
revoke all on function public.can_sell() from public, anon;
grant execute on function public.can_sell() to authenticated;

create or replace function public.access_context()
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
 'level', case when p.site_role='Administrador' and p.access_active then 1 when public.can_sell() then 2 else 3 end,
 'can_sell', public.can_sell(),
 'name', coalesce(nullif(p.full_name,''),split_part(auth.jwt()->>'email','@',1),'Visitante'),
 'email',coalesce(p.email,auth.jwt()->>'email',''),
 'attribution',case when p.access_active then p.site_role else 'Visitante' end)
 from public.profiles p where p.id=auth.uid();
$$;
revoke all on function public.access_context() from public, anon;
grant execute on function public.access_context() to authenticated;

create or replace function public.admin_set_person(
 p_user uuid, p_role text, p_active boolean, p_uf text, p_cities text, p_supervisor uuid
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')
 then raise exception 'Somente administradores podem alterar pessoas.' using errcode='42501'; end if;
 if p_role not in ('Visitante','Vendedor','Representante','Administrador')
 then raise exception 'Perfil inválido' using errcode='22023'; end if;
 if p_user=auth.uid() and (p_role<>'Administrador' or not p_active)
 then raise exception 'Não é permitido remover seu próprio acesso administrativo.' using errcode='42501'; end if;
 if p_role='Administrador' and not exists(select 1 from public.user_roles where user_id=p_user and role='admin') then
   insert into public.user_roles(user_id,role) values(p_user,'admin') on conflict do nothing;
 elsif p_role<>'Administrador' then
   delete from public.user_roles where user_id=p_user and role='admin';
 end if;
 update public.profiles set site_role=p_role, access_active=p_active,
   territory_uf=case when p_role in ('Vendedor','Representante') then nullif(trim(p_uf),'') end,
   territory_cities=case when p_role in ('Vendedor','Representante') then nullif(trim(p_cities),'') end,
   supervisor_id=case when p_role='Vendedor' and p_supervisor<>p_user then p_supervisor end
 where id=p_user;
 if not found then raise exception 'Pessoa não encontrada'; end if;
end; $$;
revoke all on function public.admin_set_person(uuid,text,boolean,text,text,uuid) from public, anon;
grant execute on function public.admin_set_person(uuid,text,boolean,text,text,uuid) to authenticated;

-- Visitantes enxergam somente o preço à vista; demais condições continuam restritas.
create or replace function public.catalog_products()
returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'category_id',p.category_id,'code',p.code,'refs',p.refs,
   'application',p.application,'brand',p.brand,'manufacturer',p.manufacturer,
   'image_url',p.image_url,'catalog_page',p.catalog_page,'active',p.active,
   'search_text',p.search_text,'created_at',p.created_at,'updated_at',p.updated_at,
   'categories',jsonb_build_object('name',c.name),
   'stock',case when public.can_sell() then p.stock end,
   'price_cash',p.price_cash,
   'price_30',case when public.can_sell() then p.price_30 end,
   'price_30_45_60',case when public.can_sell() then p.price_30_45_60 end,
   'price_30_45_60_75',case when public.can_sell() then p.price_30_45_60_75 end,
   'price_note',case when public.can_sell() then p.price_note end
 ) order by p.manufacturer,p.code),'[]'::jsonb)
 from public.products p join public.categories c on c.id=p.category_id
 where auth.uid() is not null
 and coalesce(auth.jwt()->>'is_anonymous','false')='false'
 and (public.can_sell() or auth.jwt()->'app_metadata'->>'provider'='google'
   or coalesce(auth.jwt()->'app_metadata'->'providers','[]'::jsonb) ? 'google')
 and p.active and c.active;
$$;
revoke all on function public.catalog_products() from public, anon;
grant execute on function public.catalog_products() to authenticated;
