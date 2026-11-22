CREATE TYPE public.app_role AS ENUM ('creator','moderator');
CREATE TYPE public.content_status AS ENUM ('PENDING','VALIDATED','REJECTED','REMOVED');
CREATE TYPE public.content_kind AS ENUM ('MINI_GAME','SHORT_DOC','QUIZ','PUZZLE','VIDEO');
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.user_roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE POLICY roles_self ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid() OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE FUNCTION public.on_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.profiles(id,display_name) VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'display_name','Créateur')); INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'creator'); RETURN NEW; END $$;
CREATE TRIGGER creative_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.on_signup();
CREATE TABLE public.categories(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL);
GRANT SELECT ON public.categories TO authenticated; GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.contents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_id uuid NOT NULL REFERENCES public.profiles(id), category_id uuid NOT NULL REFERENCES public.categories(id), title text NOT NULL CHECK(length(trim(title))>0), description text NOT NULL,content_type public.content_kind NOT NULL,body jsonb NOT NULL DEFAULT '{}',media_url text,status public.content_status NOT NULL DEFAULT 'PENDING',rejection_reason text,reviewed_by uuid REFERENCES public.profiles(id),reviewed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.contents TO authenticated; GRANT ALL ON public.contents TO service_role;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY contents_read ON public.contents FOR SELECT TO authenticated USING(author_id=auth.uid() OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY contents_insert ON public.contents FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND public.has_role(auth.uid(),'creator') AND status='PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL);
CREATE POLICY contents_update ON public.contents FOR UPDATE TO authenticated USING((author_id=auth.uid() AND status IN('PENDING','REJECTED')) OR public.has_role(auth.uid(),'moderator')) WITH CHECK(author_id=auth.uid() OR public.has_role(auth.uid(),'moderator'));
CREATE TABLE public.reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),content_id uuid NOT NULL REFERENCES public.contents(id),reason text NOT NULL,status text NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','DISMISSED','ACTIONED')),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,UPDATE ON public.reports TO authenticated; GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_moderator ON public.reports FOR ALL TO authenticated USING(public.has_role(auth.uid(),'moderator')) WITH CHECK(public.has_role(auth.uid(),'moderator'));
CREATE TABLE public.moderation_decisions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),content_id uuid NOT NULL REFERENCES public.contents(id),moderator_id uuid NOT NULL REFERENCES public.profiles(id),decision text NOT NULL CHECK(decision IN('ACCEPTED','REJECTED','REMOVED','RESTORED')),reason text,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.moderation_decisions TO authenticated; GRANT ALL ON public.moderation_decisions TO service_role;
ALTER TABLE public.moderation_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY decisions_read ON public.moderation_decisions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'moderator'));
CREATE FUNCTION public.enforce_content() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RETURN NEW; END IF;
IF TG_OP='INSERT' THEN NEW.status='PENDING'; NEW.reviewed_by=NULL; NEW.reviewed_at=NULL; NEW.rejection_reason=NULL; RETURN NEW; END IF;
IF NEW.author_id<>OLD.author_id OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Immutable author'; END IF;
IF public.has_role(auth.uid(),'moderator') THEN
IF ROW(NEW.title,NEW.description,NEW.category_id,NEW.content_type,NEW.body,NEW.media_url) IS DISTINCT FROM ROW(OLD.title,OLD.description,OLD.category_id,OLD.content_type,OLD.body,OLD.media_url) THEN RAISE EXCEPTION 'Moderator cannot edit content'; END IF;
IF NEW.status<>OLD.status AND NOT ((OLD.status='PENDING' AND NEW.status IN('VALIDATED','REJECTED')) OR (OLD.status='VALIDATED' AND NEW.status='REMOVED') OR (OLD.status='REMOVED' AND NEW.status='VALIDATED')) THEN RAISE EXCEPTION 'Invalid status transition'; END IF;
IF NEW.status='REJECTED' AND length(trim(coalesce(NEW.rejection_reason,'')))=0 THEN RAISE EXCEPTION 'Rejection reason required'; END IF;
NEW.reviewed_by=auth.uid(); NEW.reviewed_at=now();
ELSE
IF OLD.author_id<>auth.uid() OR OLD.status NOT IN('PENDING','REJECTED') OR NEW.status NOT IN('PENDING','REJECTED') OR (OLD.status='PENDING' AND NEW.status<>'PENDING') THEN RAISE EXCEPTION 'Creator cannot change status'; END IF;
IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN RAISE EXCEPTION 'Review fields protected'; END IF;
END IF;
NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER content_guard BEFORE INSERT OR UPDATE ON public.contents FOR EACH ROW EXECUTE FUNCTION public.enforce_content();
CREATE FUNCTION public.moderate_content(_content_id uuid,_decision text,_reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c public.contents; BEGIN
IF NOT public.has_role(auth.uid(),'moderator') THEN RAISE EXCEPTION 'Forbidden'; END IF;
SELECT * INTO c FROM public.contents WHERE id=_content_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Content not found'; END IF;
IF _decision='ACCEPTED' AND c.status='PENDING' THEN UPDATE public.contents SET status='VALIDATED',rejection_reason=NULL WHERE id=c.id;
ELSIF _decision='REJECTED' AND c.status='PENDING' AND length(trim(coalesce(_reason,'')))>0 THEN UPDATE public.contents SET status='REJECTED',rejection_reason=_reason WHERE id=c.id;
ELSIF _decision='REMOVED' AND c.status='VALIDATED' THEN UPDATE public.contents SET status='REMOVED' WHERE id=c.id; UPDATE public.reports SET status='ACTIONED' WHERE content_id=c.id AND status='OPEN';
ELSIF _decision='RESTORED' AND c.status IN('VALIDATED','REMOVED') THEN IF c.status='REMOVED' THEN UPDATE public.contents SET status='VALIDATED' WHERE id=c.id; END IF; UPDATE public.reports SET status='DISMISSED' WHERE content_id=c.id AND status='OPEN';
ELSE RAISE EXCEPTION 'Invalid decision or reason'; END IF;
INSERT INTO public.moderation_decisions(content_id,moderator_id,decision,reason) VALUES(c.id,auth.uid(),_decision,_reason); END $$;
REVOKE ALL ON FUNCTION public.moderate_content(uuid,text,text) FROM PUBLIC; REVOKE ALL ON FUNCTION public.moderate_content(uuid,text,text) FROM anon; GRANT EXECUTE ON FUNCTION public.moderate_content(uuid,text,text) TO authenticated;
CREATE POLICY contents_delete_unreviewed ON public.contents FOR DELETE TO authenticated USING (author_id = auth.uid() AND status = 'PENDING' AND reviewed_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.moderation_decisions d WHERE d.content_id = contents.id));
CREATE FUNCTION public.record_content_report(_content_id uuid, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
IF NOT public.has_role(auth.uid(), 'moderator') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF length(trim(coalesce(_reason,''))) = 0 THEN RAISE EXCEPTION 'Reason required'; END IF;
IF NOT EXISTS (SELECT 1 FROM public.contents WHERE id=_content_id AND status='VALIDATED') THEN RAISE EXCEPTION 'Only validated content can be reported'; END IF;
INSERT INTO public.reports(content_id, reason) VALUES (_content_id, trim(_reason));
END $$;
REVOKE ALL ON FUNCTION public.record_content_report(uuid,text) FROM PUBLIC; REVOKE ALL ON FUNCTION public.record_content_report(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_content_report(uuid,text) TO authenticated;
CREATE POLICY categories_read ON public.categories FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'creator') OR public.has_role(auth.uid(),'moderator'));
CREATE FUNCTION public.creator_notifications()
RETURNS TABLE(id uuid, kind text, content_id uuid, content_title text, decision text, reason text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id, n.kind, n.content_id, n.content_title, n.decision, n.reason, n.created_at FROM (
    SELECT d.id, 'DECISION'::text AS kind, c.id AS content_id, c.title AS content_title, d.decision, d.reason, d.created_at
    FROM public.moderation_decisions d JOIN public.contents c ON c.id = d.content_id
    WHERE auth.uid() IS NOT NULL AND c.author_id = auth.uid()
    UNION ALL
    SELECT r.id, 'REPORT'::text, c.id, c.title, r.status, NULL::text, r.created_at
    FROM public.reports r JOIN public.contents c ON c.id = r.content_id
    WHERE auth.uid() IS NOT NULL AND c.author_id = auth.uid()
  ) n
  ORDER BY n.created_at DESC
  LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.creator_notifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.creator_notifications() FROM anon;
GRANT EXECUTE ON FUNCTION public.creator_notifications() TO authenticated;
CREATE INDEX contents_author_idx ON public.contents(author_id); CREATE INDEX contents_status_idx ON public.contents(status,created_at); CREATE INDEX reports_content_idx ON public.reports(content_id); CREATE INDEX decisions_content_idx ON public.moderation_decisions(content_id);
INSERT INTO public.categories(name) VALUES('Santé'),('Bien-être'),('Sport'),('Nutrition'),('Jeux'),('Culture');
CREATE POLICY media_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='content-media' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_role(auth.uid(),'moderator')));
CREATE POLICY media_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='content-media' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY media_delete_own ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'content-media' AND (storage.foldername(name))[1] = auth.uid()::text);