-- Lot 4 — Architecture DB : indices et FK (sans casser l'offline-first)
-- Backfill UUID si manquant
UPDATE public.contributions c
SET member_uuid = m.id
FROM public.members m
WHERE c.member_uuid IS NULL AND m.member_id = c.member_id;

UPDATE public.deaths d
SET deceased_member_uuid = m.id
FROM public.members m
WHERE d.deceased_member_uuid IS NULL AND m.member_id = d.deceased_member_id;

-- Indices utiles pour jointures rapides
CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_member_uuid ON public.contributions(member_uuid);
CREATE INDEX IF NOT EXISTS idx_contributions_member_id ON public.contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_death_id ON public.contributions(death_id);
CREATE INDEX IF NOT EXISTS idx_deaths_deceased_member_uuid ON public.deaths(deceased_member_uuid);
CREATE INDEX IF NOT EXISTS idx_deaths_deceased_member_id ON public.deaths(deceased_member_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);

-- Foreign keys (NOT VALID puis VALIDATE pour éviter de casser des données legacy)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contributions_member_uuid_fkey') THEN
    ALTER TABLE public.contributions
      ADD CONSTRAINT contributions_member_uuid_fkey
      FOREIGN KEY (member_uuid) REFERENCES public.members(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deaths_deceased_member_uuid_fkey') THEN
    ALTER TABLE public.deaths
      ADD CONSTRAINT deaths_deceased_member_uuid_fkey
      FOREIGN KEY (deceased_member_uuid) REFERENCES public.members(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

-- Validation des contraintes (passera si données cohérentes)
ALTER TABLE public.contributions VALIDATE CONSTRAINT contributions_member_uuid_fkey;
ALTER TABLE public.deaths VALIDATE CONSTRAINT deaths_deceased_member_uuid_fkey;

-- S'assurer que les triggers de sync existent (backfill automatique futur)
DROP TRIGGER IF EXISTS sync_contrib_member_uuid ON public.contributions;
CREATE TRIGGER sync_contrib_member_uuid
  BEFORE INSERT OR UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.sync_member_relation_columns();

DROP TRIGGER IF EXISTS sync_death_member_uuid ON public.deaths;
CREATE TRIGGER sync_death_member_uuid
  BEFORE INSERT OR UPDATE ON public.deaths
  FOR EACH ROW EXECUTE FUNCTION public.sync_member_relation_columns();