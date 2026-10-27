-- Synthetic records only; all fixtures and changes are rolled back.
-- A temporary Auth stand-in invokes the real application cleanup trigger.
BEGIN;
CREATE TEMP TABLE deletion_test_auth (id uuid PRIMARY KEY);
CREATE TRIGGER cleanup_test BEFORE DELETE ON deletion_test_auth
FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_person_records();
DO $test$
DECLARE
 target uuid := gen_random_uuid();
 unrelated uuid := gen_random_uuid();
 blocked boolean := false;
BEGIN
 INSERT INTO public.profiles(id,full_name,email) VALUES
 (target,'Synthetic deletion target','delete-target@example.invalid'),
 (unrelated,'Synthetic unrelated user','delete-other@example.invalid');
 INSERT INTO public.user_roles(user_id,role) VALUES(target,'seller'),(unrelated,'seller');
 INSERT INTO deletion_test_auth VALUES(target);
 -- Simulate a supervisory link: deletion must fail without partial cleanup.
 UPDATE public.profiles SET supervisor_id=target WHERE id=unrelated;
 BEGIN
   DELETE FROM deletion_test_auth WHERE id=target;
 EXCEPTION WHEN foreign_key_violation THEN blocked := true;
 END;
 IF NOT blocked OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=target)
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target) THEN
   RAISE EXCEPTION 'Blocking relations must roll back all cleanup';
 END IF;
 -- Only synthetic fixtures are changed; no real account is involved.
 UPDATE public.profiles SET supervisor_id=NULL WHERE id=unrelated;
 DELETE FROM deletion_test_auth WHERE id=target;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=target)
 OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=target) THEN
   RAISE EXCEPTION 'Selected profile and roles must be removed';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=unrelated)
 OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=unrelated) THEN
   RAISE EXCEPTION 'Unrelated users must remain untouched';
 END IF;
END;
$test$;
ROLLBACK;