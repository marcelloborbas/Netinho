-- Permitir edição administrativa de nome e telefone sem ampliar a política RLS pública.
-- A função valida o papel de administrador no servidor.
CREATE OR REPLACE FUNCTION public.admin_update_person_contact(
 p_user uuid,
 p_name text,
 p_phone text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id=auth.uid() AND role='admin'
 ) THEN
  RAISE EXCEPTION 'Somente administradores podem editar pessoas'
    USING errcode='42501';
 END IF;
 UPDATE public.profiles
 SET full_name=NULLIF(trim(p_name),''),
     phone=NULLIF(trim(p_phone),'')
 WHERE id=p_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pessoa não encontrada'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_person_contact(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_person_contact(uuid,text,text) TO authenticated;
