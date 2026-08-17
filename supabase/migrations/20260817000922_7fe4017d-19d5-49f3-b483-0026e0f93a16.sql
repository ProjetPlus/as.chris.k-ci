CREATE OR REPLACE FUNCTION public.find_member_card_public(p_query text)
 RETURNS TABLE(id uuid, member_id text, first_name text, last_name text, phone text, campement text, sous_prefecture text, photo text, registration_date date, status text, adhesion_paid boolean, adhesion_amount integer, total_covered_persons integer, contribution_status text, secondary_members jsonb, guardian jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_norm text;
BEGIN
  v_norm := regexp_replace(coalesce(p_query, ''), '[^0-9A-Za-z]', '', 'g');
  IF length(v_norm) < 6 THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT m.id, m.member_id, m.first_name, m.last_name, m.phone,
         m.campement, m.sous_prefecture, m.photo, m.registration_date,
         m.status, m.adhesion_paid, m.adhesion_amount,
         m.total_covered_persons, m.contribution_status,
         m.secondary_members, m.guardian
  FROM public.members m
  WHERE upper(regexp_replace(m.member_id, '[^0-9A-Za-z]', '', 'g')) = upper(v_norm)
     OR right(regexp_replace(coalesce(m.phone, ''), '[^0-9]', '', 'g'), 10) = right(regexp_replace(v_norm, '[^0-9]', '', 'g'), 10)
     OR right(regexp_replace(coalesce(m.phone_secondary, ''), '[^0-9]', '', 'g'), 10) = right(regexp_replace(v_norm, '[^0-9]', '', 'g'), 10)
  LIMIT 1;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_card_settings_public()
 RETURNS TABLE(association_name text, initials text, phone text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.association_name, s.initials, s.phone FROM public.settings s LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.find_member_card_public(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_card_settings_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_member_card_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_card_settings_public() TO anon, authenticated;