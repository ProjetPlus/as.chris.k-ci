-- Harden get_member_card: keep the in-function session check and remove public/anon access
CREATE OR REPLACE FUNCTION public.get_member_card(p_member_id text)
 RETURNS TABLE(id uuid, member_id text, first_name text, last_name text, phone text, campement text, sous_prefecture text, photo text, registration_date date, status text, adhesion_paid boolean, adhesion_amount integer, total_covered_persons integer, contribution_status text, secondary_members jsonb, guardian jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$;

REVOKE ALL ON FUNCTION public.get_member_card(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_card(text) TO service_role;

REVOKE ALL ON FUNCTION public.get_card_settings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_card_settings() TO service_role;

-- Internal role helper: only used inside SECURITY DEFINER functions, never by clients
REVOKE ALL ON FUNCTION public.current_session_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_session_role() TO service_role;
