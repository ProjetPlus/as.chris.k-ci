
-- 1) Drop the fully-permissive policy on app_users
DROP POLICY IF EXISTS "Allow all on app_users" ON public.app_users;

-- 2) Revoke Data API access from anon/authenticated (client must never hit this table directly)
REVOKE ALL ON public.app_users FROM anon;
REVOKE ALL ON public.app_users FROM authenticated;

-- 3) Keep service_role for admin/edge-function usage
GRANT ALL ON public.app_users TO service_role;

-- 4) Deny-all policy (defense in depth). RLS is already enabled.
--    SECURITY DEFINER functions (authenticate_app_user, create_app_user) bypass RLS
--    because they run as the function owner.
CREATE POLICY "Deny direct client access to app_users"
  ON public.app_users
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
