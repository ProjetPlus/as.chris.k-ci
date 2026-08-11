CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  motif text NOT NULL,
  nature text NOT NULL DEFAULT 'autre',
  amount integer NOT NULL DEFAULT 0,
  beneficiary text NOT NULL DEFAULT '',
  beneficiary_member_id text DEFAULT '',
  responsible text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT 'especes',
  reference text DEFAULT '',
  status text NOT NULL DEFAULT 'validé',
  notes text DEFAULT '',
  created_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Require valid session" ON public.expenses;
CREATE POLICY "Require valid session" ON public.expenses
  FOR ALL TO anon, authenticated
  USING (public.has_valid_session())
  WITH CHECK (public.has_valid_session());

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recalculate_treasury()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_adhesions integer := 0; v_contributions integer := 0; v_payouts integer := 0;
  v_retained integer := 0; v_pending integer := 0; v_expenses integer := 0; v_treasury_id uuid;
BEGIN
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
END; $function$;

CREATE OR REPLACE FUNCTION public.get_member_card(p_member_id text)
 RETURNS TABLE(
   id uuid, member_id text, first_name text, last_name text, phone text,
   campement text, sous_prefecture text, photo text, registration_date date,
   status text, adhesion_paid boolean, adhesion_amount integer,
   total_covered_persons integer, contribution_status text,
   secondary_members jsonb, guardian jsonb
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.id, m.member_id, m.first_name, m.last_name, m.phone,
         m.campement, m.sous_prefecture, m.photo, m.registration_date,
         m.status, m.adhesion_paid, m.adhesion_amount,
         m.total_covered_persons, m.contribution_status,
         m.secondary_members, m.guardian
  FROM public.members m
  WHERE upper(replace(m.member_id, ' ', '')) = upper(replace(trim(p_member_id), ' ', ''))
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.get_member_card(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_card(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_card_settings()
 RETURNS TABLE(association_name text, initials text, phone text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.association_name, s.initials, s.phone FROM public.settings s LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.get_card_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_card_settings() TO anon, authenticated, service_role;