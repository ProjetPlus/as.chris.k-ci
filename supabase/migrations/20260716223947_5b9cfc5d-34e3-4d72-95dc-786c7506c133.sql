CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_name text NOT NULL DEFAULT 'Association des Chrétiens de Kouassikankro (AS.CHRIS.K)',
  initials text NOT NULL DEFAULT 'CHRIS',
  phone text NOT NULL DEFAULT '+225 0102806057',
  contribution_amount integer NOT NULL DEFAULT 1000,
  adhesion_fee integer NOT NULL DEFAULT 14500,
  principal_payout integer NOT NULL DEFAULT 300000,
  secondary_payout integer NOT NULL DEFAULT 250000,
  secondary_retained integer NOT NULL DEFAULT 50000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on settings" ON public.settings;
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'lecture_seule' CHECK (role IN ('super_admin', 'admin', 'lecture_seule', 'cotisations', 'membres', 'imprimeur')),
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny direct client access to app_users" ON public.app_users;
CREATE POLICY "Deny direct client access to app_users" ON public.app_users FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  phone_secondary text DEFAULT '',
  whatsapp text DEFAULT '',
  campement text NOT NULL DEFAULT '',
  sous_prefecture text NOT NULL DEFAULT '',
  id_type text NOT NULL DEFAULT '',
  id_number text DEFAULT '',
  photo text DEFAULT '',
  id_card_front text DEFAULT '',
  registration_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'suspendu', 'décédé')),
  adhesion_paid boolean NOT NULL DEFAULT false,
  adhesion_amount integer NOT NULL DEFAULT 14500,
  adhesion_payment_method text DEFAULT 'especes',
  adhesion_payment_date date,
  secondary_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  guardian jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_covered_persons integer NOT NULL DEFAULT 1,
  contribution_status text NOT NULL DEFAULT 'à_jour' CHECK (contribution_status IN ('à_jour', 'en_retard')),
  previous_principal_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  principal_successor_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO anon, authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on members" ON public.members;
CREATE POLICY "Allow all on members" ON public.members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.deaths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deceased_name text NOT NULL,
  deceased_member_id text NOT NULL,
  deceased_member_uuid uuid REFERENCES public.members(id) ON DELETE SET NULL,
  date_of_death date NOT NULL,
  type text NOT NULL CHECK (type IN ('principal', 'secondaire')),
  payout integer NOT NULL DEFAULT 0,
  retained integer NOT NULL DEFAULT 0,
  total_expected_contributions integer NOT NULL DEFAULT 0,
  total_collected integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'clôturé')),
  successor_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deaths TO anon, authenticated;
GRANT ALL ON public.deaths TO service_role;
ALTER TABLE public.deaths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on deaths" ON public.deaths;
CREATE POLICY "Allow all on deaths" ON public.deaths FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL,
  member_uuid uuid REFERENCES public.members(id) ON DELETE SET NULL,
  member_name text NOT NULL,
  death_id uuid REFERENCES public.deaths(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  expected_amount integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'especes' CHECK (payment_method IN ('especes', 'wave', 'orange', 'mtn', 'moov')),
  status text NOT NULL DEFAULT 'non_payé' CHECK (status IN ('payé', 'non_payé', 'partiel', 'exonéré')),
  date date,
  proof_type text,
  proof_data text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributions TO anon, authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on contributions" ON public.contributions;
CREATE POLICY "Allow all on contributions" ON public.contributions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_balance integer NOT NULL DEFAULT 0,
  total_contributions_collected integer NOT NULL DEFAULT 0,
  total_payouts integer NOT NULL DEFAULT 0,
  retained_reserves integer NOT NULL DEFAULT 0,
  pending_contributions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury TO anon, authenticated;
GRANT ALL ON public.treasury TO service_role;
ALTER TABLE public.treasury ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on treasury" ON public.treasury;
CREATE POLICY "Allow all on treasury" ON public.treasury FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.sync_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id text NOT NULL,
  operation text NOT NULL,
  target_table text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'dropped')),
  attempts integer NOT NULL DEFAULT 0,
  details text,
  error_message text,
  payload_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_audit_logs TO anon, authenticated;
