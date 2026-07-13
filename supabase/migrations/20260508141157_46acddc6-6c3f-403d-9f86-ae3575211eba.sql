-- Add relational columns while preserving the offline-first text identifiers already used by the app.
ALTER TABLE public.deaths
  ADD COLUMN IF NOT EXISTS deceased_member_uuid uuid;

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS member_uuid uuid;

-- Backfill relation columns from existing member_id values.
UPDATE public.deaths d
SET deceased_member_uuid = m.id
FROM public.members m
WHERE d.deceased_member_uuid IS NULL
  AND d.deceased_member_id = m.member_id;

UPDATE public.contributions c
SET member_uuid = m.id
FROM public.members m
WHERE c.member_uuid IS NULL
  AND c.member_id = m.member_id;

-- Lightweight helper for updated_at columns.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_members_updated_at ON public.members;
CREATE TRIGGER set_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_settings_updated_at ON public.settings;
CREATE TRIGGER set_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Auto-fill relational UUIDs from the app's existing public member identifier.
CREATE OR REPLACE FUNCTION public.sync_member_relation_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'deaths' THEN
    IF NEW.deceased_member_uuid IS NULL OR NEW.deceased_member_id IS DISTINCT FROM OLD.deceased_member_id THEN
      SELECT id INTO NEW.deceased_member_uuid
      FROM public.members
      WHERE member_id = NEW.deceased_member_id
      LIMIT 1;
    END IF;
  ELSIF TG_TABLE_NAME = 'contributions' THEN
    IF NEW.member_uuid IS NULL OR NEW.member_id IS DISTINCT FROM OLD.member_id THEN
      SELECT id INTO NEW.member_uuid
      FROM public.members
      WHERE member_id = NEW.member_id
      LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_deaths_member_relation ON public.deaths;
CREATE TRIGGER sync_deaths_member_relation
BEFORE INSERT OR UPDATE OF deceased_member_id, deceased_member_uuid ON public.deaths
FOR EACH ROW
EXECUTE FUNCTION public.sync_member_relation_columns();

DROP TRIGGER IF EXISTS sync_contributions_member_relation ON public.contributions;
CREATE TRIGGER sync_contributions_member_relation
BEFORE INSERT OR UPDATE OF member_id, member_uuid ON public.contributions
FOR EACH ROW
EXECUTE FUNCTION public.sync_member_relation_columns();

-- Add indexes used by relation lookups and sync backfills.
CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_deaths_deceased_member_uuid ON public.deaths(deceased_member_uuid);
CREATE INDEX IF NOT EXISTS idx_contributions_member_uuid ON public.contributions(member_uuid);
CREATE INDEX IF NOT EXISTS idx_contributions_death_id ON public.contributions(death_id);

-- Add foreign keys in a non-destructive way: existing legacy rows are preserved even if orphaned.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deaths_deceased_member_uuid_fkey'
  ) THEN
    ALTER TABLE public.deaths
      ADD CONSTRAINT deaths_deceased_member_uuid_fkey
      FOREIGN KEY (deceased_member_uuid)
      REFERENCES public.members(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contributions_member_uuid_fkey'
  ) THEN
    ALTER TABLE public.contributions
      ADD CONSTRAINT contributions_member_uuid_fkey
      FOREIGN KEY (member_uuid)
      REFERENCES public.members(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contributions_death_id_fkey'
  ) THEN
    ALTER TABLE public.contributions
      ADD CONSTRAINT contributions_death_id_fkey
      FOREIGN KEY (death_id)
      REFERENCES public.deaths(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;