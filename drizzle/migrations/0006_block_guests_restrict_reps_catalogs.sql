do $$
declare t text;
begin
  foreach t in array array['categories','commercial_representatives','customers','order_items','orders','products','profiles','representative_private_details','representative_profiles','user_roles'] loop
    execute format('create policy "no guest sessions" on public.%I as restrictive for all to authenticated using (coalesce((auth.jwt()->>''is_anonymous'')::boolean,false) is not true) with check (coalesce((auth.jwt()->>''is_anonymous'')::boolean,false) is not true)', t);
  end loop;
end $$;

drop policy if exists "Public can view representative profiles" on public.representative_profiles;
revoke select on public.representative_profiles from anon;

drop policy if exists "Authenticated accounts download catalogs" on storage.objects;
create policy "Sales reps download catalogs" on storage.objects for select to authenticated
using (bucket_id = 'catalogs' and public.can_sell());