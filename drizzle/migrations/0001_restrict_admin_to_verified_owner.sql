CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
   WHERE r.user_id = _user_id AND r.role = _role
   AND (_role <> 'admin'::public.app_role OR (lower(u.email) = 'phonpimon.y@ku.th' AND u.email_confirmed_at IS NOT NULL))
 );
$$;
CREATE OR REPLACE FUNCTION public.enforce_single_admin_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 IF NEW.role = 'admin'::public.app_role AND NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = NEW.user_id
  AND lower(u.email) = 'phonpimon.y@ku.th' AND u.email_confirmed_at IS NOT NULL
 ) THEN
  RAISE EXCEPTION 'Administrator assignment is not permitted' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_single_admin_account BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_admin_account();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 INSERT INTO public.profiles (id, full_name, phone, email)
 VALUES (new.id, nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'phone',''), new.email)
 ON CONFLICT (id) DO NOTHING;
 INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user'::public.app_role)
 ON CONFLICT (user_id, role) DO NOTHING;
 RETURN new;
END;
$$;