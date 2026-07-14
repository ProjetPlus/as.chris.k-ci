export type UserRole = "super_admin" | "admin" | "lecture_seule" | "cotisations" | "membres" | "imprimeur";

export type AppUser = {
  id: string;
  username: string;
  role: UserRole;
  display_name: string;
  is_active: boolean;
  created_at?: string;
};

export type CoveredPerson = {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  phone?: string;
  birth_date?: string;
  status?: "actif" | "décédé";
};

export type GuardianPerson = {
  id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  relationship?: string;
  campement?: string;
  sous_prefecture?: string;
  id_type?: string;
  id_number?: string;
};

export type DbMember = {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_secondary?: string;
  whatsapp?: string;
  campement: string;
  sous_prefecture: string;
  id_type: string;
  id_number?: string;
  photo?: string;
  id_card_front?: string;
  registration_date: string;
  status: "actif" | "suspendu" | "décédé";
  adhesion_paid: boolean;
  adhesion_amount: number;
  adhesion_payment_method?: string;
  adhesion_payment_date?: string;
  secondary_members: CoveredPerson[];
  guardian: GuardianPerson;
  total_covered_persons: number;
  contribution_status: "à_jour" | "en_retard";
  previous_principal_member_id?: string;
  principal_successor_member_id?: string;
  created_at: string;
  updated_at: string;
};

export type DbDeath = {
  id: string;
  deceased_name: string;
  deceased_member_id: string;
  deceased_member_uuid?: string;
  date_of_death: string;
  type: "principal" | "secondaire";
  payout: number;
  retained: number;
  total_expected_contributions: number;
  total_collected: number;
  status: "en_cours" | "clôturé";
  successor_member_id?: string;
  created_at: string;
};

export type DbContribution = {
  id: string;
  member_id: string;
  member_uuid?: string;
  member_name: string;
  death_id: string;
  amount: number;
  expected_amount: number;
  payment_method: "especes" | "wave" | "orange" | "mtn" | "moov";
  status: "payé" | "non_payé" | "partiel" | "exonéré";
  date?: string;
  proof_type?: string;
  proof_data?: string;
  created_at: string;
};

export type DbSettings = {
  id: string;
  association_name: string;
  initials: string;
  phone: string;
  contribution_amount: number;
  adhesion_fee: number;
  principal_payout: number;
  secondary_payout: number;
  secondary_retained: number;
  created_at?: string;
  updated_at?: string;
};

export type DbTreasury = {
  id: string;
  total_balance: number;
  total_contributions_collected: number;
  total_payouts: number;
  retained_reserves: number;
  pending_contributions: number;
  updated_at: string;
};

export type TableName = "settings" | "members" | "deaths" | "contributions" | "treasury" | "app_users";
