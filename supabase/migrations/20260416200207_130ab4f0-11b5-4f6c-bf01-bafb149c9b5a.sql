-- Mise à jour du nom de l'association et des initiales selon la carte officielle
UPDATE public.settings
SET 
  association_name = 'Association des Chrétiens de Kouassikankro (AS.CHRIS.K)',
  initials = 'A',
  updated_at = now();

-- Mise à jour des valeurs par défaut pour les futurs enregistrements
ALTER TABLE public.settings 
  ALTER COLUMN association_name SET DEFAULT 'Association des Chrétiens de Kouassikankro (AS.CHRIS.K)',
  ALTER COLUMN initials SET DEFAULT 'A';