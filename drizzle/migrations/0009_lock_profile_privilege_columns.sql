-- Perfis: o próprio usuário não pode mais alterar campos que concedem privilégio.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;
-- Edição direta permitida somente para dados de contato não privilegiados.
GRANT UPDATE (full_name, phone, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Defesa em profundidade: chamadas diretas pela API (papéis anon/authenticated) não podem
-- alterar função, acesso, atribuição, território, supervisor, e-mail ou id. Funções administrativas
-- SECURITY DEFINER rodam como dono da tabela e continuam funcionando.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.site_role IS DISTINCT FROM OLD.site_role
       OR NEW.access_active IS DISTINCT FROM OLD.access_active
       OR NEW.attribution IS DISTINCT FROM OLD.attribution
       OR NEW.territory_uf IS DISTINCT FROM OLD.territory_uf
       OR NEW.territory_cities IS DISTINCT FROM OLD.territory_cities
       OR NEW.supervisor_id IS DISTINCT FROM OLD.supervisor_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Somente o administrador pode alterar o perfil de acesso.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();