
-- 1) Remove default seeded admin account
DELETE FROM public.app_users
WHERE username = 'admin'
  AND password_hash = crypt('12345678', password_hash);

-- 2) Sessions table
CREATE TABLE IF NOT EXISTS public.app_sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  role text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON public.app_sessions(user_id);

GRANT ALL ON public.app_sessions TO service_role;
-- No grants to anon/authenticated: only SECURITY DEFINER functions read/write this table.

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
-- No policies -> deny all direct client access.

-- 3) Session helpers (SECURITY DEFINER so they can read app_sessions despite RLS)
CREATE OR REPLACE FUNCTION public.current_session_token()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.headers', true)::jsonb->>'x-app-session', '')
$$;

CREATE OR REPLACE FUNCTION public.has_valid_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_sessions s
    JOIN public.app_users u ON u.id = s.user_id
    WHERE s.token = public.current_session_token()
      AND s.expires_at > now()
      AND u.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.current_session_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.app_sessions s
  JOIN public.app_users u ON u.id = s.user_id
  WHERE s.token = public.current_session_token()
    AND s.expires_at > now()
    AND u.is_active = true
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_session_token() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_valid_session() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_session_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_session_token() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_valid_session() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_session_role() TO anon, authenticated, service_role;

-- 4) Rewrite authenticate_app_user to mint a session token
DROP FUNCTION IF EXISTS public.authenticate_app_user(text, text);
CREATE OR REPLACE FUNCTION public.authenticate_app_user(p_username text, p_password text)
RETURNS TABLE(id uuid, username text, display_name text, role text, is_active boolean, created_at timestamptz, session_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user public.app_users%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_user
  FROM public.app_users u
  WHERE u.username = p_username
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.app_sessions(token, user_id, role) VALUES (v_token, v_user.id, v_user.role);

  RETURN QUERY SELECT v_user.id, v_user.username, v_user.display_name, v_user.role,
                      v_user.is_active, v_user.created_at, v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.authenticate_app_user(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_app_user(text, text) TO anon, authenticated, service_role;

-- Logout: revoke current session token
CREATE OR REPLACE FUNCTION public.logout_app_session()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.app_sessions WHERE token = public.current_session_token();
$$;
REVOKE EXECUTE ON FUNCTION public.logout_app_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.logout_app_session() TO anon, authenticated, service_role;

-- 5) Lock down admin RPCs: require a super_admin session
CREATE OR REPLACE FUNCTION public.create_app_user(p_username text, p_password text, p_role text, p_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF public.current_session_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.app_users (username, password_hash, role, display_name)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_role, p_display_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_app_user(p_id uuid, p_display_name text, p_role text, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_session_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.app_users
     SET display_name = p_display_name, role = p_role, is_active = p_is_active
   WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_app_user(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_session_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.app_users WHERE id = p_id;
  DELETE FROM public.app_sessions WHERE user_id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_app_users()
RETURNS TABLE(id uuid, username text, display_name text, role text, is_active boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_session_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.created_at
    FROM public.app_users u
    ORDER BY u.created_at DESC;
END;
$$;

-- 6) Tighten RLS on core tables: require a valid session for all access.
DO $$
DECLARE
  t text;
  polname text;
BEGIN
  FOREACH t IN ARRAY ARRAY['members','deaths','contributions','treasury','settings','sync_audit_logs']
  LOOP
    FOR polname IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', polname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "Require valid session" ON public.%I FOR ALL TO anon, authenticated USING (public.has_valid_session()) WITH CHECK (public.has_valid_session())',
      t
    );
  END LOOP;
END $$;
