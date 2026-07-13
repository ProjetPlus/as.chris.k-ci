-- Lot correctif membres / cartes / comptabilité / décès

-- 1) Champs manquants sur les membres
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS id_card_front text,
  ADD COLUMN IF NOT EXISTS guardian jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS previous_principal_member_id uuid,
  ADD COLUMN IF NOT EXISTS principal_successor_member_id uuid,
  ADD COLUMN IF NOT EXISTS photo_processing_status text NOT NULL DEFAULT 'done',
  ADD COLUMN IF NOT EXISTS adhesion_amount integer NOT NULL DEFAULT 14500,
  ADD COLUMN IF NOT EXISTS adhesion_payment_method text DEFAULT 'especes',
  ADD COLUMN IF NOT EXISTS adhesion_payment_date date;

-- self relations, created only if absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_previous_principal_member_id_fkey'
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_previous_principal_member_id_fkey
      FOREIGN KEY (previous_principal_member_id) REFERENCES public.members(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_principal_successor_member_id_fkey'
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_principal_successor_member_id_fkey
      FOREIGN KEY (principal_successor_member_id) REFERENCES public.members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2) Defaults et rattrapage comptable adhésion
UPDATE public.settings SET adhesion_fee = 14500 WHERE adhesion_fee IS DISTINCT FROM 14500;
UPDATE public.members
SET adhesion_paid = true,
    adhesion_amount = 14500,
    adhesion_payment_date = COALESCE(adhesion_payment_date, registration_date)
WHERE adhesion_paid = true OR adhesion_amount IS DISTINCT FROM 14500;

-- 3) Repartir proprement sur décès/cotisations comme demandé
DELETE FROM public.contributions;
DELETE FROM public.deaths;

-- 4) Triggers de liaison member_uuid / deceased_member_uuid
CREATE OR REPLACE FUNCTION public.sync_member_relation_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'deaths' THEN
    IF NEW.deceased_member_uuid IS NULL OR NEW.deceased_member_id IS DISTINCT FROM COALESCE(OLD.deceased_member_id, '') THEN
      SELECT id INTO NEW.deceased_member_uuid
      FROM public.members
      WHERE member_id = NEW.deceased_member_id
      LIMIT 1;
    END IF;
  ELSIF TG_TABLE_NAME = 'contributions' THEN
    IF NEW.member_uuid IS NULL OR NEW.member_id IS DISTINCT FROM COALESCE(OLD.member_id, '') THEN
      SELECT id INTO NEW.member_uuid
      FROM public.members
      WHERE member_id = NEW.member_id
      LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_deaths_sync_member_relation ON public.deaths;
CREATE TRIGGER trg_deaths_sync_member_relation
BEFORE INSERT OR UPDATE ON public.deaths
FOR EACH ROW EXECUTE FUNCTION public.sync_member_relation_columns();

DROP TRIGGER IF EXISTS trg_contributions_sync_member_relation ON public.contributions;
CREATE TRIGGER trg_contributions_sync_member_relation
BEFORE INSERT OR UPDATE ON public.contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_member_relation_columns();

DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.settings;
CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Recalcul caisse avec adhésions payées + cotisations + réserves - versements
CREATE OR REPLACE FUNCTION public.recalculate_treasury()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_adhesions integer := 0;
  v_contributions integer := 0;
  v_payouts integer := 0;
  v_retained integer := 0;
  v_pending integer := 0;
  v_treasury_id uuid;
BEGIN
  SELECT COALESCE(SUM(COALESCE(adhesion_amount, 14500)), 0)
  INTO v_adhesions
  FROM public.members
  WHERE adhesion_paid = true;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_contributions
  FROM public.contributions
  WHERE status IN ('payé', 'partiel');

  SELECT COALESCE(SUM(payout), 0), COALESCE(SUM(retained), 0)
  INTO v_payouts, v_retained
  FROM public.deaths
  WHERE status IN ('en_cours', 'clôturé');

  SELECT COALESCE(SUM(GREATEST(expected_amount - amount, 0)), 0)
  INTO v_pending
  FROM public.contributions
  WHERE status IN ('non_payé', 'partiel');

  SELECT id INTO v_treasury_id FROM public.treasury LIMIT 1;
  IF v_treasury_id IS NULL THEN
    INSERT INTO public.treasury (
      total_balance, total_contributions_collected, total_payouts, retained_reserves, pending_contributions
    ) VALUES (
      v_adhesions + v_contributions - v_payouts + v_retained,
      v_adhesions + v_contributions,
      v_payouts,
      v_retained,
      v_pending
    );
  ELSE
    UPDATE public.treasury
    SET total_balance = v_adhesions + v_contributions - v_payouts + v_retained,
        total_contributions_collected = v_adhesions + v_contributions,
        total_payouts = v_payouts,
        retained_reserves = v_retained,
        pending_contributions = v_pending,
        updated_at = now()
    WHERE id = v_treasury_id;
  END IF;
END;
$function$;

SELECT public.recalculate_treasury();