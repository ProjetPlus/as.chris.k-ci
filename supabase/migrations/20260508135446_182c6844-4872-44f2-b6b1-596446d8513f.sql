
-- 1) authenticate_app_user: stop returning password_hash
DROP FUNCTION IF EXISTS public.authenticate_app_user(text, text);

CREATE OR REPLACE FUNCTION public.authenticate_app_user(p_username text, p_password text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  role text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.created_at
  FROM public.app_users u
  WHERE u.username = p_username
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.is_active = true;
END;
$$;

-- 2) create_app_user: pin search_path and revoke anon EXECUTE
CREATE OR REPLACE FUNCTION public.create_app_user(p_username text, p_password text, p_role text, p_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_users (username, password_hash, role, display_name)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_role, p_display_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_app_user(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_app_user(text, text, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.authenticate_app_user(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_app_user(text, text) TO anon, authenticated;
