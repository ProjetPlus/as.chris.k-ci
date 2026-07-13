
-- Passer le droit d'adhésion par défaut à 14500 FCFA
ALTER TABLE public.settings ALTER COLUMN adhesion_fee SET DEFAULT 14500;
UPDATE public.settings SET adhesion_fee = 14500 WHERE adhesion_fee = 10000 OR adhesion_fee IS NULL;

-- Purger tous les décès et cotisations existantes (demande utilisateur)
DELETE FROM public.contributions;
DELETE FROM public.deaths;
