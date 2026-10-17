-- Catálogos devem ser privados: download exige uma conta autenticada real.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalogs','catalogs',false,52428800,array['application/pdf'])
on conflict(id) do update set public=false;
create policy "Authenticated accounts download catalogs"
on storage.objects for select to authenticated
using(bucket_id='catalogs' and auth.uid() is not null and coalesce(auth.jwt()->>'is_anonymous','false')='false');
create policy "Administrators upload catalogs"
on storage.objects for insert to authenticated
with check(bucket_id='catalogs' and public.has_role(auth.uid(),'admin'));
create policy "Administrators update catalogs"
on storage.objects for update to authenticated
using(bucket_id='catalogs' and public.has_role(auth.uid(),'admin'))
with check(bucket_id='catalogs' and public.has_role(auth.uid(),'admin'));
