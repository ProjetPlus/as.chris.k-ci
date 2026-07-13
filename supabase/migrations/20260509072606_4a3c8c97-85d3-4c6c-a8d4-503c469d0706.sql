
-- Ensure member_id uniqueness for safe joins
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_member_id_key'
  ) THEN
    ALTER TABLE public.members ADD CONSTRAINT members_member_id_key UNIQUE (member_id);
  END IF;
END $$;

-- Backfill relational uuids
UPDATE public.deaths d
SET deceased_member_uuid = m.id
FROM public.members m
WHERE d.deceased_member_uuid IS NULL AND d.deceased_member_id = m.member_id;

UPDATE public.contributions c
SET member_uuid = m.id
FROM public.members m
WHERE c.member_uuid IS NULL AND c.member_id = m.member_id;

-- Foreign keys (set null on delete to preserve historical rows)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deaths_deceased_member_fk') THEN
    ALTER TABLE public.deaths
      ADD CONSTRAINT deaths_deceased_member_fk
      FOREIGN KEY (deceased_member_uuid) REFERENCES public.members(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contributions_member_fk') THEN
    ALTER TABLE public.contributions
      ADD CONSTRAINT contributions_member_fk
      FOREIGN KEY (member_uuid) REFERENCES public.members(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contributions_death_fk') THEN
    ALTER TABLE public.contributions
      ADD CONSTRAINT contributions_death_fk
      FOREIGN KEY (death_id) REFERENCES public.deaths(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes for hot paths
CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_deaths_deceased_member_uuid ON public.deaths(deceased_member_uuid);
CREATE INDEX IF NOT EXISTS idx_deaths_deceased_member_id ON public.deaths(deceased_member_id);
CREATE INDEX IF NOT EXISTS idx_deaths_date_of_death ON public.deaths(date_of_death);
CREATE INDEX IF NOT EXISTS idx_contributions_member_uuid ON public.contributions(member_uuid);
CREATE INDEX IF NOT EXISTS idx_contributions_member_id ON public.contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_death_id ON public.contributions(death_id);
CREATE INDEX IF NOT EXISTS idx_contributions_date ON public.contributions(date);

-- Re-attach the relation sync triggers (idempotent)
DROP TRIGGER IF EXISTS trg_sync_deaths_member_relation ON public.deaths;
CREATE TRIGGER trg_sync_deaths_member_relation
BEFORE INSERT OR UPDATE ON public.deaths
FOR EACH ROW EXECUTE FUNCTION public.sync_member_relation_columns();

DROP TRIGGER IF EXISTS trg_sync_contributions_member_relation ON public.contributions;
CREATE TRIGGER trg_sync_contributions_member_relation
BEFORE INSERT OR UPDATE ON public.contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_member_relation_columns();
