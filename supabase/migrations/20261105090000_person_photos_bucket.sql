-- Fotos de pessoas gerenciadas exclusivamente pelo administrador.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('person-photos','person-photos',true,5242880,ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE SET public=true,file_size_limit=5242880,allowed_mime_types=ARRAY['image/webp'];

DROP POLICY IF EXISTS "Public can view person photos" ON storage.objects;
CREATE POLICY "Public can view person photos" ON storage.objects
FOR SELECT TO public USING (bucket_id='person-photos');

DROP POLICY IF EXISTS "Admins upload person photos" ON storage.objects;
CREATE POLICY "Admins upload person photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='person-photos' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins update person photos" ON storage.objects;
CREATE POLICY "Admins update person photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id='person-photos' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id='person-photos' AND public.has_role(auth.uid(),'admin'));
