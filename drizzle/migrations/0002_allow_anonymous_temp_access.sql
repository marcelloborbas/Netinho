CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles(id, full_name, email)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NULLIF(split_part(COALESCE(NEW.email,''),'@',1),''), 'Vendedor'), COALESCE(NEW.email,''));
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'seller');
  -- Acesso temporário sem login (anônimo) nunca vira administrador.
  IF NOT COALESCE(NEW.is_anonymous, false) AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $function$;