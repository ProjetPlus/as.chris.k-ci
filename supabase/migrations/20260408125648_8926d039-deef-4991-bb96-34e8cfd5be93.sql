
-- Function to create a user with hashed password
CREATE OR REPLACE FUNCTION public.create_app_user(
  p_username TEXT,
  p_password TEXT,
  p_role TEXT,
  p_display_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.app_users (username, password_hash, role, display_name)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_role, p_display_name);
END;
$$;

-- Function to authenticate a user
CREATE OR REPLACE FUNCTION public.authenticate_app_user(
  p_username TEXT,
  p_password TEXT
) RETURNS SETOF public.app_users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.app_users
  WHERE username = p_username
    AND password_hash = crypt(p_password, password_hash)
    AND is_active = true;
END;
$$;
