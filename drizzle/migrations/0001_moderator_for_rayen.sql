CREATE OR REPLACE FUNCTION public.on_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.profiles(id,display_name) VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'display_name','Créateur'));
IF lower(NEW.email) = 'rayen@bahroun.com' THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'moderator');
ELSE
  INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'creator');
END IF;
RETURN NEW; END $$;
INSERT INTO public.user_roles(user_id,role) SELECT id,'moderator' FROM auth.users WHERE lower(email)='rayen@bahroun.com' ON CONFLICT DO NOTHING;
DELETE FROM public.user_roles WHERE role='creator' AND user_id IN (SELECT id FROM auth.users WHERE lower(email)='rayen@bahroun.com');