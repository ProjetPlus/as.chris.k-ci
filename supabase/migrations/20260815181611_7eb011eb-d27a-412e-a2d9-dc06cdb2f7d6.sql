
-- 1. Fixed search_path on remaining function
CREATE OR REPLACE FUNCTION public.current_session_token()
RETURNS text LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT NULLIF(current_setting('request.headers', true)::jsonb->>'x-app-session', '')
$$;

-- 2. Role helper: who may write
CREATE OR REPLACE FUNCTION public.can_write_session()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_sessions s
    JOIN public.app_users u ON u.id = s.user_id
    WHERE s.token = public.current_session_token()
      AND s.expires_at > now() AND u.is_active = true
      AND u.role IN ('super_admin','admin','membres','cotisations')
  )
$$;

-- 3. get_member_card / get_card_settings require a valid session
CREATE OR REPLACE FUNCTION public.get_member_card(p_member_id text)
RETURNS TABLE(id uuid, member_id text, first_name text, last_name text, phone text, campement text, sous_prefecture text, photo text, registration_date date, status text, adhesion_paid boolean, adhesion_amount integer, total_covered_persons integer, contribution_status text, secondary_members jsonb, guardian jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_valid_session() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT m.id, m.member_id, m.first_name, m.last_name, m.phone,
         m.campement, m.sous_prefecture, m.photo, m.registration_date,
         m.status, m.adhesion_paid, m.adhesion_amount,
         m.total_covered_persons, m.contribution_status,
         m.secondary_members, m.guardian
  FROM public.members m
  WHERE upper(replace(m.member_id, ' ', '')) = upper(replace(trim(p_member_id), ' ', ''))
  LIMIT 1;
END; $$;

CREATE OR REPLACE FUNCTION public.get_card_settings()
RETURNS TABLE(association_name text, initials text, phone text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_valid_session() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT s.association_name, s.initials, s.phone FROM public.settings s LIMIT 1;
END; $$;

-- 4. recalculate_treasury requires a write-capable session
CREATE OR REPLACE FUNCTION public.recalculate_treasury()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_adhesions integer := 0; v_contributions integer := 0; v_payouts integer := 0;
  v_retained integer := 0; v_pending integer := 0; v_expenses integer := 0; v_treasury_id uuid;
BEGIN
  IF NOT public.can_write_session() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT COALESCE(sum(adhesion_amount), 0) INTO v_adhesions FROM public.members WHERE adhesion_paid = true;
  SELECT COALESCE(sum(amount), 0) INTO v_contributions FROM public.contributions WHERE status IN ('payé', 'partiel');
  SELECT COALESCE(sum(payout), 0), COALESCE(sum(retained), 0) INTO v_payouts, v_retained FROM public.deaths;
  SELECT COALESCE(sum(GREATEST(expected_amount - amount, 0)), 0) INTO v_pending FROM public.contributions WHERE status IN ('non_payé', 'partiel');
  SELECT COALESCE(sum(amount), 0) INTO v_expenses FROM public.expenses WHERE status <> 'annulé';
  SELECT id INTO v_treasury_id FROM public.treasury LIMIT 1;
  IF v_treasury_id IS NULL THEN
    INSERT INTO public.treasury (total_balance, total_contributions_collected, total_payouts, retained_reserves, pending_contributions)
    VALUES (v_adhesions + v_contributions - v_payouts + v_retained - v_expenses, v_adhesions + v_contributions, v_payouts + v_expenses, v_retained, v_pending);
  ELSE
    UPDATE public.treasury SET total_balance = v_adhesions + v_contributions - v_payouts + v_retained - v_expenses,
      total_contributions_collected = v_adhesions + v_contributions,
      total_payouts = v_payouts + v_expenses, retained_reserves = v_retained,
      pending_contributions = v_pending, updated_at = now()
    WHERE id = v_treasury_id;
  END IF;
END; $$;

-- 5. Self-service password change so the seeded default can be replaced
CREATE OR REPLACE FUNCTION public.change_app_user_password(p_username text, p_old_password text, p_new_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_is_admin boolean;
BEGIN
  IF length(coalesce(p_new_password, '')) < 8 THEN
    RAISE EXCEPTION 'password too short';
  END IF;
  v_is_admin := public.current_session_role() = 'super_admin';
  IF NOT v_is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.app_users u
      WHERE u.username = p_username
        AND u.password_hash = extensions.crypt(p_old_password, u.password_hash)
        AND u.is_active = true
    ) THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
  END IF;
  UPDATE public.app_users
     SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
   WHERE username = p_username;
END; $$;

-- 6. Explicit deny-all policy on app_sessions
DROP POLICY IF EXISTS "Deny direct client access to app_sessions" ON public.app_sessions;
CREATE POLICY "Deny direct client access to app_sessions"
  ON public.app_sessions FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- 7. Split read vs write on business tables by session role
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['members','deaths','contributions','treasury','settings','expenses','sync_audit_logs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Require valid session', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Read with valid session', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Write with authorized session', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Update with authorized session', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Delete with authorized session', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (public.has_valid_session())', 'Read with valid session', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (public.can_write_session())', 'Write with authorized session', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (public.can_write_session()) WITH CHECK (public.can_write_session())', 'Update with authorized session', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (public.can_write_session())', 'Delete with authorized session', t);
  END LOOP;
END $$;

-- 8. Least-privilege EXECUTE grants on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.create_app_user(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_app_user(uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_app_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_app_users() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_member_card(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_card_settings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_treasury() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_session() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_valid_session() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_session_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.change_app_user_password(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.authenticate_app_user(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.logout_app_session() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.authenticate_app_user(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.logout_app_session() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_app_user_password(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_card(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_card_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_treasury() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_session() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_valid_session() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_session_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_app_user(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_app_user(uuid, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_app_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_app_users() TO anon, authenticated;
