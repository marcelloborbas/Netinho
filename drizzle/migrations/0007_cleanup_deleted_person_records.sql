CREATE OR REPLACE FUNCTION public.cleanup_deleted_person_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Shared customers and immutable sales history are intentionally preserved.
  -- A remaining supervisor reference rejects the entire Auth deletion atomically.
  DELETE FROM public.commercial_representatives WHERE user_id = OLD.id;
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$function$;
REVOKE ALL ON FUNCTION public.cleanup_deleted_person_records() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_deleted_cleanup_person
BEFORE DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_person_records();