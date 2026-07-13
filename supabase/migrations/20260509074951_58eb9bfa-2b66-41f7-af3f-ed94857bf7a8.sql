-- Fix login: include 'extensions' in search_path so crypt()/gen_salt() from pgcrypto are resolvable
CREATE OR REPLACE FUNCTION public.authenticate_app_user(p_username text, p_password text)
 RETURNS TABLE(id uuid, username text, display_name text, role text, is_active boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.created_at
  FROM public.app_users u
  WHERE u.username = p_username
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.is_active = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_app_user(p_username text, p_password text, p_role text, p_display_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  INSERT INTO public.app_users (username, password_hash, role, display_name)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_role, p_display_name);
END;
$function$;

-- Reset admin password to ensure it matches '12345678'
UPDATE public.app_users
SET password_hash = crypt('12345678', gen_salt('bf')),
    is_active = true
WHERE username = 'admin';