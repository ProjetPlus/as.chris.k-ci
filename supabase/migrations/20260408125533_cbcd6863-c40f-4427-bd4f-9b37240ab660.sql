
-- Settings table
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_name TEXT NOT NULL DEFAULT 'Mutuelle Funéraire — CAMP BÉTHEL DE KOUASSIKANDRO',
  initials TEXT NOT NULL DEFAULT 'MSCB',
  phone TEXT NOT NULL DEFAULT '+225 07 00 00 00 00',
  contribution_amount INTEGER NOT NULL DEFAULT 1000,
  adhesion_fee INTEGER NOT NULL DEFAULT 10000,
  principal_payout INTEGER NOT NULL DEFAULT 300000,
  secondary_payout INTEGER NOT NULL DEFAULT 250000,
  secondary_retained INTEGER NOT NULL DEFAULT 50000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App users table (username-based auth, no link to auth.users)
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'lecture_seule' CHECK (role IN ('super_admin', 'admin', 'lecture_seule', 'cotisations', 'membres', 'imprimeur')),
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_secondary TEXT,
  whatsapp TEXT,
  campement TEXT NOT NULL DEFAULT '',
  sous_prefecture TEXT NOT NULL DEFAULT '',
  id_type TEXT NOT NULL DEFAULT '',
  id_number TEXT,
  photo TEXT,
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'suspendu', 'décédé')),
  adhesion_paid BOOLEAN NOT NULL DEFAULT false,
  secondary_members JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_covered_persons INTEGER NOT NULL DEFAULT 1,
  contribution_status TEXT NOT NULL DEFAULT 'à_jour' CHECK (contribution_status IN ('à_jour', 'en_retard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deaths table
CREATE TABLE public.deaths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deceased_name TEXT NOT NULL,
  deceased_member_id TEXT NOT NULL,
  date_of_death DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('principal', 'secondaire')),
  payout INTEGER NOT NULL DEFAULT 0,
  retained INTEGER NOT NULL DEFAULT 0,
  total_expected_contributions INTEGER NOT NULL DEFAULT 0,
  total_collected INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'clôturé')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contributions table
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  death_id UUID REFERENCES public.deaths(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  expected_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'especes' CHECK (payment_method IN ('especes', 'wave', 'orange', 'mtn', 'moov')),
  status TEXT NOT NULL DEFAULT 'non_payé' CHECK (status IN ('payé', 'non_payé', 'partiel', 'exonéré')),
  date DATE,
  proof_type TEXT,
  proof_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Treasury table
CREATE TABLE public.treasury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_balance INTEGER NOT NULL DEFAULT 0,
  total_contributions_collected INTEGER NOT NULL DEFAULT 0,
  total_payouts INTEGER NOT NULL DEFAULT 0,
  retained_reserves INTEGER NOT NULL DEFAULT 0,
  pending_contributions INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deaths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury ENABLE ROW LEVEL SECURITY;

-- Permissive policies (all access for anon and authenticated)
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on deaths" ON public.deaths FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contributions" ON public.contributions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on treasury" ON public.treasury FOR ALL USING (true) WITH CHECK (true);

-- Insert default admin user (password: 12345678 hashed with pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO public.app_users (username, password_hash, role, display_name) 
VALUES ('admin', crypt('12345678', gen_salt('bf')), 'super_admin', 'Super Admin');

-- Insert default settings
INSERT INTO public.settings (association_name, initials, phone)
VALUES ('Mutuelle Funéraire — CAMP BÉTHEL DE KOUASSIKANDRO', 'MSCB', '+225 07 00 00 00 00');

-- Insert initial treasury
INSERT INTO public.treasury (total_balance, total_contributions_collected, total_payouts, retained_reserves, pending_contributions)
VALUES (0, 0, 0, 0, 0);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deaths;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.treasury;