GRANT ALL ON public.sync_audit_logs TO service_role;
ALTER TABLE public.sync_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on sync_audit_logs" ON public.sync_audit_logs;
CREATE POLICY "Allow all on sync_audit_logs" ON public.sync_audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.settings;
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.authenticate_app_user(p_username text, p_password text)
RETURNS TABLE(id uuid, username text, display_name text, role text, is_active boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
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
GRANT EXECUTE ON FUNCTION public.authenticate_app_user(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_app_user(p_username text, p_password text, p_role text, p_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
  INSERT INTO public.app_users (username, password_hash, role, display_name)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_role, p_display_name);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_app_user(text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_app_users()
RETURNS TABLE(id uuid, username text, display_name text, role text, is_active boolean, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT id, username, display_name, role, is_active, created_at FROM public.app_users ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.list_app_users() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_app_user(p_id uuid, p_display_name text, p_role text, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  UPDATE public.app_users SET display_name = p_display_name, role = p_role, is_active = p_is_active WHERE id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_app_user(uuid, text, text, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_app_user(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  DELETE FROM public.app_users WHERE id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_app_user(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.recalculate_treasury()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_adhesions integer := 0;
  v_contributions integer := 0;
  v_payouts integer := 0;
  v_retained integer := 0;
  v_pending integer := 0;
  v_treasury_id uuid;
BEGIN
  SELECT COALESCE(sum(adhesion_amount), 0) INTO v_adhesions FROM public.members WHERE adhesion_paid = true;
  SELECT COALESCE(sum(amount), 0) INTO v_contributions FROM public.contributions WHERE status IN ('payé', 'partiel');
  SELECT COALESCE(sum(payout), 0), COALESCE(sum(retained), 0) INTO v_payouts, v_retained FROM public.deaths;
  SELECT COALESCE(sum(GREATEST(expected_amount - amount, 0)), 0) INTO v_pending FROM public.contributions WHERE status IN ('non_payé', 'partiel');
  SELECT id INTO v_treasury_id FROM public.treasury LIMIT 1;
  IF v_treasury_id IS NULL THEN
    INSERT INTO public.treasury (total_balance, total_contributions_collected, total_payouts, retained_reserves, pending_contributions)
    VALUES (v_adhesions + v_contributions - v_payouts + v_retained, v_adhesions + v_contributions, v_payouts, v_retained, v_pending);
  ELSE
    UPDATE public.treasury SET total_balance = v_adhesions + v_contributions - v_payouts + v_retained,
      total_contributions_collected = v_adhesions + v_contributions,
      total_payouts = v_payouts,
      retained_reserves = v_retained,
      pending_contributions = v_pending,
      updated_at = now()
    WHERE id = v_treasury_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recalculate_treasury() TO anon, authenticated;

INSERT INTO public.settings (id, association_name, initials, phone, adhesion_fee)
VALUES ('00000000-0000-0000-0000-000000000001', 'Association des Chrétiens de Kouassikankro (AS.CHRIS.K)', 'CHRIS', '+225 0102806057', 14500)
ON CONFLICT (id) DO UPDATE SET association_name = EXCLUDED.association_name, initials = EXCLUDED.initials, phone = EXCLUDED.phone, adhesion_fee = EXCLUDED.adhesion_fee;

INSERT INTO public.treasury (id, total_balance, total_contributions_collected, total_payouts, retained_reserves, pending_contributions)
VALUES ('00000000-0000-0000-0000-000000000002', 0, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_users (username, password_hash, role, display_name, is_active)
VALUES ('admin', crypt('12345678', gen_salt('bf')), 'super_admin', 'Super Admin', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, display_name = EXCLUDED.display_name, is_active = true;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.deaths; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.treasury; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_audit_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;