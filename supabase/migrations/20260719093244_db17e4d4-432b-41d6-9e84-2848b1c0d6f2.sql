
-- Ensure crypto extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate default super_admin account (admin / 12345678) as requested
INSERT INTO public.app_users (username, password_hash, role, display_name, is_active)
VALUES ('admin', extensions.crypt('12345678', extensions.gen_salt('bf')), 'super_admin', 'Super Administrateur', true)
ON CONFLICT (username) DO UPDATE
  SET password_hash = extensions.crypt('12345678', extensions.gen_salt('bf')),
      role = 'super_admin',
      is_active = true;

-- Add payment proof columns for adhesion (photo receipt or mobile money transaction id)
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS adhesion_proof_type text,
  ADD COLUMN IF NOT EXISTS adhesion_proof_data text,
  ADD COLUMN IF NOT EXISTS adhesion_transaction_id text;
