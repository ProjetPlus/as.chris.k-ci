-- RPC propres pour gérer les comptes applicatifs sans exposer password_hash
CREATE OR REPLACE FUNCTION public.list_app_users()
RETURNS TABLE(id uuid, username text, display_name text, role text, is_active boolean, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.created_at
  FROM public.app_users u
  ORDER BY u.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.update_app_user(
  p_id uuid,
  p_role text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.app_users
  SET role = COALESCE(p_role, role),
      display_name = COALESCE(p_display_name, display_name),
      is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_app_user(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.app_users
  WHERE id = p_id AND role <> 'super_admin';
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_app_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_app_user(uuid, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_app_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_treasury() TO anon, authenticated;